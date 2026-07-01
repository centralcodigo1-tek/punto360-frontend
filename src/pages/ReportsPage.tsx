import { useEffect, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import { api } from "../api/axios";
import { useAuth } from "../auth/AuthContext";
import { useTheme } from "../theme/ThemeContext";
import {
  TrendingUp, DollarSign, PieChart, BarChart3,
  Calendar, ArrowUpRight, Loader2, Filter, Percent,
  Wallet, Lock, Package, Users, ShoppingBag,
  AlertTriangle, XCircle, CreditCard, Building2, Banknote, Clock
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
  PieChart as RePieChart, Pie, Legend
} from 'recharts';

// ── Types ─────────────────────────────────────────────────────────────────────
interface FinancialSummary { totalRevenue: number; totalCost: number; grossProfit: number; profitMargin: number; transactionCount: number; averageTicket: number; }
interface TrendData { date: string; revenue: number; transactions: number; }
interface TopProduct { name: string; sku: string; quantity: number; revenue: number; cost: number; profit: number; margin: number; }
interface CategoryStat { category: string; revenue: number; quantity: number; }
interface PaymentMethod { method: string; total: number; count: number; }
interface HourStat { hour: number; label: string; revenue: number; count: number; }
interface WeekdayStat { day: string; index: number; revenue: number; count: number; }
interface TopCustomer { name: string; total: number; tickets: number; }
interface InventoryKpis { totalValue: number; lowStock: number; outOfStock: number; totalProducts: number; }

const COLORS = ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'];
const cop = (v: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(v);
const fmtAxis = (v: number) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000 % 1 === 0 ? (v / 1_000_000).toFixed(0) : (v / 1_000_000).toFixed(1))}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}k`;
  return `$${v}`;
};

type Tab = 'ventas' | 'productos' | 'clientes' | 'inventario';

const localDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const today = localDate(new Date());
const daysAgo = (n: number) => localDate(new Date(Date.now() - n * 86400000));
const startOfMonth = () => { const d = new Date(); d.setDate(1); return localDate(d); };

export default function ReportsPage() {
  const { hasPermission } = useAuth();
  const { theme } = useTheme();
  const isLight = theme === 'light' || theme === 'neon-light';

  const axisColor    = isLight ? '#64748b' : '#ffffff60';
  const gridColor    = isLight ? '#00000012' : '#ffffff10';
  const tooltipBg    = isLight ? '#ffffff' : '#0f172a';
  const tooltipBorder = isLight ? '#e2e8f0' : '#ffffff20';
  const tooltipColor = isLight ? '#1e293b' : '#f1f5f9';
  const tooltipStyle = { backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '12px', color: tooltipColor };

  const [tab, setTab] = useState<Tab>('ventas');
  const [range, setRange] = useState({ start: daysAgo(7), end: today });
  const [isLoading, setIsLoading] = useState(true);

  // Data
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [trend, setTrend] = useState<TrendData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [categories, setCategories] = useState<CategoryStat[]>([]);
  const [payments, setPayments] = useState<PaymentMethod[]>([]);
  const [byHour, setByHour] = useState<HourStat[]>([]);
  const [byWeekday, setByWeekday] = useState<WeekdayStat[]>([]);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [invKpis, setInvKpis] = useState<InventoryKpis | null>(null);
  const [productSort, setProductSort] = useState<'revenue' | 'quantity' | 'profit'>('revenue');

  useEffect(() => { fetchAll(); }, [range]);

  const fetchAll = async () => {
    setIsLoading(true);
    const { start, end } = range;
    const q = `startDate=${start}&endDate=${end}`;
    try {
      const [fin, tr, tp, cat, pay, hour, wd, tc, inv] = await Promise.all([
        api.get(`/reports/financial?${q}`),
        api.get(`/reports/sales-trend?${q}`),
        api.get(`/reports/top-products?${q}&limit=10`),
        api.get(`/reports/category-stats?${q}`),
        api.get(`/reports/payment-methods?${q}`),
        api.get(`/reports/sales-by-hour?${q}`),
        api.get(`/reports/sales-by-weekday?${q}`),
        api.get(`/reports/top-customers?${q}&limit=10`),
        api.get(`/reports/inventory-kpis`),
      ]);
      setSummary(fin.data); setTrend(tr.data); setTopProducts(tp.data);
      setCategories(cat.data); setPayments(pay.data); setByHour(hour.data);
      setByWeekday(wd.data); setTopCustomers(tc.data); setInvKpis(inv.data);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const quickRanges = [
    { label: 'Hoy', start: today, end: today },
    { label: '7 días', start: daysAgo(7), end: today },
    { label: '30 días', start: daysAgo(30), end: today },
    { label: 'Este mes', start: startOfMonth(), end: today },
  ];

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'ventas', label: 'Ventas', icon: <TrendingUp size={16} /> },
    { id: 'productos', label: 'Productos', icon: <ShoppingBag size={16} /> },
    { id: 'clientes', label: 'Clientes', icon: <Users size={16} /> },
    { id: 'inventario', label: 'Inventario', icon: <Package size={16} /> },
  ];

  if (!hasPermission("reports.view")) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-app-text-muted">
          <Lock size={64} className="mb-4 opacity-20" />
          <h2 className="text-xl font-bold">Acceso Denegado</h2>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header + filtros */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-app-text flex items-center gap-3">
              <TrendingUp size={28} className="text-emerald-400" /> Estadísticas
            </h1>
            <p className="text-app-text-muted text-sm mt-0.5">Análisis completo del negocio</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {quickRanges.map(r => (
              <button key={r.label}
                onClick={() => setRange({ start: r.start, end: r.end })}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${range.start === r.start && range.end === r.end ? 'bg-app-accent text-white' : 'bg-app-card border border-app-border text-app-text-muted hover:text-app-text'}`}
              >{r.label}</button>
            ))}
            <div className="flex items-center gap-1.5 bg-app-card border border-app-border rounded-xl px-3 py-1.5">
              <Calendar size={14} className="text-app-text-muted" />
              <input type="date" value={range.start} onChange={e => setRange(r => ({ ...r, start: e.target.value }))}
                className="bg-transparent text-xs text-app-text focus:outline-none" />
              <span className="text-app-text-muted text-xs">—</span>
              <input type="date" value={range.end} onChange={e => setRange(r => ({ ...r, end: e.target.value }))}
                className="bg-transparent text-xs text-app-text focus:outline-none" />
            </div>
            <button onClick={fetchAll} className="px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-xl text-xs font-bold hover:bg-emerald-500/30 transition-all flex items-center gap-1.5">
              <Filter size={13} /> Aplicar
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-app-card border border-app-border p-1 rounded-2xl w-fit">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab === t.id ? 'bg-app-accent text-white shadow-lg' : 'text-app-text-muted hover:text-app-text'}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-[50vh] gap-4 text-app-text-muted">
            <Loader2 size={48} className="animate-spin text-app-accent" />
            <p className="animate-pulse font-bold text-sm uppercase tracking-widest">Calculando métricas...</p>
          </div>
        ) : (
          <>
            {/* ── TAB VENTAS ── */}
            {tab === 'ventas' && (
              <div className="space-y-6">
                {/* KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Ingresos Totales', value: cop(summary?.totalRevenue || 0), icon: <DollarSign size={20} />, color: 'blue' },
                    { label: 'Utilidad Bruta', value: cop(summary?.grossProfit || 0), icon: <Wallet size={20} />, color: 'emerald' },
                    { label: 'Margen de Ganancia', value: `${(summary?.profitMargin ?? 0).toFixed(1)}%`, icon: <Percent size={20} />, color: 'amber' },
                    { label: 'Ticket Promedio', value: cop(summary?.averageTicket || 0), icon: <TrendingUp size={20} />, color: 'violet' },
                    { label: 'Transacciones', value: String(summary?.transactionCount || 0), icon: <BarChart3 size={20} />, color: 'cyan' },
                    { label: 'Unidades Vendidas', value: topProducts.reduce((s, p) => s + p.quantity, 0).toLocaleString('es-CO'), icon: <ShoppingBag size={20} />, color: 'teal' },
                    { label: 'Costo Total', value: cop(summary?.totalCost || 0), icon: <ArrowUpRight size={20} />, color: 'rose' },
                  ].map((k, i) => (
                    <div key={i} className="bg-app-card border border-app-border rounded-2xl p-5 relative overflow-hidden group">
                      <div className={`absolute -top-4 -right-4 w-20 h-20 rounded-full bg-${k.color}-500/10 blur-xl group-hover:bg-${k.color}-500/20 transition-all`} />
                      <div className={`w-9 h-9 rounded-lg bg-${k.color}-500/20 text-${k.color}-400 flex items-center justify-center mb-3`}>{k.icon}</div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-app-text-muted mb-1">{k.label}</p>
                      <p className="text-xl font-black text-app-text">{k.value}</p>
                    </div>
                  ))}
                </div>

                {/* Tendencia + métodos de pago */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-app-card border border-app-border rounded-2xl p-6">
                    <h3 className="font-bold text-app-text mb-4 flex items-center gap-2"><BarChart3 size={16} className="text-cyan-400" /> Evolución de Ventas</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trend}>
                          <defs>
                            <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.6} />
                              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                          <XAxis dataKey="date" stroke={axisColor} fontSize={10} tickFormatter={d => d.slice(5).replace('-', '/')} />
                          <YAxis stroke={axisColor} fontSize={10} tickFormatter={v => fmtAxis(Number(v))} />
                          <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [cop(Number(v)), 'Ventas']} />
                          <Area type="monotone" dataKey="revenue" stroke="#06b6d4" fill="url(#gRev)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-app-card border border-app-border rounded-2xl p-6">
                    <h3 className="font-bold text-app-text mb-4 flex items-center gap-2"><PieChart size={16} className="text-violet-400" /> Métodos de Pago</h3>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                          <Pie data={payments} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={4} dataKey="total" nameKey="method">
                            {payments.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => cop(Number(v))} />
                          <Legend wrapperStyle={{ fontSize: '11px' }} />
                        </RePieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2 mt-2">
                      {payments.map((p, i) => {
                        const icons: Record<string, React.ReactNode> = { Efectivo: <Banknote size={13} />, Tarjeta: <CreditCard size={13} />, Transferencia: <Building2 size={13} /> };
                        return (
                          <div key={i} className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5" style={{ color: COLORS[i % COLORS.length] }}>
                              {icons[p.method] ?? <DollarSign size={13} />}
                              <span className="text-xs font-bold text-app-text">{p.method}</span>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-black text-app-text">{cop(p.total)}</p>
                              <p className="text-[10px] text-app-text-muted">{p.count} ventas</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Hora pico + día de la semana */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-app-card border border-app-border rounded-2xl p-6">
                    <h3 className="font-bold text-app-text mb-4 flex items-center gap-2"><Clock size={16} className="text-amber-400" /> Ventas por Hora</h3>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={byHour.filter(h => h.revenue > 0 || byHour.some(x => x.revenue > 0))} margin={{ left: -20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                          <XAxis dataKey="label" stroke={axisColor} fontSize={9} />
                          <YAxis stroke={axisColor} fontSize={9} tickFormatter={v => fmtAxis(Number(v))} />
                          <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [cop(Number(v)), 'Ventas']} />
                          <Bar dataKey="revenue" radius={[4, 4, 0, 0]} barSize={14}>
                            {byHour.map((h, i) => {
                              const max = Math.max(...byHour.map(x => x.revenue));
                              return <Cell key={i} fill={h.revenue === max && max > 0 ? '#f59e0b' : '#6366f1'} />;
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-app-card border border-app-border rounded-2xl p-6">
                    <h3 className="font-bold text-app-text mb-4 flex items-center gap-2"><Calendar size={16} className="text-emerald-400" /> Ventas por Día</h3>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={byWeekday} margin={{ left: -20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                          <XAxis dataKey="day" stroke={axisColor} fontSize={11} />
                          <YAxis stroke={axisColor} fontSize={9} tickFormatter={v => fmtAxis(Number(v))} />
                          <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [cop(Number(v)), 'Ventas']} />
                          <Bar dataKey="revenue" radius={[4, 4, 0, 0]} barSize={28}>
                            {byWeekday.map((d, i) => {
                              const max = Math.max(...byWeekday.map(x => x.revenue));
                              return <Cell key={i} fill={d.revenue === max && max > 0 ? '#10b981' : '#06b6d4'} />;
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB PRODUCTOS ── */}
            {tab === 'productos' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-app-card border border-app-border rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-app-text flex items-center gap-2">
                        <ArrowUpRight size={16} className="text-emerald-400" />
                        Top 10 Productos
                      </h3>
                      <div className="flex gap-1 bg-app-bg border border-app-border p-1 rounded-xl">
                        <button onClick={() => setProductSort('revenue')}
                          className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${productSort === 'revenue' ? 'bg-app-accent text-white' : 'text-app-text-muted hover:text-app-text'}`}>
                          Ingresos
                        </button>
                        <button onClick={() => setProductSort('profit')}
                          className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${productSort === 'profit' ? 'bg-app-accent text-white' : 'text-app-text-muted hover:text-app-text'}`}>
                          Ganancia
                        </button>
                        <button onClick={() => setProductSort('quantity')}
                          className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${productSort === 'quantity' ? 'bg-app-accent text-white' : 'text-app-text-muted hover:text-app-text'}`}>
                          Unidades
                        </button>
                      </div>
                    </div>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[...topProducts].sort((a, b) => b[productSort] - a[productSort]).slice(0, 10)}
                          layout="vertical" margin={{ left: 10, right: 30 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                          <XAxis type="number" stroke={axisColor} fontSize={9}
                            tickFormatter={v => productSort === 'quantity' ? String(v) : fmtAxis(Number(v))} />
                          <YAxis dataKey="name" type="category" stroke={axisColor} fontSize={10} width={130} />
                          <Tooltip cursor={{ fill: isLight ? '#00000008' : '#ffffff05' }}
                            contentStyle={tooltipStyle}
                            formatter={(v: any) => productSort === 'quantity' ? `${Number(v).toLocaleString('es-CO')} uds` : cop(Number(v))} />
                          <Bar dataKey={productSort} fill={productSort === 'revenue' ? '#8b5cf6' : productSort === 'profit' ? '#10b981' : '#06b6d4'} radius={[0, 4, 4, 0]} barSize={18} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-app-card border border-app-border rounded-2xl p-6">
                    <h3 className="font-bold text-app-text mb-4 flex items-center gap-2"><PieChart size={16} className="text-violet-400" /> Categorías</h3>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                          <Pie data={categories} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={4} dataKey="revenue" nameKey="category">
                            {categories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => cop(Number(v))} />
                        </RePieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2 mt-2">
                      {categories.slice(0, 6).map((c, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            <span className="text-xs text-app-text truncate max-w-[110px]">{c.category}</span>
                          </div>
                          <span className="text-xs font-bold text-app-text">{cop(c.revenue)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Tabla detalle top productos */}
                <div className="bg-app-card border border-app-border rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-app-border">
                    <h3 className="font-bold text-app-text flex items-center gap-2"><ShoppingBag size={16} className="text-cyan-400" /> Detalle de Productos</h3>
                  </div>
                  <div className="divide-y divide-app-border">
                    {/* Cabecera — solo desktop */}
                    <div className="hidden sm:grid grid-cols-12 gap-2 px-6 py-2 text-[10px] font-black uppercase text-app-text-muted tracking-widest">
                      <span className="col-span-1">#</span>
                      <span className="col-span-3">Producto</span>
                      <span className="col-span-1 text-center">Uds.</span>
                      <span className="col-span-2 text-right">Ingresos</span>
                      <span className="col-span-2 text-right">Costo</span>
                      <span className="col-span-2 text-right">Ganancia</span>
                      <span className="col-span-1 text-right">Margen</span>
                    </div>
                    {[...topProducts].sort((a, b) => b[productSort] - a[productSort]).map((p, i) => (
                      <div key={i} className="hover:bg-app-bg/30 transition-colors">
                        {/* Desktop row */}
                        <div className="hidden sm:grid grid-cols-12 gap-2 px-6 py-3 items-center">
                          <span className="col-span-1 text-xs font-black text-app-text-muted">{i + 1}</span>
                          <div className="col-span-3">
                            <p className="text-sm font-bold text-app-text truncate">{p.name}</p>
                            <p className="text-[10px] text-app-accent font-mono">{p.sku}</p>
                          </div>
                          <span className="col-span-1 text-center text-sm font-bold text-app-text">{p.quantity.toLocaleString()}</span>
                          <span className="col-span-2 text-right text-sm font-black text-app-text">{cop(p.revenue)}</span>
                          <span className="col-span-2 text-right text-xs text-app-text-muted">{cop(p.cost ?? 0)}</span>
                          <span className="col-span-2 text-right text-sm font-black text-emerald-400">{cop(p.profit ?? 0)}</span>
                          <span className={`col-span-1 text-right text-xs font-bold ${(p.margin ?? 0) >= 30 ? 'text-emerald-400' : (p.margin ?? 0) >= 15 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {(p.margin ?? 0).toFixed(1)}%
                          </span>
                        </div>
                        {/* Mobile card */}
                        <div className="sm:hidden px-4 py-3 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-app-text-muted w-5">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-app-text truncate">{p.name}</p>
                              <p className="text-[9px] text-app-accent font-mono truncate">{p.sku}</p>
                            </div>
                            <span className={`text-sm font-black ${(p.margin ?? 0) >= 30 ? 'text-emerald-400' : (p.margin ?? 0) >= 15 ? 'text-yellow-400' : 'text-red-400'}`}>
                              {(p.margin ?? 0).toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between pl-7 text-xs">
                            <span className="text-app-text-muted">{p.quantity.toLocaleString()} uds</span>
                            <span className="text-app-text font-bold">{cop(p.revenue)}</span>
                          </div>
                          <div className="flex justify-between pl-7 text-xs">
                            <span className="text-app-text-muted">Costo: {cop(p.cost ?? 0)}</span>
                            <span className="text-emerald-400 font-black">+{cop(p.profit ?? 0)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB CLIENTES ── */}
            {tab === 'clientes' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-app-card border border-app-border rounded-2xl p-6">
                    <h3 className="font-bold text-app-text mb-4 flex items-center gap-2"><Users size={16} className="text-violet-400" /> Top Clientes por Compras</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topCustomers.slice(0, 8)} layout="vertical" margin={{ left: 10, right: 30 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                          <XAxis type="number" stroke={axisColor} fontSize={9} tickFormatter={v => fmtAxis(Number(v))} />
                          <YAxis dataKey="name" type="category" stroke={axisColor} fontSize={10} width={100} />
                          <Tooltip cursor={{ fill: isLight ? '#00000008' : '#ffffff05' }} contentStyle={tooltipStyle} formatter={(v: any) => cop(Number(v))} />
                          <Bar dataKey="total" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={16} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-app-card border border-app-border rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-app-border">
                      <h3 className="font-bold text-app-text flex items-center gap-2"><Users size={16} className="text-emerald-400" /> Ranking de Clientes</h3>
                    </div>
                    <div className="divide-y divide-app-border max-h-72 overflow-y-auto custom-scrollbar">
                      {topCustomers.length === 0 ? (
                        <div className="py-10 text-center text-app-text-muted text-sm">Sin ventas con cliente en este período</div>
                      ) : topCustomers.map((c, i) => (
                        <div key={i} className="flex items-center gap-4 px-6 py-3 hover:bg-app-bg/30 transition-colors">
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${i === 0 ? 'bg-amber-500/20 text-amber-400' : i === 1 ? 'bg-slate-500/20 text-slate-400' : i === 2 ? 'bg-orange-500/20 text-orange-400' : 'bg-app-bg text-app-text-muted'}`}>{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-app-text truncate">{c.name}</p>
                            <p className="text-[10px] text-app-text-muted">{c.tickets} ticket{c.tickets !== 1 ? 's' : ''}</p>
                          </div>
                          <span className="text-sm font-black text-emerald-400">{cop(c.total)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB INVENTARIO ── */}
            {tab === 'inventario' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Valor del Inventario', value: cop(invKpis?.totalValue || 0), icon: <DollarSign size={22} />, color: 'emerald', sub: 'Precio de costo × stock' },
                    { label: 'Total Productos', value: String(invKpis?.totalProducts || 0), icon: <Package size={22} />, color: 'blue', sub: 'Productos activos' },
                    { label: 'Stock Bajo', value: String(invKpis?.lowStock || 0), icon: <AlertTriangle size={22} />, color: 'amber', sub: '3 unidades o menos' },
                    { label: 'Agotados', value: String(invKpis?.outOfStock || 0), icon: <XCircle size={22} />, color: 'rose', sub: 'Sin stock disponible' },
                  ].map((k, i) => (
                    <div key={i} className="bg-app-card border border-app-border rounded-2xl p-6 relative overflow-hidden group">
                      <div className={`absolute -top-4 -right-4 w-20 h-20 rounded-full bg-${k.color}-500/10 blur-xl group-hover:bg-${k.color}-500/20 transition-all`} />
                      <div className={`w-10 h-10 rounded-xl bg-${k.color}-500/20 text-${k.color}-400 flex items-center justify-center mb-4`}>{k.icon}</div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-app-text-muted mb-1">{k.label}</p>
                      <p className="text-2xl font-black text-app-text mb-1">{k.value}</p>
                      <p className="text-[11px] text-app-text-muted">{k.sub}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-app-card border border-app-border rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-emerald-500/20 rounded-xl"><DollarSign size={20} className="text-emerald-400" /></div>
                    <div>
                      <p className="font-black text-app-text text-lg">{cop(invKpis?.totalValue || 0)}</p>
                      <p className="text-xs text-app-text-muted">Capital total invertido en inventario (costo × unidades)</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="bg-app-bg rounded-xl p-4 border border-app-border text-center">
                      <p className="text-2xl font-black text-app-text">{invKpis?.totalProducts || 0}</p>
                      <p className="text-[10px] uppercase text-app-text-muted font-bold mt-1">Referencias</p>
                    </div>
                    <div className="bg-amber-500/5 rounded-xl p-4 border border-amber-500/20 text-center">
                      <p className="text-2xl font-black text-amber-400">{invKpis?.lowStock || 0}</p>
                      <p className="text-[10px] uppercase text-amber-400/60 font-bold mt-1">Stock Bajo</p>
                    </div>
                    <div className="bg-rose-500/5 rounded-xl p-4 border border-rose-500/20 text-center">
                      <p className="text-2xl font-black text-rose-400">{invKpis?.outOfStock || 0}</p>
                      <p className="text-[10px] uppercase text-rose-400/60 font-bold mt-1">Agotados</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
