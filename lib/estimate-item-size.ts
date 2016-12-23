/**
 * Estimates the number of Write Capacity Units that will be consumed when writing this item to DynamoDB.
 *
 * @param {TDynamoDBItem} item
 * @see http://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithTables.html#ItemSizeCalculations
 * @returns {number}
 */

export function estimateWriteCapacityUnits(item: TDynamoDBItem): number {
    return Math.ceil(estimateItemSize(item) / 1024);
}

/**
 * Estimates the number of Read Capacity Units that will be consumed when reading this item from DynamoDB.
 *
 * @param {TDynamoDBItem} item
 * @see http://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithTables.html#ItemSizeCalculations
 * @returns {number}
 */

export function estimateReadCapacityUnits(item: TDynamoDBItem): number {
    return Math.ceil(estimateItemSize(item) / 4096);
}

/**
 * Estimates the size of a DynamoDB item in bytes.
 *
 * For practical purposes, this is useful for estimating the amount of capacity units that will
 * be consumed when reading or writing an item to DynamoDB.
 *
 * @param {TDynamoDBItem} item
 * @see http://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithTables.html#ItemSizeCalculations
 * @returns {number} the estimated number of bytes the item will require for storage in DynamoDB
 */

export function estimateItemSize(item: TDynamoDBItem): number {
    let totalBytes = 0;
    for (let key in item) {
        /* tslint:disable:forin */
        // noinspection JSUnfilteredForInLoop
        totalBytes += estimateAttributeValueSize(item[key], key);
        /* tslint:enable:forin */
    }
    return totalBytes;
}

/**
 * Estimates the size of a DynamoDB AttributeValue in bytes.
 *
 * @param {AttributeValue} value
 * @param {string} name
 * @see http://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithTables.html#ItemSizeCalculations
 * @returns {number}
 */

function estimateAttributeValueSize(value: AttributeValue, name?: string): number {
    let totalBytes = 0;

    // add the size of the attribute name
    // assume strings are ~1 byte per character (accurate for alphanumeric English UTF-8 text)
    if (name) {
        totalBytes += name.length;
    }

    let attributeKey = Object.keys(value)[0];
    switch (attributeKey) {
        case 'NULL':
        case 'BOOL':
            // 1 byte to store a null or boolean value
            totalBytes += 1;
            break;
        case 'N':
        case 'S':
            // assume the number is stored in string format
            // assume strings are ~1 byte per character (accurate for alphanumeric English UTF-8 text)
            totalBytes += value[attributeKey].length;
            break;
        case 'NS':
        case 'SS':
            // sum of sizes of each element in the set
            let eSet = value[attributeKey];
            for (let e of eSet) {
                // assume the number is stored in string format
                // assume strings are ~1 byte per character (accurate for alphanumeric English UTF-8 text)
                totalBytes += e.length;
            }
            break;
        case 'L':
            // overhead required for a DynamoDB List
            totalBytes += 3;
            // sum of the sizes of all AttributeValue elements in the list
            let list = value[attributeKey];
            for (let v of list) {
                totalBytes += estimateAttributeValueSize(v);
            }
            break;
        case 'M':
            // overhead required for a DynamoDB Map
            totalBytes += 3;
            // sum of sizes of each element in the map
            let map = value[attributeKey];
            for (let key in map) {
                /* tslint:disable:forin */
                // noinspection JSUnfilteredForInLoop
                totalBytes += estimateAttributeValueSize(map[key], key);
                /* tslint:enable:forin */
            }
            break;
        case 'B':
            throw new Error('NotYetImplementedException: DynamoDB Binary data type is not yet supported');
        case 'BS':
            throw new Error('NotYetImplementedException: DynamoDB BinarySet data type is not yet supported');
        default:
            throw new Error('ValidationException: Invalid attributeKey "' + attributeKey + '"');
    }

    return totalBytes;
}