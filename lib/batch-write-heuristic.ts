import { DynamoDB } from 'aws-sdk';
import { estimateWriteCapacityUnits } from './estimate-item-size';

const BATCH_WRITE_MAX_ITEM_COUNT = 25;

export function getNextGroupByItemCount(writeRequests: DynamoDB.WriteRequests, startIndex: number,
                                        options: IBatchWriteOptions): DynamoDB.WriteRequests {

    if (startIndex < 0 || startIndex >= writeRequests.length) {
        return null;
    } else {
        const TARGET_ITEM_COUNT = Math.min(options.targetItemCount, BATCH_WRITE_MAX_ITEM_COUNT);
        let endIndex = Math.min(startIndex + TARGET_ITEM_COUNT, writeRequests.length);
        return writeRequests.slice(startIndex, endIndex);
    }
}

export function getNextGroupByItemSize(writeRequests: DynamoDB.WriteRequests, startIndex: number,
                                       options: IBatchWriteOptions): DynamoDB.WriteRequests {

    if (startIndex < 0 || startIndex >= writeRequests.length) {
        return null;
    } else {
        // always include the first item
        let estimatedWCU = estimateWriteCapacityUnits(writeRequests[startIndex].PutRequest.Item);
        let totalEstimatedWCU = estimatedWCU;
        let i = startIndex + 1;

        while (i < writeRequests.length && i - startIndex < BATCH_WRITE_MAX_ITEM_COUNT) {
            estimatedWCU = estimateWriteCapacityUnits(writeRequests[i].PutRequest.Item);

            if (totalEstimatedWCU + estimatedWCU <= options.targetItemSize) {
                totalEstimatedWCU += estimatedWCU;
                i++;
            } else {
                // do not include the item in the group, because the total WCU would exceed the threshold
                break;
            }
        }

        return writeRequests.slice(startIndex, i);
    }
}