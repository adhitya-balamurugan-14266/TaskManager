export interface Service {
  id: string;
  name: string;
  logo_url: string | null;
  created_at: string;
}

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
  pipeline_reason?: string;
  is_priority?: boolean;
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
