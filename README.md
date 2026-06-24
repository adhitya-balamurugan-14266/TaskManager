# TaskManager

A full-stack task management application built on **Zoho Catalyst** — manage services, track tasks with due dates, reminders, pipeline queues, and priorities. View everything in a Kanban-style workspace dashboard with dark mode support.

**Live URL:** https://task-manager.onslate.in

---

## Features

### Services
- Organise tasks under named services (e.g. Engineering, Marketing).
- Each service supports an optional logo stored in Catalyst Stratus.
- Service tiles show **active task count**, **priority task count** (red badge), and **overdue task count** at a glance.
- Clicking anywhere on a service tile opens that service's task view.

### Tasks
- Create tasks with a title, description, due date/time, and optional email reminder.
- Edit tasks inline; complete tasks with an optional **Final Thoughts** note.
- Tasks display a **Priority** badge and red highlight when marked as priority.
- Active and overdue tasks are sorted: **priority tasks first**, then soonest due date.

### Priority System
- Mark any active task as priority via the 🔥 Prioritize button (deprioritize with the same toggle).
- Priority tasks float to the top of every list and kanban column.
- Service tiles show a separate red priority count badge.

### Pipeline
- Create tasks directly in a **Pipeline** (backlog) queue — no due date required.
- Move any active or completed task to the pipeline at any time with an optional **reason** note.
- Activate a pipeline task when ready: assign a due date and optional reminder.
- Edit pipeline tasks (title, description, pipeline reason) inline.
- Pipeline reason is shown in a violet callout on each pipeline card.
- Tasks in the pipeline for **2+ weeks** receive an amber **"2-week review"** badge on their card.
- Clicking a pipeline card (or its **Review** button) opens a review modal with two options:
  - **Drop Task** — requires a reason; moves the task to the Dropped section.
  - **Keep in Pipeline** — requires a reason; resets the 2-week timer.
- A **daily cron** (`pipe_review_daily`, runs at midnight) automatically emails an alert listing all pipeline tasks that have exceeded the 2-week threshold and haven't been reviewed yet.

### Dropped Tasks
- Tasks that are deliberately removed from the pipeline are moved to a **Dropped** status.
- A **Dropped** tab in each service's task view shows all dropped tasks for that service, with strikethrough titles, the drop reason, and drop date.
- Dropped tasks can be **restored to the pipeline** from the Dropped tab.
- The **My Workspace** Kanban board includes a **Dropped** column as the first column.

### Final Thoughts
- Optionally add a **Final Thoughts** note when completing a task.
- View, add, or edit the note on completed task cards.
- Final thoughts are displayed in a green callout.

### Reminders
- Schedule one-time email reminders via Catalyst Job Scheduling (Cron).
- Reminders fire at the exact due date/time.
- Crons are automatically cancelled when a task is pushed to pipeline or deleted.

### Overdue Tracking
- Tasks past their due date are automatically surfaced in an **Overdue** tab per service and in the global Workspace dashboard.

### My Workspace (Kanban Dashboard)
- Five-column Kanban board: **Dropped**, **Pipeline**, **Active**, **Completed**, **Overdue** — all tasks across all services in one view.
- Search bar in the header filters all five columns live as you type.
- Click any card for full task details in a side sheet, including drop reason for dropped tasks.
- Jump to any service directly via the ⋯ meatball menu.

### Search
- **Service detail view** — search bar above tabs filters the active, overdue, pipeline, completed, and dropped task lists by title or description.
- **Workspace / Kanban** — search bar in the sticky header filters all five columns simultaneously.

### Dark / Light Mode
- Toggle between dark and light themes via the **Sun/Moon** button fixed in the bottom-right corner.
- Preference is persisted in `localStorage` and defaults to the OS system preference on first load.

