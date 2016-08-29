/// <reference path="../typings/manifest.d.ts" />
/// <reference path="./dynamodb-wrapper.d.ts" />

import { EventEmitter } from 'events';
import { DynamoDB } from 'aws-sdk';
import {
    DynamoDBWrapperException,
    DynamoDBWrapperErrorCode,
    DynamoDBWrapperErrorMessage
} from './error-types';
import { getNextGroupByItemCount, getNextGroupByTotalWCU } from './batch-write-heuristic';

export class DynamoDBWrapper {
    public dynamoDB: any;
    public events: EventEmitter;

    public tableNamePrefix: string;
    public batchWaitMs: number;
    public maxRetries: number;
    public retryDelayOptions: any;

    constructor(dynamoDB: any, options?: IDynamoDBWrapperOptions) {
        this.dynamoDB = dynamoDB;
        this.events = new EventEmitter();

        options = options || {};
        options.retryDelayOptions = options.retryDelayOptions || {};
        this.tableNamePrefix = typeof options.tableNamePrefix === 'string' ? options.tableNamePrefix : '';
        this.batchWaitMs = _getNonNegativeInteger(options.batchWaitMs, 100);
        this.maxRetries = _getNonNegativeInteger(options.maxRetries, 10);
        this.retryDelayOptions = {};
        this.retryDelayOptions.base = _getNonNegativeInteger(options.retryDelayOptions.base, 100);
        if (typeof options.retryDelayOptions.customBackoff === 'function') {
            this.retryDelayOptions.customBackoff = options.retryDelayOptions.customBackoff;
        }
    }

    /**
     * A lightweight wrapper around the DynamoDB GetItem method.
     *
     * @param params
     * @returns {Promise}
     */

    public async getItem(params: DynamoDB.GetItemInput): Promise<DynamoDB.GetItemOutput> {
        return await this._callDynamoDB('getItem', params);
    }

    /**
     * A lightweight wrapper around the DynamoDB UpdateItem method.
     *
     * @param params
     * @returns {Promise}
     */

    public async updateItem(params: DynamoDB.UpdateItemInput): Promise<DynamoDB.UpdateItemOutput> {
        return await this._callDynamoDB('updateItem', params);
    }

    /**
     * A lightweight wrapper around the DynamoDB PutItem method.
     *
     * @param params
     * @returns {Promise}
     */

    public async putItem(params: DynamoDB.PutItemInput): Promise<DynamoDB.PutItemOutput> {
        return await this._callDynamoDB('putItem', params);
    }

    /**
     * A lightweight wrapper around the DynamoDB DeleteItem method.
     *
     * @param params
     * @returns {Promise}
     */

    public async deleteItem(params: DynamoDB.DeleteItemInput): Promise<DynamoDB.DeleteItemOutput> {
        return await this._callDynamoDB('deleteItem', params);
    }

    /**
     * A lightweight wrapper around the DynamoDB Query method.
     *
     * The underlying DynamoDB Query method always returns 1 page of data per call. This method will return all pages
     * of data, making multiple calls to the underlying DynamoDB Query method if there is more than 1 page of data.
     * All pages of data are aggregated and returned in the response.
     *
     * @param params
     * @returns {Promise}
     */

    public async query(params: DynamoDB.QueryInput): Promise<DynamoDB.QueryOutput> {
        let responses = await this._queryOrScanHelper('query', params);
        return _makeQueryOrScanResponse(responses);
    }

    /**
     * A lightweight wrapper around the DynamoDB Scan method.
     *
     * The underlying DynamoDB Scan method always returns 1 page of data per call. This method will return all pages
     * of data, making multiple calls to the underlying DynamoDB Scan method if there is more than 1 page of data.
     * All pages of data are aggregated and returned in the response.
     *
     * @param params
     * @returns {Promise}
     */

    public async scan(params: DynamoDB.ScanInput): Promise<DynamoDB.ScanOutput> {
        let responses = await this._queryOrScanHelper('scan', params);
        return _makeQueryOrScanResponse(responses);
    }

