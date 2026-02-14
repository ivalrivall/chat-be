# Realtime Chat Setup (Backend + Frontend)

- [Realtime Chat Setup (Backend + Frontend)](#realtime-chat-setup-backend--frontend)
  - [Architecture Overview](#architecture-overview)
  - [Backend Setup](#backend-setup)
    - [1) Required Services](#1-required-services)
    - [2) Environment Variables](#2-environment-variables)
    - [3) Run API + Worker](#3-run-api--worker)
    - [4) Verify Realtime Flow](#4-verify-realtime-flow)
  - [Frontend Setup](#frontend-setup)
    - [1) Install Client](#1-install-client)
    - [2) Connect to Socket Namespace](#2-connect-to-socket-namespace)
    - [3) Send Message via REST](#3-send-message-via-rest)
    - [4) Handle Incoming Realtime Events](#4-handle-incoming-realtime-events)
  - [Kong API Gateway Setup (Per Module)](#kong-api-gateway-setup-per-module)
    - [1) Routing Strategy](#1-routing-strategy)
    - [2) Example Kong Services and Routes](#2-example-kong-services-and-routes)
    - [3) Auth Strategy with JWT](#3-auth-strategy-with-jwt)
    - [4) Frontend Base URLs Through Kong](#4-frontend-base-urls-through-kong)
  - [End-to-End Test Checklist](#end-to-end-test-checklist)
  - [Troubleshooting](#troubleshooting)

## Architecture Overview

This project uses an async realtime delivery pipeline:

1. Client sends message to `POST /chats/:chatId/messages`.
2. API stores enqueue payload to RabbitMQ.
3. Worker consumes payload, persists message, resolves recipients, publishes notification to Redis.
4. WebSocket gateway subscribes to Redis channel and emits `chat.message.new` to each recipient user socket.

Realtime events are delivered only to authenticated, connected users mapped by `userId -> socketIds` in Redis.

## Backend Setup

### 1) Required Services

Make sure these services are running:

- PostgreSQL
- Redis
- RabbitMQ

You can use Docker Compose from this repository:

```bash
PORT=3000 docker-compose up -d
```

### 2) Environment Variables

Copy `.env.example` to `.env` and ensure these values are correct:

```env
# App
PORT=3000

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# RabbitMQ
RABBITMQ_URI=
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USERNAME=guest
RABBITMQ_PASSWORD=guest
RABBITMQ_VHOST=/
RABBITMQ_CHAT_EXCHANGE=chat.events
RABBITMQ_CHAT_DLX_EXCHANGE=chat.dlx
RABBITMQ_CHAT_QUEUE_PREFIX=chat.message.send
RABBITMQ_CHAT_DLQ_NAME=chat.message.send.dlq
RABBITMQ_CHAT_PARTITION_COUNT=8
RABBITMQ_CHAT_MAX_RETRIES=5
RABBITMQ_CHAT_CONSUMER_PREFETCH=1

# Chat
CHAT_NOTIFICATION_CHANNEL=chat.notifications
CHAT_WORKER_ENABLED=false
```

`CHAT_WORKER_ENABLED` should be:

- `false` in API process
- `true` in worker process

### 3) Run API + Worker

Start API server:

```bash
yarn start:dev
```

In another terminal, start chat worker:

```bash
yarn chat:worker
```

### 4) Verify Realtime Flow

- API accepts send-message request (`202 Accepted`)
- Worker persists message and publishes notification
- Gateway emits socket event `chat.message.new`

## Frontend Setup

### 1) Install Client

```bash
yarn add socket.io-client
```

### 2) Connect to Socket Namespace

Use Socket.IO namespace `/chat` and pass access token from login:

```ts
import { io } from 'socket.io-client';

const API_BASE_URL = 'http://localhost:3000';
const accessToken = '<JWT_ACCESS_TOKEN>';

export const chatSocket = io(`${API_BASE_URL}/chat`, {
  transports: ['websocket'],
  auth: {
    token: accessToken,
  },
});

chatSocket.on('connect', () => {
  console.log('Connected to chat socket:', chatSocket.id);
});

chatSocket.on('disconnect', () => {
  console.log('Disconnected from chat socket');
});
```

You can also send token via `Authorization: Bearer <token>` header if needed.

### 3) Send Message via REST

Send message to backend endpoint:

`POST /chats/:chatId/messages`

Example payload:

```json
{
  "content": "Hello from sender",
  "clientMessageId": "11111111-1111-1111-1111-111111111111"
}
```

Expected response (`202 Accepted`):

```json
{
  "brokerMessageId": "22222222-2222-2222-2222-222222222222",
  "clientMessageId": "11111111-1111-1111-1111-111111111111"
}
```

### 4) Handle Incoming Realtime Events

Listen for new messages:

```ts
chatSocket.on('chat.message.new', (payload) => {
  const { chatId, message } = payload;
  console.log('New realtime message', chatId, message);
  // Update your chat state/store here
});
```

## Kong API Gateway Setup (Per Module)

If you use Kong as API gateway for each module, separate REST and realtime routes clearly.

### 1) Routing Strategy

Recommended public routes:

- Auth module REST: `/auth/*`
- Chat module REST: `/chats/*`
- Chat realtime Socket.IO handshake/transport: `/socket.io/*`

Why `/socket.io/*` for realtime:

- Socket.IO uses `/socket.io` transport path for polling/websocket upgrade.
- Namespace stays `/chat` in your client code and server gateway.

### 2) Example Kong Services and Routes

Example for local backend on `http://chat-be:3000`:

```yaml
services:
  - name: chat-be-service
    url: http://chat-be:3000
    routes:
      - name: chat-rest-route
        paths:
          - /chats
        strip_path: false
      - name: auth-rest-route
        paths:
          - /auth
        strip_path: false
      - name: chat-socket-route
        paths:
          - /socket.io
        strip_path: false
        protocols:
          - http
          - https
```

Notes:

- Keep `strip_path: false` so upstream receives expected paths.
- Ensure websocket upgrade is allowed on Kong entrypoint.
- If you enable timeouts, keep websocket read timeout high.

### 3) Auth Strategy with JWT

This backend validates JWT in NestJS:

- REST endpoints use app auth guards.
- Socket connection validates token in `ChatGateway` (`auth.token` or `Authorization` header).

You can choose:

1. Validate JWT only in NestJS (simpler, current design).
2. Validate in Kong and still forward token to NestJS (defense in depth).

If Kong validates JWT, still forward `Authorization` header to keep current app behavior unchanged.

### 4) Frontend Base URLs Through Kong

Frontend should call Kong URL (not direct service URL):

```ts
import axios from 'axios';
import { io } from 'socket.io-client';

const KONG_BASE_URL = 'https://api.example.com';
const accessToken = '<JWT_ACCESS_TOKEN>';

export const apiClient = axios.create({
  baseURL: KONG_BASE_URL,
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});

export const chatSocket = io(`${KONG_BASE_URL}/chat`, {
  path: '/socket.io',
  transports: ['websocket'],
  auth: {
    token: accessToken,
  },
});
```

REST example through Kong:

- `POST https://api.example.com/chats/:chatId/messages`

Socket event stays same:

- `chat.message.new`

Event shape:

```json
{
  "chatId": "<chat-uuid>",
  "message": {
    "id": "<message-uuid>",
    "chatId": "<chat-uuid>",
    "senderId": "<user-uuid>",
    "content": "Hello",
    "messageType": "text",
    "status": "sent",
    "sequence": 1,
    "sentAt": "2026-02-14T12:00:00.000Z"
  }
}
```

## End-to-End Test Checklist

1. Login as user A and user B.
2. Connect both clients to `/chat` with each user access token.
3. Ensure both users are participants in the same chat.
4. User A sends message through Kong route `POST /chats/:chatId/messages`.
5. User B receives `chat.message.new` in realtime through Kong websocket route.
6. User A does not receive duplicate recipient event from recipient fanout.

## Troubleshooting

- No realtime event received:
  - Confirm API process is running and reachable.
  - Confirm worker process is running (`yarn chat:worker`).
  - Confirm Redis and RabbitMQ are healthy.
  - Confirm frontend connects to `http://<host>:<port>/chat` namespace.
  - Confirm JWT is valid access token.
- Message accepted but not emitted:
  - Check worker logs for consumer errors.
  - Check Redis channel setting `CHAT_NOTIFICATION_CHANNEL` is same in API and worker.
- Only sender connected but recipient offline:
  - Realtime event only emits to active sockets for recipient user.
  - Fetch message history via `GET /chats/:chatId/messages` when recipient reconnects.
