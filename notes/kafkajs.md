# kafkajs Quickstart & Tips

Producer quickstart
```ts
import { Kafka } from 'kafkajs'
const kafka = new Kafka({ clientId: 'app', brokers: ['localhost:9092'] })
const producer = kafka.producer()
await producer.connect()
await producer.send({ topic: 'test-topic', messages: [{ key: 'k1', value: 'hello' }] })
await producer.disconnect()
```

Consumer quickstart
```ts
const consumer = kafka.consumer({ groupId: 'group-1' })
await consumer.connect()
await consumer.subscribe({ topic: 'test-topic', fromBeginning: true })
await consumer.run({ eachMessage: async ({ message }) => console.log(message.value?.toString()) })
```

Tips
- Use `eachBatch` for bulk processing and fewer commits.
- Tune producer batching (`linger.ms`, batches) and compression for throughput.
- Handle disconnects/retries gracefully.
