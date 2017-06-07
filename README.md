[![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Coverage Status][coveralls-image]][coveralls-url] [![License][license-image]][license-url]

[npm-image]: https://img.shields.io/npm/v/dynamodb-wrapper.svg
[npm-url]: https://www.npmjs.com/package/dynamodb-wrapper

[travis-image]: https://img.shields.io/travis/Shadowblazen/dynamodb-wrapper.svg
[travis-url]: https://travis-ci.org/Shadowblazen/dynamodb-wrapper

[coveralls-image]: https://img.shields.io/coveralls/Shadowblazen/dynamodb-wrapper.svg
[coveralls-url]: https://coveralls.io/github/Shadowblazen/dynamodb-wrapper?branch=master

[license-image]: https://img.shields.io/npm/l/dynamodb-wrapper.svg
[license-url]: https://opensource.org/licenses/MIT

## What is dynamodb-wrapper?

- **Enhanced AWS SDK:** Public interface closely resembles the AWS SDK, making it easier to learn and use.
- **Bulk I/O:** Easily read, write or delete entire collections of items in DynamoDB with a single API call.
- **Events:** Add event hooks to be notified of important events, such as whenever read/write capacity is consumed, or requests are retried due to throttling.
- **Table prefixes:** DynamoDBWrapper can add a table name prefix in requests and remove it in responses. This is helpful if you have multiple environments within the same AWS Account and region.

## Installing

```
npm install dynamodb-wrapper
```

## Usage

### Setup

Construct the DynamoDBWrapper class

```js
var AWS = require('aws-sdk');
var DynamoDBWrapper = require('dynamodb-wrapper');

var dynamoDB = new AWS.DynamoDB({
    // optionally disable AWS retry logic - reasoning explained below
    maxRetries: 0
});

// see the Configuration section of the README for more options
var dynamoDBWrapper = new DynamoDBWrapper(dynamoDB, {
    // optionally enable DynamoDBWrapper retry logic
    maxRetries: 6,
    retryDelayOptions: {
        base: 100
    }
});
```

*(Optional)* If you use DynamoDBWrapper retry logic instead of AWS retry logic, you gain the following benefits:

1. Improved batch processing: DynamoDBWrapper will automatically retry any *UnprocessedItems* in your `batchWriteItem` requests.
2. You can add a `retry` event listener to be notified when requests are throttled. In your application, you can log these events, or even respond by increasing provisioned throughput on the affected table.
3. DynamoDBWrapper's `retryDelayOptions` actually work as documented (this functionality doesn't work in the AWS JavaScript SDK yet, but there's an [open ticket for this feature request](https://github.com/aws/aws-sdk-js/issues/1100)).

```
dynamoDBWrapper.events.on('retry', function (e) {
    console.log(
        'An API call to DynamoDB.' + e.method + '() acting on table ' +
        e.tableName + ' was throttled. Retry attempt #' + e.retryCount +
        ' will occur after a delay of ' + e.retryDelayMs + 'ms.'
    );
});

// An API call to DynamoDB.batchWriteItem() acting on table MyTable
// was throttled. Retry attempt #3 will occur after a delay of 800ms.
```

*(Optional)* If you use the `ReturnConsumedCapacity` property in your AWS requests, the `consumedCapacity` event listener can notify you whenever read/write capacity is consumed. 

```
dynamoDBWrapper.events.on('consumedCapacity', function (e) {
    console.log(
        'An API call to DynamoDB.' + e.method + '() consumed ' +
        e.capacityType, JSON.stringify(e.consumedCapacity, null, 2)
    );
});

// An API call to DynamoDB.batchWriteItem() consumed WriteCapacityUnits
// [
//   {
//     "TableName": "MyTable",
//     "CapacityUnits": 20
//   }
// ]
```

### Example: Bulk Read

Read large collections of data from a DynamoDB table with a single API call. Multiple pages of data are aggregated and returned in a single response.

@see http://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html

```js
// params for Query - same format as in the AWS SDK
var sampleQueryParams = {
    TableName: 'MyTable',
    KeyConditionExpression: 'MyPartitionKey = :pk',
    ExpressionAttributeValues: {
        ':pk': {
            N: '1'
        }
    }
};

// fetches all pages of data from DynamoDB
// promise resolves with the aggregation of all pages,
// or rejects immediately if an error occurs

dynamoDBWrapper.query(sampleQueryParams)
    .then(function (response) {
        console.log(response.Items);
    })
    .catch(function (err) {
        console.error(err);
    });
```

### Example: Bulk Write/Delete

Insert or delete large collections of items in one or more DynamoDB tables with a single API call. DynamoDBWrapper batches your requests and aggregates the results into a single response. Use configuration values to fine tune throughput consumption for your use case.

@see http://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_BatchWriteItem.html

