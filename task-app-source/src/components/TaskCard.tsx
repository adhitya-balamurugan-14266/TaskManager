import { useState } from 'react';
import type { ActiveTask } from '@/types';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { Input, Textarea } from '@/components/Input';
import { formatDate, formatDateTime, extractDate, extractTime, isOverdue } from '@/lib/utils';
import { CheckCircle, Trash2, Edit2, Bell, BellOff } from 'lucide-react';

interface TaskCardProps {
  task: ActiveTask;
  serviceName: string;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: { title?: string; description?: string; days_assigned?: number; due_date?: string; reminder?: boolean; reminder_time?: string }) => void;
}

export function TaskCard({ task, serviceName, onComplete, onDelete, onUpdate }: TaskCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState({
    title: task.title,
    description: task.description ?? '',
    days_assigned: String(task.days_assigned),
    due_datetime: `${extractDate(task.due_date)}T${extractTime(task.due_date)}`,
  });
  const overdue = isOverdue(task.due_date);

  function daysFromDatetime(dt: string): number {
    if (!dt) return 0;
    const added = new Date(task.date_added);
    const target = new Date(dt);
    const diffMs = target.getTime() - added.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  function handleUpdate() {
    // Convert datetime-local (local time) to proper UTC ISO string via Date constructor
    const dueIso = form.due_datetime ? new Date(form.due_datetime).toISOString() : undefined;
    onUpdate(task.id, {
      title: form.title,
      description: form.description,
      days_assigned: Math.max(0, Number(form.days_assigned) || 0),
      due_date: dueIso,
    });
    setEditOpen(false);
  }

  return (
    <>
      <div className={`rounded-xl border bg-white dark:bg-gray-900 p-4 flex flex-col gap-3 shadow-sm transition-all ${overdue ? 'border-red-300 dark:border-red-800' : 'border-gray-200 dark:border-gray-700'}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">{task.title}</h3>
            {task.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{task.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {task.reminder ? <Bell className="size-4 text-blue-500" /> : <BellOff className="size-4 text-gray-300" />}
            {overdue && <Badge variant="overdue">Overdue</Badge>}
            {!overdue && <Badge variant="active">Active</Badge>}
          </div>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
          <span>Service: <span className="font-medium text-gray-700 dark:text-gray-300">{serviceName}</span></span>
          <span>Added: <span className="font-medium">{formatDate(task.date_added)}</span></span>
          <span className={overdue ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
            Due: {formatDateTime(task.due_date)} ({task.days_assigned}d)
          </span>
        </div>

        <div className="flex items-center gap-2 pt-1 border-t border-gray-100 dark:border-gray-800">
          <Button size="sm" variant="primary" onClick={() => onComplete(task.id)} className="gap-1">
            <CheckCircle className="size-3.5" /> Complete
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)}>
            <Edit2 className="size-3.5" />
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="size-3.5" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onUpdate(task.id, { reminder: !task.reminder })} className="ml-auto">
            {task.reminder ? <BellOff className="size-3.5" /> : <Bell className="size-3.5" />}
          </Button>
        </div>
      </div>

      {/* Edit modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Task">
        <div className="flex flex-col gap-4">
          <Input label="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <Textarea label="Description (optional)" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <Input
            label="Days assigned"
            type="number"
            min={0}
            value={form.days_assigned}
            onChange={(e) => {
              const value = e.target.value;
              setForm((f) => ({ ...f, days_assigned: value }));
            }}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Due date &amp; time</label>
            <div className="flex gap-2 items-center">
              <input
                type="datetime-local"
                value={form.due_datetime}
                onChange={(e) => {
                  const value = e.target.value;
                  setForm((f) => ({ ...f, due_datetime: value, days_assigned: String(daysFromDatetime(value)) }));
                }}
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
              <button
                type="button"
                onClick={() => {
                  const d = new Date(Date.now() + 60000);
                  const pad = (n: number) => String(n).padStart(2, '0');
                  const dt = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                  setForm((f) => ({ ...f, due_datetime: dt, days_assigned: '0' }));
                }}
                className="shrink-0 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-2 text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 transition whitespace-nowrap"
              >
                +1 min
              </button>
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdate}>Save</Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete Task">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Are you sure you want to permanently delete <strong>{task.title}</strong>?</p>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={() => setConfirmDelete(false)}>Cancel</Button>
          <Button variant="destructive" onClick={() => { onDelete(task.id); setConfirmDelete(false); }}>Delete</Button>
        </div>
      </Modal>
    </>
  );
}
