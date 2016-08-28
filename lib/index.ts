import { DynamoDBWrapper } from './dynamodb-wrapper';
import { estimateItemSize } from './estimate-item-size';

module.exports = {
    DynamoDBWrapper: DynamoDBWrapper,
    estimateItemSize: estimateItemSize
};