    /**
     * A lightweight wrapper around the DynamoDB BatchWriteItem method.
     *
     * The DynamoDB BatchWriteItem method only supports an array of at most 25 requests. This method
     * supports an unlimited number of requests, and will partition the requests into groups of count <= 25,
     * making multiple calls to the underlying DynamoDB BatchWriteItem method if there is more than 1 group.
     * The partitioning strategy is configurable:
     *
     * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
     *
     * The EqualItemCount partition strategy is the "simple" approach to partitioning, which works well
     * when all your items have predicable, equal size in WCU.
     *
     * For example, with partitionStrategy="EqualItemCount" and targetItemCount=10, an array of 32 items would be
     * partitioned into 4 groups as [10], [10], [10], [2]. The first 3 groups would have 10 items each, and the
     * remaining 2 items would be in the last group. The underlying DynamoDB BatchWriteItem method would be called
     * a total of 4 times - once for each group in the partition.
     *
     * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
     *
     * The EvenlyDistributedGroupWCU partition strategy is used to partition the array into groups of equal total WCU
     * up to a given threshold. This allows you make optimal use of available table throughput.
     *
     * For example, if a table has a throughput of 25 WCU, and we're writing 1 group per second, ideally every group
     * would be sized such that it consumes exactly 25 WCU when written to the table. The "simple" approach
     * used in the EqualItemCount partition strategy suffices when your item sizes are consistent and predicable,
     * but some data (particularly user-generated content) can be of highly variable or unknown sizes (in WCU).
     * This partition strategy is designed for that scenario.
     *
     * For example, suppose we wish to write an array of items [A, B, C, D, E, F], where the sizes of the items
     * (in WriteCapacityUnits) are:
     *
     *     A = 4 WCU
     *     B = 1 WCU
     *     C = 1 WCU
     *     D = 1 WCU
     *     E = 2 WCU
     *     F = 1 WCU
     *
     * With partitionStrategy="EvenlyDistributedGroupWCU" and targetGroupWCU=3, this array would be partitioned as:
     *
     *     [A]       = total of 4 WCU
     *     [B, C, D] = total of 3 WCU
     *     [E, F]    = total of 3 WCU
     *
     * With partitionStrategy="EvenlyDistributedGroupWCU" and targetGroupWCU=5, the partitioning would be:
     *
     *     [A, B]       = total of 5 WCU
     *     [C, D, E, F] = total of 5 WCU
     *
     * More generally speaking, this partition strategy employs the following algorithm:
     * for each item in the array...
     * 1) Create a new group
     * 2) Add the current item to the group (to ensure each group always contains at least 1 item)
     * 3) While the sum of item WCUs in the group + next item WCU <= targetGroupWCU, add next item to the group
     * 4) If the sum of item WCUs in the group + next item WCU > targetGroupWCU, go back to step 1
     *
     * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
     *
     * @param params
     * @param [options]
     * @returns {Promise}
     */

    public async batchWriteItem(params: DynamoDB.BatchWriteItemInput,
                                options?: IBatchWriteItemOptions): Promise<DynamoDB.BatchWriteItemOutput> {
        // validate parameters to check for features not yet implemented
        _validateBatchWriteItemParams(params);

        const tableName = Object.keys(params.RequestItems)[0];
        const totalRequestItems = params.RequestItems[tableName].length;

        // set default options
        options = options || {};
        options.targetGroupWCU = _getPositiveInteger(options.targetGroupWCU, 5);
        options.targetItemCount = _getPositiveInteger(options.targetItemCount, 25);

        let responses = await this._batchWriteItemHelper(tableName, params, options);
        return _makeBatchWriteItemResponse(tableName, totalRequestItems, responses);
    }

    private async _queryOrScanHelper(method: string, params: any): Promise<any> {
        let list = [];

        // first page of data
        let res = await this._callDynamoDB(method, params);
        list.push(res);

        // make subsequent requests to get remaining pages of data
        while (res.LastEvaluatedKey) {
            await this._wait(this.batchWaitMs);
            params.ExclusiveStartKey = res.LastEvaluatedKey;
            res = await this._callDynamoDB(method, params);
            list.push(res);
        }

        return list;
    }

