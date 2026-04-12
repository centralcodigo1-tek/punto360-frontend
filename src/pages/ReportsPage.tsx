import { useEffect, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import { api } from "../api/axios";
import { useAuth } from "../auth/AuthContext";
import {
  TrendingUp, DollarSign, PieChart, BarChart3, 
  Calendar, ArrowUpRight, ArrowDownRight, 
  Loader2, Filter, Percent, Wallet, Info, Lock
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, Cell, PieChart as RePieChart, Pie, Legend
} from 'recharts';

// --- Interfaces ---
interface FinancialSummary {
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  profitMargin: number;
  transactionCount: number;
  averageTicket: number;
}

interface TrendData {
  date: string;
  revenue: number;
  transactions: number;
}

interface TopProduct {
  name: string;
  sku: string;
  quantity: number;
  revenue: number;
}

interface CategoryStat {
  category: string;
  revenue: number;
  quantity: number;
}

const COLORS = ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'];

export default function ReportsPage() {
  const { hasPermission } = useAuth();
  
  // Rango Actual
  const today = new Date().toISOString().split('T')[0];
  const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const [range, setRange] = useState({ start: last7Days, end: today });
  const [compareRange] = useState({ start: "", end: "" });
  const [isComparing] = useState(false);

  // Datos
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [prevSummary, setPrevSummary] = useState<FinancialSummary | null>(null);
  const [trend, setTrend] = useState<TrendData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [categories, setCategories] = useState<CategoryStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, [range]);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const { start, end } = range;
      const [finRes, trendRes, topRes, catRes] = await Promise.all([
        api.get(`/reports/financial?startDate=${start}&endDate=${end}`),
        api.get(`/reports/sales-trend?startDate=${start}&endDate=${end}`),
        api.get(`/reports/top-products?startDate=${start}&endDate=${end}&limit=8`),
        api.get(`/reports/category-stats?startDate=${start}&endDate=${end}`)
      ]);
      
      setSummary(finRes.data);
      setTrend(trendRes.data);
      setTopProducts(topRes.data);
      setCategories(catRes.data);

      if (isComparing && compareRange.start && compareRange.end) {
        const prevRes = await api.get(`/reports/financial?startDate=${compareRange.start}&endDate=${compareRange.end}`);
        setPrevSummary(prevRes.data);
      } else {
        setPrevSummary(null);
      }
    } catch (e) {
      console.error("Error fetching reports", e);
    } finally {
      setIsLoading(false);
    }
  };

  const cop = (v: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(v);

  const calculateDelta = (curr: number, prev: number) => {
    if (!prev || prev === 0) return null;
    return ((curr - prev) / prev) * 100;
  };

  const DeltaIndicator = ({ current, previous }: { current: number; previous: number | undefined }) => {
    if (!isComparing || previous === undefined) return null;
    const delta = calculateDelta(current, previous);
    if (delta === null) return null;
    const isPos = delta >= 0;
    return (
      <div className={`flex items-center gap-1 text-[10px] font-bold ${isPos ? 'text-emerald-400' : 'text-rose-400'} mt-1`}>
        {isPos ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
        {Math.abs(delta).toFixed(1)}% vs prev.
      </div>
    );
  };

  if (!hasPermission("reports.view")) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-white/20">
            <Lock size={64} className="mb-4 opacity-20" />
            <h2 className="text-xl font-bold">Acceso Denegado</h2>
            <p>No tienes permisos para ver reportes financieros.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <TrendingUp size={32} className="text-emerald-400" />
            Inteligencia de Negocio
          </h1>
          <p className="text-white/40 mt-1">Análisis profundo de rentabilidad, tendencias y desempeño.</p>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
            <div className="flex items-center gap-2">
                <Calendar size={16} className="text-white/30" />
                <input 
                  type="date" 
                  value={range.start} 
                  onChange={e => setRange({...range, start: e.target.value})}
                  className="bg-black/20 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
                />
                <span className="text-white/20">al</span>
                <input 
                  type="date" 
                  value={range.end} 
                  onChange={e => setRange({...range, end: e.target.value})}
                  className="bg-black/20 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
                />
            </div>
            <div className="w-px h-6 bg-white/10 mx-1 hidden md:block"></div>
            <button 
              onClick={fetchReports}
              className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-lg text-sm font-bold hover:bg-emerald-500/30 transition-all flex items-center gap-2"
            >
              <Filter size={16} /> Aplicar
            </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-[50vh] text-white/30 gap-4">
            <Loader2 size={48} className="animate-spin text-emerald-500" />
            <p className="animate-pulse font-medium">Calculando métricas corporativas...</p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-md relative overflow-hidden group">
               <div className="absolute -top-6 -right-6 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all"></div>
               <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg"><DollarSign size={20} /></div>
                  <DeltaIndicator current={summary?.totalRevenue || 0} previous={prevSummary?.totalRevenue} />
               </div>
               <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-1">Ingresos Totales</p>
               <h3 className="text-2xl font-black text-white">{cop(summary?.totalRevenue || 0)}</h3>
            </div>

            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-md relative overflow-hidden group">
               <div className="absolute -top-6 -right-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all"></div>
               <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg"><Wallet size={20} /></div>
                  <DeltaIndicator current={summary?.grossProfit || 0} previous={prevSummary?.grossProfit} />
               </div>
               <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-1">Utilidad Bruta</p>
               <h3 className="text-2xl font-black text-emerald-400">{cop(summary?.grossProfit || 0)}</h3>
            </div>

            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-md relative overflow-hidden group">
               <div className="absolute -top-6 -right-6 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all"></div>
               <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-amber-500/20 text-amber-500 rounded-lg"><Percent size={20} /></div>
                  <DeltaIndicator current={summary?.profitMargin || 0} previous={prevSummary?.profitMargin} />
               </div>
               <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-1">Margen de Ganancia</p>
               <h3 className="text-2xl font-black text-white">{summary?.profitMargin.toFixed(1)}%</h3>
            </div>

            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-md relative overflow-hidden group">
               <div className="absolute -top-6 -right-6 w-24 h-24 bg-violet-500/10 rounded-full blur-2xl group-hover:bg-violet-500/20 transition-all"></div>
               <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-violet-500/20 text-violet-400 rounded-lg"><TrendingUp size={20} /></div>
                  <DeltaIndicator current={summary?.averageTicket || 0} previous={prevSummary?.averageTicket} />
               </div>
               <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-1">Ticket Promedio</p>
               <h3 className="text-2xl font-black text-white">{cop(summary?.averageTicket || 0)}</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* GRÁFICA DE TENDENCIA */}
            <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
               <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                 <BarChart3 size={18} className="text-cyan-400" />
                 Evolución de Ventas Diarias
               </h3>
               <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trend}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                      <XAxis dataKey="date" stroke="#ffffff40" fontSize={10} tickFormatter={(str) => str.split('-').slice(1).reverse().join('/')} />
                      <YAxis stroke="#ffffff40" fontSize={10} tickFormatter={(val) => `$${val/1000}k`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff20', borderRadius: '12px' }}
                        itemStyle={{ color: '#fff', fontSize: '12px' }}
                        formatter={(val: any) => [cop(Number(val)), "Ventas"]}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="#06b6d4" fillOpacity={1} fill="url(#colorRev)" />
                    </AreaChart>
                  </ResponsiveContainer>
               </div>
            </div>

            {/* GRÁFICA DE CATEGORÍAS */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
               <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                 <PieChart size={18} className="text-violet-400" />
                 Distribución por Categoría
               </h3>
               <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={categories}
                        cx="50%" cy="50%"
                        innerRadius={60} outerRadius={80}
                        paddingAngle={5}
                        dataKey="revenue"
                        nameKey="category"
                      >
                        {categories.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff20', borderRadius: '12px' }}
                        itemStyle={{ color: '#fff', fontSize: '12px' }}
                        formatter={(val: any) => cop(Number(val))}
                      />
                      <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '10px' }} />
                    </RePieChart>
                  </ResponsiveContainer>
               </div>
            </div>

            {/* TOP PRODUCTOS */}
            <div className="lg:col-span-3 bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <ArrowUpRight size={18} className="text-emerald-400" />
                        Top Productos por Rendimiento
                    </h3>
                    <div className="p-2 bg-white/5 rounded-lg text-white/30"><Info size={16} /></div>
                </div>
                <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topProducts} layout="vertical" margin={{ left: 40, right: 30 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" horizontal={false} />
                            <XAxis type="number" stroke="#ffffff40" fontSize={10} tickFormatter={(val) => `$${val/1000}k`} />
                            <YAxis dataKey="name" type="category" stroke="#ffffff80" fontSize={10} width={120} />
                            <Tooltip 
                                cursor={{fill: '#ffffff05'}}
                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff20', borderRadius: '12px' }}
                                formatter={(val: any) => cop(Number(val))}
                            />
                            <Bar dataKey="revenue" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
