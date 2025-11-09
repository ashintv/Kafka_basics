# Kafka Notes — Complete Overview

This file collects practical and conceptual notes about Apache Kafka — useful when learning, operating, or developing on Kafka.

> New to Kafka? Imagine a giant, durable, sortable mailbox. Apps drop letters (events) into named slots (topics). Other apps pick them up later—even in real time—without slowing down the writers.

## Overview

Apache Kafka is a distributed event streaming platform used for building real-time data pipelines and streaming apps. It provides durable, ordered, and partitioned logs that clients (producers/consumers) read and write to.

Key capabilities:
- High-throughput, low-latency publish/subscribe messaging
- Persistent storage of messages (durable log)
- Horizontal scalability via partitions and clusters
- Strong ordering within a partition
- Configurable retention and log compaction

Quick analogy:
- Topic = a named folder of messages.
- Partitions = the folder is split into N numbered subfolders to scale reads/writes.
- Offset = the line number of a message inside a subfolder.

Beginner real-world examples:
- Food delivery tracking: Rider GPS updates stream to a `rider-location` topic; a map consumer updates positions live.
- E‑commerce clickstream: Every product page view goes to `click-events`; analytics aggregates trending items.
- IoT sensors: Thousands of temperature sensors publish to `sensor-readings`; alert service watches for thresholds.
- Centralized logging: Microservices write structured JSON logs to `service-logs`; one consumer indexes to Elasticsearch, another triggers alerts.


## Core Concepts

- Broker: a Kafka server that stores data and serves client requests.
- Cluster: a group of brokers working together.
- Topic: a named stream of records. Topics are split into partitions.
- Partition: an ordered, immutable sequence of records; each record has an offset (monotonic index).
- Offset: the position of a record in a partition.
- Producer: an application that publishes (writes) records to topics.
- Consumer: an application that reads records from topics.
- Consumer Group: a set of consumers (with a group id) that coordinate to divide partitions among themselves; each partition is consumed by at most one consumer in a group.
- Leader / Followers: for each partition there is one leader (serving reads/writes) and zero or more followers that replicate the leader's data.
- ISR (In-Sync Replicas): replicas currently caught up with the leader and eligible for promotion.
- Zookeeper / KRaft: legacy cluster metadata store (Zookeeper) vs newer Kafka Raft metadata mode (KRaft).

Example
- Topic: `orders`
- Partitions: 3 (0, 1, 2)
- Producer sends: key = `user-42`, value = `{ "orderId": 1001 }`
- Kafka chooses partition = hash(`user-42`) % 3. All `user-42` orders go to the same partition, preserving order for that user.

Real-world mapping:
- `orders` topic fans out to: inventory updater, fraud detector, email notifier. Each consumer group processes independently.


## Data Model and Guarantees

- Messages are key/value pairs with optional headers and timestamp.
- Ordering is guaranteed only within a partition.
- Configurable durability/replication.

Delivery semantics (from a client perspective):
- At-most-once: messages may be lost but not duplicated (producer not retried or commits happen before processing).
- At-least-once: messages delivered >=1 time (retries or committing after processing can cause duplicates).
- Exactly-once: stronger guarantee using Kafka transactions and idempotent producers (complex; supported in Kafka broker + client versions with transactions and idempotence enabled).

Examples
- At-most-once: Consumer commits offset before doing the work. If the app crashes right after commit, the message is considered done but the work didn’t happen.
- At-least-once: Consumer processes then commits. If it crashes between processing and commit, on restart it reprocesses the same message (duplicate handling required).
- Exactly-once: Producer uses transactions and consumer reads only committed messages. Complexity increases but duplicates/loss are prevented end-to-end.

Analogy:
- At-most-once = You mark an email "handled" before actually responding—could forget it.
- At-least-once = You respond, then mark handled. Crash mid-mark leads to sending reply twice.
- Exactly-once = A workflow system guarantees one and only one final dispatched reply.


## Producers

