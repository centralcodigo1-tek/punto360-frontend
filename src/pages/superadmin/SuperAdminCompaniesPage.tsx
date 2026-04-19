import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Users, GitBranch, ShoppingCart, ChevronRight } from 'lucide-react';
import { api } from '../../api/axios';

interface Company {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
  users: number;
  branches: number;
  sales: number;
  products: number;
}

export default function SuperAdminCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get<Company[]>('/superadmin/companies')
      .then(r => setCompanies(r.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-app-text">Empresas</h1>
        <p className="text-sm text-app-text-muted mt-1">{companies.length} empresa{companies.length !== 1 ? 's' : ''} registrada{companies.length !== 1 ? 's' : ''}</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-app-card rounded-2xl border border-app-border animate-pulse" />
          ))}
        </div>
      ) : companies.length === 0 ? (
        <div className="bg-app-card border border-app-border rounded-2xl p-12 text-center text-app-text-muted">
          <Building2 size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No hay empresas registradas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {companies.map(c => (
            <button
              key={c.id}
              onClick={() => navigate(`/superadmin/empresas/${c.id}`)}
              className="w-full bg-app-card border border-app-border rounded-2xl p-5 flex items-center gap-4 hover:border-violet-500/40 hover:bg-violet-500/5 transition-all text-left group"
            >
              <div className="w-11 h-11 rounded-xl bg-violet-600/20 flex items-center justify-center shrink-0">
                <Building2 size={18} className="text-violet-400" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-bold text-app-text">{c.name}</p>
                <p className="text-xs text-app-text-muted">{c.email ?? '—'}</p>
              </div>

              <div className="hidden sm:flex items-center gap-6 text-xs text-app-text-muted">
                <span className="flex items-center gap-1.5"><Users size={13} />{c.users} usuarios</span>
                <span className="flex items-center gap-1.5"><GitBranch size={13} />{c.branches} sucursales</span>
                <span className="flex items-center gap-1.5"><ShoppingCart size={13} />{c.sales} ventas</span>
              </div>

              <ChevronRight size={16} className="text-app-text-muted group-hover:text-violet-400 transition-colors shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
