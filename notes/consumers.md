# Consumers & Groups

Basics
- Consumers read per-partition in order.
- A group splits partitions across instances (parallelism).
- Commit offsets after processing for at-least-once semantics.

Manual commit example (kafkajs)
```ts
import { Kafka } from 'kafkajs'
const kafka = new Kafka({ clientId: 'demo-consumer', brokers: ['localhost:9092'] })
const consumer = kafka.consumer({ groupId: 'orders-workers' })
await consumer.connect()
await consumer.subscribe({ topic: 'orders', fromBeginning: true })
await consumer.run({
  autoCommit: false,
  eachMessage: async ({ topic, partition, message }) => {
    const val = message.value?.toString()
    // process val safely
    await consumer.commitOffsets([{ topic, partition, offset: (Number(message.offset)+1).toString() }])
  }
})
```

Real-world
- Group `indexer` stores logs in Elasticsearch.
- Group `alerts` scans for errors to notify on Slack.

Tip
- Monitor consumer lag and scale instances to match partition count and processing speed.
