## What is dynamodb-wrapper?

- **Enhanced AWS SDK:** Public interface closely resembles the AWS SDK, making it easier to learn and use.
- **Bulk I/O:** Easily read, write or delete entire collections of items in DynamoDB with a single API call.
- **Table prefixes:** If you have multiple environments in the same AWS Account (e.g. "dev-MyTable" and "stage-MyTable"), give DynamoDBWrapper a table prefix and it will automatically prepend it to all requests and remove it from all responses - so that you don't have to think about prefixes in your application.

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
- `tableNamePrefix` (string) - A prefix to add to all requests and remove from all responses.
- `groupDelayMs` (number) - The delay (in millseconds) between individual requests made `query()`, `scan()`, and `batchWriteItem()`. Defaults to 100 ms.
- `maxRetries` (number) - The maximum amount of retries to attempt with a request. Note: this property is identical to the one described in [the AWS documentation](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#constructor-property).
- `retryDelayOptions` (object) - A set of options to configure the retry delay on retryable errors. Note: this property is identical to the one described in [the AWS documentation](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#constructor-property). Currently supported options are:
    - `base` (number) - The base number of milliseconds to use in the exponential backoff for operation retries. Defaults to 100 ms.
    - `customBackoff` (Function) - A custom function that accepts a retry count and returns the amount of time to delay in milliseconds. The `base` option will be ignored if this option is supplied.

## API

The `DynamoDBWrapper` class supports the following methods, which are wrappers around the AWS SDK method of the same name. Please refer to the AWS [API documentation](http://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Operations.html) and [JavaScript SDK documentation](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html) for more details:

- `getItem(params)` - Gets a single item from DynamoDB
- `updateItem(params)` - Updates a single item in DynamoDB
- `putItem(params)` - Puts a single item into DynamoDB
- `deleteItem(params)` - Deletes a single item from DynammoDB
- `query(params, options)` - Fetches all pages of data from a DynamoDB query, making multiple requests and aggregating responses when necessary.
    - `options.groupDelayMs` (number) - the delay between individual requests. Overrides the configuration property of the same name in the constructor. Defaults to 100 ms.
- `scan(params, options)` - Fetches all pages of data from a DynamoDB scan, making multiple requests and aggregating responses when necessary.
    - `options.groupDelayMs` (number) - the delay between individual requests. Overrides the configuration property of the same name in the constructor. Defaults to 100 ms.
- `batchWriteItem(params, options)` - Writes or deletes large collections of items in a single DynamoDB table, batching items and making multiple requests when necessary.
    - `options.groupDelayMs` (number) - the delay between individual requests. Overrides the configuration property of the same name in the constructor. Defaults to 100 ms.
    - `options.partitionStrategy` (string) - strategy to use when partitioning the write requests array:
        - `'EqualItemCount'` - creates groups with an equal number of items.
        - `'EvenlyDistributedGroupWCU'` - creates groups with equalized total WCU, allowing for variable item counts.
    - `options.targetItemCount` (number) - the number of items to put in each group when using the *EqualItemCount* partition strategy.
    - `options.targetGroupWCU` (number) - the total WCU for each group in the *EvenlyDistributedGroupWCU* partition strategy.

## Roadmap

- **BatchGetItem:** Add support for `BatchGetItem` as part of the "Bulk Read" feature set.
- **Event Hooks:** Use an EventEmitter to hook into events for logging and visibility
    - "read" - be notified whenever a request consumes read throughput, so that you can log it or adjust configured throughput levels
    - "write" - be notified whenever a request consumes write throughput, so that you can log it or adjust configured throughput levels
    - "retry" - be notified when a request is retried due to throttling, so that you can log it or increase configured throughput levels
- **Streams:** Add method signatures that return Streams (instead of Promises), allowing for better integration ecosystems such as gulp
