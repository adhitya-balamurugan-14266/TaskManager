import { useState } from 'react';
import type { AppState, Service } from '@/types';
import { TaskCard } from '@/components/TaskCard';
import { CompletedTaskCard } from '@/components/CompletedTaskCard';
import { PipelineTaskCard } from '@/components/PipelineTaskCard';
import { Button } from '@/components/Button';
import { Input, Textarea } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { Badge } from '@/components/Badge';
import { Plus, ArrowLeft, Archive, Bell, Search } from 'lucide-react';

interface ServiceDetailPageProps {
  service: Service;
  state: AppState;
  onBack: () => void;
  onCreateTask: (data: { title: string; days_assigned: number; due_date?: string; reminder: boolean; description?: string; reminder_time?: string; reminder_email?: string; is_pipeline?: boolean }) => void;
  onCompleteTask: (id: string, finalThoughts?: string) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTask: (id: string, data: { title?: string; description?: string; days_assigned?: number; due_date?: string; reminder?: boolean; reminder_time?: string; reminder_email?: string; pipeline_reason?: string; final_thoughts?: string }) => void;
  onActivateTask: (id: string, data: { days_assigned: number; due_date?: string; reminder: boolean; reminder_email?: string }) => void;
  onMoveToPipeline: (id: string, reason: string) => void;
  userEmail: string;
}

type Tab = 'active' | 'completed' | 'overdue' | 'pipeline';

