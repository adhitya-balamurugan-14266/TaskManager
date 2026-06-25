/**
 * task_api — Advanced I/O Function
 *
 * The single REST API for the TaskManager app. Routes are resolved by matching
 * the last URL path segment(s) and the HTTP method, since Catalyst Advanced I/O
 * functions receive a raw Node.js IncomingMessage rather than a pre-parsed router.
 *
 * Route summary:
 *   GET  /state                         — full app state snapshot
 *   POST /services/logo-upload          — presigned PUT URL for Stratus logo
 *   POST /services                      — create a service
 *   DELETE /services/:id                — delete service + tasks + Stratus logo
 *   POST /tasks                         — create a task (active or pipeline)
 *   PUT  /tasks/:id/push-to-pipeline    — move any task to pipeline
 *   PUT  /tasks/:id/activate            — activate a pipeline task
 *   PUT  /tasks/:id/complete            — complete an active task
 *   PUT  /tasks/:id/drop                — drop a pipeline task (with reason)
 *   PUT  /tasks/:id/pipeline-review     — keep in pipeline with reason; resets 2-week timer
 *   DELETE /tasks/:id                   — delete a task
 *   PUT  /tasks/:id                     — generic update (active / pipeline / completed)
 */
'use strict';
const catalyst = require('zcatalyst-sdk-node');

// ─── Constants ─────────────────────────────────────────────────────────────────
const SERVICES_TABLE = 'Services';
const TASKS_TABLE    = 'Tasks';
const JOBPOOL_NAME   = 'TaskReminderPool';       // Catalyst Job Pool for reminder jobs
const REMINDER_FUNCTION_NAME = 'task_reminder'; // Job Function triggered by crons
const STRATUS_BUCKET = 'taskmanager-175003';     // Catalyst Stratus bucket for service logos
const LOGO_PATH_PREFIX = 'service-logos/';      // Object key prefix inside the bucket
const TASK_IMAGES_PATH_PREFIX = 'task-images/'; // Object key prefix for task reference images

// ─── Utilities ────────────────────────────────────────────────────────────────

/**
 * Validates that a value coming from a URL path segment is a safe numeric ID.
 * Prevents ZCQL injection by rejecting non-numeric route parameters before
 * they are interpolated into query strings.
 * @param {string|number} id
 * @returns {boolean}
 */
function isValidId(id) {
  return /^\d+$/.test(String(id));
}

/**
 * Writes a JSON response with the given HTTP status code.
 * @param {import('http').ServerResponse} res
 * @param {number} status
 * @param {object} data
 */
function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

/**
 * Reads and parses the JSON request body.
 * Handles both pre-parsed bodies (set by Catalyst middleware) and raw streams.
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<object>}
 */
function getBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === 'object') return resolve(req.body);
    if (req.body && typeof req.body === 'string') {
      try { return resolve(JSON.parse(req.body)); } catch { return resolve({}); }
    }
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch { resolve({}); }
    });
    req.on('error', reject);
  });
}

/**
 * Returns an ISO timestamp that is `days` days after `isoDate`.
 * If `time` is provided as "HH:MM" it is applied; otherwise defaults to 23:59.
 * @param {string} isoDate - Base ISO date string
 * @param {number} days
 * @param {string|null} time - Optional "HH:MM" override
 * @returns {string} ISO timestamp
 */
function addDays(isoDate, days, time) {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  if (time && /^\d{1,2}:\d{2}$/.test(time)) {
    const [h, m] = time.split(':').map(Number);
    d.setHours(h, m, 0, 0);
  } else {
    d.setHours(23, 59, 0, 0);
  }
  return d.toISOString();
}

/**
 * Combines a "YYYY-MM-DD" date string and an optional "HH:MM" time string into
 * a full UTC ISO timestamp. Returns null if the date is invalid.
 * @param {string} dateValue
 * @param {string|undefined} timeValue
 * @returns {string|null}
 */
