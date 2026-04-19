import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, GitBranch, Users, ChevronRight, PlusCircle, Clock, AlertTriangle, XCircle, CheckCircle } from 'lucide-react';
import { api } from '../../api/axios';

interface Subscription {
  id: string;
  start_date: string;
  end_date: string;
  amount: number;
  status: string;
}

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
  users: number;
  branches: { id: string; name: string; is_active: boolean }[];
  subscriptionStatus: 'active' | 'expiring_soon' | 'expired' | 'suspended' | 'sin_suscripcion';
  daysRemaining: number | null;
  lastSubscription: Subscription | null;
}

const statusConfig = {
  active:          { label: 'Al día',         Icon: CheckCircle,  className: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  expiring_soon:   { label: 'Por vencer',      Icon: AlertTriangle, className: 'text-amber-400 bg-amber-500/10 border-amber-500/20'     },
  expired:         { label: 'Vencida',         Icon: XCircle,      className: 'text-rose-400 bg-rose-500/10 border-rose-500/20'         },
  suspended:       { label: 'Suspendida',      Icon: XCircle,      className: 'text-rose-400 bg-rose-500/10 border-rose-500/20'         },
  sin_suscripcion: { label: 'Sin suscripción', Icon: Clock,        className: 'text-app-text-muted bg-white/5 border-app-border'        },
};

const fmt = (d: string) => new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });

export default function SuperAdminDashboardPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const navigate = useNavigate();

  useEffect(() => {
    api.get<Client[]>('/superadmin/clients')
      .then(r => setClients(r.data))
      .finally(() => setLoading(false));
  }, []);

  const counts = {
    all:          clients.length,
    active:       clients.filter(c => c.subscriptionStatus === 'active').length,
    expiring_soon:clients.filter(c => c.subscriptionStatus === 'expiring_soon').length,
    expired:      clients.filter(c => ['expired', 'suspended'].includes(c.subscriptionStatus)).length,
  };

  const filtered = filter === 'all' ? clients : clients.filter(c =>
    filter === 'expired'
      ? ['expired', 'suspended'].includes(c.subscriptionStatus)
      : c.subscriptionStatus === filter
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-app-text">Clientes</h1>
          <p className="text-sm text-app-text-muted mt-0.5">{clients.length} cliente{clients.length !== 1 ? 's' : ''} registrado{clients.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => navigate('/superadmin/nuevo')}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-medium transition-all shadow-lg"
        >
          <PlusCircle size={16} />
          Nuevo cliente
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all',          label: `Todos (${counts.all})` },
          { key: 'active',       label: `Al día (${counts.active})` },
          { key: 'expiring_soon',label: `Por vencer (${counts.expiring_soon})` },
          { key: 'expired',      label: `Vencidas (${counts.expired})` },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              filter === key
                ? 'bg-violet-600/20 text-violet-400 border-violet-500/30'
                : 'text-app-text-muted border-app-border hover:text-app-text hover:bg-white/5'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-app-card rounded-2xl border border-app-border animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-app-card border border-app-border rounded-2xl p-12 text-center text-app-text-muted">
          <Building2 size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No hay clientes en este filtro</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(client => {
            const cfg = statusConfig[client.subscriptionStatus] ?? statusConfig.sin_suscripcion;
            return (
              <button
                key={client.id}
                onClick={() => navigate(`/superadmin/clientes/${client.id}`)}
                className="w-full bg-app-card border border-app-border rounded-2xl p-5 flex items-center gap-4 hover:border-violet-500/30 transition-all text-left group"
              >
                {/* Avatar */}
                <div className="w-11 h-11 rounded-xl bg-violet-600/20 flex items-center justify-center shrink-0 text-violet-400 font-bold text-lg">
                  {client.name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-app-text">{client.name}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-app-text-muted">
                    <span className="flex items-center gap-1"><Users size={11} />{client.users} usuarios</span>
                    <span className="flex items-center gap-1"><GitBranch size={11} />{client.branches.length} sucursal{client.branches.length !== 1 ? 'es' : ''}</span>
                    {client.branches.slice(0, 2).map(b => (
                      <span key={b.id} className="hidden sm:inline px-2 py-0.5 bg-white/5 rounded-md">{b.name}</span>
                    ))}
                    {client.branches.length > 2 && (
                      <span className="hidden sm:inline text-app-text-muted">+{client.branches.length - 2} más</span>
                    )}
                  </div>
                </div>

                {/* Suscripción */}
                <div className="shrink-0 text-right hidden sm:block">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${cfg.className}`}>
                    <cfg.Icon size={11} />
                    {cfg.label}
                  </span>
                  {client.lastSubscription && (
                    <p className="text-[10px] text-app-text-muted mt-1">
                      Vence: {fmt(client.lastSubscription.end_date)}
                      {client.daysRemaining !== null && client.daysRemaining > 0 && (
                        <span className="ml-1">({client.daysRemaining}d)</span>
                      )}
                    </p>
                  )}
                </div>

                <ChevronRight size={16} className="text-app-text-muted group-hover:text-violet-400 transition-colors shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