Important settings & concepts:
- acks: 0 (no ack), 1 (leader ack), "all" (wait for all ISR) — higher durability with `all` but higher latency.
- retries: how many times to retry on transient errors.
- linger.ms: delay to wait to batch records.
- batch.size: maximum size of a batch per partition.
- compression.type: gzip/snappy/lz4/zstd — use compression to reduce network and storage costs.
- key: used to choose partition (hash(key) % partitionCount). Use for ordering semantics.
- partitioner: custom partitioner if you need special placement.
- idempotence: when enabled, protects against duplicate messages due to retries (requires specific settings: enable.idempotence=true, and broker support).

Producer flow (high-level):
1. Client serializes key/value.
2. Select partition (by key or custom partitioner).
3. Batch messages per partition.
4. Send to leader for partition.

Producer-side best practices:
- Use keys for ordering requirements.
- Tune `linger.ms` + `batch.size` for throughput.
- Use `acks=all` and replication factor >=2 for durability in production.
- Enable idempotence for safe retries.

Minimal kafkajs producer (with key and acks)

```ts
import { Kafka, CompressionTypes } from 'kafkajs'

const kafka = new Kafka({ clientId: 'demo-producer', brokers: ['localhost:9092'] })
const producer = kafka.producer()

await producer.connect()
await producer.send({
  topic: 'test-topic',
  compression: CompressionTypes.GZIP,
  messages: [
    { key: 'user-42', value: JSON.stringify({ orderId: 1001, total: 19.99 }) },
  ],
})
await producer.disconnect()
```

Notes
- With a key (`user-42`), all messages for that key land on the same partition, preserving order for that user.
- Set producer config for idempotence and acks (in kafkajs these map to sensible defaults; on brokers use RF>=2 for durability).

Sample business events (JSON):
```json
{ "type": "ORDER_PLACED", "orderId": 1001, "userId": "user-42", "total": 19.99 }
{ "type": "ORDER_CONFIRMED", "orderId": 1001, "confirmedAt": "2025-11-09T12:00:00Z" }
{ "type": "ORDER_SHIPPED", "orderId": 1001, "carrier": "DHL" }
```
All share key `user-42` -> ordered stream for that user.


## Consumers & Consumer Groups

- Consumers read messages by partition and maintain offsets.
- Consumer group allows work distribution: each partition assigned to a single consumer in the group.
- Two offset commit modes:
  - Automatic commit: client commits offsets periodically (enable.auto.commit). Less safe for processing.
  - Manual commit: application commits offsets after processing.

Rebalance:
- When consumers join/leave or partition count changes, a rebalance happens to reassign partitions.
- Rebalances cause brief pauses and possibly duplicate processing if offsets were committed after processing.
- Use incremental cooperative rebalancers (if client supports) to reduce interruption.

Offset control:
- Seek: move to specific offset to reprocess or skip messages.
- committed offset vs position: committed offset is stored (Kafka) while position is current fetch position.

Consumer best practices:
- Commit offsets only after processing is complete (for at-least-once semantics).
- Use idempotent processing or dedup keys to handle duplicates.
- Keep processing idempotent or store processed keys to avoid double-processing.
- Monitor consumer lag (difference between latest offset and committed offset).

Example: two consumers sharing a topic
- Topic `payments` has 4 partitions: 0..3
- Group `payments-workers` has two consumers: C1 and C2
- C1 gets partitions {0,2}, C2 gets {1,3}. If C2 dies, Kafka reassigns partitions {1,3} to C1.

Minimal kafkajs consumer with manual commit

```ts
import { Kafka } from 'kafkajs'

const kafka = new Kafka({ clientId: 'demo-consumer', brokers: ['localhost:9092'] })
const consumer = kafka.consumer({ groupId: 'test-group' })

await consumer.connect()
await consumer.subscribe({ topic: 'test-topic', fromBeginning: true })

await consumer.run({
  autoCommit: false,
  eachMessage: async ({ topic, partition, message, heartbeat, pause }) => {
    const key = message.key?.toString()
    const value = message.value?.toString()
    console.log(`p${partition} ${message.offset} ${key} -> ${value}`)

    // do work ... then commit
    await consumer.commitOffsets([
      { topic, partition, offset: (Number(message.offset) + 1).toString() },
    ])
  },
})

Real-world flow: Logs
1. Services write JSON logs to `service-logs`.
2. Group `indexer` (4 instances) stores them in Elasticsearch.
3. Group `alerts` scans for `ERROR` patterns and sends Slack notifications.
Consumers don't block each other—parallel value extraction.
```


