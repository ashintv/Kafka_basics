# CLI & Operations Basics

Create topic
```
kafka-topics.sh --create --topic my-topic --bootstrap-server localhost:9092 --partitions 3 --replication-factor 1
```

List/describe
```
kafka-topics.sh --list --bootstrap-server localhost:9092
kafka-topics.sh --describe --topic my-topic --bootstrap-server localhost:9092
```

Console producer/consumer
```
kafka-console-producer.sh --topic test-topic --bootstrap-server localhost:9092
kafka-console-consumer.sh --topic test-topic --bootstrap-server localhost:9092 --from-beginning
```

Consumer groups
```
kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --group my-group
```

Docker tip
```
docker exec -it <kafka-container> kafka-topics --list --bootstrap-server localhost:9092
```

Safe workflow
1) Decide partitions & RF → 2) Create → 3) Describe → 4) Produce test → 5) Consume test.
