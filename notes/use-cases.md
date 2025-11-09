# Beginner-Friendly Kafka Use Cases

This guide gives simple, detailed scenarios showing where Kafka helps. Each use case includes: problem, flow, events, and why Kafka fits.

---
## 1. Food Delivery Location Tracking
Problem: Need near real-time rider positions so customers can track their order.

Flow:
1. Rider app sends GPS update every 5 seconds to API.
2. Backend publishes event to topic `rider-location`.
3. Consumer group `map-updater` updates in-memory geofence store.
4. Consumer group `history-writer` stores points for analytics.

Sample event:
```json
{ "riderId": "r123", "lat": 51.509, "lng": -0.08, "ts": "2025-11-09T12:00:05Z" }
```
Key choice: `riderId` keeps order of positions per rider.

Why Kafka: Multiple consumers (map, history, alerts) read the same stream without impacting the rider app.

---
## 2. E‑Commerce Order Lifecycle
Problem: Many services need to react when an order changes state.

Events (topic `orders`):
```json
{ "type": "ORDER_PLACED", "orderId": 1001, "userId": "u42", "total": 19.99 }
{ "type": "PAYMENT_CONFIRMED", "orderId": 1001, "method": "VISA" }
{ "type": "ORDER_PACKED", "orderId": 1001, "warehouse": "W-7" }
{ "type": "ORDER_SHIPPED", "orderId": 1001, "carrier": "DHL" }
```

Consumers:
- `inventory-service`: decrements stock on ORDER_PLACED.
- `email-service`: sends notifications on status changes.
- `fraud-service`: analyzes ORDER_PLACED events quickly.
- `analytics`: aggregates totals.

Why Kafka: Fan-out without coupling. Services replay history (e.g., analytics rebuild) by reading offsets from start.

---
## 3. Clickstream Analytics
Problem: Understand user navigation patterns for recommendations.

Flow:
1. Frontend sends click events to collector.
2. Collector pushes to topic `click-events`.
3. Group `recommender` calculates trending products.
4. Group `session-aggregator` builds session summaries.

Event example:
```json
{ "userId": "u7", "page": "/products/42", "ref": "homepage", "ts": 1731153600000 }
```

Partition key: `userId` preserves order within a user session.

Why Kafka: High volume, scalable ingestion; independent real-time + batch consumers.

---
## 4. IoT Sensor Monitoring
Problem: Thousands of devices send temperature readings; need alerts and storage.

Event topic: `sensor-readings`
```json
{ "deviceId": "sensor-808", "tempC": 27.4, "ts": "2025-11-09T12:05:00Z" }
```
Consumers:
- `alerting`: triggers alert if `tempC` exceeds threshold.
- `time-series-writer`: stores in database.
- `anomaly-detector`: looks for sudden jumps.

Kafka fit: Handles burst traffic and lets new analytics consumers join later.

---
## 5. Centralized Logging Pipeline
Problem: Logs in many microservices need unified search + alerts.

Topic: `service-logs`
Log event:
```json
{ "service": "api-gateway", "level": "ERROR", "message": "Timeout", "traceId": "t123", "ts": "2025-11-09T12:06:00Z" }
```
Groups:
- `indexer`: writes to Elasticsearch.
- `alerts`: triggers Slack message on ERROR.
- `dashboard`: aggregates counts per level.

Kafka benefit: Decouple log generation from indexing speed; can re-index by replaying history.

---
## 6. Payment Processing (Exactly-Once Need)
Problem: Ensure charging a card and marking order paid happens exactly once.

Flow:
1. Consumer reads `pending-payments` event.
2. Begins transaction.
3. Charges card (external API).
4. Writes `payment-status` event SUCCESS or FAILURE.
5. Commits transaction (includes consumed offset + produced event).

Event examples:
```json
{ "paymentId": "p77", "orderId": 1001, "amount": 19.99, "currency": "USD" }
{ "paymentId": "p77", "status": "SUCCESS", "orderId": 1001 }
```

Why Kafka: Transactions avoid partial visibility (success event without offset commit or vice versa).

---
## 7. Caching Derived State (Compaction)
Problem: Need current user profile quickly without scanning full history.

Topic (compacted): `user-profile`
Events:
```json
{ "userId": "u42", "name": "Alice", "email": "alice@example.com" }
{ "userId": "u42", "email": "alice@newmail.com" }
```
Compaction keeps latest value per `userId`.

Consumer builds an in-memory map:
```json
{ "u42": { "userId": "u42", "name": "Alice", "email": "alice@newmail.com" } }
```

Why Kafka: Simple replication + snapshot ability by replaying compacted log.

---
## 8. Real-Time Metrics Aggregation
Problem: Aggregate counters (e.g., orders per minute) for dashboards.

Events: Same `orders` topic from use case #2.
Process:
1. Consumer batches 1 minute of events.
2. Counts events per status.
3. Publishes summary to `order-metrics`.

Summary event:
```json
{ "windowStart": "2025-11-09T12:10:00Z", "windowEnd": "2025-11-09T12:11:00Z", "placed": 540, "shipped": 310 }
```

Why Kafka: Windowed processing from ordered partitions, replayable for backfill.

---
## 9. Data Lake Ingestion
Problem: Store raw events for future ML use.

Flow:
1. All domain events (orders, clicks, payments) flow into Kafka topics.
2. Consumer group `lake-writer` dumps Avro/JSON files hourly to S3 with partitioned folder structure.
3. ML jobs read historical S3 snapshots.

Kafka value: Unified buffer and retention before long-term cold storage.

---
## 10. Graceful Service Decoupling
Problem: A new recommendation engine needs past order data; old system was tightly coupled.

Kafka migration:
- Legacy service now publishes order events to `orders`.
- New recommendation engine reads from beginning to build its model.

Why Kafka: Enables incremental adoption without hard redirects or downtime.

---
## Choosing Keys
Guidelines:
- Use entity identifier (userId, orderId) for per-entity ordering.
- Avoid random keys if you need correlation.
- For even distribution: hash of id; for grouping: same key across related messages.

---
## When NOT to Use Kafka (Beginner Perspective)
- Few messages, simple request/response → REST may suffice.
- Need immediate synchronous response (e.g., login auth) → direct call is simpler.
- Small cron updates (hourly single job) → a queue or database table event might be enough.

---
## Cheat Sheet
| Need | Kafka Feature |
|------|---------------|
| Real-time fan-out | Topics + consumer groups |
| Replay history | Durable log + offsets |
| Order per entity | Partition key |
| Scale processing | Add consumers to group |
| Latest state table | Log compaction |
| Strong consistency across read+write | Transactions |

---
Feel free to request more examples; we can add diagrams or queries next.