## Partitioning & Ordering

- Ordering scoped to a partition only.
- Number of partitions = parallelism for consumption; increasing partitions increases concurrency but may change key-based ordering.
- Plan partition counts for expected throughput and scaling.
- Changing partitions later can increase parallelism but may change ordering for existing keys.

Example: which partition does a key go to?

```
partitions = 3
hash('user-1') % 3 -> 1
hash('user-2') % 3 -> 0
hash('user-3') % 3 -> 2
```

If you increase partitions from 3 to 6 later, the hash % N result changes; keys may land on different partitions, so ordering across history can shift.

Rule of thumb for beginners:
- Estimate peak msg/sec (e.g., 24k).
- Pick safe per-partition rate (~4k) => 24k/4k = 6 partitions.
Start slightly higher rather than too low to reduce later redistribution.


## Replication & Fault Tolerance

- Replication factor (RF) determines copies of each partition. RF >= 2 recommended; RF >=3 often used in production.
- Leader election: if leader fails, one of ISR becomes leader.
- MinISR: minimum replicas required to be in-sync — influences availability vs durability trade-offs.

Example
- RF=3, MinISR=2. A record is acknowledged only if at least 2 replicas write it.
- If one broker fails, the partition still has 2 replicas; reads/writes continue.
- If two brokers fail, the partition may become unavailable until ISR recovers.

Real-world layout:
```
Broker1  Broker2  Broker3
 P0*      P0r      P0r    (*=leader, r=replica)
 P1r      P1*      P1r
 P2r      P2r      P2*
```
Leaders spread evenly to balance load.


## Retention & Compaction

- Retention by time (e.g., 7d) or size — messages removed after limit.
- Log compaction: retains the latest value per key indefinitely (useful for changelog streams / materialized state).
- Segment.bytes, segment.ms, retention.ms and cleanup.policy are important topic-level settings.

Examples
- Time-based retention: keep 7 days of data

```
retention.ms=604800000
```

- Compacted topic (keep latest value per key)

```
cleanup.policy=compact
min.cleanable.dirty.ratio=0.5
segment.ms=600000
```

Use compacted topics for state-changelog (e.g., latest user profile per userId).

Beginner mental model:
- Retention = "Keep history for a while" (rolling window).
- Compaction = "Keep only latest state per key" (snapshot table).


## Transactions & Exactly-Once Processing (EOS)

- Transactions let producers send to multiple partitions/topics atomically and commit offsets as part of the transaction.
- For EOS: enable idempotent producer + transactions + consumer read_committed support.
- Using EOS has resource/latency tradeoffs — use where strict correctness is required.

Example scenario (conceptual)
- A service reads from topic A and writes to topic B.
- With transactions, it starts a transaction, processes a batch, writes to B, and commits both the writes and the consumed offsets atomically.
- If a crash happens before commit, nothing is visible to readers with `read_committed`.

Real-world use:
- Payment handler ensures a charge event and its status update appear together or not at all—avoids partial state.


## Broker/Cluster Operations

- Start brokers and ensure advertised.listeners are set correctly (for Docker, host mapping matters).
- Partition leadership distribution affects load — use `kafka-reassign-partitions.sh` if needed.
- Monitor controller (broker responsible for metadata) and ensure Zookeeper/KRaft health.

Zookeeper vs KRaft:
- Older versions used Zookeeper for metadata. Newer Kafka (from ~2.8 onward progressing to KRaft) uses KRaft (broker-based quorum) to remove Zookeeper.

Example: `advertised.listeners` in Docker

```
KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://localhost:9092
```

If clients run from another container, use the container service name; if clients run on host (macOS), `localhost` is fine with port mapping.

ASCII sketch:
```
App --> Broker1 (leader P0) <--> Broker2 (follower P0) <--> Broker3 (follower P0)
```


## Common CLI Commands (bin directory)

(Replace `KAFKA_HOME` or run via docker image where the scripts are available.)

- Create topic:

