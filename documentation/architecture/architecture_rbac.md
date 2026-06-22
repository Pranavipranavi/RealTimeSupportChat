# Authentication & Role-Based Access Control (RBAC) Flow
**Project:** Real-time Support Chat (SupaNova AI)  
**Organization:** Codtech IT Solutions Private Limited  
**Intern:** Naguru Suhas (ID: CITS1993)  

This document visualizes the user authentication lifecycle and permission routing of the application's RBAC matrix.

```mermaid
graph TD
    %% Authentication Phase
    Start([User Requests Login/App Access]) --> AuthCheck{Has Valid JWT Token?}
    
    AuthCheck -->|No| LoginScreen[Display AuthPage / Login / Register]
    AuthCheck -->|Yes| FetchProfile[GET /api/auth/me]
    
    LoginScreen -->|Submit Credentials| VerifyCredentials{Credentials Match?}
    VerifyCredentials -->|No| ShowError[Display Alert Notification]
    VerifyCredentials -->|Yes| GenerateToken[Issue JWT Token & Save in Store] --> FetchProfile
    
    %% Setup Guard
    FetchProfile --> SecurityGuard{Has Configured Security Question?}
    SecurityGuard -->|No| SecuritySetup[Force Redirect: SecuritySetupPage]
    SecurityGuard -->|Yes| RoleGuards{Check User Role}

    %% RBAC Enforcement
    subgraph RoleAccessMatrix ["Role-Based Dashboards & API Gateways"]
        RoleGuards -->|customer| CustomerDash["Customer Dashboard & Chat Route (/customer)"]
        RoleGuards -->|agent| AgentStatusCheck{Is Agent Approved by Admin?}
        RoleGuards -->|admin| AdminDash["Admin Control Panel (/admin)"]
        RoleGuards -->|super_admin| SuperAdminDash["Super Admin Control Panel (/admin)"]
    end

    AgentStatusCheck -->|No| PendingPage[Redirect: AgentPendingPage]
    AgentStatusCheck -->|Yes| AgentDash["Agent Console & Active Chats Route (/agent)"]

    %% Permissions Map
    CustomerDash -->|Permissions| CustPerms["Create tickets, Chat on own tickets, Rate resolved tickets"]
    AgentDash -->|Permissions| AgentPerms["View assigned tickets, Chat on assigned tickets, Set online status"]
    AdminDash -->|Permissions| AdminPerms["Read analytics, View all conversations, Access User Management, View Agent list"]
    SuperAdminDash -->|Permissions| SuperAdminPerms["Manage roles, Approve agents, System config, Manually reassign tickets, View audit logs"]
```
