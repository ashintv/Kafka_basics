import { Kafka } from "kafkajs";

const kafka = new Kafka({
  clientId: "my-app",
  brokers: ["localhost:9092"],
});

const consumer = kafka.consumer({ groupId: "test-group" });

const run = async () => {
  try {
    await consumer.connect();
    console.log("Consumer connected");
    await consumer.subscribe({ topic: "test-topic", fromBeginning: true });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        console.log({
          value: message.value?.toString(),
        });
      },
    });
  } catch (err) {
    console.error("Error in consumer: ", err);
  }
};

run()
