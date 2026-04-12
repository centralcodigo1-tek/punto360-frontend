import { useEffect, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import { useAuth } from "../auth/AuthContext";
import { api } from "../api/axios";
import {
  TrendingUp, Wallet, ShoppingBag, DollarSign,
  AlertTriangle, Package, Loader2, CheckCircle2, CreditCard, Building2,
  ChevronRight, ArrowUpRight, ShoppingCart
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Stats {
  totalHoy: number;
  efectivoHoy: number;
  ticketsHoy: number;
  totalMes: number;
  lowStock: number;
  totalProducts: number;
  recentSales: {
    id: string;
    created_at: string;
    total: string;
    payment_method: string;
    status: string;
    sale_items: { products: { name: string } }[];
    branches: { name: string };
  }[];
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(val);
}

const paymentIcon: Record<string, React.ReactElement> = {
  CASH: <Wallet size={14} className="text-emerald-400" />,
  CARD: <CreditCard size={14} className="text-blue-400" />,
  TRANSFER: <Building2 size={14} className="text-violet-400" />,
};

const paymentLabel: Record<string, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  TRANSFER: "Transferencia",
};

export default function DashboardPage() {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const firstName = user?.userName?.split(" ")[0] || "Administrador";

  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
        const res = await api.get("/sales/stats");
        setStats(res.data);
    } catch (error) {
        console.error("Dashboard error", error);
    } finally {
        setIsLoading(false);
    }
  };

  const statCards = stats
    ? [
        {
          title: "Ventas Hoy",
          value: formatCurrency(stats.totalHoy),
          subtitle: `${stats.ticketsHoy} ticket${stats.ticketsHoy !== 1 ? "s" : ""} cobrado${stats.ticketsHoy !== 1 ? "s" : ""}`,
          icon: <DollarSign size={22} />,
          from: "from-blue-600",
          to: "to-cyan-500",
        },
        {
          title: "Efectivo en Caja",
          value: formatCurrency(stats.efectivoHoy),
          subtitle: "Solo cobros en cash",
          icon: <Wallet size={22} />,
          from: "from-emerald-600",
          to: "to-teal-500",
        },
        {
          title: "Ventas del Mes",
          value: formatCurrency(stats.totalMes),
          subtitle: "Acumulado mes actual",
          icon: <TrendingUp size={22} />,
          from: "from-violet-600",
          to: "to-purple-500",
        },
        {
          title: "Inventario Activo",
          value: String(stats.totalProducts),
          subtitle: "Productos en catálogo",
          icon: <Package size={22} />,
          from: "from-orange-500",
          to: "to-amber-400",
        },
      ]
    : [];

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-black text-app-text flex items-center gap-3 tracking-tight">
            Bienvenido, {firstName}!{" "}
            <span className="text-xl md:text-2xl animate-bounce">👋</span>
          </h1>
          <p className="text-app-text-muted mt-1 flex flex-wrap items-center gap-2 font-bold text-[10px] md:text-xs uppercase tracking-widest">
            <span className="px-2 py-0.5 bg-app-accent/10 text-app-accent rounded-md border border-app-accent/20">
              {user?.role || "Personal"}
            </span>
            <span className="opacity-60">Panel de control de</span>
            <span className="text-app-text">{user?.companyName || "tu negocio"}</span>
          </p>
        </div>
        
        <div className="flex gap-2">
            {hasPermission("reports.view") && (
                <button
                    onClick={() => navigate("/reportes")}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all shadow-sm"
                >
                    <ArrowUpRight size={14} /> Ver Análisis
                </button>
            )}
            {stats && stats.lowStock > 0 && (
                <button
                    onClick={() => navigate("/inventario")}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest hover:bg-amber-500/20 transition-all shadow-sm"
                >
                    <AlertTriangle size={14} />
                    {stats.lowStock} Stock Bajo
                </button>
            )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col justify-center items-center py-20 gap-3 text-app-text-muted">
          <Loader2 size={32} className="animate-spin text-app-accent" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">Analizando flujo de caja...</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 mb-8">
            {statCards.map((card) => (
              <div
                key={card.title}
                className="relative overflow-hidden bg-app-card border border-app-border rounded-2xl p-5 shadow-xl backdrop-blur-md group hover:border-app-accent/30 transition-all duration-300"
              >
                <div
                  className={`absolute -top-4 -right-4 w-20 h-20 rounded-full bg-gradient-to-br ${card.from} ${card.to} opacity-20 group-hover:opacity-30 blur-xl transition-opacity`}
                />
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-app-text-muted">{card.title}</span>
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${card.from} ${card.to} text-white shadow-lg`}>
                    {card.icon}
                  </div>
                </div>
                <p className="text-2xl font-bold text-app-text mb-1 tracking-tight">{card.value}</p>
                {card.subtitle && (
                  <p className="text-xs text-app-text-muted font-medium">{card.subtitle}</p>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Sales Table */}
            <div className="lg:col-span-2 bg-app-card backdrop-blur-md border border-app-border rounded-2xl shadow-xl overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-app-border">
                <h3 className="font-semibold text-app-text flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  Actividad de hoy
                </h3>
                <button
                  onClick={() => navigate("/historial")}
                  className="text-xs text-app-accent hover:text-app-accent/80 font-medium transition-colors flex items-center gap-1"
                >
                  Historial completo <ChevronRight size={14} />
                </button>
              </div>

              {stats?.recentSales.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-14 text-app-text-muted opacity-50">
                  <ShoppingBag size={40} className="mb-3" />
                  <p className="text-sm font-bold uppercase tracking-widest">Sin registros hoy</p>
                </div>
              ) : (
                <div className="divide-y border-t border-app-border divide-app-border/30">
                  {stats?.recentSales.map((sale) => {
                    const products = sale.sale_items.map((i) => i.products?.name).filter(Boolean).join(", ");
                    return (
                      <div key={sale.id} className="flex items-center gap-4 px-6 py-4 hover:bg-app-accent/5 transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-app-accent flex items-center justify-center text-[10px] font-black text-white shrink-0 shadow-lg shadow-app-accent/20">
                          POS
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-app-text truncate">{products || "Venta de productos"}</p>
                          <p className="text-[10px] text-app-text-muted uppercase font-black tracking-tight">
                             <span className="text-app-accent">{sale.branches?.name || 'Sede Local'}</span> · <span className="opacity-60">Ref: {sale.id.slice(-6).toUpperCase()}</span> · {new Date(sale.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-black text-app-text-muted uppercase bg-app-accent/10 px-2.5 py-1.5 rounded-lg shrink-0 border border-app-accent/10">
                          {paymentIcon[sale.payment_method]}
                          {paymentLabel[sale.payment_method] || sale.payment_method}
                        </div>
                        <span className={`text-base font-black shrink-0 tracking-tight ${sale.status === "CANCELLED" ? "line-through opacity-30 text-app-text" : "text-emerald-500"}`}>
                          {formatCurrency(Number(sale.total))}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Acciones Rápidas */}
            <div className="flex flex-col gap-6">
                <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <ShoppingCart size={80} />
                    </div>
                    <h3 className="text-white font-bold text-lg mb-1">Caja Registradora</h3>
                    <p className="text-white/70 text-sm mb-6">Realiza ventas y cobra a tus clientes en segundos.</p>
                    <button
                        onClick={() => navigate("/ventas")}
                        className="w-full py-3 bg-white text-indigo-600 font-bold rounded-xl shadow-lg hover:bg-indigo-50 transition-colors"
                    >
                        Abrir POS Ahora →
                    </button>
                </div>

                <div className="bg-app-card border border-app-border rounded-2xl p-6 backdrop-blur-md shadow-lg">
                   <h3 className="text-app-text font-black text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                       <Package size={18} className="text-amber-500" /> Resumen Stock
                   </h3>
                   <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-app-accent/5 rounded-xl border border-app-border">
                            <span className="text-[10px] font-black uppercase text-app-text-muted tracking-widest">Productos totales</span>
                            <span className="font-black text-app-text">{stats?.totalProducts}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-app-accent/5 rounded-xl border border-app-border">
                            <span className="text-[10px] font-black uppercase text-app-text-muted tracking-widest">Stock bajo</span>
                            <span className={`font-black ${stats?.lowStock ? "text-amber-500" : "text-emerald-500"}`}>{stats?.lowStock}</span>
                        </div>
                        <button
                            onClick={() => navigate("/inventario")}
                            className="w-full py-3 text-[10px] font-black uppercase tracking-[0.2em] text-app-text-muted hover:text-app-accent border border-dashed border-app-border hover:border-app-accent/50 rounded-xl transition-all"
                        >
                            Ir a Inventario
                        </button>
                   </div>
                </div>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
