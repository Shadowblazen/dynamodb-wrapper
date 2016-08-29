## What is dynamodb-wrapper?

- **Enhanced AWS SDK:** A lightweight wrapper that extends the AWS JavaScript SDK for DynamoDB
- **Bulk read/write:** Easily transmit large amounts of data from/to DynamoDB

## Installing

```
npm install dynamodb-wrapper
```

## Usage

### Construct the DynamoDBWrapper class

```js
// require npm dependencies
var AWS = require('aws-sdk');
var DynamoDBWrapper = require('dynamodb-wrapper');

// construct the AWS SDK's DynamoDB object
var dynamoDB = new AWS.DynamoDB();

// construct the DynamoDBWrapper object
var dynamoDBWrapper = new DynamoDBWrapper(dynamoDB, {
    // see the Configuration section of the README for more info
    batchWaitMs: 200,
    maxRetries: 6
    retryDelayOptions: {
        base: 100
    }
});
```

### Example: Bulk Read

*Export large sets of data from DynamoDB tables.*

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

// The AWS SDK's query() and scan() methods only return 1 page of data at a time - if you want all pages
// aggregated you have to use LastEvaluatedKey and make multiple requests, which comes with the complexity
// of handling a series of asychronous calls, errors from individual requests, and aggregation
// of all pages of data when all the responses come back successfully.

// DynamoDBWrapper.query() or DynamoDBWrapper.scan() will handle all of that for you.
// When the promise resolves/rejects, you'll get a single response with all pages of data.
// If an error occurs with an individual request, the promise rejects immediately.

dynamoDBWrapper.query(sampleQueryParams)
    .then(function (response) {
        console.log(response.Items);
    })
    .catch(function (err) {
        console.error(err);
    });
```

### Example: Bulk Write

*Insert large collections of items into DynamoDB tables with minimal effort.*

@see http://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_BatchWriteItem.html

```js
// params for BatchWriteItem - same format as in the AWS SDK, but the array can be larger than 25 items
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
            // this array can have thousands of items ...
        ]
    }
};

// The AWS SDK's batchWriteItem() method has a limit of 25 items - if you want to write more than that
// you have to partition your items into groups and make multiple requests, which comes with
// the complexity of handling a series of asynchronous calls and errors coming from individual requests.

// Not only that, but if your items are of unknown and/or variable size (in WCU) and you take the naive approach of
// writing 25 items per request, you will have throughput spikes as your requests consume throughput
// unpredictably or unevenly. This may cause undesirable side-effects such as request failure due to throttling,
// the consumption of reserve capacity, and/or CloudWatch alarms to be triggered.

// DynamoDBWrapper.batchWriteItem() strives to improve this behavior. In the following example,
// the size (in WCU) of each item will be estimated. This estimate will be used to partition the array
// into variable-length groups whose items sum to approximately 50 total WCU. Then, these groups will be written
// sequentially at a rate of 1 request per 1000 ms.

// In other words, if you have a table with 50 WriteCapacityUnits of available throughput, this configuration would
// evenly distribute items to make predictable, optimal use of available throughput with minimal spikes.

var dynamoDBWrapper = new DynamoDBWrapper(dynamoDB, {
    batchWaitMs: 1000
});

dynamoDBWrapper.batchWriteItem(sampleParams, {
    partitionStrategy: 'EvenlyDistributedGroupWCU',
    targetGroupWCU: 50
})
    .then(function (response) {
        console.log(response);
    })
    .catch(function (err) {
        console.error(err);
    });
```

## Configuration

*This section is copied from the `IDynamoDBWrapperOptions` interface in the `index.d.ts` file.*

The `DynamoDBWrapper` constructor accepts an optional configuration object with the following properties:
- `batchWaitMs` (number) - `query()`, `scan()`, and `batchWriteItem()` make multiple requests when necessary; This setting is the delay (in millseconds) between individual requests made by these operations.
- `maxRetries` (number) - The maximum amount of retries to attempt with a request. Note: this property is identical to the one described in [the AWS documentation](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#constructor-property).
- `retryDelayOptions` (object) - A set of options to configure the retry delay on retryable errors. Note: this property is identical to the one described in [the AWS documentation](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#constructor-property). Currently supported options are:
    - `base` (number) - The base number of milliseconds to use in the exponential backoff for operation retries. Defaults to 100 ms.
    - `customBackoff` (Function) - A custom function that accepts a retry count and returns the amount of time to delay in milliseconds. The `base` option will be ignored if this option is supplied.

## Roadmap

- **Bulk Delete:** Support `DeleteRequest` in `batchWriteItem()` for bulk delete operations.
- **Event Hooks:** Use an EventEmitter to hook into events for logging and visibility
    - "retry" - get notified when a request is throttled and retried, so that you can log it or increase table throughput
- **Table Prefixes:** Configuration-drive table prefixes for users or companies that want to have multiple copies of the same table
    - Example: if you have dev and staging environments in the same AWS Account, DynamoDBWrapper can automatically add the prefix to requests and strip it from responses so that you can interact with "dev-MyTable" and "stg-MyTable" without writing extra code in your application
- **Streams:** Add method signatures that return Streams (instead of Promises), allowing for better integration ecosystems such as gulp