### Service Logos
- Upload a PNG/JPG/SVG logo when creating a service.
- Stored in Catalyst Stratus object storage and displayed on service and task cards.
- Logos are auto-deleted from Stratus when the service is deleted.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4 |
| Hosting | Catalyst Slate (static) |
| API | Catalyst Advanced I/O Function (`task_api`) — Node.js 20 |
| Job Functions | `task_reminder` (due-date email), `pipeline_review_job` (daily pipeline alert) — Node.js 20 |
| Database | Catalyst Datastore (ZCQL) — `Services` + `Tasks` tables |
| Object Storage | Catalyst Stratus — bucket `taskmanager-175003` |
| Scheduling | Catalyst Job Scheduling — one-time crons (reminders) + daily cron (pipeline review) |
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
│   ├── task_reminder/             # Job function — sends due-date reminder email
│   │   ├── index.js
│   │   └── package.json
│   └── pipeline_review_job/       # Job function — daily pipeline 2-week alert email
│       ├── index.js
│       └── package.json
├── task-app-source/               # Vite + React source
│   ├── src/
│   │   ├── App.tsx
│   │   ├── index.css              # Tailwind v4 + dark mode variant
│   │   ├── pages/
│   │   │   ├── SetupPage.tsx          # First-run email setup
│   │   │   ├── ServicesPage.tsx       # Services list + create modal
│   │   │   ├── ServiceDetailPage.tsx  # Tasks per service (tabs + search incl. Dropped)
│   │   │   └── WorkspacePage.tsx      # Kanban dashboard (5 columns, search, dark mode)
│   │   ├── components/
│   │   │   ├── TaskCard.tsx           # Active task card (priority, pipeline, complete)
│   │   │   ├── CompletedTaskCard.tsx  # Completed card (final thoughts, pipeline)
│   │   │   ├── PipelineTaskCard.tsx   # Pipeline card (review modal, 2-week badge)
│   │   │   ├── DroppedTaskCard.tsx    # Dropped task card (restore, delete)
│   │   │   ├── Badge.tsx              # Status badges incl. priority + dropped
│   │   │   ├── Button.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── Input.tsx
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
| `GET` | `/execute/state` | Fetch full app state (services, tasks, overdue, dropped) |
| `POST` | `/execute/services` | Create a service (name, optional logo_url) |
| `DELETE` | `/execute/services/:id` | Delete a service and all its tasks + Stratus logo |
| `POST` | `/execute/services/logo-upload` | Get a presigned Stratus PUT URL for logo upload |
| `POST` | `/execute/tasks` | Create a task (active or pipeline) |
| `PUT` | `/execute/tasks/:id` | Update a task |
| `PUT` | `/execute/tasks/:id/complete` | Mark a task completed (with optional final thoughts) |
| `PUT` | `/execute/tasks/:id/push-to-pipeline` | Move a task to pipeline (with optional reason) |
| `PUT` | `/execute/tasks/:id/activate` | Activate a pipeline task (assign due date + reminder) |
| `PUT` | `/execute/tasks/:id/drop` | Drop a pipeline task (requires reason) |
| `PUT` | `/execute/tasks/:id/pipeline-review` | Keep task in pipeline and reset its 2-week timer |
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
| `days_assigned` | integer | Days from creation to due date (0 for pipeline) |
| `due_date` | varchar | Full UTC ISO string (null for pipeline tasks) |
| `reminder` | boolean | Enable email reminder |
| `reminder_email` | varchar | Recipient address |
| `status` | varchar | `active`, `completed`, `pipeline`, or `dropped` |
| `date_completed` | varchar | ISO timestamp when completed |
| `cron_id` | varchar | Catalyst Cron ID for the reminder job |
| `is_pipeline` | boolean | True when task is in pipeline queue |
| `pipeline_reason` | varchar | Optional reason for moving to pipeline |
| `final_thoughts` | text | Optional completion note |
| `is_priority` | boolean | True when task is marked as priority |
| `pipeline_entered_at` | varchar | ISO timestamp when task entered the pipeline |
| `pipeline_alerted` | boolean | True after a 2-week pipeline alert email has been sent |
| `dropped_reason` | varchar | Reason provided when dropping a pipeline task |
| `dropped_date` | varchar | ISO timestamp when the task was dropped |

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
- pnpm (`npm i -g pnpm`)
- Catalyst CLI (`npm i -g @zohotools/catalyst`)

### Frontend
```bash
cd task-app-source
pnpm install
pnpm dev       # starts Vite dev server with proxy to Catalyst function
```

### Deploy to Catalyst
```bash
# Build frontend
cd task-app-source
pnpm build

# Deploy Slate (frontend) + API function
cd ..
catalyst deploy --only functions:task_api,slate:task-manager

# Deploy only frontend
catalyst deploy --only slate:task-manager

# Deploy only backend
catalyst deploy --only functions:task_api
```

### Environment Variables

**`task_reminder` function:**
| Variable | Description |
|---|---|
| `MAIL_FROM_ADDRESS` | Sender email address for due-date reminder emails |
| `MAIL_TO_ADDRESS` | Fallback recipient if task has no `reminder_email` |

**`pipeline_review_job` function:**
| Variable | Description |
|---|---|
| `MAIL_FROM_ADDRESS` | Sender email address for pipeline alert emails |
| `MAIL_TO_ADDRESS` | Recipient for pipeline review alert emails |

---

## Built with Catalyst MCP

This project was developed end-to-end using the **[Catalyst MCP (Model Context Protocol) Server](https://github.com/zoho/catalyst-mcp)** — a tool that exposes Catalyst platform capabilities as structured tools an AI agent can invoke directly from the editor, without switching to the Catalyst Console or writing boilerplate setup code.

### What the MCP Server enabled

| Capability | How it was used |
|---|---|
| **DataStore operations** | Created and modified `Services` and `Tasks` tables; added columns (`is_pipeline`, `pipeline_reason`, `final_thoughts`, `is_priority`, `pipeline_entered_at`, `pipeline_alerted`, `dropped_reason`, `dropped_date`); updated column constraints (nullable `due_date`, `days_assigned`) |
| **Function management** | Inspected function configs, environment variables, and deployment status for `task_api` and `task_reminder` |
| **Cron / Job Scheduling** | Created, verified, and managed one-time cron jobs for task reminders during development |
| **Stratus object storage** | Verified bucket config, object paths, and presigned URL behaviour for service logo uploads |
| **Query execution** | Ran ZCQL queries directly to inspect live data and validate schema changes |
| **Project introspection** | Explored project config, resource IDs, and service metadata without leaving the editor |

### Why it mattered

Rather than context-switching between editor, Catalyst Console, and documentation, the MCP server let the AI agent query live platform state, apply schema changes, and validate behaviour — all within a single conversation. This meant features like Pipeline, Priority, and Final Thoughts (each requiring new DataStore columns and backend logic) could be designed, implemented, and verified in one continuous flow.

---


