import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, GitBranch, DollarSign, Package } from 'lucide-react';
import { api } from '../../api/axios';

interface CompanyDetail {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
  totalRevenue: number;
  _count: { sales: number; products: number };
  branches: { id: string; name: string; is_active: boolean }[];
  users: {
    id: string;
    name: string;
    email: string;
    is_active: boolean;
    user_roles: { roles: { name: string } }[];
  }[];
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

export default function SuperAdminCompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<CompanyDetail>(`/superadmin/companies/${id}`)
      .then(r => setCompany(r.data))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="h-64 bg-app-card rounded-2xl border border-app-border animate-pulse" />;
  }

  if (!company) {
    return <p className="text-app-text-muted">Empresa no encontrada</p>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/superadmin/empresas')}
          className="p-2 rounded-xl bg-app-card border border-app-border text-app-text-muted hover:text-app-text transition-all"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-app-text">{company.name}</h1>
          <p className="text-sm text-app-text-muted">{company.email ?? '—'} · {company.phone ?? '—'}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Ingresos totales', value: fmt(company.totalRevenue), Icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Ventas',           value: company._count.sales,      Icon: Package,    color: 'text-blue-400',    bg: 'bg-blue-500/10'   },
          { label: 'Usuarios',         value: company.users.length,      Icon: Users,      color: 'text-violet-400',  bg: 'bg-violet-500/10' },
          { label: 'Sucursales',       value: company.branches.length,   Icon: GitBranch,  color: 'text-amber-400',   bg: 'bg-amber-500/10'  },
        ].map(({ label, value, Icon, color, bg }) => (
          <div key={label} className="bg-app-card border border-app-border rounded-2xl p-5 flex flex-col gap-3">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
              <Icon size={18} className={color} />
            </div>
            <div>
              <p className="text-xl font-bold text-app-text">{value}</p>
              <p className="text-xs text-app-text-muted">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Sucursales */}
        <div className="bg-app-card border border-app-border rounded-2xl p-5 space-y-3">
          <h2 className="font-bold text-app-text text-sm">Sucursales</h2>
          {company.branches.length === 0 ? (
            <p className="text-xs text-app-text-muted">Sin sucursales</p>
          ) : company.branches.map(b => (
            <div key={b.id} className="flex items-center justify-between py-2 border-b border-app-border last:border-0">
              <span className="text-sm text-app-text">{b.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${b.is_active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
                {b.is_active ? 'Activa' : 'Inactiva'}
              </span>
            </div>
          ))}
        </div>

        {/* Usuarios */}
        <div className="bg-app-card border border-app-border rounded-2xl p-5 space-y-3">
          <h2 className="font-bold text-app-text text-sm">Usuarios</h2>
          {company.users.length === 0 ? (
            <p className="text-xs text-app-text-muted">Sin usuarios</p>
          ) : company.users.map(u => (
            <div key={u.id} className="flex items-center justify-between py-2 border-b border-app-border last:border-0">
              <div>
                <p className="text-sm text-app-text">{u.name}</p>
                <p className="text-xs text-app-text-muted">{u.email}</p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 font-medium">
                {u.user_roles[0]?.roles.name ?? 'Sin rol'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
