# Partitioning & Ordering

- Ordering is guaranteed per partition, not per topic.
- More partitions = more throughput, but careful with hot keys.
- Changing partition count later can move keys → may disrupt historical ordering.

Which partition?
```
partitions = 3
hash('user-1') % 3 -> 1
hash('user-2') % 3 -> 0
hash('user-3') % 3 -> 2
```

Rule of thumb
- Partitions ≈ peak msg/sec ÷ safe per-partition rate.
- Example: 24k msg/s, ~4k per partition → 6 partitions.
