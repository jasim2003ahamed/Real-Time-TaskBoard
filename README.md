# SyncBoard | Real-Time Collaborative Task Board 👋

SyncBoard is a fast, real-time shared task board built to make team collaboration seamless. Designed with **Next.js**, **Node.js**, and **PostgreSQL**, it synchronizes changes across all open browser windows instantly using WebSockets. 

No page refreshes, no manual syncing—just a smooth, collaborative Kanban board.

---

## ✨ Key Features

- **Instant Real-Time Syncing**: When you drag, rename, create, or delete a card, other users see it happen live on their screens.
- **Drag-and-Drop Column Reordering**: Move cards between columns (Todo, In Progress, Done) with ease.
- **Live User Presence**: See exactly how many people are online right now via the indicator in the header.
- **Smart Connection Recovery**: If you temporarily lose internet connection, the app displays a reconnecting state and automatically synchronizes with the database once you are back online.
- **Postgres Persistence**: All tasks and movements are stored in PostgreSQL.

---

## 📂 Project Directory Structure

```text
Real-time-dashboard/
├── backend/
│   ├── config/          # Database connection pool configuration
│   ├── services/        # Standalone WebSocket handler
│   ├── utils/           # Shared utility tools (e.g. logger)
│   ├── schema.sql       # PostgreSQL database schema scripts
│   ├── server.js        # Entry point for WebSocket server
│   └── package.json     # Backend package configuration
│
└── frontend/
    ├── public/          # Static browser assets
    ├── src/
    │   ├── app/         # Next.js Pages & REST API routes (App Router)
    │   ├── components/  # React components (Column, Card, Header, forms)
    │   ├── hooks/       # Custom React hooks (handles WS connection lifecycle)
    │   ├── lib/         # Next.js Server database clients
    │   ├── services/    # Client HTTP request services
    │   └── types/       # TypeScript declarations
    ├── tsconfig.json    # TypeScript compiler configuration
    └── package.json     # Frontend package configuration and scripts
```

---

## 🚀 Setting Up the Project

### 1. Prerequisites
- **Node.js** (v20.x or higher)
- **npm** (v10.x or higher)
- **PostgreSQL** (v17.x or higher running locally on default port `5432`)

---

### 2. Database Setup
Create a PostgreSQL database named `realtime_taskboard` and run the database schema file to initialize the tables:

```bash
# 1. Create the database
psql -U postgres -h 127.0.0.1 -c "CREATE DATABASE realtime_taskboard;"

# 2. Run the schema script to create table
psql -U postgres -h 127.0.0.1 -d realtime_taskboard -f backend/schema.sql
```

> [!TIP]
> The database pool client automatically falls back to:
> `postgresql://username:password@localhost:5432/realtime_taskboard`
> If you have custom database credentials, you can configure them by setting the `DATABASE_URL` environment variable:
> `DATABASE_URL="postgresql://username:password@localhost:5432/dbname"`

---

### 3. Environment Configuration
If you need to change ports or database settings, copy the env template and adjust the values inside:

**Create a `.env` in the `frontend` folder:**
```bash
cp frontend/.env.example frontend/.env
```

**Environment parameters available:**
- `DATABASE_URL`: The PostgreSQL connection string. 
- `WS_PORT`: The WebSocket listener port. (Defaults to: `3001`)

---

### 4. Installing Dependencies
You need to install dependencies for both the frontend and backend workspaces:

**Install Backend Dependencies:**
```bash
cd backend
npm install
```

**Install Frontend Dependencies:**
```bash
cd frontend
npm install
```

---

### 5. Starting the Applications
You need to run both the Next.js frontend and the WebSocket backend server. Open two separate terminal windows:

**Terminal 1 (Start the WebSocket Server):**
```bash
cd backend
npm start
```
*Runs on port `3001`.*

**Terminal 2 (Start the Next.js Development Server):**
```bash
cd frontend
npm run dev
```
*Runs on port `3000`.*

