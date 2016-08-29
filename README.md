## What is dynamodb-wrapper?

- **Enhanced AWS SDK:** A lightweight wrapper that extends the AWS JavaScript SDK for DynamoDB
- **Bulk I/O:** Easily read, write or delete entire collections of items in DynamoDB with a single API call.
- **Table Prefixes:** If you have multiple environments in the same AWS Account (e.g. "dev-MyTable" and "stage-MyTable"), give DynamoDBWrapper a table prefix and it will automatically prepend it to all requests and remove it from all responses - so that you don't have to think about prefixes in your application.

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
    groupDelayMs: 200,
    maxRetries: 6,
    retryDelayOptions: {
        base: 100
    }
});
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
// or rejects immediately if an error occurrs

dynamoDBWrapper.query(sampleQueryParams)
    .then(function (response) {
        console.log(response.Items);
    })
    .catch(function (err) {
        console.error(err);
    });
```

### Example: Bulk Write/Delete

Insert or delete large collections of items in a DynamoDB table with a single API call. DynamoDBWrapper automatically batches your requests and aggregates the results into a single response.

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
        ]
    }
};

// performs all Puts/Deletes in the array
// promise resolves when all items are written successfully,
// or rejects immediately if an error occurs

dynamoDBWrapper.batchWriteItem(sampleParams, {
    partitionStrategy: 'EvenlyDistributedGroupWCU',
    targetGroupWCU: 50,
    groupDelayMs: 1000
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
- `groupDelayMs` (number) - `query()`, `scan()`, and `batchWriteItem()` make multiple requests when necessary. This setting is the delay (in millseconds) between individual requests made by these operations.
- `maxRetries` (number) - The maximum amount of retries to attempt with a request. Note: this property is identical to the one described in [the AWS documentation](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#constructor-property).
- `retryDelayOptions` (object) - A set of options to configure the retry delay on retryable errors. Note: this property is identical to the one described in [the AWS documentation](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#constructor-property). Currently supported options are:
    - `base` (number) - The base number of milliseconds to use in the exponential backoff for operation retries. Defaults to 100 ms.
    - `customBackoff` (Function) - A custom function that accepts a retry count and returns the amount of time to delay in milliseconds. The `base` option will be ignored if this option is supplied.

## Roadmap

- **BatchGetItem:** Add support for `BatchGetItem` as part of the "Bulk Read" feature set.
- **Event Hooks:** Use an EventEmitter to hook into events for logging and visibility
    - "retry" - get notified when a request is throttled and retried, so that you can log it or increase table throughput
- **Streams:** Add method signatures that return Streams (instead of Promises), allowing for better integration ecosystems such as gulp
