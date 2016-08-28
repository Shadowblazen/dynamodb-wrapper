import { DynamoDB } from 'aws-sdk';
import {
    getNextGroupByItemCount,
    getNextGroupByItemSize
} from './batch-write-heuristic';

describe('lib/batch-write-heuristic', () => {

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

    describe('getNextGroupByItemCount()', () => {

        it('should evenly partition the requests array', () => {
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

    describe('getNextGroupByItemSize()', () => {

        it('should evenly partition the requests array', () => {
            let writeRequests = _setupWriteRequests(10);
            let options = {
                targetItemSize: 5
            };
            let nextGroup;

            nextGroup = getNextGroupByItemSize(writeRequests, 0, options);
            expect(nextGroup).toEqual(writeRequests.slice(0, 5));

            nextGroup = getNextGroupByItemSize(writeRequests, 5, options);
            expect(nextGroup).toEqual(writeRequests.slice(5, 10));
        });

        it('should not exceed the BatchWriteItem max item count for an individual group', () => {
            let writeRequests = _setupWriteRequests(30);
            let options = {
                targetItemSize: 9999
            };
            let nextGroup;

            nextGroup = getNextGroupByItemSize(writeRequests, 0, options);
            expect(nextGroup).toEqual(writeRequests.slice(0, 25));

            nextGroup = getNextGroupByItemSize(writeRequests, 25, options);
            expect(nextGroup).toEqual(writeRequests.slice(25, 30));
        });

        it('should return null when the startIndex is out of range', () => {
            let writeRequests = _setupWriteRequests(10);
            let options = {
                targetItemSize: 5
            };
            let nextGroup;

            nextGroup = getNextGroupByItemSize(writeRequests, 10, options);
            expect(nextGroup).toBe(null);

            nextGroup = getNextGroupByItemSize(writeRequests, -1, options);
            expect(nextGroup).toBe(null);
        });

    });

});