    private async _batchWriteItemHelper(tableName: string, params: DynamoDB.BatchWriteItemInput,
                                        options: IBatchWriteItemOptions): Promise<DynamoDB.BatchWriteItemOutput[]> {

        let list = [];

        const writeRequests = params.RequestItems[tableName];
        const getNextGroup = options.partitionStrategy === 'EvenlyDistributedGroupWCU'
            ? getNextGroupByTotalWCU
            : getNextGroupByItemCount;

        // construct params for the next group of items
        let groupParams: any = {
            RequestItems: {}
        };
        if (params.ReturnConsumedCapacity) {
            groupParams.ReturnConsumedCapacity = params.ReturnConsumedCapacity;
        }

        // first group
        let groupStartIndex = 0;
        let nextGroup = getNextGroup(writeRequests, groupStartIndex, options);

        while (true) {
            // make batch write request
            groupParams.RequestItems[tableName] = nextGroup;
            let res = await this._callDynamoDB('batchWriteItem', groupParams);
            list.push(res);

            // update loop conditions
            groupStartIndex += nextGroup.length;
            nextGroup = getNextGroup(writeRequests, groupStartIndex, options);

            // wait before processing the next group, or exit if nothing left to do
            if (nextGroup) {
                await this._wait(this.batchWaitMs);
            } else {
                break;
            }
        }

        return list;
    }

    private async _callDynamoDB(method: string, params: any): Promise<any> {
        let retry, response, err, tableName, retryCount = 0;

        do {
            retry = false;

            try {
                response = await this.dynamoDB[method](params).promise();

                // BatchWriteItem: retry unprocessed items
                /* tslint:disable:no-conditional-assignment */
                let keys;
                if (response.UnprocessedItems && (keys = Object.keys(response.UnprocessedItems)).length > 0) {
                    params.RequestItems = response.UnprocessedItems;
                    retry = true;
                }
                /* tslint:enable:no-conditional-assignment */
            } catch (e) {
                err = e;
                if (e.statusCode === 500 || e.statusCode === 503 ||
                    e.code === DynamoDBWrapperErrorCode.ProvisionedThroughputExceededException) {
                    retry = true;
                } else {
                    throw e;
                }
            }

            if (retry) {
                retryCount++;
                let waitMs = this._backoffFunction(retryCount);
                this.events.emit('retry', retryCount, waitMs);
                await this._wait(waitMs);
            }

        } while (retry && retryCount <= this.maxRetries);

        if (retryCount > this.maxRetries) {
            if (method === 'batchWriteItem') {
                // BatchWriteItem: always return unprocessed items, allowing the upstream method
                // to decide what to do with them (throw error or return to sender)
                response = response || {};
                response.UnprocessedItems = response.UnprocessedItems && Object.keys(response.UnprocessedItems).length > 0
                    ? response.UnprocessedItems
                    : params.RequestItems;
            } else {
                throw err;
            }
        }

        return response;
    }

    private _backoffFunction(retryCount: number): number {
        if (this.retryDelayOptions.customBackoff) {
            return this.retryDelayOptions.customBackoff(retryCount);
        } else {
            return this.retryDelayOptions.base * Math.pow(2, retryCount);
        }
    }

    private _wait(ms: number): Promise<any> {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, ms);
        });
    }

}

function _makeQueryOrScanResponse(responses: any): any {
    let count = 0;
    let scannedCount = 0;
    let items = [];

    for (let res of responses) {
        count += res.Count;
        scannedCount += res.ScannedCount;
        _appendArray(items, res.Items);
    }

    let result: any = {
        Count: count,
        ScannedCount: scannedCount,
        Items: items
    };

    if (responses[0].ConsumedCapacity) {
        let listCC = responses.map(res => res.ConsumedCapacity);
        result.ConsumedCapacity = _aggregateConsumedCapacity(listCC);
    }

    return result;
}

function _makeBatchWriteItemResponse(tableName: string, totalRequestItems: number,
                                     responses: DynamoDB.BatchWriteItemOutput[]): DynamoDB.BatchWriteItemOutput {
    let items = [];

    for (let res of responses) {
        if (res.UnprocessedItems) {
            _appendArray(items, res.UnprocessedItems[tableName]);
        }
    }

    // if all items are unprocessed, throw an error
    if (items.length === totalRequestItems) {
        throw new DynamoDBWrapperException(
            DynamoDBWrapperErrorCode.ProvisionedThroughputExceededException,
            DynamoDBWrapperErrorMessage.ProvisionedThroughputExceededException
        );
    }

    // otherwise, construct a response
    let result: any = {};

    if (items.length > 0) {
        result.UnprocessedItems = {};
        result.UnprocessedItems[tableName] = items;
    }

    if (responses[0].ConsumedCapacity) {
        let listCCM = [];
        for (let res of responses) {
            if (res.ConsumedCapacity) {
                listCCM.push(res.ConsumedCapacity);
            }
        }
        result.ConsumedCapacity = _aggregateConsumedCapacityMultiple(listCCM);
    }

    return result;
}

