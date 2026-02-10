type Listener = () => void;

let color = '#f59e0b';
const listeners = new Set<Listener>();

export const colorStore = {
  getColor: () => color,
  setColor: (c: string) => {
    if (c !== color) {
      color = c;
      listeners.forEach((l) => l());
    }
  },
  subscribe: (listener: Listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
