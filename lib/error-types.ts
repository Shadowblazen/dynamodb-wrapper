export const DynamoDBWrapperErrorCode = {
    ProvisionedThroughputExceededException: 'ProvisionedThroughputExceededException',
    NotYetImplementedError: 'NotYetImplementedError'
};

export const DynamoDBWrapperErrorMessage = {
    ProvisionedThroughputExceededException: 'The level of configured provisioned throughput for the table was exceeded.' +
        ' Consider increasing your provisioning level with the UpdateTable API',
    BatchWriteMultipleTables: 'Expected exactly 1 table name in RequestItems, but found 0 or 2+.' +
        ' Writing to more than 1 table with BatchWriteItem is supported in the AWS DynamoDB API,' +
        ' but this capability is not yet implemented by this wrapper library.',
    BatchWriteDeleteRequest: 'DeleteRequest in BatchWriteItem is supported in the AWS DynamoDB API,' +
        ' but this capability is not yet implemented by this wrapper library.',
    ItemCollectionMetrics: 'ReturnItemCollectionMetrics is supported in the AWS DynamoDB API,' +
        ' but this capability is not yet implemented by this wrapper library.'
};

export class DynamoDBWrapperException {
    public code: string;
    public message: string;
    public statusCode: number;
    public time: string;
    public retryable: boolean;
    public retryDelay: number;

    constructor(code: string, message: string) {
        this.code = code;
        this.message = message;
        this.statusCode = 400;
        this.time = new Date().toISOString();
        this.retryable = false;
        this.retryDelay = 0;
    }
}