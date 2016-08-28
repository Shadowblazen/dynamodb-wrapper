module.exports = {
    DynamoDBWrapper: require('./bin/prod/dynamodb-wrapper').DynamoDBWrapper,
    estimateItemSize: require('./bin/prod/estimate-item-size').estimateItemSize
};