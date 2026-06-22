# Screenshot & Output Image Requirements Guide
**Project:** Real-time Support Chat (SupaNova AI)  
**Organization:** Codtech IT Solutions Private Limited  
**Intern:** Naguru Suhas (ID: CITS1993)  

This document outlines the exact screenshots and output images that must be captured from the working application. The folders `screenshots/` and `output-images/` have been created in the repository root. Please capture these images using the guidelines below and save them with the exact filenames listed.

---

## Important Rules for Capture
1. **Use Demo/Test Data Only:** Do not enter any real-world customer or proprietary company information. Use mock emails (e.g., `customer@example.com`, `agent@example.com`).
2. **No Personal Photos or Info:** Ensure user avatars are generic initials or icons, and do not use personal pictures, names, or addresses.
3. **Clean Browser Window:** Hide bookmarks bar, extensions icons, and system tray. Crop screenshots to focus on the application interface itself.
4. **Consistency:** Use consistent mock data across dashboards to make the presentation logical (e.g., show a ticket created by a customer, and then show that exact same ticket on the agent dashboard).

---

## 1. Screenshots (`screenshots/` folder)

Save the following screenshots inside the `screenshots/` directory:

| Filename | Component / Page | What to Capture |
| :--- | :--- | :--- |
| `01_landing_page.png` | Landing Page | Hero section, features overview, and modern glassmorphic headers. |
| `02_login_page.png` | Login Page | The credentials input form, Google OAuth option, and clean styling. |
| `03_register_page.png` | Register Page | The signup form showing role selection (`Customer` / `Agent`). |
| `04_customer_dashboard.png` | Customer Dashboard | List of customer's active tickets, ticket stats, and "Create Ticket" button. |
| `05_customer_chat.png` | Customer Chat View | The active real-time chat interface showing messages, typing indicators, and attachments. |
| `06_customer_profile.png` | Customer Profile Page | Profile edit form (name, email, company, and notification preferences). |
| `07_agent_dashboard.png` | Agent Dashboard | List of assigned tickets, agent presence toggle (online/offline), and statistics. |
| `08_agent_chat.png` | Agent Chat View | Agent responding to customer ticket in real-time, message search box, and action buttons. |
| `09_agent_pending.png` | Agent Pending Page | The placeholder screen shown to agents awaiting admin approval after registration. |
| `10_admin_dashboard.png` | Admin Dashboard | Summary metrics (total tickets, resolved rates, CSAT score) and conversation overview. |
| `11_agent_management.png` | Agent Management | Admin interface for approving/rejecting registered agents, disabling agents, or reassigning them. |
| `12_user_management.png` | User Management | Admin list of all registered users (customers and agents) with search and pagination. |
| `13_conversation_management.png` | Conversation Management | Admin view to monitor all open conversations across the system. |
| `14_analytics_dashboard.png` | Analytics Dashboard | CSAT ratings, average response times, ticket categories breakdown, and agent performance charts. |
| `15_notifications_view.png` | Notifications Panel | The toast alert notifications and the list of read/unread system notifications. |
| `16_security_setup.png` | Security Setup Page | Recovery question setup page during registration/login (security recovery question + answer). |
| `17_dark_mode.png` | Dark Mode View | Any dashboard showing the active CSS dark mode toggle and theme rendering. |
| `18_mobile_responsive.png` | Mobile View | The layout of the customer dashboard/chat as displayed in a simulated mobile viewport. |

---

## 2. Output Images (`output-images/` folder)

Capture and save these images inside the `output-images/` directory to document successful system flows:

| Filename | Flow / Output Event | What to Capture |
| :--- | :--- | :--- |
| `out_registration_success.png` | Registration Success | Toast alert or redirect indicating successful user registration. |
| `out_login_success.png` | Login Success | Dashboard landing page immediately after entering credentials. |
| `out_ticket_creation.png` | Ticket Creation Success | Toast confirmation / immediate appearance of new ticket in customer dashboard. |
| `out_message_sent.png` | Message Sent Success | Visual message bubble added to conversation history with checkmarks or status. |
| `out_agent_assignment.png` | Agent Assignment Success | System message within chat or admin action showing agent assignment updated. |
| `out_workflow_update.png` | Ticket Status Transition | System notification or visual status tag changing from `assigned` to `resolved`. |
| `out_agent_approval.png` | Agent Approval Action | Admin console or screen action confirming "Agent Approved". |
| `out_notification_success.png` | Toast Notification Popup | Active popup in bottom/top corner confirming new message or event. |
| `out_analytics_charts.png` | Analytics Output Visuals | Rendered graphs and charts in the Analytics Dashboard showing dummy metrics. |
| `out_deployment_success.png` | Deployment Logs | Terminal logs showing successful build or hosting on Vercel/Render. |
| `out_backend_health.png` | Health Check JSON | Browser display of `GET /health` responding with status `ok` and timestamp. |
