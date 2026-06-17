# TaskManager

A full-stack task management application built on **Zoho Catalyst** — manage services, track tasks with due dates and reminders, upload service logos via Catalyst Stratus, and view everything in a Kanban-style workspace dashboard.

**Live URL:** https://task-manager.onslate.in

---

## Features

- **Services** — Organise tasks under named services (e.g. Engineering, Marketing). Each service supports an optional logo stored in Catalyst Stratus.
- **Tasks** — Create tasks with a title, description, due date/time, and optional email reminder. Edit or complete tasks inline.
- **Reminders** — Schedule one-time email reminders via Catalyst Job Scheduling (Cron). Reminders fire at the exact due date/time.
- **Overdue tracking** — Tasks past their due date are automatically surfaced in an Overdue tab per service and in the global dashboard.
- **My Workspace (Dashboard)** — Kanban board showing all tasks across all services in three columns: Active, Completed, and Overdue. Click any card for full details. Jump to any service via the meatball (⋯) menu.
- **Service logos** — Upload a PNG/JPG/SVG logo when creating a service. Stored in Catalyst Stratus object storage and displayed on the service card.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4 |
| Hosting | Catalyst Slate (static) |
| API | Catalyst Advanced I/O Function (`task_api`) — Node.js 20 |
| Job Function | Catalyst Job Function (`task_reminder`) — Node.js 20 |
| Database | Catalyst Datastore (ZCQL) — `Services` + `Tasks` tables |
| Object Storage | Catalyst Stratus — bucket `taskmanager-175003` |
| Scheduling | Catalyst Job Scheduling (one-time Cron per task) |
| Email | Catalyst Mail |
| SDK | `zcatalyst-sdk-node` |

---

## Project Structure

```
TaskManager/
├── catalyst.json                  # Catalyst project config
├── functions/
│   ├── task_api/                  # Advanced I/O REST API
│   │   ├── index.js
│   │   └── package.json
│   └── task_reminder/             # Job function — sends reminder email
│       ├── index.js
│       └── package.json
├── task-app-source/               # Vite + React source
│   ├── src/
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── SetupPage.tsx          # First-run email setup
│   │   │   ├── ServicesPage.tsx       # Services list + create modal
│   │   │   ├── ServiceDetailPage.tsx  # Tasks per service (tabs)
│   │   │   └── WorkspacePage.tsx      # Kanban dashboard
│   │   ├── components/            # Button, Modal, Input, Badge, TaskCard…
│   │   ├── hooks/useTaskManager.ts
│   │   ├── store/engine.ts        # API client
│   │   └── types/index.ts
│   ├── public/favicon.svg
│   └── vite.config.ts
└── client/                        # Vite build output → deployed to Slate
```

---

## API Routes (`task_api`)

| Method | Path | Description |
|---|---|---|
| `GET` | `/execute/state` | Fetch full app state (services, tasks, overdue) |
| `POST` | `/execute/services` | Create a service (name, optional logo_url) |
| `DELETE` | `/execute/services/:id` | Delete a service and all its tasks + Stratus logo |
| `POST` | `/execute/services/logo-upload` | Get a presigned Stratus PUT URL for logo upload |
| `POST` | `/execute/tasks` | Create a task |
| `PUT` | `/execute/tasks/:id` | Update a task |
| `PUT` | `/execute/tasks/:id/complete` | Mark a task as completed |
| `DELETE` | `/execute/tasks/:id` | Delete a task |

---

## Datastore Schema

### `Services`
| Column | Type | Notes |
|---|---|---|
| `ROWID` | bigint | Primary key |
| `service_name` | varchar(255) | Unique, mandatory |
| `logo_url` | varchar(255) | Optional — Stratus object URL |

### `Tasks`
| Column | Type | Notes |
|---|---|---|
| `ROWID` | bigint | Primary key |
| `title` | varchar | Mandatory |
| `description` | text | Optional |
| `service_id` | varchar | FK → Services.ROWID |
| `date_added` | varchar | ISO timestamp |
| `days_assigned` | integer | Computed from due date |
| `due_date` | varchar | Full UTC ISO string |
| `reminder` | boolean | Enable email reminder |
| `reminder_email` | varchar | Recipient address |
| `status` | varchar | `active` or `completed` |
| `date_completed` | varchar | ISO timestamp when completed |
| `cron_id` | varchar | Catalyst Cron ID for the reminder |

---

## Stratus Object Storage

- **Bucket:** `taskmanager-175003` (public read)
- **Logo path:** `service-logos/<timestamp>-<filename>`
- Upload flow: frontend requests a presigned PUT URL from `task_api` → browser PUTs the file directly to Stratus → the returned object URL is saved in Datastore.
- Logos are auto-deleted from Stratus when the service is deleted.

---

## Local Development

### Prerequisites
- Node.js 20+
- Catalyst CLI (`npm i -g @zohotools/catalyst`)

### Frontend
```bash
cd task-app-source
npm install
npm run dev       # starts Vite dev server with proxy to Catalyst function
```

### Deploy to Catalyst
```bash
# Frontend (Slate)
npm run build     # from task-app-source/
cd ..
catalyst deploy slate

# Backend functions
catalyst deploy --only functions:task_api
catalyst deploy --only functions:task_reminder
```

### Environment Variables (set on `task_reminder` function in Catalyst Console)
| Variable | Description |
|---|---|
| `MAIL_FROM_ADDRESS` | Sender email address for reminders |
| `MAIL_TO` | Fallback recipient if task has no reminder_email |

---

## Catalyst Resources

| Resource | Name / ID |
|---|---|
| Project | TaskManager (`20660000000175003`) |
| Slate | task-manager |
| Function | task_api (Advanced I/O) |
| Function | task_reminder (Job) |
| Job Pool | TaskReminderPool |
| Stratus Bucket | taskmanager-175003 |