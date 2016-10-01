/// <reference path="../typings/manifest.d.ts" />
/// <reference path="./dynamodb-wrapper.d.ts" />

import { EventEmitter } from 'events';
import { DynamoDB } from 'aws-sdk';
import { ErrorCode, ErrorMessage, Exception } from './error-types';
import { getNextGroupByItemCount, getNextGroupByTotalWCU } from './partition-strategy';
import { addTablePrefixToRequest, removeTablePrefixFromResponse, removePrefix } from './table-prefixes';

export class DynamoDBWrapper {
    public dynamoDB: any;
    public events: EventEmitter;

    public tableNamePrefix: string;
    public groupDelayMs: number;
    public maxRetries: number;
    public retryDelayOptions: any;

    constructor(dynamoDB: any, options?: IDynamoDBWrapperOptions) {
        this.dynamoDB = dynamoDB;
        this.events = new EventEmitter();

        options = options || {};
        options.retryDelayOptions = options.retryDelayOptions || {};
        this.tableNamePrefix = typeof options.tableNamePrefix === 'string' ? options.tableNamePrefix : '';
        this.groupDelayMs = _getNonNegativeInteger(options.groupDelayMs, 100);
        this.maxRetries = _getNonNegativeInteger(options.maxRetries, 10);
        this.retryDelayOptions = {};
        this.retryDelayOptions.base = _getNonNegativeInteger(options.retryDelayOptions.base, 100);
        if (typeof options.retryDelayOptions.customBackoff === 'function') {
            this.retryDelayOptions.customBackoff = options.retryDelayOptions.customBackoff;
        }
    }

    /**
     * A lightweight wrapper around the DynamoDB CreateTable method.
     *
     * @param params
     * @returns {Promise}
     */

    public async createTable(params: DynamoDB.CreateTableInput): Promise<DynamoDB.CreateTableOutput> {
        addTablePrefixToRequest(this.tableNamePrefix, params);
        return await this._callDynamoDB('createTable', params);
    }

    /**
     * A lightweight wrapper around the DynamoDB UpdateTable method.
     *
     * @param params
     * @returns {Promise}
     */

    public async updateTable(params: DynamoDB.UpdateTableInput): Promise<DynamoDB.UpdateTableOutput> {
        addTablePrefixToRequest(this.tableNamePrefix, params);
        return await this._callDynamoDB('updateTable', params);
    }

    /**
     * A lightweight wrapper around the DynamoDB DescribeTable method.
     *
     * @param params
     * @returns {Promise}
     */

    public async describeTable(params: DynamoDB.DescribeTableInput): Promise<DynamoDB.DescribeTableOutput> {
        addTablePrefixToRequest(this.tableNamePrefix, params);
        return await this._callDynamoDB('describeTable', params);
    }

    /**
     * A lightweight wrapper around the DynamoDB DeleteTable method.
     *
     * @param params
     * @returns {Promise}
     */

    public async deleteTable(params: DynamoDB.DeleteTableInput): Promise<DynamoDB.DeleteTableOutput> {
        addTablePrefixToRequest(this.tableNamePrefix, params);
        return await this._callDynamoDB('deleteTable', params);
    }

    /**
     * A lightweight wrapper around the DynamoDB GetItem method.
     *
     * @param params
     * @returns {Promise}
     */

    public async getItem(params: DynamoDB.GetItemInput): Promise<DynamoDB.GetItemOutput> {
        addTablePrefixToRequest(this.tableNamePrefix, params);
        return await this._callDynamoDB('getItem', params);
    }

    /**
     * A lightweight wrapper around the DynamoDB UpdateItem method.
     *
     * @param params
     * @returns {Promise}
     */

    public async updateItem(params: DynamoDB.UpdateItemInput): Promise<DynamoDB.UpdateItemOutput> {
        addTablePrefixToRequest(this.tableNamePrefix, params);
        return await this._callDynamoDB('updateItem', params);
    }

    /**
     * A lightweight wrapper around the DynamoDB PutItem method.
     *
     * @param params
     * @returns {Promise}
     */

    public async putItem(params: DynamoDB.PutItemInput): Promise<DynamoDB.PutItemOutput> {
        addTablePrefixToRequest(this.tableNamePrefix, params);
        return await this._callDynamoDB('putItem', params);
    }

