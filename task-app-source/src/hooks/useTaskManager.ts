import { useState, useCallback, useEffect } from 'react';
import { loadState } from '@/store/engine';
import * as engine from '@/store/engine';
import type {
  AppState,
  CreateServicePayload,
  DeleteServicePayload,
  CreateTaskPayload,
  CompleteTaskPayload,
  DeleteTaskPayload,
  UpdateTaskPayload,
  ActivateTaskPayload,
  MoveToPipelinePayload,
  DropTaskPayload,
  PipelineReviewPayload,
  UpsertSnapshotPayload,
  AttachSnapshotScreenshotPayload,
} from '@/types';

const EMPTY_STATE: AppState = {
  services: [],
  tasks: { active: [], completed: {}, pipeline: [], dropped: [] },
  overdue: [],
  snapshots: [],
  last_updated: new Date().toISOString(),
};

export function useTaskManager() {
  const [state, setState] = useState<AppState>(EMPTY_STATE);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadState().then((result) => {
      if ('error' in result) setError(result.error);
      else setState(result as AppState);
      setLoading(false);
    });
  }, []);

  /** Full dispatch — shows the loading bar and surfaces errors. */
  async function dispatch<T>(fn: (s: AppState, p: T) => Promise<AppState | { error: string }>, payload: T) {
    setLoading(true);
    const result = await fn(state, payload);
    if ('error' in result) {
      setError(result.error);
    } else {
      setError(null);
      setState(result as AppState);
    }
    setLoading(false);
  }

  /** Silent dispatch — updates state without triggering the loading bar. Used for background snapshot ops. */
  async function silentDispatch<T>(fn: (s: AppState, p: T) => Promise<AppState | { error: string }>, payload: T) {
    const result = await fn(state, payload);
    if (!('error' in result)) {
      setState(result as AppState);
    }
  }

  const clearError = useCallback(() => setError(null), []);

  return {
    state,
    error,
    loading,
    clearError,
    createService: (p: CreateServicePayload) => dispatch(engine.createService, p),
    deleteService: (p: DeleteServicePayload) => dispatch(engine.deleteService, p),
    createTask: (p: CreateTaskPayload) => dispatch(engine.createTask, p),
    completeTask: (p: CompleteTaskPayload) => dispatch(engine.completeTask, p),
    deleteTask: (p: DeleteTaskPayload) => dispatch(engine.deleteTask, p),
    updateTask: (p: UpdateTaskPayload) => dispatch(engine.updateTask, p),
    activateTask: (p: ActivateTaskPayload) => dispatch(engine.activateTask, p),
    moveToPipeline: (p: MoveToPipelinePayload) => dispatch(engine.moveToPipeline, p),
    dropTask: (p: DropTaskPayload) => dispatch(engine.dropTask, p),
    pipelineReview: (p: PipelineReviewPayload) => dispatch(engine.pipelineReview, p),
    getLogoUploadUrl: engine.getLogoUploadUrl,
    // Snapshot operations — silent so they don't flash the loading bar
    upsertSnapshot: (p: UpsertSnapshotPayload) => silentDispatch(engine.upsertSnapshot, p),
    attachSnapshotScreenshot: (p: AttachSnapshotScreenshotPayload) => silentDispatch(engine.attachSnapshotScreenshot, p),
    getSnapshotScreenshotUploadUrl: engine.getSnapshotScreenshotUploadUrl,
  };
}
