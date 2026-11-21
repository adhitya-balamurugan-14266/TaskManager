/**
 * store/engine.ts — API client layer
 *
 * All communication with the `task_api` Catalyst function lives here.
 * Every exported function takes the current AppState (unused at runtime—kept
 * for the `dispatch` signature in useTaskManager) and a typed payload, then
 * returns either a fresh AppState on success or `{ error: string }` on failure.
 *
 * The BASE_URL can be overridden at build time via VITE_TASK_API_BASE_URL;
 * otherwise it defaults to the Catalyst development environment endpoint.
 *
 * Every request carries the signed-in user's Catalyst token (hosted login).
 * A 401/403 from the API is reported to the handler registered with
 * setAuthFailureHandler so the app can switch to the sign-in / no-access screen.
 */
import type {
  AppState,
  CreateServicePayload,
  DeleteServicePayload,
  CreateTaskPayload,
  CompleteTaskPayload,
  DeleteTaskPayload,
  UpdateTaskPayload,
  ActivateTaskPayload,
  MoveToPipelinePayload,
  DropTaskPayload,
  PipelineReviewPayload,
  UpsertSnapshotPayload,
  AttachSnapshotScreenshotPayload,
} from '@/types';
import { AuthError, authHeader, type CatalystUser } from '@/lib/auth';

const BASE_URL =
  import.meta.env.VITE_TASK_API_BASE_URL ??
  'https://taskmanager-60047186223.development.catalystserverless.in/server/task_api/execute';

let onAuthFailure: ((status: 401 | 403) => void) | null = null;

/** Registers the callback used when the API says "signed out" (401) or "not allowed" (403). */
export function setAuthFailureHandler(handler: ((status: 401 | 403) => void) | null) {
  onAuthFailure = handler;
}

/**
 * fetch() against task_api with the Catalyst auth token attached. Reports
 * 401/403 to the auth failure handler (and still returns the response).
 */
async function authedFetch(path: string, options?: RequestInit): Promise<Response> {
  const headers = new Headers(options?.headers ?? {});
  try {
    headers.set('Authorization', await authHeader());
  } catch (err) {
    if (err instanceof AuthError) onAuthFailure?.(err.status);
    throw err;
  }
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (res.status === 401 || res.status === 403) onAuthFailure?.(res.status);
  return res;
}

/**
 * Generic HTTP wrapper. Sets Content-Type only when a body is present.
 * Returns { error } on any non-2xx status or network failure.
 */
async function apiFetch(path: string, options?: RequestInit): Promise<AppState | { error: string }> {
  try {
    const headers = new Headers(options?.headers ?? {});
    if (options?.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const res = await authedFetch(path, { ...options, headers });
    const contentType = res.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (!res.ok) return { error: data.error ?? `HTTP ${res.status}` };
      return data as AppState;
    }

    const text = await res.text();
    if (!res.ok) return { error: text || `HTTP ${res.status}` };
    return { error: 'Unexpected non-JSON response from API.' };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Network error' };
  }
}

/** POST helper for the presigned-upload endpoints, which return their own JSON shape. */
async function postJson<T>(path: string, body: unknown): Promise<T | { error: string }> {
  try {
    const res = await authedFetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error ?? `HTTP ${res.status}` };
    return data as T;
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Network error' };
  }
}

/**
 * Who is signed in. 200 → the owner's details; otherwise the HTTP status
 * (401 signed out, 403 signed in but not allowed into this app).
 */
export async function whoAmI(): Promise<{ user: CatalystUser } | { status: number; error: string }> {
  try {
    const res = await authedFetch('/whoami');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { status: res.status, error: data.error ?? `HTTP ${res.status}` };
    return { user: data as CatalystUser };
  } catch (err: unknown) {
    if (err instanceof AuthError) return { status: err.status, error: err.message };
    return { status: 0, error: err instanceof Error ? err.message : 'Network error' };
  }
}

/** Fetches the full application state snapshot from the server. */
export async function loadState(): Promise<AppState | { error: string }> {
  return apiFetch('/state');
}

/**
 * Requests a short-lived presigned PUT URL from Stratus so the browser can
 * upload a logo image directly without routing through the function.
 * Returns both the presigned URL (for the PUT) and the final public object URL
 * (to save in the Services table).
 */
export async function getLogoUploadUrl(filename: string): Promise<{ presigned_url: string; object_url: string } | { error: string }> {
  return postJson<{ presigned_url: string; object_url: string }>('/services/logo-upload', { filename });
}

/**
 * Requests a short-lived presigned PUT URL from Stratus so the browser can
 * upload a task reference image directly without routing through the function.
 * Returns the presigned URL (for the PUT), the final public object URL (to
 * store in image_references), and the Stratus object key.
 */
export async function getTaskImageUploadUrl(filename: string): Promise<{ presigned_url: string; object_url: string; key: string } | { error: string }> {
  return postJson<{ presigned_url: string; object_url: string; key: string }>('/tasks/image-upload', { filename });
}

export async function createService(_state: AppState, payload: CreateServicePayload) {
  return apiFetch('/services', { method: 'POST', body: JSON.stringify(payload) });
}

export async function deleteService(_state: AppState, payload: DeleteServicePayload) {
  return apiFetch(`/services/${payload.service_id}`, { method: 'DELETE' });
}

export async function createTask(_state: AppState, payload: CreateTaskPayload) {
  return apiFetch('/tasks', { method: 'POST', body: JSON.stringify(payload) });
}

export async function completeTask(_state: AppState, payload: CompleteTaskPayload) {
  const { task_id, ...body } = payload;
  return apiFetch(`/tasks/${task_id}/complete`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteTask(_state: AppState, payload: DeleteTaskPayload) {
  return apiFetch(`/tasks/${payload.task_id}`, { method: 'DELETE' });
}

export async function updateTask(_state: AppState, payload: UpdateTaskPayload) {
  const { task_id, ...updates } = payload;
  return apiFetch(`/tasks/${task_id}`, { method: 'PUT', body: JSON.stringify(updates) });
}

export async function activateTask(_state: AppState, payload: ActivateTaskPayload) {
  const { task_id, ...updates } = payload;
  return apiFetch(`/tasks/${task_id}/activate`, { method: 'PUT', body: JSON.stringify(updates) });
}

export async function moveToPipeline(_state: AppState, payload: MoveToPipelinePayload) {
  const { task_id, ...body } = payload;
  return apiFetch(`/tasks/${task_id}/push-to-pipeline`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function dropTask(_state: AppState, payload: DropTaskPayload) {
  const { task_id, ...body } = payload;
  return apiFetch(`/tasks/${task_id}/drop`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function pipelineReview(_state: AppState, payload: PipelineReviewPayload) {
  const { task_id, ...body } = payload;
  return apiFetch(`/tasks/${task_id}/pipeline-review`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function upsertSnapshot(_state: AppState, payload: UpsertSnapshotPayload) {
  return apiFetch('/snapshots', { method: 'POST', body: JSON.stringify(payload) });
}

export async function attachSnapshotScreenshot(_state: AppState, payload: AttachSnapshotScreenshotPayload) {
  const { month, ...body } = payload;
  return apiFetch(`/snapshots/${month}/screenshot`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function getSnapshotScreenshotUploadUrl(month: string): Promise<{ presigned_url: string; object_url: string } | { error: string }> {
  return postJson<{ presigned_url: string; object_url: string }>('/snapshots/screenshot-upload', { month });
}
