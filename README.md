# TaskMAXXING (TaskManager)

![TaskMAXXING](task-app-source/public/logo-wordmark.png)

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
- **Drop any task directly** — a **Drop** button is present on all active, completed, and pipeline task cards. Clicking it opens a confirmation modal that requires a reason before confirming.
- Active tasks: drop clears the due date, reminder, and cron before marking dropped.
- Pipeline tasks: a dedicated **Drop** shortcut button sits in the card footer alongside the existing Review flow (which also supports dropping via the multi-step review modal).
- A **Dropped** tab in each service's task view shows all dropped tasks for that service, with strikethrough titles, the drop reason, and drop date.
- Dropped tasks can be **restored to the pipeline** from the Dropped tab.
- The **My Workspace** Kanban board includes a **Dropped** column as the first column.

### Move Task Between Services
- Every edit modal (active, completed, pipeline) includes a **Move Task** dropdown listing all services.
- Selecting a different service and saving moves the task to that service while preserving its current status, content, and attachments.
- The task immediately disappears from the current service view and appears under the destination service.

### Scrollable Create / Edit Modals
- All modals (Create Task, Edit Task, Edit Thoughts, Pipeline edit) have a **fixed header** and a **scrollable body** capped at 90 % viewport height.
- Long descriptions, image grids, and scheduling fields no longer push the action buttons off-screen.

### Rich Text Lists
- The description editor supports **bullet lists**, **numbered lists**, and multi-level **nested lists** (up to three levels: disc → circle → square for bullets; decimal → lower-alpha → lower-roman for numbers).
- List markers render correctly in both the editor and all read-only description views (info panel, workspace detail sheet).

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
- Overdue task cards show a dedicated amber **"Reschedule"** button. Clicking it opens a focused modal pre-filled with a sensible next-day default. The confirm button is disabled until a future date is chosen — preventing accidental re-saves of a past date.
- On save, the task's due date is updated (and any active reminder cron is rescheduled automatically). The task immediately leaves the overdue state and returns to the **Active** tab.

### Hyperlinks & Reference Panel
- Paste any URL directly into a task's description field — no special formatting needed.
- When viewing a task, click the **ⓘ Info button** (next to the Edit button) to open the info panel.
- The panel has two sections:
  - **Description** — full description rendered with all URLs as clickable blue links that open in a new tab.
  - **References** — only shown when links exist; every URL extracted from the description is listed as a tappable tile with an external link icon for one-click access.
- Works across all task states: Active, Completed, Pipeline, and Dropped.
- The Info button only appears when the task has a description.

### Info Attachments
- Attach **any file type** to a task (active, pipeline, or completed) from the create/edit modals via the **Upload info** button: images, CSV, JSON, PDF, Markdown/text, Office docs, audio, video, archives, and so on.
- Max **25 MB per file**. Oversized files are skipped with an inline error, and the rest of the batch still uploads.
- Files are uploaded straight to Catalyst Stratus through a presigned PUT URL, using the same bucket and path as before. Their URLs are stored in the `image_references` column. The column and route names are legacy and kept for backward compatibility.
- The `Content-Type` is inferred from the extension when the browser leaves it blank (e.g. `.md`, some `.csv`), so files open in the browser with the right type instead of downloading as `octet-stream`.
- Tiles in the modal grid:
  - Images show a thumbnail.
  - Other files show a type icon (spreadsheet, JSON braces, video, audio, archive, document), the file name and an extension badge, and open in a new tab.
  - Every tile has a hover ✕ to remove it.
- The **"N files"** badge on a task card opens an **Info** modal with the same grid.
- Clicking an image opens the full-screen **Lightbox**. It cycles through the task's images only (**Escape** to close, **← →** to navigate, thumbnail strip for multiple images) and starts on the image you clicked.
- The Workspace task detail panel shows the same **Info (N)** grid.
- Removing a file from the edit form automatically deletes the object from Stratus on save.

### My Workspace (Kanban Dashboard)
- Five-column Kanban board: **Dropped**, **Pipeline**, **Active**, **Completed**, **Overdue** — all tasks across all services in one view.
- **Monthly scoping for Completed and Dropped columns** — only tasks completed or dropped in the current calendar month appear in those two columns. This allows accurate month-by-month progress tracking. Pipeline, Active, and Overdue carry forward across months as usual.
- Accessible from the homepage or via the **Dashboard** button in any service's task view.
- Search bar in the header filters all five columns live as you type.
- Click any card for full task details in a side sheet, including Info attachments and drop reason for dropped tasks.
- **Go to service** button in the task detail panel navigates directly to the matching tab in that service's view (e.g. a completed task opens the **Completed** tab).
- Jump to any service directly via the ⋯ meatball menu.

