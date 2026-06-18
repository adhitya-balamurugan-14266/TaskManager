import { useState, useRef, useEffect } from 'react';
import type { AppState, Service, ActiveTask, CompletedTask, PipelineTask } from '@/types';
import { Modal } from '@/components/Modal';
import { Badge } from '@/components/Badge';
import { formatDateTime } from '@/lib/utils';
import {
  ArrowLeft,
  MoreHorizontal,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Building2,
  Layers,
  Search,
} from 'lucide-react';

interface WorkspacePageProps {
  state: AppState;
  onBack: () => void;
  onSelectService: (service: Service) => void;
}

type SelectedTask =
  | { kind: 'active'; task: ActiveTask; service: Service }
  | { kind: 'completed'; task: CompletedTask; service: Service }
  | { kind: 'overdue'; task: ActiveTask; service: Service; days_overdue: number }
  | { kind: 'pipeline'; task: PipelineTask; service: Service };

// ─── Sub-components ────────────────────────────────────────────────────────────

function KanbanColumn({
  title,
  count,
  headerClass,
  icon,
  children,
}: {
  title: string;
  count: number;
  headerClass: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
      <div className={`flex items-center gap-2 px-4 py-3 ${headerClass}`}>
        {icon}
        <span className="font-semibold text-sm">{title}</span>
        <span className="ml-auto text-xs font-bold bg-white/25 rounded-full px-2 py-0.5">{count}</span>
      </div>
      <div className="flex-1 p-3 space-y-2 overflow-y-auto max-h-[70vh]">
        {children}
      </div>
    </div>
  );
}

function TaskKanbanCard({
  title,
  description,
  serviceName,
  dueDate,
  status,
  daysOverdue,
  serviceLogoUrl,
  isPriority,
  onClick,
}: {
  title: string;
  description: string | null;
  serviceName: string;
  serviceLogoUrl: string | null;
  dueDate?: string;
  status: 'active' | 'completed' | 'overdue' | 'pipeline';
  daysOverdue?: number;
  isPriority?: boolean;
  onClick: () => void;
}) {
  const dueDateShort = (() => {
    if (!dueDate) return '—';
    try {
      return new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '—';
    }
  })();

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border p-3 hover:shadow-md transition-all ${
        isPriority
          ? 'border-red-400 dark:border-red-600 bg-red-50 dark:bg-red-950/30 ring-1 ring-red-400 dark:ring-red-600 hover:border-red-500'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        {isPriority
          ? <Badge variant="priority">Priority</Badge>
          : <Badge variant={status}>
              {status === 'overdue' ? `${daysOverdue}d overdue` : status}
            </Badge>
        }
        {dueDate && <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 mt-0.5">{dueDateShort}</span>}
      </div>
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 leading-snug">
        {title}
      </p>
      {description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-snug">
          {description}
        </p>
      )}
      <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-gray-100 dark:border-gray-700">
        <div className="h-4 w-4 rounded shrink-0 overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
          {serviceLogoUrl
            ? <img src={serviceLogoUrl} alt={serviceName} className="h-full w-full object-cover" />
            : <Building2 className="size-2.5 text-gray-400 dark:text-gray-500" />}
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500 truncate">{serviceName}</span>
      </div>
    </button>
  );
}

