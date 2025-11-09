# Retention & Compaction

Retention
- Keep all events for a time/size window (e.g., 7 days).
- Good for audit, replay, and history analysis.

Compaction
- Keep only the latest value per key (like a table snapshot).
- Good for state/changelog topics (e.g., latest user profile).

Configs (examples)
```
retention.ms=604800000        # 7 days
cleanup.policy=compact        # keep latest value per key
min.cleanable.dirty.ratio=0.5
segment.ms=600000
```

Tip
- Use retention for history, compaction for current state. You can combine both.
