import { describe, expect, it } from 'vitest';
import { createStore } from './state';

type CounterState = {
  count: number;
  increment: () => void;
};

describe('createStore', () => {
  it('creates a zustand store from an uncurried initializer', () => {
    const store = createStore<CounterState>((set) => ({
      count: 0,
      increment: () => set((state) => ({ count: state.count + 1 }))
    }));

    expect(store.getState().count).toBe(0);

    store.getState().increment();

    expect(store.getState().count).toBe(1);
  });
});
