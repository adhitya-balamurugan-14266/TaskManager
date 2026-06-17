import type { CompletedTask } from '@/types';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { formatDate } from '@/lib/utils';
import { Trash2 } from 'lucide-react';

interface CompletedTaskCardProps {
  task: CompletedTask;
  serviceName: string;
  onDelete: (id: string) => void;
}

export function CompletedTaskCard({ task, serviceName, onDelete }: CompletedTaskCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 flex flex-col gap-3 opacity-80">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-600 dark:text-gray-300 truncate line-through">{task.title}</h3>
          {task.description && (
            <p className="text-sm text-gray-400 mt-0.5 line-clamp-2">{task.description}</p>
          )}
        </div>
        <Badge variant="completed">Completed</Badge>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
        <span>Service: <span className="font-medium text-gray-600 dark:text-gray-300">{serviceName}</span></span>
        <span>Added: {formatDate(task.date_added)}</span>
        <span>Completed: <span className="text-green-600 dark:text-green-400 font-medium">{formatDate(task.date_completed)}</span></span>
      </div>
      <div className="flex items-center gap-2 pt-1 border-t border-gray-100 dark:border-gray-800">
        <Button size="sm" variant="destructive" onClick={() => onDelete(task.id)}>
          <Trash2 className="size-3.5" /> Delete
        </Button>
      </div>
    </div>
  );
}
