# SyncBoard | Real-Time Collaborative Task Board

A high-performance, real-time shared task board built using **Next.js**, **Node.js**, and **PostgreSQL**. Changes sync instantly across all open browser windows via WebSockets without page refreshes, and state is fully persisted in a Postgres database.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v20.x or higher
- **npm**: v10.x or higher
- **PostgreSQL**: v17.x or higher running locally on default port `5432`

### 2. Database Setup
Create a PostgreSQL database named `realtime_taskboard` and run the `schema.sql` file to set up the `cards` table.

```bash
# 1. Create the database
psql -U postgres -h 127.0.0.1 -c "CREATE DATABASE realtime_taskboard;"

# 2. Run the schema script to create table
psql -U postgres -h 127.0.0.1 -d realtime_taskboard -f schema.sql
```

> [!NOTE]
> The database pool client automatically falls back to:
> `postgresql://postgres:2003@Jasim@127.0.0.1:5432/realtime_taskboard`
> If you have custom database credentials, you can configure them by setting the `DATABASE_URL` environment variable:
> `DATABASE_URL="postgresql://username:password@localhost:5432/dbname"`

### 3. Install Dependencies
Install all project packages:
```bash
npm install
```

### 4. Start the Application
You need to run both the Next.js web application and the WebSocket server.

**Start the WebSocket Server:**
```bash
node server/ws-server.js
```
*Runs on port `3001`.*

**Start the Next.js Development Server:**
```bash
npm run dev
```
*Runs on port `3000`.*

---

## 🛠️ Architecture & Tech Stack

- **Frontend**: Next.js 16 (App Router) + React (Hooks & Effects)
- **Styling**: Premium Glassmorphism vanilla CSS
- **REST Endpoints**: Next.js API Routes (using `pg` Connection Pool)
- **Real-time Engine**: Node.js Standalone WebSocket (`ws` package)
- **Database**: PostgreSQL (Raw SQL queries with connection pooling)

---

## ⚡ WebSocket Event Protocol

All updates are broadcast instantly via the WebSocket server running on port `3001`. Sockets communicate using JSON payloads with the following schema:

### 1. Presence Notification (`PRESENCE_CHANGE`)
Emitted by the server to all connected clients whenever a socket connects or disconnects:
```json
{
  "type": "PRESENCE_CHANGE",
  "count": 3
}
```

### 2. Card Creation (`CARD_CREATED`)
Sent by a client to broadcast a newly added card:
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
Sent by a client to broadcast a rename or drag-reorder movement:
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
Sent by a client to broadcast a deleted card ID:
```json
{
  "type": "CARD_DELETED",
  "clientId": "f90a2bc",
  "id": 42
}
```

---

## 🏗️ Technical Highlights

### 1. Reconnection & Catch-Up Sync
If a client experiences network disruption:
- The WebSocket client transitions into a `reconnecting` status (showing a pulsing amber status indicator in the UI).
- It attempts reconnection using **exponential backoff** (doubling delay times from 1s to a max of 16s).
- **Auto Sync**: Immediately upon re-establishing connection, the client executes a `GET /api/cards` REST query. This pulls the latest state of the board from Postgres, automatically catching up on any creation, movement, or deletion events that occurred while the client was offline.

### 2. Drag & Drop Fractional Positioning
We implement a highly stable **Fractional Indexing** sorting algorithm for card drag-and-drop actions.
- When dropping card `C` between card `A` (position $P_A$) and card `B` (position $P_B$), the new position is computed as $(P_A + P_B) / 2$.
- If dropped at the top of a column, the position is $P_{next} - 1000$.
- If dropped at the bottom of a column, the position is $P_{prev} + 1000$.
- If dropped into an empty column, the position is set to `1000.0`.
- **Why?** This enables $O(1)$ position updates. Moving a card requires editing exactly **one row** in the database rather than updating indices across the entire table, preventing database write amplification and keeping sync overhead negligible.

### 3. Conflict Handling (Last-Write-Wins)
When two users edit or drag the same card simultaneously, conflicts are resolved using a **Last-Write-Wins (LWW)** strategy backed by PostgreSQL:
1. **DB Ordering**: The PostgreSQL server acts as the central coordinator. Any write (REST call) is executed as a transaction, setting `updated_at = NOW()`.
2. **Sequential Broadcast**: The database commits the changes sequentially, meaning the transaction that acquires the write-lock last writes its values and returns the finalized record.
3. **Clients Convergence**: The resulting updated card data is broadcast to all clients. Each client replaces its local card object with the incoming socket data.
4. **Consistency**: Since the database represents the absolute source of truth, all open browser tabs will immediately converge onto the final state dictated by the last successful database write.

---

## 🏆 Bonuses Status

| Bonus Feature | Status | Notes |
| :--- | :--- | :--- |
| **+ Presence** | **Completed** | Displays live active online connection count in the top header. |
| **+ Drag & drop ordering** | **Completed** | Fully supported using native HTML5 drag-and-drop combined with a high-performance Fractional Positioning algorithm. |
| **+ Conflict handling** | **Completed** | Implemented a database-locked Last-Write-Wins strategy (detailed above). |

---

## 🧠 Key Decisions, Trade-offs & Future Improvements

### Key Decisions
- **Decoupled Architecture**: Ran a standalone WebSocket server on a separate port (`3001`) from Next.js (`3000`). This keeps Next.js completely stateless, enabling serverless scalability, while the stateful WebSocket layer behaves purely as an event broadcaster.
- **Client-Side Deduplication**: Sockets are stamped with a random `clientId`. Broadcast messages include this ID, allowing the sender client to safely ignore its own echoes, eliminating double-applying of state or visual glitches.
- **Optimistic UI Updates**: Card updates (drag-reorders and renames) are reflected in the client's state immediately before the network requests resolve, providing a zero-latency, premium user experience.

### Trade-offs
- **Raw SQL over ORM**: We used raw SQL queries via the `pg` client instead of Prisma or Drizzle. This avoided setup/compilation build steps and kept database interaction overhead extremely small, but sacrificed compile-time schema safety.
- **Fractional Indexing Floating-Point Precision**: While fractional indexing allows $O(1)$ reorders, repeated inserts in the same narrow interval (e.g. dropping cards in the exact same spot 100 times) can theoretically cause floating-point underflow. In a real-world app, this is resolved by a periodic background "re-balancing" job that spreads out coordinates to clean integer intervals.

### Future Improvements (Given More Time)
1. **Multi-board support**: Currently, all clients share a single default board. Introducing database scopes (e.g. board IDs in URLs `/board/[id]`) would easily allow multiple separate collaborative boards.
2. **Collaborative Cursor Tracking**: Adding socket broadcast mouse positions (`onmousemove` events) to render multi-user cursors on the board in real time.
3. **Card Re-indexing Service**: Introduce a cron script to run every 24 hours to select all cards in each column and reset their `position` parameters to sequential integers (`1000`, `2000`, `3000`), resolving potential coordinate density issues.
