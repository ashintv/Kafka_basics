# Troubleshooting

Common issues & fixes
- ECONNREFUSED: Ensure Docker is running, port 9092 mapped, advertised.listeners matches how clients connect.
- No messages: Subscribed to correct topic? Using `fromBeginning` only affects the first group read.
- High lag: Scale consumers or speed processing; check partition count.
- Duplicates: Commit offsets after processing; make handlers idempotent.

Decision tree
```
Lag high? -> Add consumers or optimize work
Duplicates? -> Move commit after processing; make writes idempotent
Missing data? -> Retention expired? Wrong topic?
Conn refused? -> Port/listener mismatch
```

Monitoring targets
- Under-replicated partitions
- Consumer lag per group/partition
- Broker disk usage and request latency