function _aggregateConsumedCapacityMultiple(listCCM: DynamoDB.ConsumedCapacityMultiple[]): DynamoDB.ConsumedCapacityMultiple {
    let map: TDictionary<DynamoDB.ConsumedCapacity[]> = {};

    for (let ccm of listCCM) {
        for (let cc of ccm) {
            if (!map[cc.TableName]) {
                map[cc.TableName] = [];
            }
            map[cc.TableName].push(cc);
        }
    }

    let result = [];

    for (let tableName in map) {
        /* tslint:disable:forin */
        // noinspection JSUnfilteredForInLoop
        result.push(_aggregateConsumedCapacity(map[tableName]));
        /* tslint:enable:forin */
    }

    return result;
}

function _aggregateConsumedCapacity(listCC: DynamoDB.ConsumedCapacity[]): DynamoDB.ConsumedCapacity {
    let totalCC: any = {
        CapacityUnits: 0,
        TableName: listCC[0].TableName
    };

    // total
    for (let cc of listCC) {
        totalCC.CapacityUnits += cc.CapacityUnits;
    }

    // table
    if (listCC[0].Table) {
        totalCC.Table = {
            CapacityUnits: 0
        };

        for (let cc of listCC) {
            totalCC.Table.CapacityUnits += cc.Table.CapacityUnits;
        }
    }

    // local secondary indexes
    if (listCC[0].LocalSecondaryIndexes) {
        totalCC.LocalSecondaryIndexes = _aggregateConsumedCapacityForIndexes(listCC, 'LocalSecondaryIndexes');
    }

    // global secondary indexes
    if (listCC[0].GlobalSecondaryIndexes) {
        totalCC.GlobalSecondaryIndexes = _aggregateConsumedCapacityForIndexes(listCC, 'GlobalSecondaryIndexes');
    }

    return totalCC;
}

function _aggregateConsumedCapacityForIndexes(listCC: DynamoDB.ConsumedCapacity[],
                                              secondaryIndex: string): DynamoDB.SecondaryIndexesCapacityMap {
    let resultIndexes: any = {};

    for (let cc of listCC) {
        let indexes = cc[secondaryIndex];
        for (let key in indexes) {
            /* tslint:disable:forin */
            // noinspection JSUnfilteredForInLoop
            resultIndexes[key] = resultIndexes[key] || {
                CapacityUnits: 0
            };
            // noinspection JSUnfilteredForInLoop
            resultIndexes[key].CapacityUnits += indexes[key].CapacityUnits;
            /* tslint:enable:forin */
        }
    }

    return resultIndexes;
}

function _validateBatchWriteItemParams(params: DynamoDB.BatchWriteItemInput): void {
    // ReturnItemCollectionMetrics not yet supported

    if (params.ReturnItemCollectionMetrics === 'SIZE') {
        throw new DynamoDBWrapperException(
            DynamoDBWrapperErrorCode.NotYetImplementedError,
            DynamoDBWrapperErrorMessage.ItemCollectionMetrics
        );
    }

    // multiple table names not yet supported
    let tableNames = Object.keys(params.RequestItems);
    if (!tableNames || tableNames.length !== 1) {
        throw new DynamoDBWrapperException(
            DynamoDBWrapperErrorCode.NotYetImplementedError,
            DynamoDBWrapperErrorMessage.BatchWriteMultipleTables
        );
    }

    // DeleteRequest not yet supported
    let writeRequests = params.RequestItems[tableNames[0]];
    for (let request of writeRequests) {
        if (request.DeleteRequest) {
            throw new DynamoDBWrapperException(
                DynamoDBWrapperErrorCode.NotYetImplementedError,
                DynamoDBWrapperErrorMessage.BatchWriteDeleteRequest
            );
        }
    }
}

function _getNonNegativeInteger(v: any, defaultValue: number) {
    if (typeof v !== 'number' || isNaN(v) || v >= Number.MAX_SAFE_INTEGER || v < 0 || Math.round(v) !== v) {
        v = defaultValue;
    }
    return v;
}

function _getPositiveInteger(v: any, defaultValue: number) {
    if (typeof v !== 'number' || isNaN(v) || v >= Number.MAX_SAFE_INTEGER || v < 1 || Math.round(v) !== v) {
        v = defaultValue;
    }
    return v;
}

function _appendArray(array1: any[], array2: any[]) {
    if (array2 && array2.length > 0) {
        Array.prototype.push.apply(array1, array2);
    }
}