# System Architecture Diagram
**Project:** Real-time Support Chat (SupaNova AI)  
**Organization:** Codtech IT Solutions Private Limited  
**Intern:** Naguru Suhas (ID: CITS1993)  

This document describes the high-level system architecture of the SupaNova AI customer support platform.

```mermaid
graph TD
    %% Clients
    subgraph ClientLayer ["Client Tier (React/Vite)"]
        CustomerUI["Customer Portal (Dashboard / Chat)"]
        AgentUI["Agent Console (Dashboard / Chat)"]
        AdminUI["Admin Control Panel (User/Agent Mgmt)"]
        SuperAdminUI["Super Admin Dashboard (RBAC / Workflows)"]
    end

    %% Gateway
    subgraph NetworkLayer ["Routing & Security"]
        VercelEdge["Vercel Edge Gateway (SSL/HTTPs)"]
        CORSFilter["CORS Middleware"]
        RateLimiter["Rate Limiting Middleware"]
    end

    %% Servers
    subgraph ServerLayer ["Application Tier (Node/Express)"]
        ExpressApp["Express API Server"]
        SocketServer["Socket.IO Server (Real-time Events)"]
        SecuritySanitizer["Request Sanitization (xss-clean)"]
    end

    %% Database
    subgraph DatabaseLayer ["Data Persistence Tier"]
        MongoDBAtlas["MongoDB Atlas Cluster"]
        MongooseODM["Mongoose ODM (Schema Rules)"]
    end

    %% Connections
    CustomerUI & AgentUI & AdminUI & SuperAdminUI -->|HTTPS Request| VercelEdge
    VercelEdge --> CORSFilter
    CORSFilter --> RateLimiter
    RateLimiter --> SecuritySanitizer
    SecuritySanitizer --> ExpressApp
    
    CustomerUI & AgentUI & AdminUI & SuperAdminUI <-->|WebSockets (WSS)| SocketServer
    
    ExpressApp & SocketServer <--> MongooseODM
    MongooseODM <--> MongoDBAtlas
```