    /**
     * A lightweight wrapper around the DynamoDB DeleteItem method.
     *
     * @param params
     * @returns {Promise}
     */

    public async deleteItem(params: DynamoDB.DeleteItemInput): Promise<DynamoDB.DeleteItemOutput> {
        addTablePrefixToRequest(this.tableNamePrefix, params);
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
     * @param [options]
     * @returns {Promise}
     */

    public async query(params: DynamoDB.QueryInput, options?: IQueryOptions): Promise<DynamoDB.QueryOutput> {
        addTablePrefixToRequest(this.tableNamePrefix, params);

        // set default options
        options = options || {};
        options.groupDelayMs = _getNonNegativeInteger(options.groupDelayMs, this.groupDelayMs);

        let responses = await this._queryOrScanHelper('query', params, options.groupDelayMs);
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
     * @param [options]
     * @returns {Promise}
     */

    public async scan(params: DynamoDB.ScanInput, options?: IScanOptions): Promise<DynamoDB.ScanOutput> {
        addTablePrefixToRequest(this.tableNamePrefix, params);

        // set default options
        options = options || {};
        options.groupDelayMs = _getNonNegativeInteger(options.groupDelayMs, this.groupDelayMs);

        let responses = await this._queryOrScanHelper('scan', params, options.groupDelayMs);
        return _makeQueryOrScanResponse(responses);
    }

    /**
     * A lightweight wrapper around the DynamoDB BatchWriteItem method.
     *
     * The underlying DynamoDB BatchWriteItem method only supports an array of at most 25 requests.
     * This method supports an unlimited number of requests, and will partition the requests into
     * groups of count <= 25, making multiple calls to the underlying DynamoDB BatchWriteItem method
     * if there is more than 1 group.
     *
     * See partition-strategy.ts for partition implementation details.
     *
     * @param params
     * @param [options]
     * @returns {Promise}
     */

    public async batchWriteItem(params: DynamoDB.BatchWriteItemInput,
                                options?: IBatchWriteItemOptions): Promise<DynamoDB.BatchWriteItemOutput> {

        // set default options
        options = options || {};
        options.groupDelayMs = _getNonNegativeInteger(options.groupDelayMs, this.groupDelayMs);
        options.targetGroupWCU = _getPositiveInteger(options.targetGroupWCU, 5);
        options.targetItemCount = _getPositiveInteger(options.targetItemCount, 25);

        // validate parameters to check for features not yet implemented
        _validateBatchWriteItemParams(params);

        addTablePrefixToRequest(this.tableNamePrefix, params);

        const tableName = _extractTableNameFromRequest(params);
        const totalRequestItems = params.RequestItems[tableName].length;

        let responses = await this._batchWriteItemHelper(tableName, params, options);
        return _makeBatchWriteItemResponse(tableName, totalRequestItems, responses);
    }

    private async _queryOrScanHelper(method: string, params: any, groupDelayMs: number): Promise<any> {
        let list = [];

        // first page of data
        let res = await this._callDynamoDB(method, params);
        list.push(res);

        // make subsequent requests to get remaining pages of data
        while (res.LastEvaluatedKey) {
            await this._wait(groupDelayMs);
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
                await this._wait(options.groupDelayMs);
            } else {
                break;
            }
        }

        return list;
    }

    /**
     * Entry point for calling into the AWS SDK. This is the centralized location for retry logic and events.
     * All DynamoDBWrapper public methods are funneled through here.
     *
     * @param method
     * @param params
     * @returns {any}
     * @private
     */

    private async _callDynamoDB(method: string, params: any): Promise<any> {
        let retryCount = 0;
        let responses = [];
        let shouldRetry, result, error;

        while (true) {
            shouldRetry = false;
            result = null;

            try {
                result = await this.dynamoDB[method](params).promise();
                responses.push(result);
                removeTablePrefixFromResponse(this.tableNamePrefix, result);
                this._emitConsumedCapacitySummary(method, result);

                // BatchWriteItem: retry unprocessed items
                if (result.UnprocessedItems && Object.keys(result.UnprocessedItems).length > 0) {
                    params.RequestItems = result.UnprocessedItems;
                    shouldRetry = true;
                }
            } catch (e) {
                error = e;
                if (e.code === ErrorCode.ProvisionedThroughputExceededException ||
                        e.code === ErrorCode.ThrottlingException || e.statusCode === 500 || e.statusCode === 503) {
                    shouldRetry = true;
                } else {
                    throw e;
                }
            }

            if (shouldRetry && ++retryCount <= this.maxRetries) {
                let waitMs = this._backoffFunction(retryCount);
                let tableName = removePrefix(this.tableNamePrefix, _extractTableNameFromRequest(params));
                this.events.emit('retry', {
                    tableName: tableName,
                    method: method,
                    retryCount: retryCount,
                    retryDelayMs: waitMs
                });
                await this._wait(waitMs);
            } else {
                break;
            }
        }

        if (method === 'batchWriteItem') {
            result = {};
            _aggregateConsumedCapacityMultipleFromResponses(responses, result);
        }

        if (retryCount > this.maxRetries) {
            if (method === 'batchWriteItem') {
                // instead of throwing an error, always return UnprocessedItems and delete decision upstream
                // set UnprocessedItems equal to the UnprocessedItems from the last response
                // in the array, or use params.RequestItems if there were no successful responses
                result.UnprocessedItems = responses.length > 0
                    ? responses[responses.length - 1].UnprocessedItems
                    : params.RequestItems;
            } else {
                throw error;
            }
        }

        return result;
    }

    private _backoffFunction(retryCount: number): number {
        if (this.retryDelayOptions.customBackoff) {
            return this.retryDelayOptions.customBackoff(retryCount);
        } else {
            return this.retryDelayOptions.base * Math.pow(2, retryCount - 1);
        }
    }

    private _wait(ms: number): Promise<any> {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, ms);
        });
    }

    private _emitConsumedCapacitySummary(method: string, response: any) {
        if (response.ConsumedCapacity) {
            let capacityType = _getMethodCapacityUnitsType(method);
            if (capacityType) {
                this.events.emit('consumedCapacity', {
                    method: method,
                    capacityType: capacityType,
                    consumedCapacity: response.ConsumedCapacity
                });
            }
        }
    }

}

