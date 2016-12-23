# dynamodb-wrapper changelog

## 1.3.0

- added a couple missing fields to `index.d.ts` for TypeScript consumers
- enhancement: `batchWriteItem` now supports writing to multiple tables.
    - There is an updated example in the README
    - The format of the *options* object passed to `batchWriteItem` has changed, refer to `index.d.s` for details. (The previous format is still supported for backwards compatibility.)

## 1.2.3

- fixed a bug where a table prefix could be prepended multiple times
- added retries for LimitExceededException

## 1.2.1, 1.2.2

- updated typescript typings for the public API

## 1.2.0

- added support for `createTable`, `updateTable`, `describeTable` and `deleteTable` methods

## 1.1.1

- fixed an off-by-1 bug where the `retry` event would erroneously fire (e.g. retry #1 with maxRetries=0)
- fixed a bug where ConsumedCapacity was not aggregated correctly for BatchWriteItem

## 1.1.0

- new feature: table prefixes
- new feature: event hooks for `retry` and `consumedCapacity`
- enhancement: `batchWriteItem` now supports DeleteRequests

## 1.0.x

- project setup