function combineDateAndTime(dateValue, timeValue) {
  if (!dateValue || !/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return null;
  const safeTime = timeValue && /^\d{1,2}:\d{2}$/.test(timeValue) ? timeValue : '23:59';
  const dt = new Date(`${dateValue}T${safeTime}:00`);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString();
}

/**
 * Calculates the number of days between task creation and due date.
 * Always returns at least 1 so the field stays meaningful.
 * @param {string} dateAddedIso
 * @param {string} dueDateIso
 * @returns {number}
 */
function calcDaysAssigned(dateAddedIso, dueDateIso) {
  const added = new Date(dateAddedIso);
  const due = new Date(dueDateIso);
  const diffMs = due.getTime() - added.getTime();
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Extracts the "YYYY-MM" month key from an ISO date string.
 * Used to group completed tasks into monthly archive buckets.
 * @param {string} isoDate
 * @returns {string}
 */
function monthKey(isoDate) {
  return isoDate.slice(0, 7);
}

/**
 * Derives the overdue list from active tasks.
 * A task is overdue if its due date is in the past — the reminder flag is
 * intentionally NOT checked here; any task can be overdue regardless of
 * whether an email reminder was configured.
 * @param {object[]} activeTasks - Mapped task objects with a due_date field
 * @returns {object[]}
 */
function computeOverdue(activeTasks) {
  const now = new Date();
  return activeTasks
    .filter((t) => t.due_date && new Date(t.due_date) < now)
    .map((t) => ({
      id: String(t.id),
      title: t.title,
      service_id: t.service_id,
      due_date: t.due_date,
      days_overdue: Math.floor((now - new Date(t.due_date)) / (1000 * 60 * 60 * 24)),
    }));
}

/**
 * Creates a one-time Catalyst Cron that fires the `task_reminder` job function
 * at the task's due date. Skips creation if the due date is within 10 seconds
 * (Catalyst rejects crons too close to now).
 * @param {object} catalystApp
 * @param {string|number} taskId
 * @param {string} dueDate - ISO timestamp
 * @param {string} reminderEmail
 * @returns {Promise<string|null>} Cron ID, or null if skipped/failed
 */
async function createReminderCron(catalystApp, taskId, dueDate, reminderEmail) {
  const dueMs = new Date(dueDate).getTime();
  const dueSeconds = Math.floor(dueMs / 1000);
  const secondsFromNow = (dueMs - Date.now()) / 1000;
  if (secondsFromNow <= 10) {
    console.warn(`[task_api] Skipping cron for task ${taskId}: due in ${secondsFromNow.toFixed(1)}s (too soon)`);
    return null;
  }
  const name = `tr${taskId}`;
  try {
    const jobScheduling = catalystApp.jobScheduling();
    const result = await jobScheduling.CRON.createCron({
      cron_name: name,
      cron_status: true,
      cron_type: 'OneTime',
      cron_detail: {
        time_of_execution: String(dueSeconds)
      },
      job_meta: {
        job_name: name,
        target_type: 'Function',
        target_name: REMINDER_FUNCTION_NAME,
        jobpool_name: JOBPOOL_NAME,
        params: { task_id: String(taskId), reminder_email: reminderEmail || '' }
      }
    });
    return result && result.id ? String(result.id) : null;
  } catch (e) {
    console.warn('[task_api] createReminderCron failed for task', taskId, ':', e.message);
    return null;
  }
}

/**
 * Deletes a Catalyst Cron by ID. Safe to call with null/undefined — it no-ops.
 * Errors are caught and logged as warnings so they never abort the main request.
 * @param {object} catalystApp
 * @param {string|null} cronId
 */
async function deleteReminderCron(catalystApp, cronId) {
  if (!cronId) return;
  try {
    const jobScheduling = catalystApp.jobScheduling();
    await jobScheduling.CRON.deleteCron(String(cronId));
  } catch (e) {
    console.warn('[task_api] deleteReminderCron failed for cron', cronId, ':', e.message);
  }
}

/**
 * Deletes Stratus objects whose URLs appear in oldRefs but not in newRefs.
 * Called when a task's image_references array is updated so orphaned objects
 * are cleaned up automatically.
 * @param {object} adminApp - Admin-scoped Catalyst app
 * @param {string[]} oldRefs
 * @param {string[]} newRefs
 */
async function deleteRemovedImages(adminApp, oldRefs, newRefs) {
  if (!Array.isArray(oldRefs) || oldRefs.length === 0) return;
  const safeNew = Array.isArray(newRefs) ? newRefs : [];
  const removed = oldRefs.filter((url) => !safeNew.includes(url));
  if (removed.length === 0) return;
  const bucket = adminApp.stratus().bucket(STRATUS_BUCKET);
  await Promise.all(removed.map(async (url) => {
    try {
      const keyMatch = String(url).match(/zohostratus\.in\/(.+)$/);
      if (keyMatch) await bucket.deleteObject(keyMatch[1]);
    } catch (e) {
      console.warn('[task_api] Failed to delete removed image from Stratus:', e.message);
    }
  }));
}

// ─── Row Mappers ──────────────────────────────────────────────────────────────

/**
 * Maps a raw Catalyst Datastore row (Services table) to a plain service object
 * consumed by the frontend.
 * @param {object} row
 * @returns {object}
 */
function rowToService(row) {
  return {
    id: String(row.ROWID),
    name: row.service_name,
    logo_url: row.logo_url || null,
    created_at: row.CREATEDTIME ? new Date(row.CREATEDTIME).toISOString() : new Date().toISOString(),
  };
}

/**
 * Maps a raw Catalyst Datastore row (Tasks table) to a typed task object.
 * Handles boolean coercion (Catalyst returns booleans as strings in some
 * contexts), null-coalescing optional fields, and status-specific extras
 * (e.g., date_completed only on completed tasks).
 * @param {object} row
 * @returns {object}
 */
function rowToTask(row) {
  const base = {
    id: String(row.ROWID),
    title: row.title,
    description: row.description || null,
    service_id: row.service_id,
    date_added: row.date_added,
    days_assigned: Number(row.days_assigned),
    due_date: row.due_date,
    reminder: row.reminder === true || row.reminder === 'true',
    reminder_email: row.reminder_email || null,
    status: row.status,
    pipeline_reason: row.pipeline_reason || null,
    pipeline_entered_at: row.pipeline_entered_at || null,
    pipeline_alerted: row.pipeline_alerted === true || row.pipeline_alerted === 'true',
    final_thoughts: row.final_thoughts || null,
    is_priority: row.is_priority === true || row.is_priority === 'true',
    dropped_reason: row.dropped_reason || null,
    dropped_date: row.dropped_date || null,
    image_references: (() => {
      try {
        if (!row.image_references) return [];
        const parsed = typeof row.image_references === 'string'
          ? JSON.parse(row.image_references)
          : row.image_references;
        return Array.isArray(parsed) ? parsed : [];
      } catch { return []; }
    })(),
  };
  if (row.status === 'completed') base.date_completed = row.date_completed;
  return base;
}

/**
 * Builds and returns the full application state snapshot by querying both
 * tables in two ZCQL calls. Completed tasks are grouped by "YYYY-MM" month
 * key so the frontend can render an archive selector. Overdue tasks are
 * derived from active tasks — no separate DB column needed.
 * @param {object} zcql - Catalyst ZCQL instance
 * @returns {Promise<{services, tasks: {active, completed, pipeline}, overdue, last_updated}>}
 */
async function buildState(zcql) {
  // Fetch all services
  const svcRows = await zcql.executeZCQLQuery(`SELECT * FROM ${SERVICES_TABLE}`);
  const services = svcRows.map((r) => rowToService(r[SERVICES_TABLE])).filter(Boolean);

  // Fetch all tasks
  const taskRows = await zcql.executeZCQLQuery(`SELECT * FROM ${TASKS_TABLE}`);
  const allTasks = taskRows.map((r) => rowToTask(r[TASKS_TABLE])).filter(Boolean);

  const pipeline = allTasks.filter((t) => t.status === 'pipeline');
  const active = allTasks.filter((t) => t.status === 'active');
  const completedFlat = allTasks.filter((t) => t.status === 'completed');
  const dropped = allTasks.filter((t) => t.status === 'dropped');

  const completed = {};
  for (const t of completedFlat) {
    const month = monthKey(t.date_completed);
    if (!completed[month]) completed[month] = [];
    completed[month].push(t);
  }

  const overdue = computeOverdue(active);

  return {
    services,
    tasks: { active, completed, pipeline, dropped },
    overdue,
    last_updated: new Date().toISOString(),
  };
}

// ─── Request Handler ────────────────────────────────────────────────────────────
module.exports = async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const zcql = catalystApp.zcql();
    const dsServices = catalystApp.datastore().table(SERVICES_TABLE);
    const dsTasks    = catalystApp.datastore().table(TASKS_TABLE);

    // Catalyst Advanced I/O functions receive a raw Node.js request; there is no
    // built-in router. We resolve routes by splitting the URL path and matching
    // the last one or two segments together with the HTTP method.
    const parsedUrl = new URL(req.url, `https://${req.headers.host}`);
    const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
    const action    = pathParts[pathParts.length - 1]; // last segment
    const method    = req.method;

    // GET /state — return full state
    if (action === 'state' && method === 'GET') {
      const state = await buildState(zcql);
      return sendJson(res, 200, state);
    }

    // POST /services/logo-upload — generate presigned PUT URL for logo upload
    if (pathParts[pathParts.length - 1] === 'logo-upload' && pathParts[pathParts.length - 2] === 'services' && method === 'POST') {
      const body = await getBody(req);
      const { filename } = body;
      if (!filename) return sendJson(res, 400, { error: 'filename is required.' });
      const safe = String(filename).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
      const key = `${LOGO_PATH_PREFIX}${Date.now()}-${safe}`;
      const adminApp = catalyst.initialize(req, { type: 'admin' });
      const bucket = adminApp.stratus().bucket(STRATUS_BUCKET);
      const signedRes = await bucket.generatePreSignedUrl(key, 'PUT', { expiryIn: 300 });
      const objectUrl = `https://${STRATUS_BUCKET}-development.zohostratus.in/${key}`;
      return sendJson(res, 200, { presigned_url: signedRes.signature, object_url: objectUrl, key });
    }

    // POST /tasks/image-upload — generate presigned PUT URL for a task reference image
    if (pathParts[pathParts.length - 1] === 'image-upload' && pathParts[pathParts.length - 2] === 'tasks' && method === 'POST') {
      const body = await getBody(req);
      const { filename } = body;
      if (!filename) return sendJson(res, 400, { error: 'filename is required.' });
      const safe = String(filename).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
      const key = `${TASK_IMAGES_PATH_PREFIX}${Date.now()}-${safe}`;
      const adminApp = catalyst.initialize(req, { type: 'admin' });
      const bucket = adminApp.stratus().bucket(STRATUS_BUCKET);
      const signedRes = await bucket.generatePreSignedUrl(key, 'PUT', { expiryIn: 300 });
      const objectUrl = `https://${STRATUS_BUCKET}-development.zohostratus.in/${key}`;
      return sendJson(res, 200, { presigned_url: signedRes.signature, object_url: objectUrl, key });
    }

    // POST /services — create_service
    if (action === 'services' && method === 'POST') {
      const body = await getBody(req);
      const { name, logo_url } = body;
      if (!name || !name.trim()) return sendJson(res, 400, { error: 'Service name is required.' });

      // Check duplicate
      const existing = await zcql.executeZCQLQuery(
        `SELECT ROWID FROM ${SERVICES_TABLE} WHERE service_name = '${name.trim().replace(/'/g, "\\'")}'`
      );
      if (existing.length > 0) return sendJson(res, 409, { error: `A service named "${name}" already exists.` });

      await dsServices.insertRow({ service_name: name.trim(), logo_url: logo_url || null });
      const state = await buildState(zcql);
      return sendJson(res, 201, state);
    }

    // DELETE /services/:id — delete service, all its tasks, and its Stratus logo
    if (action !== 'services' && pathParts[pathParts.length - 2] === 'services' && method === 'DELETE') {
      const serviceId = action;
      if (!isValidId(serviceId)) return sendJson(res, 400, { error: 'Invalid service ID.' });

      const svcRows = await zcql.executeZCQLQuery(
        `SELECT ROWID, logo_url FROM ${SERVICES_TABLE} WHERE ROWID = ${serviceId}`
      );
      if (svcRows.length === 0) return sendJson(res, 404, { error: `Service "${serviceId}" not found.` });

      // Delete logo from Stratus if present
      const logoUrl = svcRows[0][SERVICES_TABLE].logo_url;
      if (logoUrl) {
        try {
          const adminApp = catalyst.initialize(req, { type: 'admin' });
          // Extract key from URL: everything after the bucket host
          const keyMatch = logoUrl.match(/zohostratus\.in\/(.+)$/);
          if (keyMatch) {
            await adminApp.stratus().bucket(STRATUS_BUCKET).deleteObject(keyMatch[1]);
          }
        } catch (e) {
          console.warn('[task_api] Failed to delete logo from Stratus:', e.message);
        }
      }

      // Fetch tasks for this service (including cron IDs so we can clean up reminders)
      const taskRows = await zcql.executeZCQLQuery(
        `SELECT ROWID, cron_id FROM ${TASKS_TABLE} WHERE service_id = '${serviceId}'`
      );
      if (taskRows.length > 0) {
        // Cancel all active reminder crons before deleting the rows; otherwise
        // the cron fires after deletion and the job function finds no task.
        await Promise.all(
          taskRows
            .map((r) => r[TASKS_TABLE].cron_id)
            .filter(Boolean)
            .map((cronId) => deleteReminderCron(catalystApp, cronId))
        );
        const rowids = taskRows.map((r) => r[TASKS_TABLE].ROWID);
        await dsTasks.deleteRows(rowids);
      }
      await dsServices.deleteRow(serviceId);
      const state = await buildState(zcql);
      return sendJson(res, 200, state);
    }

    // POST /tasks — create_task
    if (action === 'tasks' && method === 'POST') {
      const body = await getBody(req);
      const { title, service_id, days_assigned, due_date, reminder, description, reminder_time, reminder_email, is_pipeline, image_references } = body;
      if (!title || !title.trim()) return sendJson(res, 400, { error: 'Task title is required.' });
      if (!service_id) return sendJson(res, 400, { error: 'service_id is required.' });

      const svcRows = await zcql.executeZCQLQuery(
        `SELECT ROWID FROM ${SERVICES_TABLE} WHERE ROWID = ${service_id}`
      );
      if (svcRows.length === 0) return sendJson(res, 404, { error: `Service "${service_id}" not found.` });

      const date_added = new Date().toISOString();
      const imageRefsJson = Array.isArray(image_references) && image_references.length > 0
        ? JSON.stringify(image_references)
        : null;

      if (is_pipeline) {
        await dsTasks.insertRow({
          title: title.trim(),
          description: description ? description.trim() : null,
          service_id: String(service_id),
          date_added,
          days_assigned: 0,
          due_date: null,
          reminder: false,
          reminder_email: null,
          status: 'pipeline',
          date_completed: null,
          cron_id: null,
          pipeline_entered_at: date_added,
          pipeline_alerted: false,
          image_references: imageRefsJson,
        });
        const state = await buildState(zcql);
        return sendJson(res, 201, state);
      }

      const parsedDays = Number(days_assigned);
      if (!due_date && (!parsedDays || parsedDays < 0)) return sendJson(res, 400, { error: 'days_assigned must be 0 or greater.' });
      // If due_date is already a full ISO string (sent from browser with correct tz), use it directly
      const resolvedDueDate = (due_date && due_date.includes('T'))
        ? due_date
        : combineDateAndTime(due_date, reminder_time) || addDays(date_added, parsedDays || 0, reminder_time);
      const resolvedDaysAssigned = calcDaysAssigned(date_added, resolvedDueDate);

      const inserted = await dsTasks.insertRow({
        title: title.trim(),
        description: description ? description.trim() : null,
        service_id: String(service_id),
        date_added,
        days_assigned: resolvedDaysAssigned,
        due_date: resolvedDueDate,
        reminder: !!reminder,
        reminder_email: reminder_email ? reminder_email.trim() : null,
        status: 'active',
        date_completed: null,
        cron_id: null,
        image_references: imageRefsJson,
      });
      if (!!reminder && inserted && inserted.ROWID) {
        const cronId = await createReminderCron(catalystApp, inserted.ROWID, resolvedDueDate, reminder_email || '');
        if (cronId) await dsTasks.updateRow({ ROWID: inserted.ROWID, cron_id: cronId });
      }
      const state = await buildState(zcql);
      return sendJson(res, 201, state);
    }

    // PUT /tasks/:id/push-to-pipeline — move any active/completed task to the pipeline backlog
    if (pathParts[pathParts.length - 1] === 'push-to-pipeline' && pathParts[pathParts.length - 3] === 'tasks' && method === 'PUT') {
      const taskId = pathParts[pathParts.length - 2];
      if (!isValidId(taskId)) return sendJson(res, 400, { error: 'Invalid task ID.' });
      const body = await getBody(req);
      const taskRows = await zcql.executeZCQLQuery(
        `SELECT * FROM ${TASKS_TABLE} WHERE ROWID = ${taskId}`
      );
      if (taskRows.length === 0) return sendJson(res, 404, { error: `Task "${taskId}" not found.` });

      const existingRaw = taskRows[0][TASKS_TABLE];
      if (existingRaw.status === 'pipeline') return sendJson(res, 400, { error: 'Task is already in pipeline.' });

      await deleteReminderCron(catalystApp, existingRaw.cron_id || null);

      const reason = body.reason ? String(body.reason).trim() : null;
      const now = new Date().toISOString();
      await dsTasks.updateRow({
        ROWID: taskId,
        status: 'pipeline',
        due_date: null,
        days_assigned: 0,
        reminder: false,
        reminder_email: null,
        cron_id: null,
        date_completed: null,
        pipeline_reason: reason || null,
        pipeline_entered_at: now,
        pipeline_alerted: false,
      });

      const state = await buildState(zcql);
      return sendJson(res, 200, state);
    }

    // PUT /tasks/:id/drop — move a pipeline task to dropped status
    if (pathParts[pathParts.length - 1] === 'drop' && pathParts[pathParts.length - 3] === 'tasks' && method === 'PUT') {
      const taskId = pathParts[pathParts.length - 2];
      if (!isValidId(taskId)) return sendJson(res, 400, { error: 'Invalid task ID.' });
      const body = await getBody(req);
      const { dropped_reason } = body;
      if (!dropped_reason || !String(dropped_reason).trim()) {
        return sendJson(res, 400, { error: 'dropped_reason is required.' });
      }
      const taskRows = await zcql.executeZCQLQuery(
        `SELECT * FROM ${TASKS_TABLE} WHERE ROWID = ${taskId} AND status = 'pipeline'`
      );
      if (taskRows.length === 0) return sendJson(res, 404, { error: `Task "${taskId}" not found in pipeline.` });

      const dropped_date = new Date().toISOString();
      await dsTasks.updateRow({
        ROWID: taskId,
        status: 'dropped',
        pipeline_reason: null,
        pipeline_entered_at: null,
        pipeline_alerted: false,
        dropped_reason: String(dropped_reason).trim(),
        dropped_date,
      });

      const state = await buildState(zcql);
      return sendJson(res, 200, state);
    }

    // PUT /tasks/:id/pipeline-review — keep in pipeline; reset 2-week timer
    if (pathParts[pathParts.length - 1] === 'pipeline-review' && pathParts[pathParts.length - 3] === 'tasks' && method === 'PUT') {
      const taskId = pathParts[pathParts.length - 2];
      if (!isValidId(taskId)) return sendJson(res, 400, { error: 'Invalid task ID.' });
      const body = await getBody(req);
      const { reason } = body;
      if (!reason || !String(reason).trim()) {
        return sendJson(res, 400, { error: 'reason is required.' });
      }
      const taskRows = await zcql.executeZCQLQuery(
        `SELECT * FROM ${TASKS_TABLE} WHERE ROWID = ${taskId} AND status = 'pipeline'`
      );
      if (taskRows.length === 0) return sendJson(res, 404, { error: `Task "${taskId}" not found in pipeline.` });

      const now = new Date().toISOString();
      await dsTasks.updateRow({
        ROWID: taskId,
        pipeline_reason: String(reason).trim(),
        pipeline_entered_at: now,
        pipeline_alerted: false,
      });

      const state = await buildState(zcql);
      return sendJson(res, 200, state);
    }

    // PUT /tasks/:id/activate — promote a pipeline task to active status
    if (pathParts[pathParts.length - 1] === 'activate' && pathParts[pathParts.length - 3] === 'tasks' && method === 'PUT') {
      const taskId = pathParts[pathParts.length - 2];
      if (!isValidId(taskId)) return sendJson(res, 400, { error: 'Invalid task ID.' });
      const body = await getBody(req);
      const taskRows = await zcql.executeZCQLQuery(
        `SELECT * FROM ${TASKS_TABLE} WHERE ROWID = ${taskId} AND status = 'pipeline'`
      );
      if (taskRows.length === 0) return sendJson(res, 404, { error: `Task "${taskId}" not found in pipeline.` });

      const existing = rowToTask(taskRows[0][TASKS_TABLE]);
      const { days_assigned, due_date, reminder, reminder_email } = body;
      const resolvedDueDate = (due_date && due_date.includes('T'))
        ? due_date
        : addDays(existing.date_added, Number(days_assigned) || 1, null);
      const resolvedDaysAssigned = calcDaysAssigned(existing.date_added, resolvedDueDate);

      await dsTasks.updateRow({
        ROWID: taskId,
        status: 'active',
        due_date: resolvedDueDate,
        days_assigned: resolvedDaysAssigned,
        reminder: !!reminder,
        reminder_email: reminder_email ? reminder_email.trim() : null,
        cron_id: null,
      });

      if (!!reminder) {
        const cronId = await createReminderCron(catalystApp, taskId, resolvedDueDate, reminder_email || '');
        if (cronId) await dsTasks.updateRow({ ROWID: taskId, cron_id: cronId });
      }

      const state = await buildState(zcql);
      return sendJson(res, 200, state);
    }

    // PUT /tasks/:id/complete — mark an active task as completed
    if (pathParts[pathParts.length - 1] === 'complete' && pathParts[pathParts.length - 3] === 'tasks' && method === 'PUT') {
      const taskId = pathParts[pathParts.length - 2];
      if (!isValidId(taskId)) return sendJson(res, 400, { error: 'Invalid task ID.' });
      const body = await getBody(req);
      const taskRows = await zcql.executeZCQLQuery(
        `SELECT * FROM ${TASKS_TABLE} WHERE ROWID = ${taskId} AND status = 'active'`
      );
      if (taskRows.length === 0) return sendJson(res, 404, { error: `Task "${taskId}" not found in active tasks.` });

      await deleteReminderCron(catalystApp, taskRows[0][TASKS_TABLE].cron_id || null);
      const date_completed = new Date().toISOString();
      const final_thoughts = body.final_thoughts ? String(body.final_thoughts).trim() : null;
      await dsTasks.updateRow({ ROWID: taskId, status: 'completed', date_completed, cron_id: null, final_thoughts: final_thoughts || null });
      const state = await buildState(zcql);
      return sendJson(res, 200, state);
    }

    // DELETE /tasks/:id — hard-delete a task and cancel its reminder cron
    if (pathParts[pathParts.length - 2] === 'tasks' && method === 'DELETE') {
      const taskId = action;
      if (!isValidId(taskId)) return sendJson(res, 400, { error: 'Invalid task ID.' });
      const taskRows = await zcql.executeZCQLQuery(
        `SELECT ROWID, cron_id FROM ${TASKS_TABLE} WHERE ROWID = ${taskId}`
      );
      if (taskRows.length === 0) return sendJson(res, 404, { error: `Task "${taskId}" not found.` });

      await deleteReminderCron(catalystApp, taskRows[0][TASKS_TABLE].cron_id || null);
      await dsTasks.deleteRow(taskId);
      const state = await buildState(zcql);
      return sendJson(res, 200, state);
    }

    // PUT /tasks/:id — generic update dispatched by task status:
    //   pipeline  → title, description, pipeline_reason only
    //   completed → final_thoughts only
    //   active    → any field; cron lifecycle is managed automatically
    if (pathParts[pathParts.length - 2] === 'tasks' && method === 'PUT') {
      const taskId = action;
      if (!isValidId(taskId)) return sendJson(res, 400, { error: 'Invalid task ID.' });
      const body = await getBody(req);
      const taskRows = await zcql.executeZCQLQuery(
        `SELECT * FROM ${TASKS_TABLE} WHERE ROWID = ${taskId}`
      );
      if (taskRows.length === 0) return sendJson(res, 404, { error: `Task "${taskId}" not found.` });

      const rawTask = taskRows[0][TASKS_TABLE];
      const existing = rowToTask(rawTask);

      // Pipeline tasks: only title, description, pipeline_reason, image_references are editable
      if (existing.status === 'pipeline') {
        const updates = { ROWID: taskId };
        if (body.title !== undefined) updates.title = body.title.trim();
        if (body.description !== undefined) updates.description = body.description ? body.description.trim() : null;
        if (body.pipeline_reason !== undefined) updates.pipeline_reason = body.pipeline_reason ? body.pipeline_reason.trim() : null;
        if (body.image_references !== undefined) {
          const adminApp = catalyst.initialize(req, { type: 'admin' });
          await deleteRemovedImages(adminApp, existing.image_references || [], body.image_references || []);
          updates.image_references = Array.isArray(body.image_references) && body.image_references.length > 0
            ? JSON.stringify(body.image_references) : null;
        }
        await dsTasks.updateRow(updates);
        const state = await buildState(zcql);
        return sendJson(res, 200, state);
      }

      // Completed tasks: only final_thoughts and image_references are editable
      if (existing.status === 'completed') {
        const updates = { ROWID: taskId };
        if (body.final_thoughts !== undefined) updates.final_thoughts = body.final_thoughts ? body.final_thoughts.trim() : null;
        if (body.image_references !== undefined) {
          const adminApp = catalyst.initialize(req, { type: 'admin' });
          await deleteRemovedImages(adminApp, existing.image_references || [], body.image_references || []);
          updates.image_references = Array.isArray(body.image_references) && body.image_references.length > 0
            ? JSON.stringify(body.image_references) : null;
        }
        await dsTasks.updateRow(updates);
        const state = await buildState(zcql);
        return sendJson(res, 200, state);
      }

      if (existing.status !== 'active') return sendJson(res, 400, { error: `Task "${taskId}" cannot be updated in its current state.` });

      const updates = { ROWID: taskId };
      if (body.title !== undefined) updates.title = body.title.trim();
      if (body.description !== undefined) updates.description = body.description ? body.description.trim() : null;
      if (body.reminder !== undefined) updates.reminder = !!body.reminder;
      if (body.reminder_email !== undefined) updates.reminder_email = body.reminder_email ? body.reminder_email.trim() : null;
      if (body.is_priority !== undefined) updates.is_priority = !!body.is_priority;
      if (body.image_references !== undefined) {
        const adminApp = catalyst.initialize(req, { type: 'admin' });
        await deleteRemovedImages(adminApp, existing.image_references || [], body.image_references || []);
        updates.image_references = Array.isArray(body.image_references) && body.image_references.length > 0
          ? JSON.stringify(body.image_references) : null;
      }
      if (body.days_assigned !== undefined || body.due_date !== undefined || body.reminder_time !== undefined) {
        // If due_date is already a full ISO string (sent from browser with correct tz), use it directly
        const nextDueDate = (body.due_date && body.due_date.includes('T'))
          ? body.due_date
          : combineDateAndTime(body.due_date, body.reminder_time) ||
            addDays(existing.date_added, body.days_assigned !== undefined ? Number(body.days_assigned) : existing.days_assigned, body.reminder_time);
        updates.due_date = nextDueDate;
        updates.days_assigned = calcDaysAssigned(existing.date_added, nextDueDate);
      }

      // Dynamic cron lifecycle for active task updates:
      // \u2022 If reminder was ON and due date changed \u2192 delete old cron, create new one at the new time
      // \u2022 If reminder was toggled OFF              \u2192 delete old cron, clear cron_id
      // \u2022 If reminder was toggled ON               \u2192 create new cron (none existed yet)
      const existingCronId = rawTask.cron_id || null;
      const wasReminder = rawTask.reminder === true || rawTask.reminder === 'true';
      const newReminder = updates.reminder !== undefined ? updates.reminder : wasReminder;
      const newDueDate = updates.due_date || rawTask.due_date;
      const dueDateChanged = updates.due_date !== undefined;

      // Delete old cron if reminder turned off OR due date changed
      if (existingCronId && (!newReminder || dueDateChanged)) {
        await deleteReminderCron(catalystApp, existingCronId);
        updates.cron_id = null;
      }
      // Create new cron if reminder is on AND (no cron existed yet, OR due date changed)
      if (newReminder && (!existingCronId || dueDateChanged)) {
        const taskReminderEmail = updates.reminder_email !== undefined ? updates.reminder_email : (rawTask.reminder_email || '');
        const newCronId = await createReminderCron(catalystApp, taskId, newDueDate, taskReminderEmail);
        updates.cron_id = newCronId || null;
      }

      await dsTasks.updateRow(updates);
      const state = await buildState(zcql);
      return sendJson(res, 200, state);
    }

    sendJson(res, 404, { error: 'Unknown action.' });
  } catch (err) {
    console.error('task_api error:', err);
    sendJson(res, 500, { error: err.message || 'Internal server error' });
  }
};
