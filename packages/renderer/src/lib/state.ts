import { create, type StateCreator } from 'zustand';

export function createStore<TState>(initializer: StateCreator<TState, [], []>) {
  return create<TState>()(initializer);
}
