# dynamodb-wrapper changelog

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