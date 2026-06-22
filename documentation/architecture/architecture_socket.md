# Socket.IO Real-time Communication lifecycle
**Project:** Real-time Support Chat (SupaNova AI)  
**Organization:** Codtech IT Solutions Private Limited  
**Intern:** Naguru Suhas (ID: CITS1993)  

This document visualizes the real-time event pipeline and message exchange channels established over WebSockets.

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer (Client)
    participant SocketServer as Socket.IO Server (Backend)
    actor Agent as Agent (Client)
    participant Database as Database (MongoDB)

    %% Connection Setup
    Customer->>SocketServer: Connect with JWT Auth
    SocketServer->>SocketServer: Validate JWT Token
    SocketServer-->>Customer: Connection Established & Join Personal Notification Room
    SocketServer->>Agent: Broadcast `presence:update` (Customer Online)

    %% Room Join
    Customer->>SocketServer: Emit `conversation:join` { conversationId }
    SocketServer->>SocketServer: Add Customer socket to conversation room channel

    %% Typing Indicators
    Customer->>SocketServer: Emit `typing:start` { conversationId }
    SocketServer->>Agent: Broadcast `typing:start` { conversationId, user }
    Note over Agent: Displays typing indicator in chat window

    Customer->>SocketServer: Emit `typing:stop` { conversationId }
    SocketServer->>Agent: Broadcast `typing:stop` { conversationId, userId }
    Note over Agent: Typing indicator disappears

    %% Message Exchange
    Customer->>SocketServer: Emit `message:send` { conversationId, content }
    SocketServer->>Database: Save message schema (Message.js)
    Database-->>SocketServer: Message Document Saved
    SocketServer-->>Customer: message:send Acknowledgement { ok: true, message }
    SocketServer->>Agent: Emit `message:new` { message }
    Note over Agent: Message appends to chat UI
    SocketServer->>Agent: Emit `notification:new` (Unread Message Badge count increases)
```
