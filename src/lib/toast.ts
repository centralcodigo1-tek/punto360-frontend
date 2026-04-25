export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

let toasts: ToastItem[] = [];
let listeners: ((t: ToastItem[]) => void)[] = [];

function notify() {
  listeners.forEach(l => l([...toasts]));
}

function add(type: ToastType, message: string) {
  const id = Math.random().toString(36).slice(2);
  toasts = [...toasts, { id, type, message }];
  notify();
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id);
    notify();
  }, 4000);
}

export function subscribe(fn: (t: ToastItem[]) => void) {
  listeners.push(fn);
  return () => { listeners = listeners.filter(l => l !== fn); };
}

export const toast = {
  success: (msg: string) => add('success', msg),
  error:   (msg: string) => add('error', msg),
  warning: (msg: string) => add('warning', msg),
  info:    (msg: string) => add('info', msg),
};
