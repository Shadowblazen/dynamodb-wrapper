export function addTablePrefixToRequest(prefix: string, params: any): void {
    if (prefix.length > 0) {
        // used in most API methods
        if (params.TableName) {
            params.TableName = addPrefix(prefix, params.TableName);
        }

        // used in BatchGetItem, BatchWriteItem
        if (params.RequestItems) {
            params.RequestItems = addPrefixes(prefix, params.RequestItems);
        }
    }
}

export function removeTablePrefixFromResponse(prefix: string, response: any): void {
    if (prefix.length > 0) {
        // used in BatchGetItem
        if (response.Responses) {
            response.Responses = removePrefixes(prefix, response.Responses);
        }

        // used in BatchGetItem
        if (response.UnprocessedKeys) {
            response.UnprocessedKeys = removePrefixes(prefix, response.UnprocessedKeys);
        }

        if (response.UnprocessedItems) {
            response.UnprocessedItems = removePrefixes(prefix, response.UnprocessedItems);
        }

        // used in BatchWriteItem
        if (response.ItemCollectionMetrics && !response.ItemCollectionMetrics.ItemCollectionKey &&
                !response.ItemCollectionMetrics.SizeEstimateRangeGB) {
            response.ItemCollectionMetrics = removePrefixes(prefix, response.ItemCollectionMetrics);
        }

        if (response.ConsumedCapacity) {
            // used in BatchGetItem, BatchWriteItem
            if (Array.isArray(response.ConsumedCapacity)) {
                for (let consumedCapacity of response.ConsumedCapacity) {
                    consumedCapacity.TableName = removePrefix(prefix, consumedCapacity.TableName);
                }
            } else {
                // used in most API methods
                response.ConsumedCapacity.TableName = removePrefix(prefix, response.ConsumedCapacity.TableName);
            }
        }
    }
}

export function addPrefix(prefix: string, tableName: string): string {
    return tableName.indexOf(prefix) === 0 ? tableName : prefix + tableName;
}

export function addPrefixes(prefix: string, map: any): any {
    let outMap = {};
    for (let tableName in map) {
        /* tslint:disable:forin */
        // noinspection JSUnfilteredForInLoop
        outMap[addPrefix(prefix, tableName)] = map[tableName];
        /* tslint:enable:forin */
    }
    return outMap;
}

export function removePrefix(prefix: string, tableName: string) {
    return tableName.substr(prefix.length);
}

export function removePrefixes(prefix: string, map) {
    let outMap = {};
    for (let tableName in map) {
        /* tslint:disable:forin */
        // noinspection JSUnfilteredForInLoop
        outMap[removePrefix(prefix, tableName)] = map[tableName];
        /* tslint:enable:forin */
    }
    return outMap;
}