# Backend API & Socket Architecture
**Project:** Real-time Support Chat (SupaNova AI)  
**Organization:** Codtech IT Solutions Private Limited  
**Intern:** Naguru Suhas (ID: CITS1993)  

This document visualizes the controller architecture, route handling, and WebSockets setup of the Express server.

```mermaid
graph TD
    %% Server Bootstrap
    IndexJS["index.js (HTTP/WSS Server Start)"] --> AppJS["app.js (Express Middleware Config)"]
    IndexJS --> SocketIndex["socket/index.js (Socket.IO Hookup)"]

    %% Middlewares Layer
    subgraph Middlewares ["Express Router Pipelines"]
        AppJS --> GlobalMidd["Security Headers (Helmet, CORS, rateLimit)"]
        GlobalMidd --> SecurityMidd["Sanitization (sanitizeRequest)"]
        SecurityMidd --> ApiRoutes["/api Router Group"]
    end

    %% Route Categories
    subgraph ApiEndpoints ["Route Endpoints Layer"]
        ApiRoutes --> AuthRoutes["authRoutes.js"]
        ApiRoutes --> ConvRoutes["conversationRoutes.js"]
        ApiRoutes --> MsgRoutes["messageRoutes.js"]
        ApiRoutes --> AdminRoutes["adminRoutes.js"]
        ApiRoutes --> RatingRoutes["ratingRoutes.js"]
    end

    %% Controllers
    subgraph ControllerBusinessLogic ["Business Logic Handlers"]
        AuthRoutes --> AuthCtrl["authController.js"]
        ConvRoutes --> ConvCtrl["conversationController.js"]
        MsgRoutes --> MsgCtrl["messageController.js"]
        AdminRoutes --> AdminCtrl["adminController.js"]
        RatingRoutes --> RatingCtrl["ratingController.js"]
    end

    %% Socket events
    subgraph RealtimeSockets ["Real-time Sockets Pipeline"]
        SocketIndex <--> AuthSocketMiddleware["auth.js (Socket Token Verification)"]
        AuthSocketMiddleware <--> SocketConn["connectionHandler.js"]
        SocketConn <--> ChatSocket["chatHandler.js (typing, messages)"]
        SocketConn <--> PresenceSocket["presenceHandler.js (online status)"]
    end

    %% ODMs
    subgraph MongooseODM ["Mongoose ODM Layer"]
        AuthCtrl & ConvCtrl & MsgCtrl & AdminCtrl & RatingCtrl & ChatSocket & PresenceSocket <--> Models["Mongoose Models"]
    end

    %% DB Link
    Models <--> Database[("MongoDB Database")]
```
