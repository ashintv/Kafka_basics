# Transactions & Exactly-Once (EOS)

- Transactions let you write to multiple topics and commit consumed offsets atomically.
- Exactly-once: pair idempotent producer + transactions + read_committed consumers.

Scenario
- Service reads from `pending-payments`, charges card, writes result to `payment-status`, and commits offsets in one transaction.
- Crash before commit → nothing visible to readers with `read_committed`.

Trade-offs
- More complexity and overhead; use when correctness is critical (e.g., money).
