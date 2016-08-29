## What is dynamodb-wrapper?

- **Enhanced AWS SDK:** A lightweight wrapper that enhances the functionality of the AWS JavaScript SDK for DynamoDB
- **Bulk read/write:** Easily transmit large amounts of data from/to DynamoDB

## Installing

```
npm install dynamodb-wrapper
```

## Usage

### Construct DynamoDBWrapper class

```js
// require npm dependencies
var AWS = require('aws-sdk');
var DynamoDBWrapper = require('dynamodb-wrapper');

// construct the AWS DynamoDB object
var dynamoDB = new AWS.DynamoDB();

// optional configuration for DynamoDBWrapper, see the Configuration section of the README for more info
var config = {
    batchWaitMs: 200,
    maxRetries: 6
    retryDelayOptions: {
        base: 100
    }
}

// construct the dynamodb-wrapper object, passing it the AWS DynamoDB object
var dynamoDBWrapper = new DynamoDBWrapper(dynamoDB, config);
```

### Bulk read example

```js
// params for Query - same format as AWS SDK
var sampleQueryParams = {
    TableName: 'MyTable',
    KeyConditionExpression: 'MyPartitionKey = :pk',
    ExpressionAttributeValues: {
        ':pk': {
            N: '1'
        }
    }
};

// query() and scan() responses come back with all pages of data aggregated
// compare to AWS SDK which only returns 1 page of data at a time, if you want ALL pages aggregated
// you have to use LastEvaluatedKey and make multiple requests - DynamoDBWrapper handles this for you

dynamoDBWrapper.query(sampleQueryParams)
    .then(function (response) {
        console.log(response.Items);
    })
    .catch(function (err) {
        console.error(err);
    });
```

### Bulk write example

```js
// params for BatchWriteItem - same format as AWS SDK, but array can be larger than 25 items!
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
            // and so on ...
        ]
    }
};

// Easily bulk write a large array of items
// compare to AWS SDK which has a limit of 25 items, if you want to write more than 25 items
// you have to partition into groups, make multiple requests, and handle the asynchronous
// code (and any errors) for the individual requests - DynamoDBWrapper handles this for you

dynamoDBWrapper.batchWriteItem(sampleParams)
    .then(function (response) {
        console.log(response);
    })
    .catch(function (err) {
        console.error(err);
    });
```

## Configuration

The `DynamoDBWrapper` constructor accepts an optional configuration object with the following properties:
- `batchWaitMs` (number) - The DynamoDBWrapper methods query(), scan(), and batchWriteItem() make multiple requests when necessary; This setting is the delay (in millseconds) between individual requests made by these operations.
- `maxRetries` (number) - The maximum amount of retries to attempt with a request. (Note: this property is identical to the one described in [the AWS documentation](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#constructor-property))
- `retryDelayOptions` (object) - A set of options to configure the retry delay on retryable errors. (Note: this property is identical to the one described in [the AWS documentation](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#constructor-property)) Currently supported options are:
    - `base` (number) - The base number of milliseconds to use in the exponential backoff for operation retries. Defaults to 100 ms.
    - `customBackoff` (Function) - A custom function that accepts a retry count and returns the amount of time to delay in milliseconds. The `base` option will be ignored if this option is supplied.

## Roadmap
- **Events:** Use an EventEmitter to hook into events for logging and visibility
    - "retry" - get notified when a request is throttled and retried, so that you can log it or increase table throughput
- **Table prefixes:** Configuration-drive table prefixes for users or companies that want to have multiple copies of the same table
    - Example: if you have dev and staging environments in the same AWS Account, easily interact with "dev-MyTable" or "stg-MyTable" without writing extra code in your application
- **Streams:** A version of this library built on streams, allowing for easier integration other ecosystems such as gulp