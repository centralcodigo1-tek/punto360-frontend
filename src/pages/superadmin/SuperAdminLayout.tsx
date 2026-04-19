import { NavLink, Outlet } from 'react-router-dom';
import { Users, LogOut, ShieldCheck, PlusCircle } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';

const navItems = [
  { to: '/superadmin',          label: 'Clientes',        Icon: Users,      end: true },
  { to: '/superadmin/nuevo',    label: 'Nuevo cliente',   Icon: PlusCircle              },
];

export default function SuperAdminLayout() {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-app-bg flex">
      <aside className="w-64 shrink-0 bg-app-card border-r border-app-border flex flex-col">
        <div className="p-6 border-b border-app-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg">
              <ShieldCheck size={18} className="text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-app-text">PUNTO 360</p>
              <p className="text-[10px] text-violet-400 font-bold uppercase tracking-widest">Super Admin</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 flex flex-col gap-1">
          {navItems.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-violet-600/20 text-violet-400 border border-violet-500/30'
                    : 'text-app-text-muted hover:text-app-text hover:bg-white/5'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-app-border">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-rose-400 hover:bg-rose-500/10 transition-all"
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
