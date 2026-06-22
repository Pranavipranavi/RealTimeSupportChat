# Database Design & Entity Relationship Diagram (ERD)
**Project:** Real-time Support Chat (SupaNova AI)  
**Organization:** Codtech IT Solutions Private Limited  
**Intern:** Naguru Suhas (ID: CITS1993)  

This document describes the schema architecture and reference-based relationships within the MongoDB collections.

```mermaid
erDiagram
    USER {
        ObjectId _id PK
        string name
        string email
        string password
        string role "super_admin | admin | agent | customer"
        string approvalStatus "pending | approved | rejected"
        string status "online | offline"
        boolean disabled
        string securityQuestion
        string securityAnswer
        object notificationPreferences
        date lastSeenAt
        date createdAt
    }

    CONVERSATION {
        ObjectId _id PK
        string subject
        string content
        string category "billing | technical | sales | general"
        string priority "low | medium | high | urgent"
        string status "open | assigned | in_progress | resolved | closed"
        ObjectId participants FK "Array of User IDs"
        ObjectId assignedAgent FK "User ID"
        string summary
        array suggestedReplies
        date lastMessageAt
        date createdAt
    }

    MESSAGE {
        ObjectId _id PK
        ObjectId conversationId FK "Conversation ID"
        ObjectId sender FK "User ID"
        string content
        array attachments "File URLs"
        array reactions "Emoji + User ID"
        array readBy "User IDs"
        date createdAt
    }

    RATING {
        ObjectId _id PK
        ObjectId conversationId FK "Conversation ID"
        ObjectId customer FK "User ID"
        number rating "1 to 5"
        string feedback
        date createdAt
    }

    NOTIFICATION {
        ObjectId _id PK
        ObjectId recipient FK "User ID"
        ObjectId sender FK "User ID"
        ObjectId conversationId FK "Conversation ID"
        string type "message | assignment | status_change | approval"
        string title
        string message
        boolean isRead
        date createdAt
    }

    AUDIT_LOG {
        ObjectId _id PK
        ObjectId actor FK "User ID"
        string action "user_role_changed | admin_created | agent_approved | etc."
        string ipAddress
        object metadata
        date createdAt
    }

    USER ||--o{ CONVERSATION : participates
    USER ||--o{ MESSAGE : sends
    USER ||--o{ RATING : writes
    USER ||--o{ NOTIFICATION : receives
    USER ||--o{ AUDIT_LOG : triggers

    CONVERSATION ||--o{ MESSAGE : contains
    CONVERSATION ||--o| RATING : has
    CONVERSATION ||--o{ NOTIFICATION : triggers
```