export function ServiceDetailPage({
  service,
  state,
  onBack,
  onCreateTask,
  onCompleteTask,
  onDeleteTask,
  onUpdateTask,
  onActivateTask,
  onMoveToPipeline,
  userEmail,
}: ServiceDetailPageProps) {
  function datetimeLocalFromDays(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + Math.max(0, days));
    // keep current time for same-day, or 23:59 for future days
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

  const [tab, setTab] = useState<Tab>('active');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [archiveMonth, setArchiveMonth] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    days_assigned: '7',
    due_datetime: datetimeLocalFromDays(7),
    reminder: false,
    reminder_email: userEmail,
    is_pipeline: false,
  });

  const activeTasks = state.tasks.active
    .filter((t) => t.service_id === service.id)
    .sort((a, b) => {
      if (a.is_priority !== b.is_priority) return a.is_priority ? -1 : 1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });
  const overdueTasks = state.overdue
    .filter((t) => t.service_id === service.id)
    .sort((a, b) => {
      const taskA = activeTasks.find((t) => t.id === a.id);
      const taskB = activeTasks.find((t) => t.id === b.id);
      if ((taskA?.is_priority ?? false) !== (taskB?.is_priority ?? false)) return taskA?.is_priority ? -1 : 1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });
  const pipelineTasks = (state.tasks.pipeline ?? []).filter((t) => t.service_id === service.id);

  // Completed tasks for this service, sorted months descending
  const completedMonths = Object.entries(state.tasks.completed)
    .map(([month, tasks]) => ({ month, tasks: tasks.filter((t) => t.service_id === service.id) }))
    .filter((m) => m.tasks.length > 0)
    .sort((a, b) => b.month.localeCompare(a.month));

  const serviceMap = Object.fromEntries(state.services.map((s) => [s.id, s.name]));

  const q = search.trim().toLowerCase();
  const filteredActive = q ? activeTasks.filter((t) => t.title.toLowerCase().includes(q) || (t.description ?? '').toLowerCase().includes(q)) : activeTasks;
  const filteredOverdue = q ? overdueTasks.filter((ot) => {
    const task = activeTasks.find((t) => t.id === ot.id);
    return task?.title.toLowerCase().includes(q) || (task?.description ?? '').toLowerCase().includes(q);
  }) : overdueTasks;
  const filteredPipeline = q ? pipelineTasks.filter((t) => t.title.toLowerCase().includes(q) || (t.description ?? '').toLowerCase().includes(q)) : pipelineTasks;
  const filteredCompletedMonths = q
    ? completedMonths.map((m) => ({ ...m, tasks: m.tasks.filter((t) => t.title.toLowerCase().includes(q) || (t.description ?? '').toLowerCase().includes(q)) })).filter((m) => m.tasks.length > 0)
    : completedMonths;

  function handleCreate() {
    if (!form.title.trim()) return;
    if (form.is_pipeline) {
      onCreateTask({
        title: form.title.trim(),
        description: form.description.trim(),
        days_assigned: 0,
        reminder: false,
        is_pipeline: true,
      });
    } else {
      const dueIso = form.due_datetime ? new Date(form.due_datetime).toISOString() : undefined;
      onCreateTask({
        title: form.title.trim(),
        description: form.description.trim(),
        days_assigned: Math.max(0, Number(form.days_assigned) || 0),
        due_date: dueIso,
        reminder: form.reminder,
        reminder_email: form.reminder ? form.reminder_email : '',
      });
    }
    setForm({
      title: '',
      description: '',
      days_assigned: '7',
      due_datetime: datetimeLocalFromDays(7),
      reminder: false,
      reminder_email: userEmail,
      is_pipeline: false,
    });
    setCreateOpen(false);
  }

  const filteredArchive = archiveMonth
    ? filteredCompletedMonths.filter((m) => m.month === archiveMonth)
    : filteredCompletedMonths;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500">
          <ArrowLeft className="size-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{service.name}</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {activeTasks.length} active · {pipelineTasks.length} pipeline · {Object.values(state.tasks.completed).flat().filter((t) => t.service_id === service.id).length} completed
            {overdueTasks.length > 0 && <span className="text-red-500 ml-2">· {overdueTasks.length} overdue</span>}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" /> New Task
        </Button>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs">✕</button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
        {(['pipeline', 'active', 'completed', 'overdue'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg capitalize transition-colors ${tab === t ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
          >
            {t}
            {t === 'overdue' && overdueTasks.length > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{overdueTasks.length}</span>
            )}
            {t === 'pipeline' && pipelineTasks.length > 0 && (
              <span className="ml-1.5 bg-violet-500 text-white text-xs rounded-full px-1.5 py-0.5">{pipelineTasks.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Pipeline tasks */}
      {tab === 'pipeline' && (
        <div className="space-y-3">
          {filteredPipeline.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p>{q ? 'No pipeline tasks match your search.' : 'No pipeline tasks. Create one and check "Pipeline task" when creating.'}</p>
            </div>
          ) : (
            filteredPipeline.map((task) => (
              <PipelineTaskCard
                key={task.id}
                task={task}
                serviceName={serviceMap[task.service_id] ?? '—'}
                userEmail={userEmail}
                onDelete={onDeleteTask}
                onActivate={(id, data) => onActivateTask(id, data)}
                onUpdate={(id, data) => onUpdateTask(id, data)}
              />
            ))
          )}
        </div>
      )}

      {/* Active tasks */}
      {tab === 'active' && (
        <div className="space-y-3">
          {filteredActive.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p>{q ? 'No active tasks match your search.' : 'No active tasks. Create one to get started.'}</p>
            </div>
          ) : (
            filteredActive.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                serviceName={serviceMap[task.service_id] ?? '—'}
                onComplete={onCompleteTask}
                onDelete={onDeleteTask}
                onUpdate={(id, data) => onUpdateTask(id, data)}
                onMoveToPipeline={onMoveToPipeline}
              />
            ))          )}
        </div>
      )}

      {/* Completed tasks */}
      {tab === 'completed' && (
        <div className="space-y-6">
          {/* Archive month filter */}
          {completedMonths.length > 0 && (
            <div className="flex items-center gap-3">
              <Archive className="size-4 text-gray-400 shrink-0" />
              <select
                value={archiveMonth}
                onChange={(e) => setArchiveMonth(e.target.value)}
                className="text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-1.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All months</option>
                {completedMonths.map((m) => (
                  <option key={m.month} value={m.month}>{m.month}</option>
                ))}
              </select>
            </div>
          )}
          {filteredArchive.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p>{q ? 'No completed tasks match your search.' : 'No completed tasks yet.'}</p>
            </div>
          ) : (
            filteredArchive.map(({ month, tasks }) => (
              <div key={month} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="neutral">{month}</Badge>
                  <span className="text-xs text-gray-400">{tasks.length} task{tasks.length > 1 ? 's' : ''}</span>
                </div>
                {tasks.map((task) => (
                  <CompletedTaskCard
                    key={task.id}
                    task={task}
                    serviceName={serviceMap[task.service_id] ?? '—'}
                    onDelete={onDeleteTask}
                    onMoveToPipeline={onMoveToPipeline}
                    onUpdate={(id, data) => onUpdateTask(id, data)}
                  />
                ))}
              </div>
            ))
          )}
        </div>
      )}

      {/* Overdue tasks */}
      {tab === 'overdue' && (
        <div className="space-y-3">
          {filteredOverdue.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="flex items-center justify-center gap-2 text-green-500 mb-2">
                <Bell className="size-5" />
              </div>
              <p>{q ? 'No overdue tasks match your search.' : "No overdue tasks. You're on track!"}</p>
            </div>
          ) : (
            filteredOverdue.map((ot) => {
              const task = activeTasks.find((t) => t.id === ot.id);
              if (!task) return null;
              return (
                <TaskCard
                  key={task.id}
                  task={task}
                  serviceName={serviceMap[task.service_id] ?? '—'}
                  onComplete={onCompleteTask}
                  onDelete={onDeleteTask}
                  onUpdate={(id, data) => onUpdateTask(id, data)}
                  onMoveToPipeline={onMoveToPipeline}
                />
              );
            })
          )}
        </div>
      )}

      {/* Create task modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Task">
        <div className="flex flex-col gap-4">
          <Input
            label="Title *"
            placeholder="What needs to be done?"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            autoFocus
          />
          <Textarea
            label="Description (optional)"
            placeholder="Add details..."
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          {/* Pipeline toggle */}
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30">
            <input
              type="checkbox"
              checked={form.is_pipeline}
              onChange={(e) => setForm((f) => ({ ...f, is_pipeline: e.target.checked, reminder: false }))}
              className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
            />
            <div>
              <span className="text-sm font-medium text-violet-800 dark:text-violet-300">Pipeline task</span>
              <p className="text-xs text-violet-600 dark:text-violet-400 mt-0.5">Schedule and reminders are set when the task is activated.</p>
            </div>
          </label>
          {/* Scheduling fields — hidden for pipeline tasks */}
          {!form.is_pipeline && (
            <>
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
            </>
          )}
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.title.trim()}>Create Task</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
