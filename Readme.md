# SimpleKafka (Kafka_basics)

A minimal example using Kafka with Node.js and kafkajs. This project shows a basic producer and consumer (TypeScript) and a Docker Compose setup for a local Kafka broker.

## Highlights

- Uses kafkajs for Kafka client in Node.js.
- Example `producer.ts` and `consumer.ts` in `src/`.
- `consumer` subscribes to topic `test-topic` and logs message values.

## Prerequisites

- Docker and Docker Compose
- Node.js (recommended >= 18)
- npm or yarn

## Quick start (recommended)

Start Kafka (using the included Docker Compose):

```bash
# from project root
docker-compose up -d
```

Install dependencies:

```bash
npm install
# or
# yarn
```

Run the consumer (TypeScript files are in `src/`):

Option A — using ts-node (recommended for quick run):

```bash
# install ts-node/typescript if you don't have them
npm install -D ts-node typescript
npx ts-node src/consumer.ts
```

Option B — compile and run:

```bash
# compile
npx tsc
# run compiled JS
node dist/src/consumer.js
```

Run the producer (to send messages):

```bash
# with ts-node
npx ts-node src/producer.ts
```

## What the consumer logs

The `consumer.ts` logs incoming messages like:

```
{ value: 'some message payload' }
```

This simple consumer connects to `localhost:9092`, subscribes to `test-topic` (from the start), and prints message values.

## Project structure

```
/
├─ docker-compose.yml      # docker config to run Kafka locally
├─ package.json
├─ Readme.md               # existing file (this repo may have it)
├─ README.md               # (this file)
├─ tsconfig.json
└─ src/
        ├─ consumer.ts          # example consumer using kafkajs
        └─ producer.ts          # example producer
```

## Configuration notes

- The Kafka host is configured as `localhost:9092` in the code.
- Consumer group in `src/consumer.ts` is `test-group` and topic is `test-topic`.

If you change broker addresses or topic names, update `src/producer.ts` and `src/consumer.ts` accordingly.

## Troubleshooting

- If your consumer can't connect, ensure Docker Compose started the broker and it's listening on port 9092.
- To check Docker containers:

```bash
docker ps
```

- If you see TLS/auth errors or host resolution problems, review `docker-compose.yml` and your Docker network settings.

## Tests and validation

This repo contains minimal example code. To validate the end-to-end flow:

1. Start Docker Compose.
2. Start the consumer.
3. Run the producer to send messages.
4. Confirm the consumer prints the messages.







