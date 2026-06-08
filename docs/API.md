# SupportFlow AI API

Base URL: `http://localhost:5000`

Authentication: send `Authorization: Bearer <jwt>` for protected routes.

## Auth

### `POST /api/auth/register`

```json
{
  "name": "Jane Customer",
  "email": "jane@example.com",
  "password": "password123",
  "role": "customer"
}
```

Roles accepted publicly: `customer`, `agent`.

### `POST /api/auth/login`

```json
{
  "email": "jane@example.com",
  "password": "password123"
}
```

### `POST /api/auth/google`

```json
{
  "credential": "google-id-token",
  "role": "customer"
}
```

Requires `GOOGLE_CLIENT_ID`.

### `POST /api/auth/forgot-password`

```json
{
  "email": "jane@example.com"
}
```

Returns a generic response. In non-production environments, the response includes `resetToken` to support local testing without an email provider.

### `POST /api/auth/reset-password`

```json
{
  "token": "reset-token",
  "password": "newpassword123"
}
```

### `GET /api/auth/me`

Returns the authenticated user.

### `PATCH /api/auth/profile`

```json
{
  "name": "Jane Doe",
  "avatar": "https://example.com/avatar.png"
}
```

### `POST /api/auth/logout`

Marks the user offline.

## Conversations

### `GET /api/conversations`

Query params: `q`, `status`, `category`.
Pagination params: `page`, `limit`.

Customers see their conversations. Agents see assigned conversations. Admins see all conversations.

### `POST /api/conversations`

```json
{
  "subject": "API webhook failing",
  "content": "Webhook events are returning 500 errors.",
  "category": "technical"
}
```

`category` is optional. If omitted, SupportFlow AI categorizes the conversation locally.

### `GET /api/conversations/:id`

Returns conversation details, messages, and the current customer's rating if present.

### `PATCH /api/conversations/:id/status`

Agent/admin only.

```json
{
  "status": "resolved"
}
```

Valid statuses: `open`, `pending`, `resolved`, `closed`.

### `POST /api/conversations/:id/summary`

Generates a local summary from the message history.

## Messages

### `POST /api/messages/:conversationId`

Multipart form-data:

- `content`: optional text
- `attachments`: up to 5 files

Supported uploads: images, PDFs, Word documents, text files.

### `GET /api/messages/search?q=refund`

Searches visible messages.
Pagination params: `page`, `limit`.

### `POST /api/messages/:conversationId/read`

Marks messages in the conversation as read.

### `POST /api/messages/:messageId/reactions`

```json
{
  "emoji": "👍"
}
```

Toggles the current user's reaction.

## Ratings

### `POST /api/ratings/:conversationId`

Customer only for conversations they participate in.

```json
{
  "rating": 5,
  "feedback": "Fast and clear support."
}
```

## Admin

Admin routes require role `admin`.

### `GET /api/admin/analytics`

Returns:

- total users
- active users
- messages today
- total conversations
- ticket counts by status
- average response time
- customer satisfaction score
- agent performance metrics

### `GET /api/admin/users`

Query params: `role`, `q`.
Pagination params: `page`, `limit`.

### `PATCH /api/admin/users/:id/role`

```json
{
  "role": "agent"
}
```

Valid roles: `customer`, `agent`, `admin`.

## Notifications

### `GET /api/notifications`

Returns current user's persisted notifications and unread count.

Query params: `page`, `limit`.

### `POST /api/notifications/read`

Marks all current user's unread notifications as read.

## Socket.io

Connect with:

```js
io(API_URL, { auth: { token } })
```

### Client Emits

- `conversation:join`, payload: `conversationId`
- `conversation:leave`, payload: `conversationId`
- `typing:start`, payload: `{ conversationId }`
- `typing:stop`, payload: `{ conversationId }`
- `message:send`, payload: `{ conversationId, content }`, ack: `{ ok, message }`
- `message:read`, payload: `{ conversationId }`

### Server Emits

- `presence:list`, payload: online user IDs
- `presence:update`, payload: `{ userId, status, lastSeenAt }`
- `conversation:new`, payload: conversation
- `conversation:update`, payload: conversation
- `message:new`, payload: message
- `message:reaction`, payload: message
- `message:read`, payload: `{ conversationId, userId, readAt }`
- `notification:new`, payload: notification
- `typing:start`, payload: `{ conversationId, user }`
- `typing:stop`, payload: `{ conversationId, userId }`
