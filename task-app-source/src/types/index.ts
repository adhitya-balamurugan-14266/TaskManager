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
}

export type Task = ActiveTask | CompletedTask;

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
}
export interface CompleteTaskPayload { task_id: string; }
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
}
