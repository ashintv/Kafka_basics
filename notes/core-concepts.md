# Core Concepts

- Broker: Kafka server that stores data and serves clients.
- Cluster: Group of brokers working together.
- Topic: Named stream of records, split into partitions.
- Partition: Ordered, immutable sequence of records. Ordering guaranteed only within a partition.
- Offset: Position of a record within a partition.
- Producer: App that writes messages.
- Consumer: App that reads messages.
- Consumer Group: Multiple consumers cooperating to split partitions; each partition is read by at most one consumer in the group.
- Leader/Follower: For each partition, one broker is leader; others replicate.
- ISR: In-sync replicas, candidates for leader if needed.

Example mapping
- Topic: `orders` with 3 partitions (0,1,2)
- Producer uses key `user-42` → partition = hash(key)%3
- All events for `user-42` go to the same partition → order preserved for that user

Takeaways
- Use keys to keep related events ordered.
- Use consumer groups to scale processing horizontally.
