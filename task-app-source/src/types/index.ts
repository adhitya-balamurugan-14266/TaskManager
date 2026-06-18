/**
 * Shared TypeScript types for the TaskManager app.
 *
 * The three task statuses map to distinct interfaces so the compiler can
 * narrow task data to the right shape. Use the `Task` union for generic
 * lists, and narrow to `ActiveTask | CompletedTask | PipelineTask` when
 * you need status-specific fields.
 */

export interface Service {
  id: string;
  name: string;
  logo_url: string | null;
  created_at: string;
}

/** A task that is actively tracked with a due date. */
export interface ActiveTask {
  id: string;
  title: string;
  description: string | null;
  service_id: string;
  date_added: string;
  days_assigned: number;
  due_date: string;
  reminder: boolean;
  reminder_email: string | null;
  status: 'active';
  is_priority: boolean;
}

/** A task that has been marked complete. Moves to the monthly archive in AppState. */
export interface CompletedTask {
  id: string;
  title: string;
  description: string | null;
  service_id: string;
  date_added: string;
  days_assigned: number;
  due_date: string;
  reminder: boolean;
  status: 'completed';
  date_completed: string;
  final_thoughts: string | null;
}

/** A task sitting in the backlog (no due date until activated). */
export interface PipelineTask {
  id: string;
  title: string;
  description: string | null;
  service_id: string;
  date_added: string;
  status: 'pipeline';
  pipeline_reason: string | null;
}

export type Task = ActiveTask | CompletedTask | PipelineTask;

export interface OverdueTask {
  id: string;
  title: string;
  service_id: string;
  due_date: string;
  days_overdue: number;
}

/**
 * Full application state returned by GET /state.
 * completed tasks are keyed by "YYYY-MM" for the monthly archive view.
 */
export interface AppState {
  services: Service[];
  tasks: {
    active: ActiveTask[];
    completed: Record<string, CompletedTask[]>; // keyed by "YYYY-MM"
    pipeline: PipelineTask[];
  };
  overdue: OverdueTask[];
  last_updated: string;
}

// Action payloads
export interface CreateServicePayload { name: string; logo_url?: string | null; }
export interface DeleteServicePayload { service_id: string; }
export interface CreateTaskPayload {
  title: string;
  service_id: string;
  days_assigned: number;
  due_date?: string;
  reminder: boolean;
  description?: string;
  reminder_time?: string;
  reminder_email?: string;
  is_pipeline?: boolean;
}
export interface CompleteTaskPayload { task_id: string; final_thoughts?: string; }
export interface DeleteTaskPayload { task_id: string; }
export interface UpdateTaskPayload {
  task_id: string;
  title?: string;
  description?: string;
  days_assigned?: number;
  due_date?: string;
  reminder?: boolean;
  reminder_time?: string;
  reminder_email?: string;
  pipeline_reason?: string;  // pipeline tasks only
  final_thoughts?: string;   // completed tasks only
  is_priority?: boolean;     // active tasks only
}
export interface ActivateTaskPayload {
  task_id: string;
  days_assigned: number;
  due_date?: string;
  reminder: boolean;
  reminder_email?: string;
}
export interface MoveToPipelinePayload {
  task_id: string;
  reason?: string;
}