```
kafka-topics.sh --create --topic my-topic --bootstrap-server localhost:9092 --partitions 3 --replication-factor 1
```

- Describe topic:

```
kafka-topics.sh --describe --topic my-topic --bootstrap-server localhost:9092
```

- List topics:

```
kafka-topics.sh --list --bootstrap-server localhost:9092
```

- Console producer:

```
kafka-console-producer.sh --topic test-topic --bootstrap-server localhost:9092
```

- Console consumer (from beginning):

```
kafka-console-consumer.sh --topic test-topic --bootstrap-server localhost:9092 --from-beginning
```

- Get consumer group offsets / describe group:

```
kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --group my-group
```

- Alter topic config (example: retention):

```
kafka-configs.sh --bootstrap-server localhost:9092 --entity-type topics --entity-name my-topic --alter --add-config retention.ms=604800000
```

- Reassign partitions / balance (advanced ops) — use `kafka-reassign-partitions.sh` with a JSON plan.

Tip: running CLI inside Docker

```
docker exec -it <kafka-container> kafka-topics --list --bootstrap-server localhost:9092
```

Mini workflow to launch a topic:
1. Decide partitions & RF.
2. Create topic.
3. Describe to verify distribution.
4. Produce sample test messages.
5. Consume to confirm path.
```


## Docker Compose example (minimal)

If your repo has `docker-compose.yml`, ensure advertised listeners are correct. Minimal snippet (for local dev):

```yaml
version: '3.8'
services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.4.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
  kafka:
    image: confluentinc/cp-kafka:7.4.0
    depends_on:
      - zookeeper
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
    ports:
      - 9092:9092
```

Notes: for Docker on macOS/Windows, advertised listeners may need to be set to host.docker.internal or your host IP to allow external clients to connect correctly.

Pitfall:
- If `ADVERTISED_LISTENERS` uses the container hostname and you connect from host with `localhost`, the client may fail—align them.


## kafkajs-specific notes (Node.js)

- Package: `kafkajs` is a popular client for Node.js.
- Basic producer:

```ts
import { Kafka } from 'kafkajs';
const kafka = new Kafka({ clientId: 'app', brokers: ['localhost:9092'] });
const producer = kafka.producer();
await producer.connect();
await producer.send({ topic: 'test-topic', messages: [{ key: 'k1', value: 'hello' }] });
await producer.disconnect();
```

- Basic consumer:

```ts
const consumer = kafka.consumer({ groupId: 'group-1' });
await consumer.connect();
await consumer.subscribe({ topic: 'test-topic', fromBeginning: true });
await consumer.run({ eachMessage: async ({ topic, partition, message }) => {
  // message.value is Buffer | null
  console.log(message.key?.toString(), message.value?.toString());
}});
```

kafkajs tips:
- Use `consumer.run()` with `eachMessage` for per-message handling, or `eachBatch` for batch processing.
- When committing manually, use `consumer.commitOffsets([{ topic, partition, offset }])`.
- To read only committed messages in transactional producers, set `isolation.level` to `read_committed` in consumer config.
- For large throughput tune `maxInFlightRequests` and batch settings (producer) and fetch sizes (consumer).
- Handle `disconnect` and `CONNECT` errors gracefully, and implement retry/backoff.

Example: batch processing (eachBatch)

```ts
await consumer.run({
  eachBatchAutoResolve: false,
  eachBatch: async ({ batch, resolveOffset, heartbeat, commitOffsetsIfNecessary }) => {
    for (const message of batch.messages) {
      console.log(message.offset, message.value?.toString())
      // process message
      resolveOffset(message.offset)
    }
    await commitOffsetsIfNecessary()
    await heartbeat()
  },
})