function _extractTableNameFromRequest(params: any): string {
    return params.RequestItems ? Object.keys(params.RequestItems)[0] : params.TableName;
}

function _getMethodCapacityUnitsType(method: string): string {
    /* tslint:disable:switch-default */
    switch (method) {
        case 'getItem':
        case 'query':
        case 'scan':
        case 'batchGetItem':
            return 'ReadCapacityUnits';
        case 'putItem':
        case 'updateItem':
        case 'deleteItem':
        case 'batchWriteItem':
            return 'WriteCapacityUnits';
    }
    /* tslint:enable:switch-default */
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

    let totalUnprocessedItems = [];

    for (let res of responses) {
        if (res.UnprocessedItems) {
            _appendArray(totalUnprocessedItems, res.UnprocessedItems[tableName]);
        }
    }

    // if all items are unprocessed, throw an error
    if (totalUnprocessedItems.length === totalRequestItems) {
        throw new Exception(
            ErrorCode.ProvisionedThroughputExceededException,
            ErrorMessage.ProvisionedThroughputExceededException
        );
    }

    // otherwise, construct a 200 OK response
    let result: any = {};

    if (totalUnprocessedItems.length > 0) {
        result.UnprocessedItems = {};
        result.UnprocessedItems[tableName] = totalUnprocessedItems;
    }

    _aggregateConsumedCapacityMultipleFromResponses(responses, result);

    return result;
}

function _aggregateConsumedCapacityMultipleFromResponses(responses: any[], result: any): void {
    let listCCM = [];

    if (responses.length > 0) {
        for (let res of responses) {
            if (res.ConsumedCapacity) {
                listCCM.push(res.ConsumedCapacity);
            }
        }
    }

    if (listCCM.length > 0) {
        result.ConsumedCapacity = _aggregateConsumedCapacityMultiple(listCCM);
    }
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
        throw new Exception(
            ErrorCode.NotYetImplementedError,
            ErrorMessage.ItemCollectionMetrics
        );
    }

    // multiple table names not yet supported
    let tableNames = Object.keys(params.RequestItems);
    if (!tableNames || tableNames.length !== 1) {
        throw new Exception(
            ErrorCode.NotYetImplementedError,
            ErrorMessage.BatchWriteMultipleTables
        );
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