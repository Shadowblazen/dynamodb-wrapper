import {
    ErrorCode,
    ErrorMessage,
    Exception
} from './error-types';

describe('lib/error-types', () => {

    it('should define error codes', () => {
        expect(ErrorCode).toEqual({
            ProvisionedThroughputExceededException: 'ProvisionedThroughputExceededException',
            NotYetImplementedError: 'NotYetImplementedError'
        });
    });

    it('should define error messages', () => {
        expect(ErrorMessage).toEqual({
            ProvisionedThroughputExceededException: 'The level of configured provisioned throughput for the table was exceeded.' +
            ' Consider increasing your provisioning level with the UpdateTable API',
            BatchWriteMultipleTables: 'Expected exactly 1 table name in RequestItems, but found 0 or 2+.' +
            ' Writing to more than 1 table with BatchWriteItem is supported in the AWS DynamoDB API,' +
            ' but this capability is not yet implemented by this wrapper library.',
            BatchWriteDeleteRequest: 'DeleteRequest in BatchWriteItem is supported in the AWS DynamoDB API,' +
            ' but this capability is not yet implemented by this wrapper library.',
            ItemCollectionMetrics: 'ReturnItemCollectionMetrics is supported in the AWS DynamoDB API,' +
            ' but this capability is not yet implemented by this wrapper library.'
        });
    });

    it('should create an exception', () => {
        let code = ErrorCode.NotYetImplementedError;
        let message = ErrorMessage.ItemCollectionMetrics;

        let e = new Exception(code, message);

        expect(e.code).toBe(code);
        expect(e.message).toBe(message);
        expect(e.statusCode).toBe(400);
        expect(e.time).toBeDefined();
        expect(e.retryable).toBe(false);
        expect(e.retryDelay).toBe(0);
    });

});