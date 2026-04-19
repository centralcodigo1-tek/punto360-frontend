import { useEffect, useRef } from 'react';
import { AlertTriangle, AlertCircle, Info, X, BellOff } from 'lucide-react';
import type { AppNotification } from '../hooks/useNotifications';

interface Props {
  notifications: AppNotification[];
  onClose: () => void;
}

const typeConfig = {
  danger: {
    Icon: AlertCircle,
    iconClass: 'text-rose-400',
    dotClass: 'bg-rose-500',
    borderClass: 'border-rose-500/20',
    bgClass: 'bg-rose-500/10',
  },
  warning: {
    Icon: AlertTriangle,
    iconClass: 'text-amber-400',
    dotClass: 'bg-amber-500',
    borderClass: 'border-amber-500/20',
    bgClass: 'bg-amber-500/10',
  },
  info: {
    Icon: Info,
    iconClass: 'text-blue-400',
    dotClass: 'bg-blue-500',
    borderClass: 'border-blue-500/20',
    bgClass: 'bg-blue-500/10',
  },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

export default function NotificationDropdown({ notifications, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 w-80 bg-app-card border border-app-border rounded-2xl shadow-2xl z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-app-border">
        <span className="text-sm font-bold text-app-text">Notificaciones</span>
        <button
          onClick={onClose}
          className="p-1 text-app-text-muted hover:text-app-text hover:bg-app-card rounded-lg transition-all"
        >
          <X size={14} />
        </button>
      </div>

      {/* List */}
      <div className="max-h-96 overflow-y-auto divide-y divide-app-border">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-app-text-muted">
            <BellOff size={28} />
            <span className="text-sm">Sin notificaciones</span>
          </div>
        ) : (
          notifications.map((n) => {
            const cfg = typeConfig[n.type] ?? typeConfig.info;
            return (
              <div
                key={n.id}
                className={`flex gap-3 px-4 py-3 ${cfg.bgClass} hover:brightness-110 transition-all`}
              >
                <div className={`mt-0.5 shrink-0 ${cfg.iconClass}`}>
                  <cfg.Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-app-text">{n.title}</p>
                  <p className="text-xs text-app-text-muted truncate">{n.message}</p>
                </div>
                <span className="text-[10px] text-app-text-muted shrink-0 mt-0.5">
                  {timeAgo(n.createdAt)}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="px-4 py-2 border-t border-app-border">
          <p className="text-[10px] text-app-text-muted text-center">
            Actualiza cada 60 segundos
          </p>
        </div>
      )}
    </div>
  );
}