Why use eachBatch?
- Bulk database writes, better throughput.
- Apply one transform to all messages, commit once.
```


## Troubleshooting Checklist

- Broker not reachable:
  - Ensure Docker container is running; `docker ps`.
  - Check `advertised.listeners` and port mapping (9092).
- Consumer stuck / large lag:
  - Check consumer group offsets via `kafka-consumer-groups.sh`.
  - Verify partitions assigned and no long-running processing blocking commit.
- Messages missing:
  - Check topic retention settings and compaction policy.
  - Confirm correct topic name and bootstrap server.
- Duplicate processing:
  - Ensure offsets are committed at the correct time (after processing) or add idempotence in processing logic.
- Rebalancing churn:
  - Use cooperative rebalancing in supported clients.
  - Check if consumers frequently join/leave (crashes, frequent restarts).

Examples
- Connection error like `ECONNREFUSED`:
  - Ensure Docker is running; `docker ps` shows the Kafka container.
  - Verify port mapping `9092:9092` and `KAFKA_ADVERTISED_LISTENERS` uses `localhost:9092`.
- Consumer not receiving messages:
  - Did you subscribe to the correct topic?
  - Using `fromBeginning: true` only affects first group read; later starts from committed offset.
- High lag:
  - Scale consumers (increase instances) or optimize processing time.

Quick decision tree:
```
Lag high? -> Add consumers or speed processing.
Duplicates? -> Commit after processing; make handlers idempotent.
Missed data? -> Check retention or topic name.
Connection refused? -> Ports/listeners mismatch.
```


## Monitoring & Metrics

- Expose JMX metrics from brokers and use Prometheus + Grafana.
- Key metrics: bytes in/out, request rates, request latencies, under-replicated partitions, leader elections, consumer lag per partition.
- Monitor disk usage and log segment sizes.


## Performance Tuning (brief)

- Producers: batch.size, linger.ms, compression, acks, retries.
- Consumers: fetch.min.bytes, fetch.max.wait.ms, max.poll.records (client-specific), processing speed.
- Brokers: num.io.threads, num.network.threads, socket.send.buffer.bytes, log.segment.bytes, log.retention.ms.
- Partition strategy: more partitions = more throughput but more overhead (memory/file descriptors) and potential for imbalance.

Example quick wins
- Producers: enable compression (lz4 or zstd) and set small `linger.ms` (e.g., 5–20ms) to batch.
- Consumers: increase `fetch.min.bytes` for throughput; ensure processing is fast and non-blocking.
- Brokers: avoid tiny segment sizes; keep RF>=3 for resilience in prod.

Mini benchmark idea:
- Produce 10k messages with `linger.ms=0` vs `linger.ms=15`—measure throughput difference.


## Security Overview

- TLS encryption: set listeners and truststore/keystore.
- Authentication: SASL (PLAIN, SCRAM, GSSAPI/Kerberos, OAUTHBEARER).
- Authorization: ACLs configured on the broker.

Example
- Local dev (PLAINTEXT) needs no TLS/SASL.
- Prod: enable TLS + SASL (e.g., SCRAM), then add ACLs so only allowed apps can read/write topics.

Conceptual ACL examples:
```
inventory-service: READ on orders
fraud-service: READ on orders, WRITE on fraud-alerts
email-service: READ on orders, WRITE on email-events
```


## Best Practices

- Use multiple brokers and replication factor >= 2 (prefer 3) in production.
- Keep topic partition counts planned with growth in mind.
- Use monitoring and alerting for under-replicated partitions and broker health.
- Keep processing idempotent to handle duplicate deliveries.
- Use `acks=all` and synchronous replication for durability-critical data.
- Use compacted topics for changelog/state rather than long retention.

Example checklist before prod
- RF>=3, MinISR>=2, acks=all
- Thoughtful partitions (hot keys, expected throughput)
- Monitoring for URP (under-replicated partitions), controller health, and consumer lag
- Idempotent processing and retries

Beginner launch sanity:
- Can restart consumers without losing processed data? ✅
- Can handle duplicates gracefully? ✅
- Metrics/alerts in place? ✅
- Partition skew checked? ✅


## Useful Resources

- Kafka official docs: https://kafka.apache.org/documentation/
- Kafka configuration reference
- kafkajs: https://kafka.js.org/
- Confluent blog posts and operational guides


---

Notes created for this repo. If you'd like, I can:
- Add a small `kafkajs` example project under `examples/` with scripts,
- Create an `operations.md` with commands and sample `docker-compose.yml` tuned for development,
- Add `npm run` scripts to `package.json` for starting producer/consumer via `ts-node`.

Which follow-up would you prefer?
