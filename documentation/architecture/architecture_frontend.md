# Frontend Component Architecture
**Project:** Real-time Support Chat (SupaNova AI)  
**Organization:** Codtech IT Solutions Private Limited  
**Intern:** Naguru Suhas (ID: CITS1993)  

This document visualizes the internal structural flow and React components architecture of the client application.

```mermaid
graph TD
    %% Entry Point
    MainJSX["main.jsx (Root Render)"] --> AppJSX["App.jsx (App Entry & Theme Engine)"]
    
    %% Router
    subgraph RouterControl ["React Router Dom"]
        AppJSX --> Routes["Route Definitions"]
        Routes --> PublicRoutes["Public (LandingPage / AuthPage / Reset)"]
        Routes --> ProtectedRoutes["Protected AppShell (Role-Based Guards)"]
    end

    %% State Management
    subgraph StoreLayer ["State Stores (Zustand & Cache)"]
        AuthStore["useAuthStore (Token, User Session)"]
        UiStore["useUiStore (Theme, Active Sidebar)"]
        ReactQuery["React Query Cache (Ticket queries)"]
    end

    %% Protected Subpages
    subgraph ViewLayouts ["Dashboard View Layers"]
        ProtectedRoutes --> CustomerDash["CustomerDashboard.jsx (Tickets, Create Form)"]
        ProtectedRoutes --> AgentDash["AgentDashboard.jsx (Assigned List, Actions)"]
        ProtectedRoutes --> AdminDash["AdminDashboard.jsx (Analytics, System Config)"]
        ProtectedRoutes --> UserDash["UserManagement.jsx (Admin Users, Agents Approvals)"]
        ProtectedRoutes --> SharedChat["ChatPage.jsx (Real-time Chat Portal)"]
    end

    %% Helpers
    subgraph HelpersLayer ["Utilities & APIs"]
        ApiClient["client.js (Axios instance with JWT interceptors)"]
        SocketClient["socketService.js (Socket.io client listener)"]
    end

    %% Dependencies
    SharedChat <--> SocketClient
    CustomerDash & AgentDash & AdminDash & UserDash --> ApiClient
    ApiClient & SocketClient <--> AuthStore
```
