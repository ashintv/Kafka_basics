# Producers

Key settings
- acks: 0 | 1 | all — durability vs latency
- retries: handle transient failures
- linger.ms & batch.size: batching for throughput
- compression: gzip/snappy/lz4/zstd to save bandwidth
- key: choose partition and preserve per-key order

Minimal kafkajs producer
```ts
import { Kafka, CompressionTypes } from 'kafkajs'
const kafka = new Kafka({ clientId: 'demo-producer', brokers: ['localhost:9092'] })
const producer = kafka.producer()
await producer.connect()
await producer.send({
  topic: 'orders',
  compression: CompressionTypes.GZIP,
  messages: [
    { key: 'user-42', value: JSON.stringify({ type: 'ORDER_PLACED', orderId: 1001, total: 19.99 }) }
  ],
})
await producer.disconnect()
```

Sample events (JSON)
```json
{ "type": "ORDER_PLACED", "orderId": 1001, "userId": "user-42", "total": 19.99 }
{ "type": "ORDER_CONFIRMED", "orderId": 1001, "confirmedAt": "2025-11-09T12:00:00Z" }
```

Tips
- Use a stable key for ordering (e.g., userId).
- Prefer acks=all + replication in prod; enable idempotence to avoid duplicates on retries.
