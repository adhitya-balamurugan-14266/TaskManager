/**
 * useTaskManager — central state hook
 *
 * Owns the AppState, loading flag, and error message for the entire app.
 * All mutations go through `dispatch`, which:
 *   1. Sets loading=true
 *   2. Calls the engine function (which hits the API and returns a fresh state)
 *   3. Replaces the local state with the server response (single source of truth)
 *   4. Clears or sets the error accordingly
 *
 * Because the server always returns the full state after every mutation, there
 * is no need for optimistic updates or local state merging.
 */
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
} from '@/types';

const EMPTY_STATE: AppState = {
  services: [],
  tasks: { active: [], completed: {}, pipeline: [], dropped: [] },
  overdue: [],
  last_updated: new Date().toISOString(),
};

export function useTaskManager() {
  const [state, setState] = useState<AppState>(EMPTY_STATE);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load initial state from API
  useEffect(() => {
    loadState().then((result) => {
      if ('error' in result) setError(result.error);
      else setState(result as AppState);
      setLoading(false);
    });
  }, []);

  /**
   * Calls an engine function and replaces state with the server response.
   * All action creators below delegate to this so error handling is centralised.
   */
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
  };
}
