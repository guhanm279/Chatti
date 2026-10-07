# CHATTi — Turn Conversations Into Actions

> **Visual Source of Truth:** Stitch Design System (`action_messaging_system/DESIGN.md` & `chatti_flagship_messaging_actions_desktop/code.html`)  
> **Status:** Production-Ready MVP  
> **Live Server:** `http://localhost:3000`

---

## 1. Product Overview

Traditional messaging follows a passive paradigm:
$$\text{Message} \longrightarrow \text{Reply}$$

**CHATTi** transforms messaging into actionable collaborative execution:
$$\text{Message} \longrightarrow \text{Action}$$

### Signature Interaction Primitives
1. 🔒 **Whisper** — In-thread private message within a group channel with backend-enforced privacy (only sender and recipient can decrypt; other members see a stealth notice only).
2. ✨ **Magic** — Converts conversational dialogue into structured, assigned, tracked tasks with status tracking.
3. 🔥 **Fuse** — Transforms a query into a timed, live consensus voting window (10s countdown) that auto-locks into a permanent recorded decision upon expiry.

---

## 2. Architecture & Technology Stack

```
Frontend (Stitch Design, Tailwind, Glassmorphism, Material Symbols)
     ↓ HTTP REST + WebSockets (ws)
Node.js / Express Backend
     ↓ pg Client with SSL
Aiven PostgreSQL (with persistent local disk storage fallback)
```

- **Styling & Design Tokens:** Exact Stitch dark canvas (`#0f131c`), Plus Jakarta Sans display typography, Inter conversational typography, chromatic accents (Electric Indigo `#6366f1` for Magic, Neon Cyan `#06b6d4` for Fuse, Warm Amber `#f59e0b` for Whisper).
- **Persistence Engine:** Full PostgreSQL schema (`users`, `conversations`, `messages`, `tasks`, `fuses`, `votes`, `whispers`, `activity_log`). Automatically connects to Aiven PostgreSQL when `DATABASE_URL` is configured in `.env`, with automatic migration and persistent disk fallback in `data/chatti_data.json`.
- **Zero Refresh Real-Time Updates:** WebSocket event broadcaster keeps all tabs and active users synchronized for messages, votes, timers, and decisions.

---

## 3. Database & Secrets Configuration

All database credentials are kept strictly on the backend and loaded via environment variables.

### Connecting to Aiven PostgreSQL:
1. Open `.env` (or copy from `.env.example`):
   ```env
   DATABASE_URL=postgres://avnadmin:YOUR_PASSWORD@YOUR_AIVEN_HOST:PORT/defaultdb?sslmode=require
   PORT=3000
   ```
2. Or use the in-app **"Database Status"** badge at the top of the sidebar to test and connect your Aiven database URL live!

---

## 4. Hackathon 60-Second Demo Flow

The application includes a built-in **"Hackathon Demo Flow"** button in the header bar. You can run all steps automatically with 1 click or step-by-step:

### Step 1: Magic → Task
1. Guhan sends: `"Rahul, send the PPT before 6 PM."`
2. Select **✨ Magic** → **📋 Create Task**
3. Card renders attached to the message:
   - **Task:** Finish the PPT
   - **Assignee:** Rahul
   - **Deadline:** Today, 6:00 PM
   - **Status:** 🟡 Pending (can be toggled to 🟢 Completed)

### Step 2: 🔒 Whisper (In-Thread Privacy)
1. Guhan sends: `"Rahul, come 15 minutes early."`
2. Select **🔒 Whisper** → Choose Rahul as recipient.
3. **Perspective A (Rahul / Sender):** Sees illuminated glowing amber card:  
   `🔒 Private Whisper • Visible only to you & Guhan: "Rahul, come 15 minutes early."`
4. **Perspective B (Ananya / Other Members):** The backend scrubs the content and returns only:  
   `🔒 Guhan sent a private Whisper to Rahul` (private text is never leaked over the wire).
5. Switch perspectives using the top **User Switcher** dropdown in 1 click!

### Step 3: 🔥 Fuse (10s Live Consensus)
1. Guhan sends: `"Should we submit today?"`
2. Select **🔥 Fuse** → Starts 10-second rapid consensus timer.
3. Rahul votes 👍, Ananya votes 👍.
4. Live vote progress bars update in real time.
5. Countdown reaches 0 → Auto-executes into **🔥 DECISION LOCKED: Outcome: Submit Today (100% consensus)**!

---

## 5. API Reference

- `GET /api/status` — Database connection status & stats
- `POST /api/db/connect` — Dynamically connect & migrate Aiven PostgreSQL
- `GET /api/users` — List demo team members
- `GET /api/conversations` — List active conversation threads
- `GET /api/conversations/:id/messages?userId=:id` — Get messages with strict Whisper access control
- `POST /api/messages` — Send standard message
- `POST /api/whisper` — Send stealth private whisper
- `POST /api/tasks` — Convert message into a tracked task
- `PATCH /api/tasks/:id` — Toggle task status (pending/completed)
- `POST /api/fuses` — Start a live timed Fuse
- `POST /api/fuses/:id/vote` — Cast live vote
- `POST /api/fuses/:id/lock` — Lock consensus outcome
- `GET /api/actions` — Summary for Right Actions Cockpit
- `GET /api/activity` — Timeline activity stream