```js
// params for BatchWriteItem - same format as in the AWS SDK
var sampleParams = {
    RequestItems: {
        MyTable: [
            {
                PutRequest: {
                    Item: {
                        MyPartitionKey: { N: '1' }
                    }
                }
            },
            {
                DeleteRequest: {
                    Key: {
                        MyPartitionKey: { N: '2' }
                    }
                }
            },
            // this array can have thousands of items ...
        ],
        AnotherTable: [
            {
                PutRequest: {
                    Item: {
                        User: { S: 'Batman' }
                    }
                }
            },
            {
                DeleteRequest: {
                    Key: {
                        User: { S: 'Superman' }
                    }
                }
            },
            // this array can have thousands of items ...
        ]
    }
};

// performs all Puts/Deletes in the array
// promise resolves when all items are written successfully,
// or rejects immediately if an error occurs

dynamoDBWrapper.batchWriteItem(sampleParams, {
    // use configuration to control and optimize throughput consumption

    // write 10 items to MyTable every 500 milliseconds
    // this strategy is best if you have known, consistent item sizes
    MyTable: {
        partitionStrategy: 'EqualItemCount',
        targetItemCount: 10,
        groupDelayMs: 500
    }

    // write up to 50 WCU of data to AnotherTable every 1000 milliseconds
    // this strategy is best if you have unknown or variable item sizes,
    // because it evenly distributes the items across requests so as
    // to minimize throughput spikes (which can cause throttling)
    AnotherTable: {
        partitionStrategy: 'EvenlyDistributedGroupWCU',
        targetGroupWCU: 50,
        groupDelayMs: 1000
    }
})
    .then(function (response) {
        console.log(response);
    })
    .catch(function (err) {
        console.error(err);
    });
```

### Example: Table Prefixes

You may wish to work with duplicate copies of the same set of tables. For example: "dev-MyTable" and "stg-MyTable" if you have dev and stage environments under the same AWS account. DynamoDBWrapper supports this use-case via a configuration-driven `tableNamePrefix` option.

```js
// load this "environment" variable from a config file
// so it will have different values per environment
// we'll just use dev for this example

var environment = 'dev-';

// Configure DynamoDBWrapper with the environment-specific prefix
// Note: we only do this here in one place; there's no need to
// sprinkle the prefix throughout your codebase.

var AWS = require('aws-sdk');
var DynamoDBWrapper = require('dynamodb-wrapper');
var dynamoDB = new AWS.DynamoDB();
var dynamoDBWrapper = new DynamoDBWrapper(dynamoDB, {
    tableNamePrefix: environment
});

// Create the table like usual...

dynamoDBWrapper.createTable({
    TableName: 'MyTable',
    // more params...
});

// The new table will be named "dev-MyTable" instead of "MyTable"
// This works with all the other API methods too.

var promise = dynamoDBWrapper.getItem({
    TableName: 'MyTable',
    ReturnConsumedCapacity: 'TOTAL',
    // more params...
});

// Although the real table name in AWS DynamoDB is "dev-MyTable",
// the prefix will be stripped from the response for transparency:

promise.then(function (response) {
    console.log(response);
});

// {
//   ConsumedCapacity: {
//     TableName: 'MyTable', // <-- no prefix in the response
//     CapacityUnits: 1
//   },
//   Item: { ... }
// }

// In summary: the prefix is prepended to all requests
// and stripped from all responses
```

## Configuration

*This section is copied from the `IDynamoDBWrapperOptions` interface in the `index.d.ts` file.*

The `DynamoDBWrapper` constructor accepts an optional configuration object with the following properties:
- `tableNamePrefix` (string) - A prefix to add to all requests and remove from all responses.
- `groupDelayMs` (number) - The delay (in millseconds) between individual requests made by `query()`, `scan()`, and `batchWriteItem()`. Defaults to 100 ms.
- `maxRetries` (number) - The maximum amount of retries to attempt with a request. Note: this property is identical to the one described in [the AWS documentation](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#constructor-property).
- `retryDelayOptions` (object) - A set of options to configure the retry delay on retryable errors. Note: this property is identical to the one described in [the AWS documentation](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#constructor-property). Currently supported options are:
    - `base` (number) - The base number of milliseconds to use in the exponential backoff for operation retries. Defaults to 100 ms.
    - `customBackoff` (Function) - A custom function that accepts a retry count and returns the amount of time to delay in milliseconds. The `base` option will be ignored if this option is supplied.

## API

The `DynamoDBWrapper` class supports a Promise-based API with the following methods. These are wrappers around the AWS SDK method of the same name. Please refer to the AWS [API documentation](http://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Operations.html) and [JavaScript SDK documentation](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html) for more details:

The following methods are passed straight through to the AWS JavaScript SDK:

- `createTable(params)`
- `updateTable(params)`
- `describeTable(params)`
- `deleteTable(params)`
- `getItem(params)`
- `updateItem(params)`
- `putItem(params)`
- `deleteItem(params)`

## Enhanced API methods

The following API methods have enhanced behavior to support bulk I/O:

- `query(params, options)` - Fetches all pages of data from a DynamoDB query, making multiple requests and aggregating responses when necessary.
    - `options.groupDelayMs` (number) - the delay between individual requests. Overrides the configuration property of the same name in the constructor. Defaults to 100 ms.
- `scan(params, options)` - Fetches all pages of data from a DynamoDB scan, making multiple requests and aggregating responses when necessary.
    - `options.groupDelayMs` (number) - the delay between individual requests. Overrides the configuration property of the same name in the constructor. Defaults to 100 ms.
- `batchWriteItem(params, options)` - Writes or deletes large collections of items in multiple DynamoDB tables, batching items and making multiple requests when necessary.
    - `options` is a mapping of table names to option hashes. Each option hash may have the following properties:
        - `groupDelayMs` (number) - the delay between individual requests. Overrides the configuration property of the same name in the constructor. Defaults to 100 ms.
        - `partitionStrategy` (string) - strategy to use when partitioning the write requests array. Possible values: *EqualItemCount* or *EvenlyDistributedGroupWCU*.
        - `targetItemCount` (number) - the number of items to put in each group when using the *EqualItemCount* partition strategy.
        - `targetGroupWCU` (number) - the size threshold (in WriteCapacityUnits) of each group when using the *EvenlyDistributedGroupWCU* partition strategy.

## Roadmap

- **Streams:** Add method signatures that return Streams (instead of Promises), allowing for better integration ecosystems such as gulp