function TaskDetailContent({
  selected,
  onViewService,
}: {
  selected: SelectedTask;
  onViewService: () => void;
}) {
  const { task, service } = selected;

  return (
    <div className="space-y-4">
      {/* Service breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
        <div className="h-5 w-5 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 border border-gray-200 dark:border-gray-700">
          {service.logo_url
            ? <img src={service.logo_url} alt={service.name} className="h-full w-full object-cover" />
            : <Building2 className="size-3 text-gray-400" />}
        </div>
        <span>{service.name}</span>
      </div>

      {/* Title + badge */}
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-snug">
          {task.title}
        </h3>
        <Badge
          variant={
            selected.kind === 'active'
              ? 'active'
              : selected.kind === 'completed'
              ? 'completed'
              : selected.kind === 'pipeline'
              ? 'pipeline'
              : 'overdue'
          }
        >
          {selected.kind === 'overdue'
            ? `${selected.days_overdue} day${selected.days_overdue !== 1 ? 's' : ''} overdue`
            : selected.kind}
        </Badge>
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/60 rounded-xl px-3 py-2.5 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Detail grid */}
      {selected.kind !== 'pipeline' && (
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-xl bg-gray-50 dark:bg-gray-800 px-3 py-2.5">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Due Date</p>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
              {formatDateTime((task as ActiveTask | CompletedTask).due_date)}
            </p>
          </div>
          <div className="rounded-xl bg-gray-50 dark:bg-gray-800 px-3 py-2.5">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Days Assigned</p>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
              {(task as ActiveTask | CompletedTask).days_assigned} day{(task as ActiveTask | CompletedTask).days_assigned !== 1 ? 's' : ''}
            </p>
          </div>
          {selected.kind === 'completed' && (
            <div className="col-span-2 rounded-xl bg-green-50 dark:bg-green-900/20 px-3 py-2.5">
              <p className="text-xs text-green-600 dark:text-green-400 mb-0.5">Completed On</p>
              <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                {formatDateTime(selected.task.date_completed)}
              </p>
            </div>
          )}
        </div>
      )}

      {selected.kind === 'pipeline' && (
        <div className="rounded-xl bg-violet-50 dark:bg-violet-900/20 px-3 py-2.5 text-sm text-violet-700 dark:text-violet-300">
          This task is in the pipeline. Go to the service to set a schedule and activate it.
        </div>
      )}

      {/* Go to service */}
      <button
        onClick={onViewService}
        className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 px-4 py-2.5 transition-colors"
      >
        Go to {service.name}
        <ArrowRight className="size-4" />
      </button>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────────

export function WorkspacePage({ state, onBack, onSelectService }: WorkspacePageProps) {
  const [selected, setSelected] = useState<SelectedTask | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  const serviceMap = Object.fromEntries(state.services.map((s) => [s.id, s]));

  const overdueIds = new Set(state.overdue.map((t) => t.id));
  const activeTasks = state.tasks.active
    .filter((t) => !overdueIds.has(t.id))
    .sort((a, b) => {
      if (a.is_priority !== b.is_priority) return a.is_priority ? -1 : 1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });
  const completedTasks = Object.values(state.tasks.completed).flat();
  const pipelineTasks = state.tasks.pipeline ?? [];
  const overdueTasks = state.overdue
    .map((o) => ({ o, task: state.tasks.active.find((t) => t.id === o.id) }))
    .filter((x): x is { o: (typeof state.overdue)[0]; task: ActiveTask } => x.task != null)
    .sort((a, b) => {
      if (a.task.is_priority !== b.task.is_priority) return a.task.is_priority ? -1 : 1;
      return new Date(a.task.due_date).getTime() - new Date(b.task.due_date).getTime();
    });

  const q = search.trim().toLowerCase();
  const filterTask = (t: { title: string; description?: string | null }) =>
    !q || t.title.toLowerCase().includes(q) || (t.description ?? '').toLowerCase().includes(q);

  const visibleActive = activeTasks.filter(filterTask);
  const visibleCompleted = completedTasks.filter(filterTask);
  const visiblePipeline = pipelineTasks.filter(filterTask);
  const visibleOverdue = overdueTasks.filter((x) => filterTask(x.task));

  function openCard(kind: 'active' | 'completed' | 'overdue' | 'pipeline', taskId: string) {
    if (kind === 'active') {
      const task = activeTasks.find((t) => t.id === taskId);
      const service = task ? serviceMap[task.service_id] : undefined;
      if (task && service) setSelected({ kind: 'active', task, service });
    } else if (kind === 'completed') {
      const task = completedTasks.find((t) => t.id === taskId);
      const service = task ? serviceMap[task.service_id] : undefined;
      if (task && service) setSelected({ kind: 'completed', task, service });
    } else if (kind === 'pipeline') {
      const task = pipelineTasks.find((t) => t.id === taskId);
      const service = task ? serviceMap[task.service_id] : undefined;
      if (task && service) setSelected({ kind: 'pipeline', task, service });
    } else {
      const entry = overdueTasks.find((x) => x.task.id === taskId);
      const service = entry ? serviceMap[entry.task.service_id] : undefined;
      if (entry && service) {
        setSelected({ kind: 'overdue', task: entry.task, service, days_overdue: entry.o.days_overdue });
      }
    }
  }

  // Close meatball menu on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Sticky header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto space-y-3">
          {/* Title row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500"
              >
                <ArrowLeft className="size-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">My Workspace</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {activeTasks.length} active · {pipelineTasks.length} pipeline · {completedTasks.length} completed · {overdueTasks.length} overdue
                </p>
              </div>
            </div>

            {/* Meatball menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                title="Jump to service"
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400"
              >
                <MoreHorizontal className="size-5" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl z-50 overflow-hidden py-1">
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 px-4 pt-3 pb-1.5 uppercase tracking-wider">
                    Jump to Service
                  </p>
                  {state.services.length === 0 ? (
                    <p className="px-4 py-2 pb-3 text-sm text-gray-400 dark:text-gray-500">
                      No services yet
                    </p>
                  ) : (
                    state.services.map((s) => {
                      const activeCount = state.tasks.active.filter((t) => t.service_id === s.id).length;
                      return (
                        <button
                          key={s.id}
                          onClick={() => {
                            setMenuOpen(false);
                            onSelectService(s);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <div className="h-6 w-6 rounded-md shrink-0 overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center border border-gray-200 dark:border-gray-700">
                            {s.logo_url
                              ? <img src={s.logo_url} alt={s.name} className="h-full w-full object-cover" />
                              : <Building2 className="size-3.5 text-gray-400" />}
                          </div>
                          <span className="flex-1 truncate text-left">{s.name}</span>
                          <span className="text-xs text-gray-400 shrink-0">{activeCount} active</span>
                          <ArrowRight className="size-3.5 text-gray-300 dark:text-gray-600 shrink-0" />
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search tasks across workspace..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs">✕</button>
            )}
          </div>
        </div>
      </div>

      {/* Kanban board */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {/* ── Pipeline ── */}
          <KanbanColumn
            title="Pipeline"
            count={visiblePipeline.length}
            headerClass="bg-violet-600 text-white"
            icon={<Layers className="size-4" />}
          >
            {visiblePipeline.length === 0 ? (
              <p className="text-center text-xs text-gray-400 dark:text-gray-600 py-10">
                No pipeline tasks
              </p>
            ) : (
              visiblePipeline.map((t) => (
                <TaskKanbanCard
                  key={t.id}
                  title={t.title}
                  description={t.description}
                  serviceName={serviceMap[t.service_id]?.name ?? '—'}
                  serviceLogoUrl={serviceMap[t.service_id]?.logo_url ?? null}
                  status="pipeline"
                  onClick={() => openCard('pipeline', t.id)}
                />
              ))
            )}
          </KanbanColumn>
          {/* ── Active ── */}
          <KanbanColumn
            title="Active"
            count={visibleActive.length}
            headerClass="bg-blue-600 text-white"
            icon={<Clock className="size-4" />}
          >
            {visibleActive.length === 0 ? (
              <p className="text-center text-xs text-gray-400 dark:text-gray-600 py-10">
                No active tasks
              </p>
            ) : (
              visibleActive.map((t) => (
                <TaskKanbanCard
                  key={t.id}
                  title={t.title}
                  description={t.description}
                  serviceName={serviceMap[t.service_id]?.name ?? '—'}
                  serviceLogoUrl={serviceMap[t.service_id]?.logo_url ?? null}
                  dueDate={t.due_date}
                  status="active"
                  isPriority={t.is_priority}
                  onClick={() => openCard('active', t.id)}
                />
              ))
            )}
          </KanbanColumn>

          {/* ── Completed ── */}
          <KanbanColumn
            title="Completed"
            count={visibleCompleted.length}
            headerClass="bg-emerald-600 text-white"
            icon={<CheckCircle2 className="size-4" />}
          >
            {visibleCompleted.length === 0 ? (
              <p className="text-center text-xs text-gray-400 dark:text-gray-600 py-10">
                No completed tasks
              </p>
            ) : (
              visibleCompleted.map((t) => (
                <TaskKanbanCard
                  key={t.id}
                  title={t.title}
                  description={t.description}
                  serviceName={serviceMap[t.service_id]?.name ?? '—'}
                  serviceLogoUrl={serviceMap[t.service_id]?.logo_url ?? null}
                  dueDate={t.due_date}
                  status="completed"
                  onClick={() => openCard('completed', t.id)}
                />
              ))
            )}
          </KanbanColumn>

          {/* ── Overdue ── */}
          <KanbanColumn
            title="Overdue"
            count={visibleOverdue.length}
            headerClass="bg-red-600 text-white"
            icon={<AlertTriangle className="size-4" />}
          >
            {visibleOverdue.length === 0 ? (
              <p className="text-center text-xs text-gray-400 dark:text-gray-600 py-10">
                No overdue tasks
              </p>
            ) : (
              visibleOverdue.map(({ o, task }) => (
                <TaskKanbanCard
                  key={task.id}
                  title={task.title}
                  description={task.description}
                  serviceName={serviceMap[task.service_id]?.name ?? '—'}
                  serviceLogoUrl={serviceMap[task.service_id]?.logo_url ?? null}
                  dueDate={task.due_date}
                  status="overdue"
                  daysOverdue={o.days_overdue}
                  isPriority={task.is_priority}
                  onClick={() => openCard('overdue', task.id)}
                />
              ))
            )}
          </KanbanColumn>
        </div>
      </div>

      {/* Task detail modal */}
      {selected && (
        <Modal
          open
          onClose={() => setSelected(null)}
          title="Task Details"
          className="max-w-lg"
        >
          <TaskDetailContent
            selected={selected}
            onViewService={() => {
              const svc = selected.service;
              setSelected(null);
              onSelectService(svc);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
