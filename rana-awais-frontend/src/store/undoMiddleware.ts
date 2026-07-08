/**
 * Undo/Redo middleware for Zustand stores
 * Provides undo/redo functionality for any zustand store
 */

import { StateCreator, StoreMutatorIdentifier } from 'zustand';

type UndoMiddleware = <
  T extends object,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = []
>(
  f: StateCreator<T, Mps, Mcs>,
  config?: { maxHistory?: number }
) => StateCreator<T, Mps, Mcs>;

// Track if we're in the middle of undo/redo to avoid re-recording
let isUndoingOrRedoing = false;

export const undoMiddleware: UndoMiddleware = ((f: any, config?: { maxHistory?: number }) => {
  return ((set: any, get: any, store: any) => {
    const maxHistory = config?.maxHistory || 50;

    // Wrap the original set function to track history
    const trackedSet: any = (partial: any, replace?: any) => {
      if (!isUndoingOrRedoing) {
        const state = get();
        const past = state._past || [];
        const currentState = { ...state };

        // Remove sensitive/internal keys before saving
        const { _past, _future, undo, redo, clearHistory, canUndo, canRedo, ...snapshot } = currentState;

        // Add current state to past
        const newPast = [...past.slice(-maxHistory + 1), snapshot];

        set({
          _past: newPast,
          _future: [],
        });
      }

      // Call original set
      set(partial, replace);
    };

    const api = f(trackedSet, get, store);

    return {
      ...api,
      _past: [],
      _future: [],
      _maxHistory: maxHistory,

      undo: () => {
        const state = get();
        const past = state._past || [];
        const future = state._future || [];

        if (past.length === 0) return;

        const previous = past[past.length - 1];
        const newPast = past.slice(0, -1);

        // Save current state to future
        const { _past, _future, undo, redo, clearHistory, canUndo, canRedo, ...currentSnapshot } = state;

        isUndoingOrRedoing = true;
        set({
          ...previous,
          _past: newPast,
          _future: [currentSnapshot, ...future],
        });
        isUndoingOrRedoing = false;
      },

      redo: () => {
        const state = get();
        const past = state._past || [];
        const future = state._future || [];

        if (future.length === 0) return;

        const next = future[0];
        const newFuture = future.slice(1);

        // Save current state to past
        const { _past, _future, undo, redo, clearHistory, canUndo, canRedo, ...currentSnapshot } = state;

        isUndoingOrRedoing = true;
        set({
          ...next,
          _past: [...past, currentSnapshot],
          _future: newFuture,
        });
        isUndoingOrRedoing = false;
      },

      clearHistory: () => {
        set({
          _past: [],
          _future: [],
        });
      },

      canUndo: () => {
        const state = get();
        return (state._past?.length || 0) > 0;
      },

      canRedo: () => {
        const state = get();
        return (state._future?.length || 0) > 0;
      },
    };
  }) as any;
}) as any;

export default undoMiddleware;
