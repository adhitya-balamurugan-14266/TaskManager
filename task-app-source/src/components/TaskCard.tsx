import { useState } from 'react';
import type { ActiveTask } from '@/types';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { Input, Textarea } from '@/components/Input';
import { ImageReferences } from '@/components/ImageReferences';
import { ImageLightbox } from '@/components/ImageLightbox';
import { formatDate, formatDateTime, extractDate, extractTime, isOverdue } from '@/lib/utils';
import { CheckCircle, Trash2, Edit2, Bell, BellOff, Layers, Flame, Image as ImageIcon, CalendarClock } from 'lucide-react';

interface TaskCardProps {
  task: ActiveTask;
  serviceName: string;
  onComplete: (id: string, finalThoughts?: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: { title?: string; description?: string; days_assigned?: number; due_date?: string; reminder?: boolean; reminder_time?: string; reminder_email?: string; is_priority?: boolean; image_references?: string[] }) => void;
  onMoveToPipeline: (id: string, reason: string) => void;
}

export function TaskCard({ task, serviceName, onComplete, onDelete, onUpdate, onMoveToPipeline }: TaskCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pipelineOpen, setPipelineOpen] = useState(false);
  const [pipelineReason, setPipelineReason] = useState('');
  const [completeOpen, setCompleteOpen] = useState(false);
  const [finalThoughts, setFinalThoughts] = useState('');
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [newDueDatetime, setNewDueDatetime] = useState('');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [form, setForm] = useState({
    title: task.title,
    description: task.description ?? '',
    days_assigned: String(task.days_assigned),
    due_datetime: `${extractDate(task.due_date)}T${extractTime(task.due_date)}`,
    image_references: task.image_references ?? [] as string[],
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
      image_references: form.image_references,
    });
    setEditOpen(false);
  }

  function handleMoveToPipeline() {
    onMoveToPipeline(task.id, pipelineReason.trim());
    setPipelineOpen(false);
    setPipelineReason('');
  }

  function handleReschedule() {
    if (!newDueDatetime) return;
    const dueIso = new Date(newDueDatetime).toISOString();
    onUpdate(task.id, {
      due_date: dueIso,
      days_assigned: daysFromDatetime(newDueDatetime),
    });
    setRescheduleOpen(false);
    setNewDueDatetime('');
  }

  function handleComplete() {
    onComplete(task.id, finalThoughts.trim() || undefined);
    setCompleteOpen(false);
    setFinalThoughts('');
  }

  return (
    <>
      <div className={`rounded-xl border bg-white dark:bg-gray-900 p-4 flex flex-col gap-3 shadow-sm transition-all ${
        task.is_priority
          ? 'border-red-400 dark:border-red-600 ring-1 ring-red-400 dark:ring-red-600'
          : overdue
          ? 'border-red-300 dark:border-red-800'
          : 'border-gray-200 dark:border-gray-700'
      }`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">{task.title}</h3>
            {task.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{task.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {task.is_priority && <Badge variant="priority">Priority</Badge>}
            {task.reminder ? <Bell className="size-4 text-blue-500" /> : <BellOff className="size-4 text-gray-300" />}
            {overdue && <Badge variant="overdue">Overdue</Badge>}
            {!overdue && !task.is_priority && <Badge variant="active">Active</Badge>}
          </div>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
          <span>Service: <span className="font-medium text-gray-700 dark:text-gray-300">{serviceName}</span></span>
          <span>Added: <span className="font-medium">{formatDate(task.date_added)}</span></span>
          <span className={overdue ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
            Due: {formatDateTime(task.due_date)} ({task.days_assigned}d)
          </span>
          {task.image_references && task.image_references.length > 0 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setLightboxOpen(true); }}
              className="flex items-center gap-0.5 text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors hover:underline underline-offset-2"
            >
              <ImageIcon className="size-3" /> {task.image_references.length} image{task.image_references.length !== 1 ? 's' : ''}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 pt-1 border-t border-gray-100 dark:border-gray-800">
          <Button size="sm" variant="primary" onClick={() => setCompleteOpen(true)} className="gap-1">
            <CheckCircle className="size-3.5" /> Complete
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)}>
            <Edit2 className="size-3.5" />
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="size-3.5" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setPipelineOpen(true)} className="gap-1 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950">
            <Layers className="size-3.5" /> Pipeline
          </Button>
          {overdue && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() + 1);
                d.setHours(23, 59, 0, 0);
                const pad = (n: number) => String(n).padStart(2, '0');
                setNewDueDatetime(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
                setRescheduleOpen(true);
              }}
              className="gap-1 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950"
            >
              <CalendarClock className="size-3.5" /> Reschedule
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => onUpdate(task.id, { is_priority: !task.is_priority })} className={`gap-1 ${task.is_priority ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950' : 'text-gray-500 hover:text-red-600'}`}>
            <Flame className="size-3.5" /> {task.is_priority ? 'Deprioritize' : 'Prioritize'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onUpdate(task.id, { reminder: !task.reminder })} className="ml-auto">
            {task.reminder ? <BellOff className="size-3.5" /> : <Bell className="size-3.5" />}
          </Button>
        </div>
      </div>

      {/* Complete modal */}
      <Modal open={completeOpen} onClose={() => { setCompleteOpen(false); setFinalThoughts(''); }} title="Complete Task">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Mark <strong className="text-gray-900 dark:text-gray-100">{task.title}</strong> as complete.
        </p>
        <div className="flex flex-col gap-4">
          <Textarea
            label="Final thoughts (optional)"
            placeholder="Any notes, outcomes, or reflections on this task..."
            value={finalThoughts}
            onChange={(e) => setFinalThoughts(e.target.value)}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => { setCompleteOpen(false); setFinalThoughts(''); }}>Cancel</Button>
            <Button variant="primary" onClick={handleComplete} className="gap-1">
              <CheckCircle className="size-3.5" /> Complete
            </Button>
          </div>
        </div>
      </Modal>

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
          <ImageReferences
            images={form.image_references}
            onImagesChange={(imgs) => setForm((f) => ({ ...f, image_references: imgs }))}
          />
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

      {/* Move to Pipeline modal */}
      <Modal open={pipelineOpen} onClose={() => { setPipelineOpen(false); setPipelineReason(''); }} title="Move to Pipeline">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Move <strong className="text-gray-900 dark:text-gray-100">{task.title}</strong> back to pipeline. The due date and reminders will be cleared.
        </p>
        <div className="flex flex-col gap-4">
          <Textarea
            label="Reason (optional)"
            placeholder="Why is this task being pushed back to pipeline?"
            value={pipelineReason}
            onChange={(e) => setPipelineReason(e.target.value)}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => { setPipelineOpen(false); setPipelineReason(''); }}>Cancel</Button>
            <Button
              onClick={handleMoveToPipeline}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              <Layers className="size-3.5" /> Move to Pipeline
            </Button>
          </div>
        </div>
      </Modal>

      <ImageLightbox
        images={task.image_references ?? []}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />

      {/* Reschedule modal — shown only for overdue tasks */}
      <Modal open={rescheduleOpen} onClose={() => setRescheduleOpen(false)} title="Reschedule Task">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Set a new due date for <strong className="text-gray-900 dark:text-gray-100">{task.title}</strong>. The task will return to active once a future date is saved.
        </p>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">New due date &amp; time</label>
            <input
              type="datetime-local"
              value={newDueDatetime}
              onChange={(e) => setNewDueDatetime(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setRescheduleOpen(false)}>Cancel</Button>
            <Button
              onClick={handleReschedule}
              disabled={!newDueDatetime || new Date(newDueDatetime) <= new Date()}
              className="gap-1 bg-amber-500 hover:bg-amber-600 text-white"
            >
              <CalendarClock className="size-3.5" /> Reschedule
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
