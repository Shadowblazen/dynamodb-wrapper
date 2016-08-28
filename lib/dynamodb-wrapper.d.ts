declare type TDictionary<T> = { [key: string] : T; };

declare type TDynamoDBItem = TDictionary<AttributeValue>;

declare interface IDynamoDBWrapperOptions {
    tableNamePrefix?: string;
    batchWaitMs?: number;
    maxRetries?: number;
    retryDelayOptions?: {
        base?: number;
        customBackoff?: Function;
    };
}

declare interface IBatchWriteOptions {
    partitionKey?: string;
    sortKey?: string;
    heuristic?: string;
    targetItemCount?: number;
    targetItemSize?: number;
}

declare namespace DynamoDBValue {
    type String = { S: string };
    type Number = { N: string };
    type Binary = { B: any };
    type StringSet = { SS: string[] };
    type NumberSet = { NS: string[] };
    type BinarySet = { BS: any[] };
    type Map<T> = { M: T };
    type List<T> = { L: T[] };
    type Null = { NULL: boolean };
    type Boolean = { BOOL: boolean };
}

declare type AttributeValue = {
    S?: string;
    N?: string;
    B?: any;
    SS?: string[];
    NS?: string[];
    BS?: any[];
    M?: any;
    L?: any;
    NULL?: boolean;
    BOOL?: boolean;
}