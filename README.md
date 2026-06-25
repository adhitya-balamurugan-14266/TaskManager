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

### Image References
- Attach reference images to any task (active, pipeline, or completed) via the create/edit modals.
- Images are uploaded to Catalyst Stratus and the URLs are stored in the `image_references` column.
- Upload multiple images at once; a thumbnail grid is shown in the modal with hover-to-delete (✕ button).
- Image count badge (e.g. **"1 image"**) is clickable and opens a full-screen **Lightbox** viewer.
- The lightbox supports keyboard navigation: **Escape** to close, **← →** arrows to cycle through images, and a thumbnail strip for multi-image tasks.
- Images displayed in the Workspace task detail panel are also clickable thumbnails that open the lightbox.
- Removing an image from the edit form automatically deletes the object from Stratus on save.

### My Workspace (Kanban Dashboard)
- Five-column Kanban board: **Dropped**, **Pipeline**, **Active**, **Completed**, **Overdue** — all tasks across all services in one view.
- Search bar in the header filters all five columns live as you type.
- Click any card for full task details in a side sheet, including image thumbnails and drop reason for dropped tasks.
- **Go to service** button in the task detail panel navigates directly to the matching tab in that service's view (e.g. a completed task opens the **Completed** tab).
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

### Setup & Onboarding
- First-run email setup screen supports both **click** and **Enter key** to proceed.

---

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
│   │   │   ├── ImageReferences.tsx    # Upload/manage task reference images
│   │   │   ├── ImageLightbox.tsx      # Full-screen image viewer with keyboard nav
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
| `POST` | `/execute/tasks/image-upload` | Get a presigned Stratus PUT URL for task image upload |
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
| `image_references` | text | JSON array of Stratus image URLs (optional) |

---

## Stratus Object Storage

- **Bucket:** `taskmanager-175003` (public read)
- **Logo path:** `service-logos/<timestamp>-<filename>`
- **Task image path:** `task-images/<timestamp>-<filename>`
- Upload flow: frontend requests a presigned PUT URL from `task_api` → browser PUTs the file directly to Stratus → the returned object URL is saved in Datastore.
- Logos are auto-deleted from Stratus when the service is deleted.
- Task images are auto-deleted from Stratus when removed from the edit form or when the task is deleted.

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

This project was built on the **[Catalyst by Zoho](https://catalyst.zoho.com)** platform — using Catalyst Slate for frontend hosting, Advanced I/O Functions for the REST API, Datastore for structured data, Stratus for object storage, Job Scheduling for reminders, and Mail for notifications.

Throughout development, the **[Catalyst MCP (Model Context Protocol) Server](https://github.com/zoho/catalyst-mcp)** made console operations significantly easier. Rather than switching to the Catalyst Console for every platform task, the MCP server exposed Catalyst capabilities as structured tools that could be invoked directly from the editor — making it faster to manage schema changes, inspect live data, and configure resources without breaking the development flow.

### What the MCP Server helped with

| Capability | How it was used |
|---|---|
| **DataStore operations** | Created and modified `Services` and `Tasks` tables; added columns (`is_pipeline`, `pipeline_reason`, `final_thoughts`, `is_priority`, `pipeline_entered_at`, `pipeline_alerted`, `dropped_reason`, `dropped_date`, `image_references`); updated column constraints (nullable `due_date`, `days_assigned`) |
| **Function management** | Inspected function configs, environment variables, and deployment status for `task_api`, `task_reminder`, and `pipeline_review_job` |
| **Cron / Job Scheduling** | Created, verified, and managed one-time cron jobs for task reminders during development |
| **Stratus object storage** | Verified bucket config, object paths, and presigned URL behaviour for service logo and task image uploads |
| **Query execution** | Ran ZCQL queries directly to inspect live data and validate schema changes |
| **Project introspection** | Explored project config, resource IDs, and service metadata without leaving the editor |

---


