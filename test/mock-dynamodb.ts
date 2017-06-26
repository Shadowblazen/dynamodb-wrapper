import { DynamoDB } from 'aws-sdk';

export interface IMockDynamoDBOptions {
    customResponses?: ICustomResponses;
}

export interface ICustomResponses {
    // 'ProvisionedThroughputExceededException'
    // 'SomeUnprocessedItems'
    // 'ValidationException'
    [responseNumber: number]: string;
}

export class MockDynamoDB {
    private _countRequests: number;
    private _customResponses: ICustomResponses;

    constructor(options?: any) {
        options = options || {};

        this._customResponses = options.customResponses || {};
        this._countRequests = 0;
    }

    public createTable() {
        return this._mockApiResult();
    }

    public updateTable() {
        return this._mockApiResult();
    }

    public describeTable() {
        return this._mockApiResult();
    }

    public deleteTable() {
        return this._mockApiResult();
    }

    public getItem() {
        return this._mockApiResult();
    }

    public updateItem() {
        return this._mockApiResult();
    }

    public deleteItem() {
        return this._mockApiResult();
    }

    public batchGetItem() {
        return this._mockApiResult();
    }

    public putItem(params: DynamoDB.PutItemInput) {
        return {
            promise: () => {
                return new Promise((resolve, reject) => {
                    this._countRequests++;

                    if (this._isAllValidationException()) {
                        reject({
                            code: 'ValidationException',
                            statusCode: 400
                        });
                    } else if (this._isThroughputExceeded()) {
                        reject({
                            code: 'ProvisionedThroughputExceededException',
                            statusCode: 400
                        });
                    } else {
                        // case: put item successful
                        resolve({
                            ConsumedCapacity: {
                                TableName: params.TableName,
                                CapacityUnits: 1
                            }
                        });
                    }
                });
            }
        };
    }

    public query(params: DynamoDB.QueryInput) {
        return this._mockQueryOrScanResponse(params);
    }

    public scan(params: DynamoDB.ScanInput) {
        return this._mockQueryOrScanResponse(params);
    }

    public batchWriteItem(params: DynamoDB.BatchWriteItemInput) {
        return {
            promise: () => {
                return new Promise((resolve, reject) => {
                    this._countRequests++;

                    if (this._isThroughputExceeded()) {
                        reject({
                            code: 'ProvisionedThroughputExceededException',
                            statusCode: 400
                        });
                    } else {
                        let tableNames = Object.keys(params.RequestItems);
                        let firstTableName = tableNames[0];
                        let numPutItemSucceeded = 0;
                        let response = {};

                        if (this._isSomeUnprocessedItems()) {
                            // case: PutRequest succeeded for 1st item, failed for all the others
                            numPutItemSucceeded = 1;
                            response['UnprocessedItems'] = params.RequestItems;
                            response['UnprocessedItems'][firstTableName] = response['UnprocessedItems'][firstTableName].slice(1);
                        } else {
                            // case: PutRequest succeeded for all items
                            numPutItemSucceeded = params.RequestItems[firstTableName].length;
                        }

                        if (params.ReturnConsumedCapacity === 'INDEXES') {
                            response['ConsumedCapacity'] = [
                                {
                                    CapacityUnits: 6 * numPutItemSucceeded,
                                    TableName: firstTableName,
                                    Table: {
                                        CapacityUnits: numPutItemSucceeded
                                    },
                                    LocalSecondaryIndexes: {
                                        MyLocalIndex: {
                                            CapacityUnits: 3 * numPutItemSucceeded
                                        }
                                    },
                                    GlobalSecondaryIndexes: {
                                        MyGlobalIndex: {
                                            CapacityUnits: 2 * numPutItemSucceeded
                                        }
                                    }
                                }
                            ];
                        } else if (params.ReturnConsumedCapacity === 'TOTAL') {
                            response['ConsumedCapacity'] = [
                                {
                                    CapacityUnits: 6 * numPutItemSucceeded,
                                    TableName: firstTableName
                                }
                            ];
                        }

                        resolve(response);
                    }
                });
            }
        };
    }

    private _mockQueryOrScanResponse(params: any) {
        return {
            promise: () => {
                return new Promise(resolve => {
                    this._countRequests++;

                    // create mock response
                    let response = {
                        Items: []
                    };

                    // create mock items
                    for (let i = 0; i < params.Limit; i++) {
                        response.Items.push({});
                    }

                    if (params.ReturnConsumedCapacity === 'INDEXES') {
                        response['ConsumedCapacity'] = {
                            CapacityUnits: 7,
                            TableName: params.TableName,
                            Table: {
                                CapacityUnits: 2
                            },
                            LocalSecondaryIndexes: {
                                MyLocalIndex: {
                                    CapacityUnits: 4
                                }
                            },
                            GlobalSecondaryIndexes: {
                                MyGlobalIndex: {
                                    CapacityUnits: 1
                                }
                            }
                        };
                    } else if (params.ReturnConsumedCapacity === 'TOTAL') {
                        response['ConsumedCapacity'] = {
                            CapacityUnits: 7,
                            TableName: params.TableName
                        };
                    }

                    if (this._countRequests < 3) {
                        response['LastEvaluatedKey'] = 'foo';
                    }

                    resolve(response);
                });
            }
        };
    }

    private _mockApiResult() {
        return {
            promise: () => {
                return new Promise(resolve => {
                    resolve({});
                });
            }
        };
    }

    private _isThroughputExceeded() {
        return this._customResponses[this._countRequests] === 'ProvisionedThroughputExceededException';
    }

    private _isSomeUnprocessedItems() {
        return this._customResponses[this._countRequests] === 'SomeUnprocessedItems';
    }

    private _isAllValidationException() {
        return this._customResponses[this._countRequests] === 'ValidationException';
    }

}