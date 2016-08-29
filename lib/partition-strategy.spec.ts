import { DynamoDB } from 'aws-sdk';
import { getNextGroupByItemCount, getNextGroupByTotalWCU } from './partition-strategy';

describe('lib/partition-strategy', () => {

    const ONE_KB = (() => {
        let str = '';
        for (let i = 0; i < 1000; i++) {
            str += 'a';
        }
        return str;
    });

    function _setupWriteRequests(countRequests: number): DynamoDB.WriteRequests {
        let writeRequests: any = [];
        for (let i = 0; i < countRequests; i++) {
            writeRequests.push({
                PutRequest: {
                    Item: {
                        MyPartitionKey: { N: i.toString() },
                        MyKey: { S: ONE_KB }
                    }
                }
            });
        }
        return writeRequests;
    }

    function _setupDeleteRequests(countRequests: number): DynamoDB.WriteRequests {
        let writeRequests: any = [];
        for (let i = 0; i < countRequests; i++) {
            writeRequests.push({
                DeleteRequest: {
                    Key: {
                        MyPartitionKey: { N: i.toString() }
                    }
                }
            });
        }
        return writeRequests;
    }

    describe('getNextGroupByItemCount()', () => {

        it('should partition the requests array into groups of equal length', () => {
            let writeRequests = _setupWriteRequests(10);
            let options = {
                targetItemCount: 4
            };
            let nextGroup;

            nextGroup = getNextGroupByItemCount(writeRequests, 0, options);
            expect(nextGroup).toEqual(writeRequests.slice(0, 4));

            nextGroup = getNextGroupByItemCount(writeRequests, 4, options);
            expect(nextGroup).toEqual(writeRequests.slice(4, 8));

            nextGroup = getNextGroupByItemCount(writeRequests, 8, options);
            expect(nextGroup).toEqual(writeRequests.slice(8, 10));
        });

        it('should not exceed the BatchWriteItem max item count for an individual group', () => {
            let writeRequests = _setupWriteRequests(30);
            let options = {
                targetItemCount: 9999
            };
            let nextGroup;

            nextGroup = getNextGroupByItemCount(writeRequests, 0, options);
            expect(nextGroup).toEqual(writeRequests.slice(0, 25));

            nextGroup = getNextGroupByItemCount(writeRequests, 25, options);
            expect(nextGroup).toEqual(writeRequests.slice(25, 30));
        });

        it('should return null when the startIndex is out of range', () => {
            let writeRequests = _setupWriteRequests(10);
            let options = {
                targetItemCount: 4
            };
            let nextGroup;

            nextGroup = getNextGroupByItemCount(writeRequests, 10, options);
            expect(nextGroup).toBe(null);

            nextGroup = getNextGroupByItemCount(writeRequests, -1, options);
            expect(nextGroup).toBe(null);
        });

    });

    describe('getNextGroupByTotalWCU()', () => {

        it('should partition the requests array into groups of approximately equal total WCU', () => {
            let writeRequests = _setupWriteRequests(10);
            let options = {
                targetGroupWCU: 5
            };
            let nextGroup;

            nextGroup = getNextGroupByTotalWCU(writeRequests, 0, options);
            expect(nextGroup).toEqual(writeRequests.slice(0, 5));

            nextGroup = getNextGroupByTotalWCU(writeRequests, 5, options);
            expect(nextGroup).toEqual(writeRequests.slice(5, 10));
        });

        it('should not exceed the BatchWriteItem max item count for an individual group', () => {
            let writeRequests = _setupWriteRequests(30);
            let options = {
                targetGroupWCU: 9999
            };
            let nextGroup;

            nextGroup = getNextGroupByTotalWCU(writeRequests, 0, options);
            expect(nextGroup).toEqual(writeRequests.slice(0, 25));

            nextGroup = getNextGroupByTotalWCU(writeRequests, 25, options);
            expect(nextGroup).toEqual(writeRequests.slice(25, 30));
        });

        it('should assume that DeleteRequests always consume 1 WCU', () => {
            let writeRequests = _setupDeleteRequests(11);
            let options = {
                targetGroupWCU: 5
            };
            let nextGroup;

            nextGroup = getNextGroupByTotalWCU(writeRequests, 0, options);
            expect(nextGroup).toEqual(writeRequests.slice(0, 5));

            nextGroup = getNextGroupByTotalWCU(writeRequests, 5, options);
            expect(nextGroup).toEqual(writeRequests.slice(5, 10));

            nextGroup = getNextGroupByTotalWCU(writeRequests, 10, options);
            expect(nextGroup).toEqual(writeRequests.slice(10, 11));
        });

        it('should return null when the startIndex is out of range', () => {
            let writeRequests = _setupWriteRequests(10);
            let options = {
                targetGroupWCU: 5
            };
            let nextGroup;

            nextGroup = getNextGroupByTotalWCU(writeRequests, 10, options);
            expect(nextGroup).toBe(null);

            nextGroup = getNextGroupByTotalWCU(writeRequests, -1, options);
            expect(nextGroup).toBe(null);
        });

    });

});