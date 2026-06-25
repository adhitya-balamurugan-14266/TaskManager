import { useState } from 'react';
import type { CompletedTask } from '@/types';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { Textarea } from '@/components/Input';
import { ImageReferences } from '@/components/ImageReferences';
import { ImageLightbox } from '@/components/ImageLightbox';
import { formatDate } from '@/lib/utils';
import { Trash2, Layers, Edit2, Image as ImageIcon } from 'lucide-react';

interface CompletedTaskCardProps {
  task: CompletedTask;
  serviceName: string;
  onDelete: (id: string) => void;
  onMoveToPipeline: (id: string, reason: string) => void;
  onUpdate: (id: string, data: { final_thoughts?: string; image_references?: string[] }) => void;
}

export function CompletedTaskCard({ task, serviceName, onDelete, onMoveToPipeline, onUpdate }: CompletedTaskCardProps) {
  const [pipelineOpen, setPipelineOpen] = useState(false);
  const [pipelineReason, setPipelineReason] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editThoughts, setEditThoughts] = useState(task.final_thoughts ?? '');
  const [editImages, setEditImages] = useState<string[]>(task.image_references ?? []);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  function handleMoveToPipeline() {
    onMoveToPipeline(task.id, pipelineReason.trim());
    setPipelineOpen(false);
    setPipelineReason('');
  }

  function handleEditThoughts() {
    onUpdate(task.id, { final_thoughts: editThoughts.trim() || undefined, image_references: editImages });
    setEditOpen(false);
  }

  return (
    <>
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
        {task.final_thoughts && (
          <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-3 py-2">
            <p className="text-xs text-green-700 dark:text-green-300">
              <span className="font-semibold">Final thoughts: </span>{task.final_thoughts}
            </p>
          </div>
        )}
        <div className="flex items-center gap-2 pt-1 border-t border-gray-100 dark:border-gray-800">
          <Button size="sm" variant="destructive" onClick={() => onDelete(task.id)}>
            <Trash2 className="size-3.5" /> Delete
          </Button>
          <Button size="sm" variant="secondary" onClick={() => { setEditThoughts(task.final_thoughts ?? ''); setEditImages(task.image_references ?? []); setEditOpen(true); }} className="gap-1">
            <Edit2 className="size-3.5" /> {task.final_thoughts ? 'Edit thoughts' : 'Add thoughts'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setPipelineOpen(true)} className="gap-1 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950">
            <Layers className="size-3.5" /> Pipeline
          </Button>
        </div>
      </div>

      <ImageLightbox
        images={task.image_references ?? []}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />

      {/* Edit final thoughts modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Final Thoughts">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          <strong className="text-gray-900 dark:text-gray-100">{task.title}</strong>
        </p>
        <div className="flex flex-col gap-4">
          <Textarea
            label="Final thoughts"
            placeholder="Any notes, outcomes, or reflections on this task..."
            value={editThoughts}
            onChange={(e) => setEditThoughts(e.target.value)}
          />
          <ImageReferences
            images={editImages}
            onImagesChange={setEditImages}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEditThoughts}>Save</Button>
          </div>
        </div>
      </Modal>

      {/* Move to Pipeline modal */}
      <Modal open={pipelineOpen} onClose={() => { setPipelineOpen(false); setPipelineReason(''); }} title="Move to Pipeline">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Move <strong className="text-gray-900 dark:text-gray-100">{task.title}</strong> back to pipeline.
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
    </>
  );
}
