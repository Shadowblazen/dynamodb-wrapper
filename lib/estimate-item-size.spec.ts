import {
    estimateWriteCapacityUnits,
    estimateReadCapacityUnits,
    estimateItemSize
} from './estimate-item-size';

describe('lib/estimate-item-size', () => {

    it('estimates write capacity units (1 WCU = 1 kilobyte)', () => {

        let item, numBytes, wcu;

        item = _makeTestItem(42);
        numBytes = estimateItemSize(item);
        wcu = estimateWriteCapacityUnits(item);
        expect(numBytes).toBe(42);
        expect(wcu).toBe(1);

        item = _makeTestItem(1024);
        numBytes = estimateItemSize(item);
        wcu = estimateWriteCapacityUnits(item);
        expect(numBytes).toBe(1024);
        expect(wcu).toBe(1);

        item = _makeTestItem(1025);
        numBytes = estimateItemSize(item);
        wcu = estimateWriteCapacityUnits(item);
        expect(numBytes).toBe(1025);
        expect(wcu).toBe(2);

        item = _makeTestItem(2048);
        numBytes = estimateItemSize(item);
        wcu = estimateWriteCapacityUnits(item);
        expect(numBytes).toBe(2048);
        expect(wcu).toBe(2);

        item = _makeTestItem(2049);
        numBytes = estimateItemSize(item);
        wcu = estimateWriteCapacityUnits(item);
        expect(numBytes).toBe(2049);
        expect(wcu).toBe(3);

    });

    it('estimates read capacity units (1 RCU = 4 kilobytes)', () => {

        let item, numBytes, rcu;

        item = _makeTestItem(42);
        numBytes = estimateItemSize(item);
        rcu = estimateReadCapacityUnits(item);
        expect(numBytes).toBe(42);
        expect(rcu).toBe(1);

        item = _makeTestItem(4096);
        numBytes = estimateItemSize(item);
        rcu = estimateReadCapacityUnits(item);
        expect(numBytes).toBe(4096);
        expect(rcu).toBe(1);

        item = _makeTestItem(4097);
        numBytes = estimateItemSize(item);
        rcu = estimateReadCapacityUnits(item);
        expect(numBytes).toBe(4097);
        expect(rcu).toBe(2);

        item = _makeTestItem(8192);
        numBytes = estimateItemSize(item);
        rcu = estimateReadCapacityUnits(item);
        expect(numBytes).toBe(8192);
        expect(rcu).toBe(2);

        item = _makeTestItem(8193);
        numBytes = estimateItemSize(item);
        rcu = estimateReadCapacityUnits(item);
        expect(numBytes).toBe(8193);
        expect(rcu).toBe(3);

    });

    it('estimates the size of a Null attribute', () => {

        let item: TDynamoDBItem = {
            MyAttr: { NULL: true }
        };

        let numBytes = estimateItemSize(item);

        // 'MyAttr' (6 bytes) + 1 byte to store a null
        expect(numBytes).toBe(6 + 1);

    });

    it('estimates the size of a Boolean attribute', () => {

        let item: TDynamoDBItem = {
            MyAttr: { BOOL: true }
        };

        let numBytes = estimateItemSize(item);

        // 'MyAttr' (6 bytes) + 1 byte to store a boolean
        expect(numBytes).toBe(6 + 1);

    });

    it('estimates the size of a Number attribute', () => {

        let item: TDynamoDBItem = {
            MyAttr: { N: '42.123456789' }
        };

        let numBytes = estimateItemSize(item);

        // 'MyAttr' (6 bytes) + string length of the number (12 bytes)
        expect(numBytes).toBe(6 + 12);

    });

    it('estimates the size of a String attribute', () => {

        let item: TDynamoDBItem = {
            MyAttr: { S: 'Value' }
        };

        let numBytes = estimateItemSize(item);

        // 'MyAttr' (6 bytes) + 'Value' (5 bytes)
        expect(numBytes).toBe(6 + 5);

    });

    it('estimates the size of a NumberSet attribute', () => {

        let item: TDynamoDBItem = {
            MyAttr: {
                NS: ['10', '20', '30', '40', '50', '60', '70']
            }
        };

        let numBytes = estimateItemSize(item);

        // 'MyAttr' (6 bytes) + sum of all string lengths in the set (2 * 7 bytes)
        expect(numBytes).toBe(6 + 2 * 7);

    });

    it('estimates the size of a StringSet attribute', () => {

        let item: TDynamoDBItem = {
            MyAttr: {
                SS: ['aa', 'bb', 'cc', 'dd', 'ee', 'ff', 'gg']
            }
        };

        let numBytes = estimateItemSize(item);

        // 'MyAttr' (6 bytes) + sum of all string lengths in the set (2 * 7 bytes)
        expect(numBytes).toBe(6 + 2 * 7);

    });

    it('estimates the size of a List attribute', () => {

        let item: TDynamoDBItem = {
            MyAttr: {
                L: [
                    { S: 'berry' },
                    { N: '42' }
                ]
            }
        };

        let numBytes = estimateItemSize(item);

        // 'MyAttr' (6 bytes) + list overhead (3 bytes) + 'berry' (5 bytes) + '42' (2 bytes)
        expect(numBytes).toBe(6 + 3 + 5 + 2);

    });

    it('estimates the size of a Map attribute', () => {

        let item: TDynamoDBItem = {
            MyAttr: {
                M: {
                    FirstAttr: { S: 'berry' },
                    SecondAttr: { N: '42' }
                }
            }
        };

        let numBytes = estimateItemSize(item);

        // 'MyAttr' (6 bytes) + map overhead (3 bytes) + 'berry' (5 bytes) + '42' (2 bytes)
        // + 'FirstAttr' (9 bytes) + 'SecondAttr' (10 bytes)
        expect(numBytes).toBe(6 + 3 + 5 + 2 + 9 + 10);

    });

    it('throws a not yet implemented error when attempting to estimate the size of a Binary attribute', () => {

        let item: TDynamoDBItem = {
            MyAttr: {
                B: null
            }
        };

        expect(() => {
            estimateItemSize(item);
        }).toThrow(new Error('NotImplementedException: DynamoDB Binary data type is not yet supported'));

    });

    it('throws a not yet implemented error when attempting to estimate the size of a BinarySet attribute', () => {

        let item: TDynamoDBItem = {
            MyAttr: {
                BS: null
            }
        };

        expect(() => {
            estimateItemSize(item);
        }).toThrow(new Error('NotImplementedException: DynamoDB BinarySet data type is not yet supported'));

    });

    it('throws an error if an invalid data type is encountered', () => {

        let item: any = {
            MyAttr: {
                BAD_KEY: null
            }
        };

        expect(() => {
            estimateItemSize(item);
        }).toThrow(new Error('ValidationException: Invalid attributeKey "BAD_KEY"'));

    });

    function _makeTestItem(numBytes: number): TDynamoDBItem {
        let str = '';
        for (let i = 3; i < numBytes; i++) {
            str += 'a';
        }
        return {
            foo: { S: str }
        };
    }

});