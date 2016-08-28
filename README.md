## What is dynamodb-wrapper?

- **AWS SDK wrapper:** A lightweight wrapper that enhances the functionality of the AWS JavaScript SDK for DynamoDB
- **Bulk read/write:** Easily transmit large amounts of data from/to DynamoDB

## Getting Started

Coming soon...

## Roadmap
- **Events:** Use an EventEmitter to hook into events for logging and visibility
    - "retry" - get notified when a request is throttled and retried, so that you can log it or increase table throughput
- **Table prefixes:** Configuration-drive table prefixes for users or companies that want to have multiple copies of the same table
    - Example: if you have dev and staging environments in the same AWS Account, easily interact with "dev-MyTable" or "stg-MyTable" without writing extra code in your application
- **Streams:** A version of this library built on streams, allowing for easier integration other ecosystems such as gulp