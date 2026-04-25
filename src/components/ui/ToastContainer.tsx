import { useEffect, useState } from "react";
import { subscribe, type ToastItem } from "../../lib/toast";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

const CONFIG = {
  success: { icon: CheckCircle2, bg: "bg-emerald-500/10 border-emerald-500/30", text: "text-emerald-400", bar: "bg-emerald-500" },
  error:   { icon: XCircle,      bg: "bg-rose-500/10 border-rose-500/30",    text: "text-rose-400",    bar: "bg-rose-500"    },
  warning: { icon: AlertTriangle, bg: "bg-amber-500/10 border-amber-500/30",  text: "text-amber-400",   bar: "bg-amber-500"   },
  info:    { icon: Info,          bg: "bg-blue-500/10 border-blue-500/30",    text: "text-blue-400",    bar: "bg-blue-500"    },
};

function Toast({ item, onRemove }: { item: ToastItem; onRemove: (id: string) => void }) {
  const c = CONFIG[item.type];
  const Icon = c.icon;

  return (
    <div className={`relative flex items-start gap-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-md ${c.bg} min-w-[280px] max-w-[380px] animate-in slide-in-from-right-4 duration-300`}>
      <Icon size={18} className={`${c.text} shrink-0 mt-0.5`} />
      <p className="text-sm text-app-text flex-1 leading-snug">{item.message}</p>
      <button onClick={() => onRemove(item.id)} className="text-app-text-muted hover:text-app-text transition-colors shrink-0">
        <X size={14} />
      </button>
      <div className={`absolute bottom-0 left-0 h-0.5 rounded-b-xl ${c.bar} animate-shrink`} />
    </div>
  );
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => subscribe(setToasts), []);

  const remove = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 items-end">
      {toasts.map(t => <Toast key={t.id} item={t} onRemove={remove} />)}
    </div>
  );
}