### Monthly Kanban Archive
- On every Workspace load, the app silently upserts a **snapshot** for the current month — recording the live counts of active, pipeline, dropped, completed, and overdue tasks.
- Simultaneously, a **`html2canvas` screenshot** of the Kanban board is captured 2 seconds after render, uploaded directly to Catalyst Stratus, and attached to the snapshot record.
- When a new month begins, all non-completed tasks from the previous month carry forward into the new Kanban automatically (they never disappear — they're still active/pipeline/etc.).
- **Past months** appear below the Kanban as collapsed **accordion rows**, newest first. Each row shows:
  - Month name (e.g. *July 2026*)
  - A small thumbnail of the Kanban screenshot from that month
  - Count chips: `13 Active · 10 Pipeline · 2 Dropped · 40 Completed · 7 Overdue`
- **Expanding an accordion** reveals the full Kanban screenshot (click to zoom) and a green card grid of every completed task from that month, each showing the task title and service name.
- Snapshot upserts happen silently in the background — no loading bar flash, no interruption to normal use.

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

### Authentication (hosted login, owner only)
- Sign-in uses **Catalyst hosted login**. Signed-out visitors see a TaskMAXXING sign-in page whose **Sign in** button opens `/__catalyst/auth/login`, served by Slate. After sign-in, the hosted page returns to the app.
- The app is **single-user**. `task_api` lets in only the Catalyst user IDs listed in the `ALLOWED_USER_IDS` env variable, which defaults to the owner, `20660000002140058`.
  - No signed-in user → `401`, and the app shows the sign-in page.
  - Any other signed-in account → `403`, and the app shows a blank screen saying *"You don't have permission to access this app."* with a small **Log out** link. That account never receives data.
- Data has no owner column. Every existing service, task and snapshot belongs to the single owner, so turning on login needed no data migration.
- Slate and the function are on different domains, so the login cookie never reaches the API. Every API call sends a Catalyst token from the Web SDK instead (`Authorization: Zoho-oauthtoken …`, from `catalyst.auth.generateAuthToken()`). `task_api` reads the user with `getCurrentUser()` in user scope, then does all Datastore, ZCQL, Stratus and Job Scheduling work in **admin scope**.
- **Log out** is fixed in the bottom-right corner, next to the theme toggle, on every signed-in screen. It goes to `/accounts/p/<ZAID>/logout`, which ends the httpOnly session cookies. The Web SDK's `signOut()` doesn't end a hosted-login session. The app then returns to the sign-in page with a *"You've been logged out"* note.
- The reminder-email default is the signed-in user's email. The old first-run email setup screen has been removed.
- After confirming an invite, Catalyst redirects to the legacy `/app/index.html`. Slate static apps ignore `_redirects`, so a real `public/app/index.html` forwards to `/`, keeping the query string and hash.
- Console setup:
  - Authentication → Hosted login on, public signup off.
  - The owner is invited as an App User.
  - `task-manager.onslate.in` is an authorized CORS domain.
  - To let another account in, add its user ID to `ALLOWED_USER_IDS`.

---

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4 |
| Hosting | Catalyst Slate (static) |
| Auth | Catalyst Authentication: hosted login + Web SDK 4.6.2; owner-only allowlist in `task_api` |
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
│   │   ├── App.tsx                # Auth gate (sign-in / no-access / app) + Log out & theme controls
│   │   ├── lib/auth.ts            # Hosted login helpers: SDK readiness, token header, sign-in/out URLs
│   │   ├── lib/attachments.ts     # File-type helpers for Info attachments
│   │   ├── index.css              # Tailwind v4 + dark mode variant
│   │   ├── pages/
│   │   │   ├── ServicesPage.tsx       # Services list + create modal
│   │   │   ├── ServiceDetailPage.tsx  # Tasks per service (tabs + search incl. Dropped)
│   │   │   └── WorkspacePage.tsx      # Kanban dashboard (5 columns, search, dark mode)
│   │   ├── components/
│   │   │   ├── TaskCard.tsx           # Active task card (priority, pipeline, complete)
│   │   │   ├── CompletedTaskCard.tsx  # Completed card (final thoughts, pipeline)
│   │   │   ├── PipelineTaskCard.tsx   # Pipeline card (review modal, 2-week badge)
│   │   │   ├── DroppedTaskCard.tsx    # Dropped task card (restore, delete)
│   │   │   ├── ImageReferences.tsx    # "Upload info" — upload/manage task attachments (any file type)
│   │   │   ├── AttachmentTile.tsx     # Image thumbnail or file-type tile for one attachment
│   │   │   ├── AttachmentGrid.tsx     # Read-only attachment grid + Info modal (images → lightbox)
│   │   │   ├── ImageLightbox.tsx      # Full-screen image viewer with keyboard nav
│   │   │   ├── Badge.tsx              # Status badges incl. priority + dropped
│   │   │   ├── Button.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── Input.tsx
│   │   ├── hooks/useTaskManager.ts
│   │   ├── store/engine.ts        # API client
│   │   └── types/index.ts
│   ├── public/
│   │   ├── favicon.ico            # TM favicon (16–256 px)
│   │   ├── apple-touch-icon.png   # 180 px home-screen icon
│   │   └── logo-wordmark.png      # TaskMAXXING wordmark (header + sign-in page)
│   └── vite.config.ts
└── client/                        # Vite build output → deployed to Slate
```

---

## API Routes (`task_api`)

Every route requires a signed-in owner (see Authentication). It returns `401` when the request has no user and `403` for any other account.

| Method | Path | Description |
|---|---|---|
| `GET` | `/execute/whoami` | The signed-in owner (`user_id`, `email_id`, `first_name`). 401 if signed out, 403 for any other account |
| `GET` | `/execute/state` | Fetch full app state (services, tasks, overdue, dropped) |
| `POST` | `/execute/services` | Create a service (name, optional logo_url) |
| `DELETE` | `/execute/services/:id` | Delete a service and all its tasks + Stratus logo |
| `POST` | `/execute/services/logo-upload` | Get a presigned Stratus PUT URL for logo upload |
| `POST` | `/execute/tasks/image-upload` | Get a presigned Stratus PUT URL for a task attachment (any file type) |
| `POST` | `/execute/tasks` | Create a task (active or pipeline) |
| `PUT` | `/execute/tasks/:id` | Update a task |
| `PUT` | `/execute/tasks/:id/complete` | Mark a task completed (with optional final thoughts) |
| `PUT` | `/execute/tasks/:id/push-to-pipeline` | Move a task to pipeline (with optional reason) |
| `PUT` | `/execute/tasks/:id/activate` | Activate a pipeline task (assign due date + reminder) |
| `PUT` | `/execute/tasks/:id/drop` | Drop a pipeline task (requires reason) |
| `PUT` | `/execute/tasks/:id/pipeline-review` | Keep task in pipeline and reset its 2-week timer |
| `DELETE` | `/execute/tasks/:id` | Delete a task |
| `POST` | `/execute/snapshots` | Upsert monthly snapshot counts |
| `POST` | `/execute/snapshots/screenshot-upload` | Get a presigned Stratus PUT URL for snapshot screenshot |
| `PUT` | `/execute/snapshots/:month/screenshot` | Attach screenshot URL to an existing snapshot |

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
| `image_references` | text | JSON array of Stratus attachment URLs, any file type (optional) |

### `MonthlySnapshots`
| Column | Type | Notes |
|---|---|---|
| `ROWID` | bigint | Primary key |
| `snapshot_month` | varchar | `YYYY-MM` format — unique per month |
| `active_count` | integer | Active task count at snapshot time |
| `pipeline_count` | integer | Pipeline task count at snapshot time |
| `dropped_count` | integer | Dropped task count for that month |
| `overdue_count` | integer | Overdue task count at snapshot time |
| `completed_count` | integer | Completed task count for that month |
| `screenshot_url` | varchar | Stratus object URL for the Kanban screenshot (optional) |

---

## Stratus Object Storage

- **Bucket:** `taskmanager-175003` (public read)
- **Logo path:** `service-logos/<timestamp>-<filename>`
- **Task attachment path:** `task-images/<timestamp>-<filename>` (all file types; prefix name is legacy)
- **Snapshot screenshot path:** `month-snapshots/YYYY-MM.png`
- Upload flow: frontend requests a presigned PUT URL from `task_api` → browser PUTs the file directly to Stratus → the returned object URL is saved in Datastore.
- Logos are auto-deleted from Stratus when the service is deleted.
- Task attachments are auto-deleted from Stratus when removed from the edit form and saved.
- Snapshot screenshot paths are fixed per month — re-uploading overwrites the previous screenshot for that month.

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
| **Live data updates** | Updated service `logo_url` values directly via ZCQL UPDATE without touching the app (e.g. swapped the Claude Apps service logo to an SVG stored in Stratus) |

---


