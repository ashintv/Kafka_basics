import { Kafka } from "kafkajs";

const kafka = new Kafka({
  clientId: "my-app",
  brokers: ["localhost:9092"],
});

const producer = kafka.producer();

/**
 * Function to run the producer
 * Connects to Kafka and sends messages to the specified topic at regular intervals
 */
const run = async () => {
  try {
    await producer.connect();
    console.log("Producer connected");
    let messageCount = 0;

    setInterval(async () => {
      try {
        const result = await producer.send({
          topic: "test-topic",
          messages: [{ value: `Message ${messageCount}` }],
        });
        console.log("Message sent: ", result);
        messageCount++;
      } catch (err) {
        console.error("Error sending message: ", err);
      }
    }, 1000 * 2);
  } catch (err) {
    console.error("Error in producer: ", err);
  }
};
run();
