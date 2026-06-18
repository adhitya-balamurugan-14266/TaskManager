import { useState } from 'react';
import type { PipelineTask } from '@/types';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { Input, Textarea } from '@/components/Input';
import { formatDate } from '@/lib/utils';
import { Trash2, ArrowRight, Edit2 } from 'lucide-react';

interface PipelineTaskCardProps {
  task: PipelineTask;
  serviceName: string;
  userEmail: string;
  onDelete: (id: string) => void;
  onActivate: (id: string, data: { days_assigned: number; due_date?: string; reminder: boolean; reminder_email?: string }) => void;
  onUpdate: (id: string, data: { title?: string; description?: string; pipeline_reason?: string }) => void;
}

export function PipelineTaskCard({ task, serviceName, userEmail, onDelete, onActivate, onUpdate }: PipelineTaskCardProps) {
  const [activateOpen, setActivateOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    title: task.title,
    description: task.description ?? '',
    pipeline_reason: task.pipeline_reason ?? '',
  });

  function handleEdit() {
    onUpdate(task.id, {
      title: editForm.title,
      description: editForm.description,
      pipeline_reason: editForm.pipeline_reason,
    });
    setEditOpen(false);
  }

  function datetimeLocalFromDays(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + Math.max(0, days));
    if (days >= 1) { d.setHours(23, 59, 0, 0); }
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function daysFromDatetime(dt: string): number {
    if (!dt) return 1;
    const now = new Date();
    const target = new Date(dt);
    const diffMs = target.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  const [form, setForm] = useState({
    days_assigned: '7',
    due_datetime: datetimeLocalFromDays(7),
    reminder: false,
    reminder_email: userEmail,
  });

  function handleActivate() {
    const dueIso = form.due_datetime ? new Date(form.due_datetime).toISOString() : undefined;
    onActivate(task.id, {
      days_assigned: Math.max(0, Number(form.days_assigned) || 0),
      due_date: dueIso,
      reminder: form.reminder,
      reminder_email: form.reminder ? form.reminder_email : '',
    });
    setActivateOpen(false);
  }

  return (
    <>
      <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-white dark:bg-gray-900 p-4 flex flex-col gap-3 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">{task.title}</h3>
            {task.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{task.description}</p>
            )}
          </div>
          <Badge variant="pipeline">Pipeline</Badge>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
          <span>Service: <span className="font-medium text-gray-700 dark:text-gray-300">{serviceName}</span></span>
          <span>Added: <span className="font-medium">{formatDate(task.date_added)}</span></span>
        </div>

        {task.pipeline_reason && (
          <div className="rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 px-3 py-2">
            <p className="text-xs text-violet-700 dark:text-violet-300">
              <span className="font-semibold">Reason: </span>{task.pipeline_reason}
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 pt-1 border-t border-gray-100 dark:border-gray-800">
          <Button size="sm" variant="primary" onClick={() => setActivateOpen(true)} className="gap-1">
            <ArrowRight className="size-3.5" /> Move to Active
          </Button>
          <Button size="sm" variant="secondary" onClick={() => { setEditForm({ title: task.title, description: task.description ?? '', pipeline_reason: task.pipeline_reason ?? '' }); setEditOpen(true); }}>
            <Edit2 className="size-3.5" />
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Edit modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Pipeline Task">
        <div className="flex flex-col gap-4">
          <Input
            label="Title"
            value={editForm.title}
            onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
          />
          <Textarea
            label="Description (optional)"
            value={editForm.description}
            onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
          />
          <Textarea
            label="Pipeline reason (optional)"
            placeholder="Why is this task in pipeline?"
            value={editForm.pipeline_reason}
            onChange={(e) => setEditForm((f) => ({ ...f, pipeline_reason: e.target.value }))}
          />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={!editForm.title.trim()}>Save</Button>
          </div>
        </div>
      </Modal>

      {/* Activate modal */}
      <Modal open={activateOpen} onClose={() => setActivateOpen(false)} title="Activate Task">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Set a schedule to move <strong className="text-gray-900 dark:text-gray-100">{task.title}</strong> to active.
        </p>
        <div className="flex flex-col gap-4">
          <Input
            label="Days to complete"
            type="number"
            min={0}
            value={form.days_assigned}
            onChange={(e) => {
              const value = e.target.value;
              const days = Math.max(0, Number(value) || 0);
              setForm((f) => ({ ...f, days_assigned: value, due_datetime: datetimeLocalFromDays(days) }));
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
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.reminder}
              onChange={(e) => setForm((f) => ({ ...f, reminder: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Enable overdue reminder</span>
          </label>
          {form.reminder && (
            <Input
              label="Reminder email"
              type="email"
              placeholder="you@example.com"
              value={form.reminder_email}
              onChange={(e) => setForm((f) => ({ ...f, reminder_email: e.target.value }))}
            />
          )}
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => setActivateOpen(false)}>Cancel</Button>
            <Button onClick={handleActivate}>Activate</Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete Task">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Are you sure you want to permanently delete <strong>{task.title}</strong>?
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={() => setConfirmDelete(false)}>Cancel</Button>
          <Button variant="destructive" onClick={() => { onDelete(task.id); setConfirmDelete(false); }}>Delete</Button>
        </div>
      </Modal>
    </>
  );
}
