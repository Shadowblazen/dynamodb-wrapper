declare module "dynamodb-wrapper" {

    // ------------------------------------------------------------------------
    // DynamoDBWrapper public API
    // ------------------------------------------------------------------------

    export class DynamoDBWrapper {
        constructor(dynamoDB: any, options?: DynamoDBWrapper.IDynamoDBWrapperOptions);
        getItem(params: DynamoDBWrapper.GetItemInput): Promise<DynamoDBWrapper.GetItemOutput>;
        updateItem(params: DynamoDBWrapper.UpdateItemInput): Promise<DynamoDBWrapper.UpdateItemOutput>;
        putItem(params: DynamoDBWrapper.PutItemInput): Promise<DynamoDBWrapper.PutItemOutput>;
        deleteItem(params: DynamoDBWrapper.DeleteItemInput): Promise<DynamoDBWrapper.DeleteItemOutput>;
        query(params: DynamoDBWrapper.QueryInput): Promise<DynamoDBWrapper.QueryOutput>;
        scan(params: DynamoDBWrapper.ScanInput): Promise<DynamoDBWrapper.ScanOutput>;
        batchWriteItem(params: DynamoDBWrapper.BatchWriteItemInput, options?: DynamoDBWrapper.IBatchWriteItemOptions): Promise<DynamoDBWrapper.BatchWriteItemOutput>;
    }

    export module DynamoDBWrapper {

        export interface IDynamoDBWrapperOptions {

            // A prefix to add to all requests and remove from all responses.
            tableNamePrefix?: string;

            // The DynamoDBWrapper methods query(), scan(), and batchWriteItem() make multiple requests when necessary.
            // This setting is the delay (in millseconds) between individual requests made by these operations.
            groupDelayMs?: number;

            // The maximum amount of retries to attempt with a request.
            // @see http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#constructor-property
            maxRetries?: number;

            // A set of options to configure the retry delay on retryable errors. Currently supported options are:
            // @see http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#constructor-property
            retryDelayOptions?: {
                // The base number of milliseconds to use in the exponential backoff for operation retries. Defaults to 100 ms.
                base?: number;
                // A custom function that accepts a retry count and returns the amount of time to delay in milliseconds.
                // The base option will be ignored if this option is supplied.
                customBackoff?: Function;
            };

        }

        export interface IBatchWriteItemOptions {
            partitionStrategy?: 'EqualItemCount' | 'EvenlyDistributedGroupWCU';
            targetItemCount?: number;
            targetGroupWCU?: number;
            groupDelayMs?: number;
        }

        export interface IQueryOptions {
            groupDelayMs?: number;
        }

        export interface IScanOptions {
            groupDelayMs?: number;
        }

        // ------------------------------------------------------------------------
        // Copy/pasted from aws-dynamodb.d.ts
        // ------------------------------------------------------------------------

        export type AttributeAction = string;
        export type AttributeDefinitions = AttributeDefinition[];
        export type AttributeMap = {[key: string]: AttributeValue};
        export type AttributeName = string;    // max: 65535
        export type AttributeNameList = AttributeName[];    // min: 1
        export type AttributeUpdates = {[key: string]: AttributeValueUpdate};
        export type AttributeValueList = AttributeValue[];
        export type Backfilling = boolean;
        export type BatchGetRequestMap = {[key: string]: KeysAndAttributes};    // max: 100, min: 1
        export type BatchGetResponseMap = {[key: string]: ItemList};
        export type BatchWriteItemRequestMap = {[key: string]: WriteRequests};    // max: 25, min: 1
        export type BinaryAttributeValue = any;    // type: blob
        export type BinarySetAttributeValue = BinaryAttributeValue[];
        export type BooleanAttributeValue = boolean;
        export type BooleanObject = boolean;
        export type ComparisonOperator = string;
        export type ConditionExpression = string;
        export type ConditionalOperator = string;
        export type ConsistentRead = boolean;
        export type ConsumedCapacityMultiple = ConsumedCapacity[];
        export type ConsumedCapacityUnits = number;
        export type Date = number;
        export type ErrorMessage = string;
        export type ExpectedAttributeMap = {[key: string]: ExpectedAttributeValue};
        export type ExpressionAttributeNameMap = {[key: string]: AttributeName};
        export type ExpressionAttributeNameVariable = string;
        export type ExpressionAttributeValueMap = {[key: string]: AttributeValue};
        export type ExpressionAttributeValueVariable = string;
        export type FilterConditionMap = {[key: string]: Condition};
        export type GlobalSecondaryIndexDescriptionList = GlobalSecondaryIndexDescription[];
        export type GlobalSecondaryIndexList = GlobalSecondaryIndex[];
        export type GlobalSecondaryIndexUpdateList = GlobalSecondaryIndexUpdate[];
        export type IndexName = string;    // pattern: &quot;[a-zA-Z0-9_.-]+&quot;, max: 255, min: 3
        export type IndexStatus = string;
        export type Integer = number;
        export type ItemCollectionKeyAttributeMap = {[key: string]: AttributeValue};
        export type ItemCollectionMetricsMultiple = ItemCollectionMetrics[];
        export type ItemCollectionMetricsPerTable = {[key: string]: ItemCollectionMetricsMultiple};
        export type ItemCollectionSizeEstimateBound = number;
        export type ItemCollectionSizeEstimateRange = ItemCollectionSizeEstimateBound[];
        export type ItemList = AttributeMap[];
        export type Key = {[key: string]: AttributeValue};
        export type KeyConditions = {[key: string]: Condition};
        export type KeyExpression = string;
        export type KeyList = Key[];    // max: 100, min: 1
        export type KeySchema = KeySchemaElement[];    // max: 2, min: 1
        export type KeySchemaAttributeName = string;    // max: 255, min: 1
        export type KeyType = string;
        export type ListAttributeValue = AttributeValue[];
        export type ListTablesInputLimit = number;    // max: 100, min: 1
        export type LocalSecondaryIndexDescriptionList = LocalSecondaryIndexDescription[];
        export type LocalSecondaryIndexList = LocalSecondaryIndex[];
        export type Long = number;
        export type MapAttributeValue = {[key: string]: AttributeValue};
        export type NonKeyAttributeName = string;    // max: 255, min: 1
        export type NonKeyAttributeNameList = NonKeyAttributeName[];    // max: 20, min: 1
        export type NullAttributeValue = boolean;
        export type NumberAttributeValue = string;
        export type NumberSetAttributeValue = NumberAttributeValue[];
        export type PositiveIntegerObject = number;    // min: 1
        export type PositiveLongObject = number;    // min: 1
        export type ProjectionExpression = string;
        export type ProjectionType = string;
        export type PutItemInputAttributeMap = {[key: string]: AttributeValue};
        export type ReturnConsumedCapacity = string;
        export type ReturnItemCollectionMetrics = string;
        export type ReturnValue = string;
        export type ScalarAttributeType = string;
        export type ScanSegment = number;    // max: 999999
        export type ScanTotalSegments = number;    // max: 1000000, min: 1
        export type SecondaryIndexesCapacityMap = {[key: string]: Capacity};
        export type Select = string;
        export type StreamArn = string;    // max: 1024, min: 37
        export type StreamEnabled = boolean;
        export type StreamViewType = string;
        export type String = string;
        export type StringAttributeValue = string;
        export type StringSetAttributeValue = StringAttributeValue[];
        export type TableName = string;    // pattern: &quot;[a-zA-Z0-9_.-]+&quot;, max: 255, min: 3
        export type TableNameList = TableName[];
        export type TableStatus = string;
        export type UpdateExpression = string;
        export type WriteRequests = WriteRequest[];    // max: 25, min: 1

        export interface AttributeDefinition {
            AttributeName: KeySchemaAttributeName;
            AttributeType: ScalarAttributeType;
        }
        export interface AttributeValue {
            S?: StringAttributeValue;
            N?: NumberAttributeValue;
            B?: BinaryAttributeValue;
            SS?: StringSetAttributeValue;
            NS?: NumberSetAttributeValue;
            BS?: BinarySetAttributeValue;
            M?: MapAttributeValue;
            L?: ListAttributeValue;
            NULL?: NullAttributeValue;
            BOOL?: BooleanAttributeValue;
        }
        export interface AttributeValueUpdate {
            Value?: AttributeValue;
            Action?: AttributeAction;
        }
        export interface BatchGetItemInput {
            RequestItems: BatchGetRequestMap;
            ReturnConsumedCapacity?: ReturnConsumedCapacity;
        }
        export interface BatchGetItemOutput {
            Responses?: BatchGetResponseMap;
            UnprocessedKeys?: BatchGetRequestMap;
            ConsumedCapacity?: ConsumedCapacityMultiple;
        }
        export interface BatchWriteItemInput {
            RequestItems: BatchWriteItemRequestMap;
            ReturnConsumedCapacity?: ReturnConsumedCapacity;
            ReturnItemCollectionMetrics?: ReturnItemCollectionMetrics;
        }
        export interface BatchWriteItemOutput {
            UnprocessedItems?: BatchWriteItemRequestMap;
            ItemCollectionMetrics?: ItemCollectionMetricsPerTable;
            ConsumedCapacity?: ConsumedCapacityMultiple;
        }
        export interface Capacity {
            CapacityUnits?: ConsumedCapacityUnits;
        }
        export interface Condition {
            AttributeValueList?: AttributeValueList;
            ComparisonOperator: ComparisonOperator;
        }
        export interface ConditionalCheckFailedException {
            message?: ErrorMessage;
        }
        export interface ConsumedCapacity {
            TableName?: TableName;
            CapacityUnits?: ConsumedCapacityUnits;
            Table?: Capacity;
            LocalSecondaryIndexes?: SecondaryIndexesCapacityMap;
            GlobalSecondaryIndexes?: SecondaryIndexesCapacityMap;
        }
        export interface CreateGlobalSecondaryIndexAction {
            IndexName: IndexName;
            KeySchema: KeySchema;
            Projection: Projection;
            ProvisionedThroughput: ProvisionedThroughput;
        }
        export interface CreateTableInput {
            AttributeDefinitions: AttributeDefinitions;
            TableName: TableName;
            KeySchema: KeySchema;
            LocalSecondaryIndexes?: LocalSecondaryIndexList;
            GlobalSecondaryIndexes?: GlobalSecondaryIndexList;
            ProvisionedThroughput: ProvisionedThroughput;
            StreamSpecification?: StreamSpecification;
        }
        export interface CreateTableOutput {
            TableDescription?: TableDescription;
        }
        export interface DeleteGlobalSecondaryIndexAction {
            IndexName: IndexName;
        }
        export interface DeleteItemInput {
            TableName: TableName;
            Key: Key;
            Expected?: ExpectedAttributeMap;
            ConditionalOperator?: ConditionalOperator;
            ReturnValues?: ReturnValue;
            ReturnConsumedCapacity?: ReturnConsumedCapacity;
            ReturnItemCollectionMetrics?: ReturnItemCollectionMetrics;
            ConditionExpression?: ConditionExpression;
            ExpressionAttributeNames?: ExpressionAttributeNameMap;
            ExpressionAttributeValues?: ExpressionAttributeValueMap;
        }
        export interface DeleteItemOutput {
            Attributes?: AttributeMap;
            ConsumedCapacity?: ConsumedCapacity;
            ItemCollectionMetrics?: ItemCollectionMetrics;
        }
        export interface DeleteRequest {
            Key: Key;
        }
        export interface DeleteTableInput {
            TableName: TableName;
        }
        export interface DeleteTableOutput {
            TableDescription?: TableDescription;
        }
        export interface DescribeTableInput {
            TableName: TableName;
        }
        export interface DescribeTableOutput {
            Table?: TableDescription;
        }
        export interface ExpectedAttributeValue {
            Value?: AttributeValue;
            Exists?: BooleanObject;
            ComparisonOperator?: ComparisonOperator;
            AttributeValueList?: AttributeValueList;
        }
        export interface GetItemInput {
            TableName: TableName;
            Key: Key;
            AttributesToGet?: AttributeNameList;
            ConsistentRead?: ConsistentRead;
            ReturnConsumedCapacity?: ReturnConsumedCapacity;
            ProjectionExpression?: ProjectionExpression;
            ExpressionAttributeNames?: ExpressionAttributeNameMap;
        }
        export interface GetItemOutput {
            Item?: AttributeMap;
            ConsumedCapacity?: ConsumedCapacity;
        }
        export interface GlobalSecondaryIndex {
            IndexName: IndexName;
            KeySchema: KeySchema;
            Projection: Projection;
            ProvisionedThroughput: ProvisionedThroughput;
        }
        export interface GlobalSecondaryIndexDescription {
            IndexName?: IndexName;
            KeySchema?: KeySchema;
            Projection?: Projection;
            IndexStatus?: IndexStatus;
            Backfilling?: Backfilling;
            ProvisionedThroughput?: ProvisionedThroughputDescription;
            IndexSizeBytes?: Long;
            ItemCount?: Long;
            IndexArn?: String;
        }
        export interface GlobalSecondaryIndexUpdate {
            Update?: UpdateGlobalSecondaryIndexAction;
            Create?: CreateGlobalSecondaryIndexAction;
            Delete?: DeleteGlobalSecondaryIndexAction;
        }
        export interface InternalServerError {
            message?: ErrorMessage;
        }
        export interface ItemCollectionMetrics {
            ItemCollectionKey?: ItemCollectionKeyAttributeMap;
            SizeEstimateRangeGB?: ItemCollectionSizeEstimateRange;
        }
        export interface ItemCollectionSizeLimitExceededException {
            message?: ErrorMessage;
        }
        export interface KeySchemaElement {
            AttributeName: KeySchemaAttributeName;
            KeyType: KeyType;
        }
        export interface KeysAndAttributes {
            Keys: KeyList;
            AttributesToGet?: AttributeNameList;
            ConsistentRead?: ConsistentRead;
            ProjectionExpression?: ProjectionExpression;
            ExpressionAttributeNames?: ExpressionAttributeNameMap;
        }
        export interface LimitExceededException {
            message?: ErrorMessage;
        }
        export interface ListTablesInput {
            ExclusiveStartTableName?: TableName;
            Limit?: ListTablesInputLimit;
        }
        export interface ListTablesOutput {
            TableNames?: TableNameList;
            LastEvaluatedTableName?: TableName;
        }
        export interface LocalSecondaryIndex {
            IndexName: IndexName;
            KeySchema: KeySchema;
            Projection: Projection;
        }
        export interface LocalSecondaryIndexDescription {
            IndexName?: IndexName;
            KeySchema?: KeySchema;
            Projection?: Projection;
            IndexSizeBytes?: Long;
            ItemCount?: Long;
            IndexArn?: String;
        }
        export interface Projection {
            ProjectionType?: ProjectionType;
            NonKeyAttributes?: NonKeyAttributeNameList;
        }
        export interface ProvisionedThroughput {
            ReadCapacityUnits: PositiveLongObject;
            WriteCapacityUnits: PositiveLongObject;
        }
        export interface ProvisionedThroughputDescription {
            LastIncreaseDateTime?: Date;
            LastDecreaseDateTime?: Date;
            NumberOfDecreasesToday?: PositiveLongObject;
            ReadCapacityUnits?: PositiveLongObject;
            WriteCapacityUnits?: PositiveLongObject;
        }
        export interface ProvisionedThroughputExceededException {
            message?: ErrorMessage;
        }
        export interface PutItemInput {
            TableName: TableName;
            Item: PutItemInputAttributeMap;
            Expected?: ExpectedAttributeMap;
            ReturnValues?: ReturnValue;
            ReturnConsumedCapacity?: ReturnConsumedCapacity;
            ReturnItemCollectionMetrics?: ReturnItemCollectionMetrics;
            ConditionalOperator?: ConditionalOperator;
            ConditionExpression?: ConditionExpression;
            ExpressionAttributeNames?: ExpressionAttributeNameMap;
            ExpressionAttributeValues?: ExpressionAttributeValueMap;
        }
        export interface PutItemOutput {
            Attributes?: AttributeMap;
            ConsumedCapacity?: ConsumedCapacity;
            ItemCollectionMetrics?: ItemCollectionMetrics;
        }
        export interface PutRequest {
            Item: PutItemInputAttributeMap;
        }
        export interface QueryInput {
            TableName: TableName;
            IndexName?: IndexName;
            Select?: Select;
            AttributesToGet?: AttributeNameList;
            Limit?: PositiveIntegerObject;
            ConsistentRead?: ConsistentRead;
            KeyConditions?: KeyConditions;
            QueryFilter?: FilterConditionMap;
            ConditionalOperator?: ConditionalOperator;
            ScanIndexForward?: BooleanObject;
            ExclusiveStartKey?: Key;
            ReturnConsumedCapacity?: ReturnConsumedCapacity;
            ProjectionExpression?: ProjectionExpression;
            FilterExpression?: ConditionExpression;
            KeyConditionExpression?: KeyExpression;
            ExpressionAttributeNames?: ExpressionAttributeNameMap;
            ExpressionAttributeValues?: ExpressionAttributeValueMap;
        }
        export interface QueryOutput {
            Items?: ItemList;
            Count?: Integer;
            ScannedCount?: Integer;
            LastEvaluatedKey?: Key;
            ConsumedCapacity?: ConsumedCapacity;
        }
        export interface ResourceInUseException {
            message?: ErrorMessage;
        }
        export interface ResourceNotFoundException {
            message?: ErrorMessage;
        }
        export interface ScanInput {
            TableName: TableName;
            IndexName?: IndexName;
            AttributesToGet?: AttributeNameList;
            Limit?: PositiveIntegerObject;
            Select?: Select;
            ScanFilter?: FilterConditionMap;
            ConditionalOperator?: ConditionalOperator;
            ExclusiveStartKey?: Key;
            ReturnConsumedCapacity?: ReturnConsumedCapacity;
            TotalSegments?: ScanTotalSegments;
            Segment?: ScanSegment;
            ProjectionExpression?: ProjectionExpression;
            FilterExpression?: ConditionExpression;
            ExpressionAttributeNames?: ExpressionAttributeNameMap;
            ExpressionAttributeValues?: ExpressionAttributeValueMap;
            ConsistentRead?: ConsistentRead;
        }
        export interface ScanOutput {
            Items?: ItemList;
            Count?: Integer;
            ScannedCount?: Integer;
            LastEvaluatedKey?: Key;
            ConsumedCapacity?: ConsumedCapacity;
        }
        export interface StreamSpecification {
            StreamEnabled?: StreamEnabled;
            StreamViewType?: StreamViewType;
        }
        export interface TableDescription {
            AttributeDefinitions?: AttributeDefinitions;
            TableName?: TableName;
            KeySchema?: KeySchema;
            TableStatus?: TableStatus;
            CreationDateTime?: Date;
            ProvisionedThroughput?: ProvisionedThroughputDescription;
            TableSizeBytes?: Long;
            ItemCount?: Long;
            TableArn?: String;
            LocalSecondaryIndexes?: LocalSecondaryIndexDescriptionList;
            GlobalSecondaryIndexes?: GlobalSecondaryIndexDescriptionList;
            StreamSpecification?: StreamSpecification;
            LatestStreamLabel?: String;
            LatestStreamArn?: StreamArn;
        }
        export interface UpdateGlobalSecondaryIndexAction {
            IndexName: IndexName;
            ProvisionedThroughput: ProvisionedThroughput;
        }
        export interface UpdateItemInput {
            TableName: TableName;
            Key: Key;
            AttributeUpdates?: AttributeUpdates;
            Expected?: ExpectedAttributeMap;
            ConditionalOperator?: ConditionalOperator;
            ReturnValues?: ReturnValue;
            ReturnConsumedCapacity?: ReturnConsumedCapacity;
            ReturnItemCollectionMetrics?: ReturnItemCollectionMetrics;
            UpdateExpression?: UpdateExpression;
            ConditionExpression?: ConditionExpression;
            ExpressionAttributeNames?: ExpressionAttributeNameMap;
            ExpressionAttributeValues?: ExpressionAttributeValueMap;
        }
        export interface UpdateItemOutput {
            Attributes?: AttributeMap;
            ConsumedCapacity?: ConsumedCapacity;
            ItemCollectionMetrics?: ItemCollectionMetrics;
        }
        export interface UpdateTableInput {
            AttributeDefinitions?: AttributeDefinitions;
            TableName: TableName;
            ProvisionedThroughput?: ProvisionedThroughput;
            GlobalSecondaryIndexUpdates?: GlobalSecondaryIndexUpdateList;
            StreamSpecification?: StreamSpecification;
        }
        export interface UpdateTableOutput {
            TableDescription?: TableDescription;
        }
        export interface WriteRequest {
            PutRequest?: PutRequest;
            DeleteRequest?: DeleteRequest;
        }

    }
}