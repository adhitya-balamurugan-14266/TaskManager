import { useState } from 'react';
import type { DroppedTask } from '@/types';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { formatDate } from '@/lib/utils';
import { Trash2, RotateCcw } from 'lucide-react';

interface DroppedTaskCardProps {
  task: DroppedTask;
  serviceName: string;
  onDelete: (id: string) => void;
  onMoveToPipeline: (id: string, reason: string) => void;
}

export function DroppedTaskCard({ task, serviceName, onDelete, onMoveToPipeline }: DroppedTaskCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);

  return (
    <>
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 flex flex-col gap-3 shadow-sm opacity-80">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-700 dark:text-gray-300 truncate line-through">{task.title}</h3>
            {task.description && (
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-2">{task.description}</p>
            )}
          </div>
          <Badge variant="dropped">Dropped</Badge>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
          <span>Service: <span className="font-medium text-gray-600 dark:text-gray-400">{serviceName}</span></span>
          <span>Dropped: <span className="font-medium">{formatDate(task.dropped_date)}</span></span>
        </div>

        <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 px-3 py-2">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            <span className="font-semibold">Reason: </span>{task.dropped_reason}
          </p>
        </div>

        <div className="flex items-center gap-2 pt-1 border-t border-gray-100 dark:border-gray-800">
          <Button size="sm" variant="secondary" onClick={() => setRestoreOpen(true)} className="gap-1">
            <RotateCcw className="size-3.5" /> Restore to Pipeline
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Restore to pipeline modal */}
      <Modal open={restoreOpen} onClose={() => setRestoreOpen(false)} title="Restore to Pipeline">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Move <strong className="text-gray-900 dark:text-gray-100">{task.title}</strong> back to the pipeline?
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={() => setRestoreOpen(false)}>Cancel</Button>
          <Button onClick={() => { onMoveToPipeline(task.id, ''); setRestoreOpen(false); }}>Restore</Button>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete Task">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Are you sure you want to permanently delete <strong>{task.title}</strong>? This cannot be undone.
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={() => setConfirmDelete(false)}>Cancel</Button>
          <Button variant="destructive" onClick={() => { onDelete(task.id); setConfirmDelete(false); }}>Delete</Button>
        </div>
      </Modal>
    </>
  );
}
