import { DynamoDB } from 'aws-sdk';
import { estimateWriteCapacityUnits } from './estimate-item-size';

const BATCH_WRITE_MAX_ITEM_COUNT = 25;

/**
 * The EqualItemCount partition strategy is the "simple" approach to partitioning, which works well
 * when all your items have predicable, equal size in WriteCapacityUnits.
 *
 * For example, with partitionStrategy="EqualItemCount" and targetItemCount=10, an array of 32 items
 * would be partitioned into 4 groups as [10], [10], [10], [2]. A total of 4 requests would be made
 * to AWS - 1 request for each group.
 *
 * @param writeRequests - an array of WriteRequest objects
 * @param startIndex - index to begin the partition at
 * @param options - options with partition settings
 * @returns {DynamoDB.WriteRequests} a subset of the writeRequests array
 */

export function getNextGroupByItemCount(writeRequests: DynamoDB.WriteRequests, startIndex: number,
                                        options: IBatchWriteItemOptions): DynamoDB.WriteRequests {

    if (startIndex < 0 || startIndex >= writeRequests.length) {
        return null;
    } else {
        const TARGET_ITEM_COUNT = Math.min(options.targetItemCount, BATCH_WRITE_MAX_ITEM_COUNT);
        let endIndex = Math.min(startIndex + TARGET_ITEM_COUNT, writeRequests.length);
        return writeRequests.slice(startIndex, endIndex);
    }
}

/**
 * The EvenlyDistributedGroupWCU partition strategy is used to partition the array into groups of
 * equal total WCU, up to a given threshold.
 *
 * In contrast to the EqualItemCount partition strategy - which makes each group have the same length,
 * this strategy allows for variable length groups with evenly distributed WCU.
 *
 * If a table is configured to have a write throughput of 10 WCU, and we're writing
 * 1 group per second, we can make full use of available throughput if each group's items
 * have a sum of 10 WCU. This partition strategy accomplishes this by estimating the size
 * of your items and placing them into groups with a normalized total WCU.
 *
 * Suppose we wish to write an array of items [A, B, C, D, E, F], where the sizes of the items are:
 *
 *     A = 11 WCU
 *     B = 5 WCU
 *     C = 2 WCU
 *     D = 3 WCU
 *     E = 1 WCU
 *     F = 8 WCU
 *
 * With targetGroupWCU=10, the partition would be:
 *
 *     [A]       = total of 11 WCU
 *     [B, C, D] = total of 10 WCU
 *     [E, F]    = total of 9 WCU
 *
 * With targetGroupWCU=20, the partition would be:
 *
 *     [A, B, C] = total of 18 WCU
 *     [D, E, F] = total of 12 WCU
 *
 * With targetGroupWCU=30, all items fit into a single group:
 *
 *     [A, B, C, D, E, F] = total of 30 WCU
 *
 * @param writeRequests - an array of WriteRequest objects
 * @param startIndex - index to begin the partition at
 * @param options - options with partition settings
 * @returns {DynamoDB.WriteRequests} a subset of the writeRequests array
 */

export function getNextGroupByTotalWCU(writeRequests: DynamoDB.WriteRequests, startIndex: number,
                                       options: IBatchWriteItemOptions): DynamoDB.WriteRequests {

    if (startIndex < 0 || startIndex >= writeRequests.length) {
        return null;
    } else {
        // always include the first item
        let estimatedWCU = _estimateWCUForPutOrDeleteRequest(writeRequests[startIndex]);
        let totalEstimatedWCU = estimatedWCU;
        let i = startIndex + 1;

        while (i < writeRequests.length && i - startIndex < BATCH_WRITE_MAX_ITEM_COUNT) {
            estimatedWCU = _estimateWCUForPutOrDeleteRequest(writeRequests[i]);

            if (totalEstimatedWCU + estimatedWCU <= options.targetGroupWCU) {
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

function _estimateWCUForPutOrDeleteRequest(writeRequest: DynamoDB.WriteRequest): number {
    if (writeRequest.DeleteRequest) {
        // assume the item to be deleted is 1 WCU (it's not possible to know the WCU
        // before we actually delete the item, so all we can do is guess)
        return 1;
    } else {
        return estimateWriteCapacityUnits(writeRequest.PutRequest.Item);
    }
}