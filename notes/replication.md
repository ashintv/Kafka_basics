# Replication & Fault Tolerance

- Replication factor (RF) = number of copies; RF≥3 for prod often.
- MinISR controls how many replicas must ack.
- Leader handles reads/writes; followers replicate.

Layout example
```
Broker1  Broker2  Broker3
 P0*      P0r      P0r   (*=leader, r=replica)
 P1r      P1*      P1r
 P2r      P2r      P2*
```

Failure example
- RF=3, MinISR=2: if one broker fails, writes can continue (2 replicas remain).
- If two fail, partition may be unavailable until ISR recovers.
