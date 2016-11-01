export function addTablePrefixToRequest(prefix: string, params: any): void {
    if (prefix.length > 0) {
        // used in most API methods
        if (params.TableName) {
            params.TableName = _addPrefix(prefix, params.TableName);
        }

        // used in BatchGetItem, BatchWriteItem
        if (params.RequestItems) {
            params.RequestItems = _addPrefixes(prefix, params.RequestItems);
        }
    }
}

export function removeTablePrefixFromResponse(prefix: string, response: any): void {
    if (prefix.length > 0) {
        // used in BatchGetItem
        if (response.Responses) {
            response.Responses = _removePrefixes(prefix, response.Responses);
        }

        // used in BatchGetItem
        if (response.UnprocessedKeys) {
            response.UnprocessedKeys = _removePrefixes(prefix, response.UnprocessedKeys);
        }

        // used in BatchWriteItem
        if (response.ItemCollectionMetrics && !response.ItemCollectionMetrics.ItemCollectionKey &&
                !response.ItemCollectionMetrics.SizeEstimateRangeGB) {
            response.ItemCollectionMetrics = _removePrefixes(prefix, response.ItemCollectionMetrics);
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

export function removePrefix(prefix: string, tableName: string) {
    return tableName.substr(prefix.length);
}

function _removePrefixes(prefix: string, map) {
    let outMap = {};
    for (let tableName in map) {
        /* tslint:disable:forin */
        // noinspection JSUnfilteredForInLoop
        outMap[removePrefix(prefix, tableName)] = map[tableName];
        /* tslint:enable:forin */
    }
    return outMap;
}

function _addPrefixes(prefix: string, map: any): any {
    let outMap = {};
    for (let tableName in map) {
        /* tslint:disable:forin */
        // noinspection JSUnfilteredForInLoop
        outMap[_addPrefix(prefix, tableName)] = map[tableName];
        /* tslint:enable:forin */
    }
    return outMap;
}

function _addPrefix(prefix: string, tableName: string): string {
    return tableName.indexOf(prefix) === 0 ? tableName : prefix + tableName;
}