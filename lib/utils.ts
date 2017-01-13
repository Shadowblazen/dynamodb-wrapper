export function getNonNegativeInteger(arr: any[]) {
    for (let v of arr) {
        if (typeof v === 'number' && !isNaN(v) && v < Number.MAX_SAFE_INTEGER && v >= 0 && Math.round(v) === v) {
            return v;
        }
    }

    return 0;
}

export function getPositiveInteger(arr: any[]) {
    for (let v of arr) {
        if (typeof v === 'number' && !isNaN(v) && v < Number.MAX_SAFE_INTEGER && v > 0 && Math.round(v) === v) {
            return v;
        }
    }

    return 1;
}

export function appendArray(array1: any[], array2: any[]) {
    if (Array.isArray(array2)) {
        Array.prototype.push.apply(array1, array2);
    }
}

export function wait(ms: number): Promise<any> {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, ms);
    });
}