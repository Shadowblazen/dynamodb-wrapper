import { DynamoDB } from 'aws-sdk';
import { IMockDynamoDBOptions, MockDynamoDB } from '../test/mock-dynamodb';
import { DynamoDBWrapper } from './dynamodb-wrapper';

function testAsync(fn) {
    return (done) => {
        fn.apply(null, arguments)
            .then(() => done())
            .catch((err) => done.fail(err));
    };
}

describe('lib/dynamodb-wrapper', () => {

    function _setupDynamoDBWrapper(options?: IMockDynamoDBOptions) {
        options = options || {};
        let mockDynamoDB = new MockDynamoDB(options);
        return {
            dynamoDB: mockDynamoDB,
            dynamoDBWrapper: new DynamoDBWrapper(mockDynamoDB, {
                tableNamePrefix: 'local-',
                groupDelayMs: 0,
                maxRetries: 2,
                retryDelayOptions: {
                    base: 0
                }
            })
        };
    }

    it('should initialize with default options', () => {
        let dynamoDB = new MockDynamoDB();
        let dynamoDBWrapper = new DynamoDBWrapper(dynamoDB);

        expect(dynamoDBWrapper.tableNamePrefix).toBe('');
        expect(dynamoDBWrapper.groupDelayMs).toBe(100);
        expect(dynamoDBWrapper.maxRetries).toBe(10);
        expect(dynamoDBWrapper.retryDelayOptions).toEqual({
            base: 100
        });
    });

    it('should initialize with custom options', () => {
        let dynamoDB = new MockDynamoDB();
        let dynamoDBWrapper = new DynamoDBWrapper(dynamoDB, {
            tableNamePrefix: 'local',
            groupDelayMs: 5,
            maxRetries: 3,
            retryDelayOptions: {
                base: 42,
                customBackoff: function (retryCount) { return 100 * retryCount; }
            }
        });

        expect(dynamoDBWrapper.tableNamePrefix).toBe('local');
        expect(dynamoDBWrapper.groupDelayMs).toBe(5);
        expect(dynamoDBWrapper.maxRetries).toBe(3);
        expect(dynamoDBWrapper.retryDelayOptions.base).toBe(42);
        expect(dynamoDBWrapper.retryDelayOptions.customBackoff).toBeDefined();
    });

    it('should initialize with custom options', () => {
        let dynamoDB = new MockDynamoDB();
        let dynamoDBWrapper = new DynamoDBWrapper(dynamoDB, {
            tableNamePrefix: 'local',
            groupDelayMs: 5,
            maxRetries: 3,
            retryDelayOptions: {
                base: 42,
                customBackoff: function (retryCount) { return 100 * retryCount; }
            }
        });

        expect(dynamoDBWrapper.tableNamePrefix).toBe('local');
        expect(dynamoDBWrapper.groupDelayMs).toBe(5);
        expect(dynamoDBWrapper.maxRetries).toBe(3);
        expect(dynamoDBWrapper.retryDelayOptions.base).toBe(42);
        expect(dynamoDBWrapper.retryDelayOptions.customBackoff).toBeDefined();
    });

    [
        'createTable',
        'updateTable',
        'describeTable',
        'deleteTable',
        'getItem',
        'putItem',
        'updateItem',
        'deleteItem',
        'batchGetItem'
    ].forEach(method => {
        it('should pass ' + method + '() calls straight through to the AWS SDK', testAsync(() => {
            async function test() {
                let params: any = {
                    TableName: 'Test'
                };
                let mock = _setupDynamoDBWrapper();
                let dynamoDB = mock.dynamoDB;
                let dynamoDBWrapper = mock.dynamoDBWrapper;
                dynamoDBWrapper.tableNamePrefix = 'local-';

                spyOn(dynamoDB, <any> method).and.callThrough();
                await dynamoDBWrapper[method](params);

                expect(params.TableName).toBe('local-Test');
                expect(dynamoDB[method]).toHaveBeenCalledWith(params);
            }

            return test();
        }));
    });

    describe('putItem()', () => {

        function _setupPutItemParams(options?): DynamoDB.PutItemInput {
            options = options || {};

            let params: any = {
                TableName: 'Test',
                Item: {
                    MyPartitionKey: { N: '1' }
                }
            };

            if (options.ReturnConsumedCapacity) {
                params.ReturnConsumedCapacity = options.ReturnConsumedCapacity;
            }

            return params;
        }

        it('should put item', testAsync(() => {
            async function test() {
                let params = _setupPutItemParams();
                let mock = _setupDynamoDBWrapper();
                let dynamoDB = mock.dynamoDB;
                let dynamoDBWrapper = mock.dynamoDBWrapper;

                spyOn(dynamoDB, 'putItem').and.callThrough();
                await dynamoDBWrapper.putItem(params);

                expect(dynamoDB.putItem).toHaveBeenCalledWith(params);
            }

            return test();
        }));

        it('should emit a "consumedCapacity" event when a response contains a ConsumedCapacity object', testAsync(() => {
            async function test() {
                let params = _setupPutItemParams({ ReturnConsumedCapacity: 'TOTAL' });
                let mock = _setupDynamoDBWrapper();
                let dynamoDB = mock.dynamoDB;
                let dynamoDBWrapper = mock.dynamoDBWrapper;

                let event = null;

                dynamoDBWrapper.events.on('consumedCapacity', function onConsumedCapacity(e) {
                    event = e;
                });

                await dynamoDBWrapper.putItem(params);

                expect(event).toEqual({
                    method: 'putItem',
                    capacityType: 'WriteCapacityUnits',
                    consumedCapacity: {
                        TableName: 'Test',
                        CapacityUnits: 1
                    }
                });
            }

            return test();
        }));

        it('should retry a failed request (throttled)', testAsync(() => {
            async function test() {
                let params = _setupPutItemParams();
                let mock = _setupDynamoDBWrapper({
                    customResponses: {
                        1: 'ProvisionedThroughputExceededException'
                    }
                });
                let dynamoDB = mock.dynamoDB;
                let dynamoDBWrapper = mock.dynamoDBWrapper;

                spyOn(dynamoDB, 'putItem').and.callThrough();
                await dynamoDBWrapper.putItem(params);

                expect(dynamoDB.putItem).toHaveBeenCalledTimes(2);
            }

            return test();
        }));

        it('should emit a "retry" event when retrying a failed request', testAsync(() => {
            async function test() {
                let params = _setupPutItemParams();
                let mock = _setupDynamoDBWrapper({
                    customResponses: {
                        1: 'ProvisionedThroughputExceededException'
                    }
                });
                let dynamoDB = mock.dynamoDB;
                let dynamoDBWrapper = mock.dynamoDBWrapper;

                let event = null;

                dynamoDBWrapper.events.on('retry', function onRetry(e) {
                    event = e;
                });

                await dynamoDBWrapper.putItem(params);

                expect(event).toEqual({
                    tableName: 'Test',
                    method: 'putItem',
                    retryCount: 1,
                    retryDelayMs: 0
                });
            }

            return test();
        }));

        it('should throw a fatal exception when the maximum number of retries is exceeded', testAsync(() => {
            async function test() {
                let params = _setupPutItemParams();
                let mock = _setupDynamoDBWrapper({
                    customResponses: {
                        1: 'ProvisionedThroughputExceededException',
                        2: 'ProvisionedThroughputExceededException',
                        3: 'ProvisionedThroughputExceededException'
                    }
                });
                let dynamoDB = mock.dynamoDB;
                let dynamoDBWrapper = mock.dynamoDBWrapper;
                dynamoDBWrapper.retryDelayOptions.customBackoff = () => 0;

                spyOn(dynamoDB, 'putItem').and.callThrough();

                let exception;
                try {
                    await dynamoDBWrapper.putItem(params);
                } catch (e) {
                    exception = e;
                }

                expect(dynamoDB.putItem).toHaveBeenCalledTimes(3);
                expect(exception.code).toBe('ProvisionedThroughputExceededException');
                expect(exception.statusCode).toBe(400);
            }

            return test();
        }));

        it('should pass AWS non-retryable errors through', testAsync(() => {
            async function test() {
                let params = _setupPutItemParams();
                let mock = _setupDynamoDBWrapper({
                    customResponses: {
                        1: 'ValidationException'
                    }
                });
                let dynamoDB = mock.dynamoDB;
                let dynamoDBWrapper = mock.dynamoDBWrapper;

                let exception;
                try {
                    await dynamoDBWrapper.putItem(params);
                } catch (e) {
                    exception = e;
                }

                expect(exception.code).toBe('ValidationException');
                expect(exception.statusCode).toBe(400);
            }

            return test();
        }));
    });

    describe('query()', () => {

        function _setupQueryParams(returnConsumedCapacity?: string): DynamoDB.QueryInput {
            let params: any = {
                TableName: 'Test',
                KeyConditionExpression: 'MyPartitionKey = :pk',
                ExpressionAttributeValues: {
                    ':pk': {
                        N: '1'
                    }
                },
                Limit: 2
            };

            if (returnConsumedCapacity) {
                params['ReturnConsumedCapacity'] = returnConsumedCapacity;
            }

            return params;
        }

        it('should query by LastEvaluatedKey to return all pages of data', testAsync(() => {
            async function test() {
                let params = _setupQueryParams();
                let mock = _setupDynamoDBWrapper();
                let dynamoDB = mock.dynamoDB;
                let dynamoDBWrapper = mock.dynamoDBWrapper;

                spyOn(dynamoDB, 'query').and.callThrough();
                let response = await dynamoDBWrapper.query(params);

                expect(dynamoDB.query).toHaveBeenCalledTimes(3);
                expect(response.Items.length).toBe(6);
                expect(response.ConsumedCapacity).not.toBeDefined();
            }

            return test();
        }));

        it('should aggregate consumed capacity (TOTAL) from multiple responses', testAsync(() => {
            async function test() {
                let params = _setupQueryParams('TOTAL');
                let mock = _setupDynamoDBWrapper();
                let dynamoDB = mock.dynamoDB;
                let dynamoDBWrapper = mock.dynamoDBWrapper;

                spyOn(dynamoDB, 'query').and.callThrough();
                let response = await dynamoDBWrapper.query(params);

                expect(dynamoDB.query).toHaveBeenCalledTimes(3);
                expect(response.Items.length).toBe(6);
                expect(response.ConsumedCapacity).toEqual({
                    CapacityUnits: 21,
                    TableName: 'Test'
                });
            }

            return test();
        }));

        it('should aggregate consumed capacity (INDEXES) from multiple responses', testAsync(() => {
            async function test() {
                let params = _setupQueryParams('INDEXES');
                let mock = _setupDynamoDBWrapper();
                let dynamoDB = mock.dynamoDB;
                let dynamoDBWrapper = mock.dynamoDBWrapper;

                spyOn(dynamoDB, 'query').and.callThrough();
                let response = await dynamoDBWrapper.query(params);

                expect(dynamoDB.query).toHaveBeenCalledTimes(3);
                expect(response.Items.length).toBe(6);
                expect(response.ConsumedCapacity).toEqual({
                    CapacityUnits: 21,
                    TableName: 'Test',
                    Table: {
                        CapacityUnits: 6
                    },
                    LocalSecondaryIndexes: {
                        MyLocalIndex: {
                            CapacityUnits: 12
                        }
                    },
                    GlobalSecondaryIndexes: {
                        MyGlobalIndex: {
                            CapacityUnits: 3
                        }
                    }
                });
            }

            return test();
        }));

    });

    describe('scan()', () => {

        function _setupScanParams(returnConsumedCapacity?: string): DynamoDB.QueryInput {
            let params: any = {
                TableName: 'Test',
                KeyConditionExpression: 'MyPartitionKey = :pk',
                ExpressionAttributeValues: {
                    ':pk': {
                        N: '1'
                    }
                },
                Limit: 2
            };

            if (returnConsumedCapacity) {
                params['ReturnConsumedCapacity'] = returnConsumedCapacity;
            }

            return params;
        }

        it('should scan by LastEvaluatedKey to return all pages of data', testAsync(() => {
            async function test() {
                let params = _setupScanParams();
                let mock = _setupDynamoDBWrapper();
                let dynamoDB = mock.dynamoDB;
                let dynamoDBWrapper = mock.dynamoDBWrapper;

                spyOn(dynamoDB, 'scan').and.callThrough();
                let response = await dynamoDBWrapper.scan(params);

                expect(dynamoDB.scan).toHaveBeenCalledTimes(3);
                expect(response.Items.length).toBe(6);
                expect(response.ConsumedCapacity).not.toBeDefined();
            }

            return test();
        }));

        it('should aggregate consumed capacity (TOTAL) from multiple responses', testAsync(() => {
            async function test() {
                let params = _setupScanParams('TOTAL');
                let mock = _setupDynamoDBWrapper();
                let dynamoDB = mock.dynamoDB;
                let dynamoDBWrapper = mock.dynamoDBWrapper;

                spyOn(dynamoDB, 'scan').and.callThrough();
                let response = await dynamoDBWrapper.scan(params);

                expect(dynamoDB.scan).toHaveBeenCalledTimes(3);
                expect(response.Items.length).toBe(6);
                expect(response.ConsumedCapacity).toEqual({
                    CapacityUnits: 21,
                    TableName: 'Test'
                });
            }

            return test();
        }));

        it('should aggregate consumed capacity (INDEXES) from multiple responses', testAsync(() => {
            async function test() {
                let params = _setupScanParams('INDEXES');
                let mock = _setupDynamoDBWrapper();
                let dynamoDB = mock.dynamoDB;
                let dynamoDBWrapper = mock.dynamoDBWrapper;

                spyOn(dynamoDB, 'scan').and.callThrough();
                let response = await dynamoDBWrapper.scan(params);

                expect(dynamoDB.scan).toHaveBeenCalledTimes(3);
                expect(response.Items.length).toBe(6);
                expect(response.ConsumedCapacity).toEqual({
                    CapacityUnits: 21,
                    TableName: 'Test',
                    Table: {
                        CapacityUnits: 6
                    },
                    LocalSecondaryIndexes: {
                        MyLocalIndex: {
                            CapacityUnits: 12
                        }
                    },
                    GlobalSecondaryIndexes: {
                        MyGlobalIndex: {
                            CapacityUnits: 3
                        }
                    }
                });
            }

            return test();
        }));

    });

    describe('batchWriteItem()', () => {

        interface ISetupOpts {
            isMultipleTables?: boolean;
            returnConsumedCapacity?: string;
        }

        function _setupBatchWriteItemParams(opts?: ISetupOpts): DynamoDB.BatchWriteItemInput {
            let params: any = {
                RequestItems: {
                    Test: []
                }
            };

            for (let i = 0; i < 10; i++) {
                params.RequestItems['Test'].push({
                    PutRequest: {
                        Item: {
                            MyPartitionKey: { N: i.toString() }
                        }
                    }
                });
            }

            if (opts && opts.isMultipleTables) {
                params.RequestItems['AnotherTest'] = [];
                for (let i = 0; i < 4; i++) {
                    params.RequestItems['AnotherTest'].push({
                        PutRequest: {
                            Item: {
                                MyPartitionKey: { N: i.toString() }
                            }
                        }
                    });
                }
            }

            if (opts && opts.returnConsumedCapacity) {
                params['ReturnConsumedCapacity'] = opts.returnConsumedCapacity;
            }

            return params;
        }

        it('should throw a NotYetImplemented exception for item collection metrics', testAsync(() => {
            async function test() {
                let mock = _setupDynamoDBWrapper();
                let dynamoDBWrapper = mock.dynamoDBWrapper;
                let params: any = {
                    ReturnItemCollectionMetrics: 'SIZE'
                };

                let exception;
                try {
                    await dynamoDBWrapper.batchWriteItem(params);
                } catch (e) {
                    exception = e;
                }

                expect(exception.code).toBe('NotYetImplementedError');
                expect(exception.message).toBe('ReturnItemCollectionMetrics is supported in the AWS DynamoDB API, ' +
                    'but this capability is not yet implemented by this wrapper library.');
            }

            return test();
        }));

        it('should batch write items with default options', testAsync(() => {
            async function test() {
                let params = _setupBatchWriteItemParams();
                let mock = _setupDynamoDBWrapper();
                let dynamoDB = mock.dynamoDB;
                let dynamoDBWrapper = mock.dynamoDBWrapper;

                spyOn(dynamoDB, 'batchWriteItem').and.callThrough();

                await dynamoDBWrapper.batchWriteItem(params);

                expect(dynamoDB.batchWriteItem).toHaveBeenCalledTimes(1);

            }

            return test();
        }));

        it('should emit batchGroupWritten after processing a group', testAsync(() => {
            async function test() {
                let params = _setupBatchWriteItemParams({
                  isMultipleTables: true
                });
                let mock = _setupDynamoDBWrapper();
                let dynamoDB = mock.dynamoDB;
                let dynamoDBWrapper = mock.dynamoDBWrapper;

                let counts = new Map();
                dynamoDBWrapper.events.on('batchGroupWritten', function onConsumedCapacity(e) {
                    counts.set(e.tableName, e.processedCount);
                });

                await dynamoDBWrapper.batchWriteItem(params);

                expect(counts.size).toEqual(2);
                expect(counts.get('Test')).toEqual(10);
                expect(counts.get('AnotherTest')).toEqual(4);
            }

            return test();
        }));

        it('should batch write items with custom options per table', testAsync(() => {
            async function test() {
                let params = _setupBatchWriteItemParams();
                let mock = _setupDynamoDBWrapper();
                let dynamoDB = mock.dynamoDB;
                let dynamoDBWrapper = mock.dynamoDBWrapper;

                spyOn(dynamoDB, 'batchWriteItem').and.callThrough();

                await dynamoDBWrapper.batchWriteItem(params, {
                    Test: {
                        partitionStrategy: 'EvenlyDistributedGroupWCU',
                        targetGroupWCU: 4
                    }
                });

                expect(dynamoDB.batchWriteItem).toHaveBeenCalledTimes(3);

            }

            return test();
        }));

        it('should batch write items with custom options (legacy for backwards compatibility)', testAsync(() => {
            async function test() {
                let params = _setupBatchWriteItemParams();
                let mock = _setupDynamoDBWrapper();
                let dynamoDB = mock.dynamoDB;
                let dynamoDBWrapper = mock.dynamoDBWrapper;

                spyOn(dynamoDB, 'batchWriteItem').and.callThrough();

                await dynamoDBWrapper.batchWriteItem(params, {
                    partitionStrategy: 'EvenlyDistributedGroupWCU',
                    targetGroupWCU: 4
                });

                expect(dynamoDB.batchWriteItem).toHaveBeenCalledTimes(3);

            }

            return test();
        }));

        it('should retry failed requests when there are UnprocessedItems', testAsync(() => {
            async function test() {
                let params = _setupBatchWriteItemParams();
                let mock = _setupDynamoDBWrapper({
                    customResponses: {
                        1: 'SomeUnprocessedItems'
                    }
                });
                let dynamoDB = mock.dynamoDB;
                let dynamoDBWrapper = mock.dynamoDBWrapper;

                spyOn(dynamoDB, 'batchWriteItem').and.callThrough();

                await dynamoDBWrapper.batchWriteItem(params, {
                    partitionStrategy: 'EqualItemCount',
                    targetItemCount: 10
                });

                expect(dynamoDB.batchWriteItem).toHaveBeenCalledTimes(2);

            }

            return test();
        }));

        it('should return a 200 OK response if some items were unprocessed', testAsync(() => {
            async function test() {
                let params = _setupBatchWriteItemParams();
                let mock = _setupDynamoDBWrapper({
                    customResponses: {
                        1: 'ProvisionedThroughputExceededException',
                        2: 'ProvisionedThroughputExceededException',
                        3: 'SomeUnprocessedItems'
                    }
                });
                let dynamoDB = mock.dynamoDB;
                let dynamoDBWrapper = mock.dynamoDBWrapper;

                spyOn(dynamoDB, 'batchWriteItem').and.callThrough();

                let response = await dynamoDBWrapper.batchWriteItem(params, {
                    partitionStrategy: 'EqualItemCount',
                    targetItemCount: 10
                });

                expect(dynamoDB.batchWriteItem).toHaveBeenCalledTimes(3);
                console.log(JSON.stringify(response, null, 2)); //tslint:disable-line
                expect(response.UnprocessedItems['Test'].length).toEqual(9);
            }

            return test();
        }));

        it('should throw a ProvisionedThroughputExceededException if ALL items are unprocessed', testAsync(() => {
            async function test() {
                let params = _setupBatchWriteItemParams();
                let mock = _setupDynamoDBWrapper({
                    customResponses: {
                        1: 'ProvisionedThroughputExceededException',
                        2: 'ProvisionedThroughputExceededException',
                        3: 'ProvisionedThroughputExceededException'
                    }
                });
                let dynamoDB = mock.dynamoDB;
                let dynamoDBWrapper = mock.dynamoDBWrapper;

                spyOn(dynamoDB, 'batchWriteItem').and.callThrough();

                let exception;
                try {
                    await dynamoDBWrapper.batchWriteItem(params, {
                        partitionStrategy: 'EqualItemCount',
                        targetItemCount: 10
                    });
                } catch (e) {
                    exception = e;
                }

                expect(dynamoDB.batchWriteItem).toHaveBeenCalledTimes(3);
                expect(exception.code).toBe('ProvisionedThroughputExceededException');
                expect(exception.message).toBe('The level of configured provisioned throughput for the table was exceeded. ' +
                    'Consider increasing your provisioning level with the UpdateTable API');
            }

            return test();
        }));

        it('should aggregate consumed capacity (TOTAL) from multiple responses', testAsync(() => {
            async function test() {
                let params = _setupBatchWriteItemParams({
                    returnConsumedCapacity: 'TOTAL'
                });
                let mock = _setupDynamoDBWrapper();
                let dynamoDB = mock.dynamoDB;
                let dynamoDBWrapper = mock.dynamoDBWrapper;

                spyOn(dynamoDB, 'batchWriteItem').and.callThrough();

                let response = await dynamoDBWrapper.batchWriteItem(params, {
                    Test: {
                        partitionStrategy: 'EqualItemCount',
                        targetItemCount: 4
                    }
                });

                expect(dynamoDB.batchWriteItem).toHaveBeenCalledTimes(3);
                expect(response.ConsumedCapacity).toEqual([
                    {
                        CapacityUnits: 60,
                        TableName: 'Test'
                    }
                ]);

            }

            return test();
        }));

        it('should aggregate consumed capacity (INDEXES) from multiple responses', testAsync(() => {
            async function test() {
                let params = _setupBatchWriteItemParams({
                    returnConsumedCapacity: 'INDEXES'
                });
                let mock = _setupDynamoDBWrapper();
                let dynamoDB = mock.dynamoDB;
                let dynamoDBWrapper = mock.dynamoDBWrapper;

                spyOn(dynamoDB, 'batchWriteItem').and.callThrough();

                let response = await dynamoDBWrapper.batchWriteItem(params, {
                    Test: {
                        partitionStrategy: 'EqualItemCount',
                        targetItemCount: 4
                    }
                });

                expect(dynamoDB.batchWriteItem).toHaveBeenCalledTimes(3);
                expect(response.ConsumedCapacity).toEqual([
                    {
                        CapacityUnits: 60,
                        TableName: 'Test',
                        Table: {
                            CapacityUnits: 10
                        },
                        LocalSecondaryIndexes: {
                            MyLocalIndex: {
                                CapacityUnits: 30
                            }
                        },
                        GlobalSecondaryIndexes: {
                            MyGlobalIndex: {
                                CapacityUnits: 20
                            }
                        }
                    }
                ]);

            }

            return test();
        }));

        it('should aggregate consumed capacity (TOTAL) when some requests are throttled', testAsync(() => {
            async function test() {
                let params = _setupBatchWriteItemParams({
                    returnConsumedCapacity: 'TOTAL'
                });
                let mock = _setupDynamoDBWrapper({
                    customResponses: {
                        1: 'SomeUnprocessedItems'
                    }
                });
                let dynamoDB = mock.dynamoDB;
                let dynamoDBWrapper = mock.dynamoDBWrapper;

                spyOn(dynamoDB, 'batchWriteItem').and.callThrough();

                let response = await dynamoDBWrapper.batchWriteItem(params, {
                    partitionStrategy: 'EqualItemCount',
                    targetItemCount: 10
                });

                expect(dynamoDB.batchWriteItem).toHaveBeenCalledTimes(2);
                expect(response.ConsumedCapacity).toEqual([
                    {
                        CapacityUnits: 60,
                        TableName: 'Test'
                    }
                ]);

            }

            return test();
        }));

        it('should support batch writing to multiple tables', testAsync(() => {
            async function test() {
                let params = _setupBatchWriteItemParams({
                    isMultipleTables: true,
                    returnConsumedCapacity: 'INDEXES'
                });
                let mock = _setupDynamoDBWrapper();
                let dynamoDB = mock.dynamoDB;
                let dynamoDBWrapper = mock.dynamoDBWrapper;

                spyOn(dynamoDB, 'batchWriteItem').and.callThrough();

                let response = await dynamoDBWrapper.batchWriteItem(params, {
                    Test: {
                        partitionStrategy: 'EqualItemCount',
                        targetItemCount: 6
                    },
                    AnotherTest: {
                        partitionStrategy: 'EqualItemCount',
                        targetItemCount: 1
                    }
                });

                expect(dynamoDB.batchWriteItem).toHaveBeenCalledTimes(2 + 4);
                expect(response.ConsumedCapacity).toEqual([
                    {
                        CapacityUnits: 60,
                        TableName: 'Test',
                        Table: {
                            CapacityUnits: 10
                        },
                        LocalSecondaryIndexes: {
                            MyLocalIndex: {
                                CapacityUnits: 30
                            }
                        },
                        GlobalSecondaryIndexes: {
                            MyGlobalIndex: {
                                CapacityUnits: 20
                            }
                        }
                    },
                    {
                        CapacityUnits: 24,
                        TableName: 'AnotherTest',
                        Table: {
                            CapacityUnits: 4
                        },
                        LocalSecondaryIndexes: {
                            MyLocalIndex: {
                                CapacityUnits: 12
                            }
                        },
                        GlobalSecondaryIndexes: {
                            MyGlobalIndex: {
                                CapacityUnits: 8
                            }
                        }
                    }
                ]);

            }

            return test();
        }));

    });

});
