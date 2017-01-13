import {
    getNonNegativeInteger,
    getPositiveInteger,
    appendArray,
    wait
} from './utils';

describe('lib/utils', () => {

    describe('getNonNegativeInteger()', () => {

        it('returns the first non-negative integer in the input', () => {
            expect(getNonNegativeInteger([0])).toBe(0);
            expect(getNonNegativeInteger([1, 2])).toBe(1);
            expect(getNonNegativeInteger(['foo', NaN, Infinity, -1, 1.2, 3])).toBe(3);
        });

        it('returns 0 if the input does not contain a non-negative integer', () => {
            expect(getNonNegativeInteger([])).toBe(0);
            expect(getNonNegativeInteger(['foo', NaN, Infinity, -1, 1.2])).toBe(0);
        });

    });

    describe('getPositiveInteger()', () => {

        it('returns the first positive integer in the input', () => {
            expect(getPositiveInteger([1])).toBe(1);
            expect(getPositiveInteger([1, 2])).toBe(1);
            expect(getPositiveInteger(['foo', NaN, Infinity, -1, 1.2, 3])).toBe(3);
        });

        it('returns 1 if the input does not contain a positive integer', () => {
            expect(getPositiveInteger([])).toBe(1);
            expect(getPositiveInteger(['foo', NaN, Infinity, -1, 1.2])).toBe(1);
        });

    });

    describe('appendArray()', () => {

        it('should append the contents of array2 to array1', () => {
            let arr1 = ['a', 'b', 'c'];
            let arr2 = ['d', 'e', 'f'];
            appendArray(arr1, arr2);
            expect(arr1).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
        });

        it('should be a no-op if the 2nd parameter is not an array', () => {
            let arr1 = ['a', 'b', 'c'];
            let arr2: any = undefined;
            appendArray(arr1, arr2);
            expect(arr1).toEqual(['a', 'b', 'c']);
        });

    });

    describe('wait()', () => {

        it('should return a promise', () => {
            let p = wait(0);
            expect(p instanceof Promise).toBe(true);
        });

    });

});