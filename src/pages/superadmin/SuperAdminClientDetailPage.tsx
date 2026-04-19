import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, GitBranch, PlusCircle, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { api } from '../../api/axios';

interface Subscription { id: string; start_date: string; end_date: string; amount: number; status: string; notes: string | null; }
interface Branch { id: string; name: string; is_active: boolean; address: string | null; }
interface UserEntry { id: string; name: string; email: string; is_active: boolean; user_roles: { roles: { name: string } }[]; }
interface ClientDetail {
  id: string; name: string; email: string | null; phone: string | null; address: string | null; created_at: string;
  branches: Branch[];
  users: UserEntry[];
  subscriptions: Subscription[];
}

const fmt = (d: string) => new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtCOP = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

function subStatus(s: Subscription) {
  const now = new Date();
  const end = new Date(s.end_date);
  if (s.status === 'suspended') return { label: 'Suspendida', cls: 'text-rose-400 bg-rose-500/10 border-rose-500/20' };
  if (end < now) return { label: 'Vencida', cls: 'text-rose-400 bg-rose-500/10 border-rose-500/20' };
  const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 30) return { label: `Vence en ${days}d`, cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
  return { label: 'Al día', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
}

export default function SuperAdminClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [renewLoading, setRenewLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [showRenewForm, setShowRenewForm] = useState(false);

  const load = () => api.get<ClientDetail>(`/superadmin/clients/${id}`).then(r => setClient(r.data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, [id]);

  const handleRenew = async () => {
    setRenewLoading(true);
    try {
      await api.post(`/superadmin/clients/${id}/subscriptions`, { startDate: new Date().toISOString(), notes });
      setShowRenewForm(false);
      setNotes('');
      load();
    } finally { setRenewLoading(false); }
  };

  const handleToggleStatus = async (subId: string, current: string) => {
    const next = current === 'suspended' ? 'active' : 'suspended';
    await api.patch(`/superadmin/subscriptions/${subId}/status`, { status: next });
    load();
  };

  if (loading) return <div className="h-64 bg-app-card rounded-2xl border border-app-border animate-pulse" />;
  if (!client) return <p className="text-app-text-muted">Cliente no encontrado</p>;

  const activeSub = client.subscriptions.find(s => {
    const end = new Date(s.end_date);
    return s.status === 'active' && end > new Date();
  });

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/superadmin')} className="p-2 rounded-xl bg-app-card border border-app-border text-app-text-muted hover:text-app-text transition-all">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-app-text">{client.name}</h1>
          <p className="text-sm text-app-text-muted">{client.email ?? '—'} · {client.phone ?? '—'}</p>
        </div>
        <button
          onClick={() => setShowRenewForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-medium transition-all"
        >
          <PlusCircle size={15} />
          Renovar suscripción
        </button>
      </div>

      {/* Renovar form */}
      {showRenewForm && (
        <div className="bg-app-card border border-violet-500/30 rounded-2xl p-5 space-y-4">
          <p className="text-sm font-bold text-app-text">Nueva suscripción — $800.000 COP / año</p>
          <input
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Notas (opcional)"
            className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-2.5 text-sm text-app-text focus:outline-none focus:border-violet-500/50"
          />
          <div className="flex gap-3">
            <button onClick={handleRenew} disabled={renewLoading} className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm transition-all disabled:opacity-60">
              {renewLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              Confirmar
            </button>
            <button onClick={() => setShowRenewForm(false)} className="px-4 py-2 rounded-xl text-sm text-app-text-muted hover:text-app-text transition-all">Cancelar</button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Suscripciones */}
        <div className="lg:col-span-2 bg-app-card border border-app-border rounded-2xl p-5 space-y-3">
          <h2 className="font-bold text-app-text text-sm flex items-center gap-2">
            <Clock size={14} className="text-violet-400" /> Historial de suscripciones
          </h2>
          {client.subscriptions.length === 0 ? (
            <p className="text-xs text-app-text-muted py-4 text-center">Sin suscripciones registradas</p>
          ) : client.subscriptions.map(s => {
            const st = subStatus(s);
            return (
              <div key={s.id} className="flex items-center justify-between py-3 border-b border-app-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-app-text">{fmtCOP(s.amount)}</p>
                  <p className="text-xs text-app-text-muted">{fmt(s.start_date)} → {fmt(s.end_date)}</p>
                  {s.notes && <p className="text-xs text-app-text-muted italic mt-0.5">{s.notes}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-lg font-medium border ${st.cls}`}>{st.label}</span>
                  <button
                    onClick={() => handleToggleStatus(s.id, s.status)}
                    className="text-xs px-2.5 py-1 rounded-lg border border-app-border text-app-text-muted hover:text-app-text transition-all"
                  >
                    {s.status === 'suspended' ? 'Activar' : 'Suspender'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Info lateral */}
        <div className="space-y-4">
          {/* Sucursales */}
          <div className="bg-app-card border border-app-border rounded-2xl p-5 space-y-3">
            <h2 className="font-bold text-app-text text-sm flex items-center gap-2"><GitBranch size={14} className="text-violet-400" /> Sucursales</h2>
            {client.branches.map(b => (
              <div key={b.id} className="flex items-center justify-between">
                <span className="text-sm text-app-text">{b.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${b.is_active ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'}`}>
                  {b.is_active ? 'Activa' : 'Inactiva'}
                </span>
              </div>
            ))}
          </div>

          {/* Usuarios */}
          <div className="bg-app-card border border-app-border rounded-2xl p-5 space-y-3">
            <h2 className="font-bold text-app-text text-sm flex items-center gap-2"><Users size={14} className="text-violet-400" /> Usuarios</h2>
            {client.users.map(u => (
              <div key={u.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-app-text">{u.name}</p>
                  <p className="text-xs text-app-text-muted">{u.email}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400">
                  {u.user_roles[0]?.roles.name ?? '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
