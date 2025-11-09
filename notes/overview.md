# Overview

Kafka is a distributed event streaming platform. Think of it as a durable, append-only log that many producers write to and many consumers read from, independently.

Why Kafka?
- Decouple services (producers don’t wait for consumers)
- Replayable history (re-read events for new features)
- Scalability via partitions

Quick analogy
- Topic = named folder of events
- Partition = subfolder to scale
- Offset = line number in the subfolder

Real-world examples
- Food delivery: GPS updates stream to a topic; a map app consumes and updates positions.
- E‑commerce: Clicks sent to `clickstream` for analytics and recommendations.
- IoT: Sensor readings ingested for alerting and storage.

Next steps
- Browse foundational terms: `core-concepts.md`
- See real systems in action: `use-cases.md`