Now open your browser and navigate to **[http://localhost:3000](http://localhost:3000)**!

---

## 🛠️ Architecture & Tech Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend UI** | Next.js 16 (App Router) | High performance web page rendering and reactivity. |
| **Styling** | Vanilla CSS | Custom Glassmorphism styles and micro-animations. |
| **REST Endpoints** | Next.js Route Handlers | Node API routes executing operations on PostgreSQL with `pg` connection pool. |
| **Real-time Server** | Node.js Standalone WebSocket | Standalone Node script (`ws` package) broadcasting sync messages to clients. |
| **Database** | PostgreSQL | Persists task details and positioning using raw connection pooling. |

### 🔄 Real-time Sync Workflow
1. **User action**: A user creates, drags, or renames a card on the Kanban board.
2. **Optimistic update**: The card UI updates instantly locally for zero latency.
3. **Database Save**: An API request (REST) is sent to the Next.js server, which writes the change to the PostgreSQL database.
4. **WebSocket Broadcast**: Once saved, the browser sends a synchronization event to the standalone WebSocket server (running on port `3001`).
5. **Client Convergence**: The WebSocket server forwards the event to all other open browsers, updating their screens in real-time.

```mermaid
sequenceDiagram
    participant ClientA as Client A (Browser)
    participant NextJS as Next.js API (Port 3000)
    participant Database as PostgreSQL DB
    participant WSServer as WebSocket Server (Port 3001)
    participant ClientB as Client B (Browser)

    ClientA->>ClientA: 1. Apply local change (Optimistic UI Update)
    ClientA->>NextJS: 2. Send HTTP REST Request (POST/PATCH/DELETE)
    NextJS->>Database: 3. Persist modifications & update timestamp
    Database-->>NextJS: Return updated database record
    NextJS-->>ClientA: 4. Respond with verified database record
    ClientA->>WSServer: 5. Broadcast Sync Event (e.g. CARD_UPDATED)
    WSServer-->>ClientB: 6. Forward Broadcast Event to other clients
    ClientB->>ClientB: 7. Apply broadcast payload (Convergence to LWW state)
```

---

## 🏗️ Technical Highlights

### ⚡ Reconnection & Catch-Up Sync
If a user goes offline or experiences a network dropout:
- The UI status indicator transitions to a pulsing amber **reconnecting** state.
- The browser attempts to reconnect using **exponential backoff** (increasing delays from 1s up to a maximum of 16s to avoid overloading the server).
- **Auto Catch-Up**: As soon as the connection is recovered, the client automatically requests the latest board state from `/api/cards` and resolves any modifications that occurred while offline.

### 📍 Smart Positioning (Fractional Indexing)
To support card re-ordering inside columns without rewriting index columns on every movement:
- When a card is dragged between Card A (position 100) and Card B (position 200), its position is calculated as the average: `(100 + 200) / 2 = 150`.
- Moving a card only requires updating **one row** in the database rather than updating index positions for the entire table.

### 🛡️ Conflict Handling (Last-Write-Wins)
If two users drag or edit the exact same card at the same time:
1. The PostgreSQL database acts as the single source of truth, locking the record and setting `updated_at = NOW()`.
2. Whichever database transaction commits last overwrites previous edits (Last-Write-Wins).
3. The resulting database state is broadcast to all clients, and all open browser windows converge onto the final state.

---

## ⚡ Technical Payload Specifications

<details>
<summary><b>Click to view WebSocket JSON schemas</b></summary>

### 1. Presence Notification (`PRESENCE_CHANGE`)
Emitted by the server to all connected clients when someone joins or leaves:
```json
{
  "type": "PRESENCE_CHANGE",
  "count": 3
}
```

### 2. Card Creation (`CARD_CREATED`)
Sent by a client when a card is created:
```json
{
  "type": "CARD_CREATED",
  "clientId": "f90a2bc",
  "card": {
    "id": 42,
    "title": "PostgreSQL Schema",
    "status": "todo",
    "position": 1000.0,
    "created_at": "2026-06-26T14:48:48Z",
    "updated_at": "2026-06-26T14:48:48Z"
  }
}
```

### 3. Card Modification (`CARD_UPDATED`)
Sent by a client when a card is edited or dragged:
```json
{
  "type": "CARD_UPDATED",
  "clientId": "f90a2bc",
  "card": {
    "id": 42,
    "title": "Updated PostgreSQL Schema",
    "status": "in_progress",
    "position": 500.0,
    "created_at": "2026-06-26T14:48:48Z",
    "updated_at": "2026-06-26T14:52:12Z"
  }
}
```

### 4. Card Deletion (`CARD_DELETED`)
Sent by a client when a card is deleted:
```json
{
  "type": "CARD_DELETED",
  "clientId": "f90a2bc",
  "id": 42
}
```
</details>

---

## 🏆 Feature Milestones

- ✅ **Presence Counter**: Live count of online users in the top header.
- ✅ **Drag and Drop Sorting**: Natural fluid dragging with fractional positioning calculations.
- ✅ **Conflict Protection**: Database-driven Last-Write-Wins syncing.

---

## 🧠 Future Roadmap

1. **Multi-Board Support**: Allow users to create multiple boards and transition between them via URL parameters (e.g. `/board/1`, `/board/2`).
2. **Collaborative Cursor Tracking**: Broadcast active cursor coordinates over WebSockets to show other team members moving on screen.
3. **Card Re-indexing Service**: A daily cleanup cron script to clean up floating point divisions and reset positions back to clean integers (`1000`, `2000`, `3000`).



