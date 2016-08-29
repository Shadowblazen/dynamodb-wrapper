declare interface IDynamoDBWrapperOptions {
    tableNamePrefix?: string;
    batchWaitMs?: number;
    maxRetries?: number;
    retryDelayOptions?: {
        base?: number;
        customBackoff?: Function;
    };
}

declare interface IBatchWriteItemOptions {
    heuristic?: 'ItemCount' | 'ItemSize';
    targetItemCount?: number;
    targetItemSize?: number;
}

declare type TDictionary<T> = { [key: string] : T; };

declare type TDynamoDBItem = TDictionary<AttributeValue>;

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