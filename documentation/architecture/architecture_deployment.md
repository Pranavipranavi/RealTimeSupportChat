# Deployment Topology Diagram
**Project:** Real-time Support Chat (SupaNova AI)  
**Organization:** Codtech IT Solutions Private Limited  
**Intern:** Naguru Suhas (ID: CITS1993)  

This document visualizes the production deployment topology on Vercel, Render, and MongoDB Atlas.

```mermaid
graph TD
    %% User entry
    Developer["Naguru Suhas (Dev / Intern)"] -->|git push| GitHub["GitHub Repository"]

    subgraph HostingPlatforms ["Production Hosting Environments"]
        %% Frontend Hosting
        subgraph VercelCloud ["Vercel (Frontend Host)"]
            VercelRouter["Vercel Edge Router"]
            ReactCDN["React Client (Static/Vite Bundles)"]
        end

        %% Backend Hosting
        subgraph RenderCloud ["Render (Backend Server Host)"]
            RenderLoadBalancer["Render Load Balancer"]
            ExpressServer["Express.js Server Node (PaaS)"]
        end

        %% Database Hosting
        subgraph MongoCloud ["MongoDB Atlas (Database Host)"]
            AtlasCluster["Multi-Region Replica Set Cluster"]
        end
    end

    %% CI/CD Flows
    GitHub -->|CI/CD trigger build| ReactCDN
    GitHub -->|CI/CD trigger deploy| ExpressServer

    %% Runtime Network traffic
    ClientBrowser["Client Browser (End-User)"] -->|Fetch HTML/CSS/JS| VercelRouter
    VercelRouter --> ReactCDN
    
    ClientBrowser <-->|WebSocket Events / HTTPS REST| RenderLoadBalancer
    RenderLoadBalancer --> ExpressServer
    
    ExpressServer <-->|Database operations (Mongoose)| AtlasCluster
```
