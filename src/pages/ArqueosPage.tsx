import { useEffect, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import { api } from "../api/axios";
import {
    Archive, ChevronDown, ChevronUp, Wallet, CreditCard,
    Building2, TrendingDown, CheckCircle2, AlertTriangle,
    Loader2, User, Clock, Lock
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface CashMovement {
    id: string;
    type: string;
    amount: string;
    reason: string;
    created_at: string;
}

interface ArqueoSummary {
    openingAmount: number;
    cashSales: number;
    cardSales: number;
    transferSales: number;
    totalSales: number;
    totalExpenses: number;
    expectedCash: number;
    closingAmount: number;
    difference: number;
    ticketsCount: number;
}

interface Arqueo {
    id: string;
    name: string;
    status: string;
    opened_at: string;
    closed_at: string | null;
    notes: string | null;
    cashier: { name: string; user_name: string } | null;
    cash_movements: CashMovement[];
    summary: ArqueoSummary;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const cop = (n: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const fDate = (d: string) =>
    new Date(d).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });

const fTime = (d: string) =>
    new Date(d).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });

function sessionDuration(opened: string, closed: string | null) {
    const end = closed ? new Date(closed) : new Date();
    const ms = end.getTime() - new Date(opened).getTime();
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ArqueosPage() {
    const { hasPermission, user } = useAuth();
    const navigate = useNavigate();

    const canView = hasPermission("reports.view") || user?.role === 'ADMIN';
    if (!canView) {
        navigate("/");
        return null;
    }

    const [arqueos, setArqueos] = useState<Arqueo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        api.get("/cash-registers/history")
            .then(res => setArqueos(res.data))
            .catch(console.error)
            .finally(() => setIsLoading(false));
    }, []);

    const toggle = (id: string) => setExpandedId(prev => prev === id ? null : id);

    // ── Summary totals across all closed sessions ─────────────────────────────
    const closed = arqueos.filter(a => a.status === "CLOSED");
    const totalRevenue = closed.reduce((s, a) => s + a.summary.totalSales, 0);
    const totalDiff = closed.reduce((s, a) => s + a.summary.difference, 0);

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <DashboardLayout>
            <div className="space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
                            <Archive size={28} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-app-text drop-shadow-md">Historial de Arqueos</h1>
                            <p className="text-app-text-muted text-sm font-medium">Registro de todos los cierres de caja</p>
                        </div>
                    </div>
                </div>

                {/* Global summary strip */}
                {!isLoading && closed.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                            { label: "Arqueos registrados", value: String(closed.length), cls: "text-app-text" },
                            { label: "Ventas totales", value: cop(totalRevenue), cls: "text-emerald-400" },
                            { label: "Diferencia acumulada", value: (totalDiff >= 0 ? "+" : "") + cop(totalDiff), cls: totalDiff >= 0 ? "text-emerald-400" : "text-rose-400" },
                            { label: "Sesión abierta", value: arqueos.some(a => a.status === "OPEN") ? "Sí" : "No", cls: arqueos.some(a => a.status === "OPEN") ? "text-amber-400" : "text-app-text-muted" },
                        ].map(c => (
                            <div key={c.label} className="bg-app-card border border-app-border rounded-xl p-4 text-center">
                                <p className={`text-lg font-black ${c.cls}`}>{c.value}</p>
                                <p className="text-[9px] text-app-text-muted uppercase tracking-widest mt-0.5">{c.label}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* List */}
                {isLoading ? (
                    <div className="flex justify-center items-center py-20 gap-3 text-app-text-muted">
                        <Loader2 size={24} className="animate-spin" />
                        <span className="text-sm">Cargando arqueos...</span>
                    </div>
                ) : arqueos.length === 0 ? (
                    <div className="bg-app-card border border-app-border rounded-2xl p-16 text-center">
                        <Archive size={40} className="mx-auto text-app-text-muted mb-3 opacity-30" />
                        <p className="text-app-text-muted text-sm">No hay arqueos registrados aún</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {arqueos.map(a => {
                            const { summary: s } = a;
                            const isExpanded = expandedId === a.id;
                            const isOpen = a.status === "OPEN";
                            const isOver = s.difference >= 0;
                            const expenses = a.cash_movements.filter(m => m.type === "EXPENSE");

                            return (
                                <div
                                    key={a.id}
                                    className={`bg-app-card border rounded-2xl overflow-hidden transition-all ${
                                        isOpen ? "border-amber-500/40" : "border-app-border"
                                    }`}
                                >
                                    {/* ── Row header ── */}
                                    <button
                                        onClick={() => toggle(a.id)}
                                        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-app-accent/5 transition-colors text-left"
                                    >
                                        {/* Status icon */}
                                        <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
                                            isOpen ? "bg-amber-500/20 text-amber-400" : "bg-app-bg text-app-text-muted"
                                        }`}>
                                            {isOpen ? <Clock size={18} /> : <Lock size={18} />}
                                        </div>

                                        {/* Date + cashier */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-black text-sm text-app-text">
                                                    {fDate(a.opened_at)}
                                                </span>
                                                {isOpen && (
                                                    <span className="text-[9px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full uppercase tracking-widest">
                                                        En curso
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-app-text-muted mt-0.5 flex items-center gap-3 flex-wrap">
                                                <span className="flex items-center gap-1">
                                                    <Clock size={10} />
                                                    {fTime(a.opened_at)}{a.closed_at ? ` → ${fTime(a.closed_at)}` : ""} · {sessionDuration(a.opened_at, a.closed_at)}
                                                </span>
                                                {a.cashier && (
                                                    <span className="flex items-center gap-1">
                                                        <User size={10} /> {a.cashier.name}
                                                    </span>
                                                )}
                                                <span>{s.ticketsCount} ticket{s.ticketsCount !== 1 ? "s" : ""}</span>
                                            </p>
                                        </div>

                                        {/* Key numbers */}
                                        <div className="hidden sm:flex items-center gap-6 shrink-0">
                                            <div className="text-center">
                                                <p className="text-xs font-black text-emerald-400">{cop(s.totalSales)}</p>
                                                <p className="text-[9px] text-app-text-muted uppercase tracking-widest">Ventas</p>
                                            </div>
                                            {!isOpen && (
                                                <div className="text-center">
                                                    <p className={`text-xs font-black ${isOver ? "text-emerald-400" : "text-rose-400"}`}>
                                                        {isOver ? "+" : ""}{cop(s.difference)}
                                                    </p>
                                                    <p className="text-[9px] text-app-text-muted uppercase tracking-widest">
                                                        {isOver ? "Sobrante" : "Faltante"}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {isExpanded
                                            ? <ChevronUp size={16} className="text-app-text-muted shrink-0" />
                                            : <ChevronDown size={16} className="text-app-text-muted shrink-0" />
                                        }
                                    </button>

                                    {/* ── Expanded detail ── */}
                                    {isExpanded && (
                                        <div className="border-t border-app-border">

                                            {/* Summary grid */}
                                            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">

                                                {/* Sales breakdown */}
                                                <div className="bg-app-bg rounded-xl border border-app-border p-4">
                                                    <p className="text-[9px] font-black text-app-text-muted uppercase tracking-widest mb-3">Desglose de Ventas</p>
                                                    <div className="space-y-2">
                                                        {[
                                                            { label: "Efectivo", value: s.cashSales, icon: <Wallet size={13} />, cls: "text-emerald-400" },
                                                            { label: "Tarjeta", value: s.cardSales, icon: <CreditCard size={13} />, cls: "text-blue-400" },
                                                            { label: "Transferencia", value: s.transferSales, icon: <Building2 size={13} />, cls: "text-violet-400" },
                                                        ].map(row => (
                                                            <div key={row.label} className="flex items-center justify-between text-sm">
                                                                <span className={`flex items-center gap-1.5 ${row.cls}`}>{row.icon}{row.label}</span>
                                                                <span className="font-bold text-app-text">{cop(row.value)}</span>
                                                            </div>
                                                        ))}
                                                        <div className="flex items-center justify-between text-sm font-black border-t border-app-border pt-2 mt-1">
                                                            <span className="text-app-text-muted">Total Ventas</span>
                                                            <span className="text-emerald-400">{cop(s.totalSales)}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Cash reconciliation */}
                                                <div className="bg-app-bg rounded-xl border border-app-border p-4">
                                                    <p className="text-[9px] font-black text-app-text-muted uppercase tracking-widest mb-3">Arqueo de Efectivo</p>
                                                    <div className="space-y-2">
                                                        {[
                                                            { label: "Fondo inicial", value: s.openingAmount, cls: "text-app-text" },
                                                            { label: "+ Ventas efectivo", value: s.cashSales, cls: "text-emerald-400" },
                                                            { label: "- Gastos de caja", value: -s.totalExpenses, cls: "text-rose-400" },
                                                        ].map(row => (
                                                            <div key={row.label} className="flex items-center justify-between text-sm">
                                                                <span className="text-app-text-muted">{row.label}</span>
                                                                <span className={`font-bold ${row.cls}`}>{cop(row.value)}</span>
                                                            </div>
                                                        ))}
                                                        <div className="flex items-center justify-between text-sm border-t border-app-border pt-2 mt-1">
                                                            <span className="text-app-text-muted font-bold">Efectivo esperado</span>
                                                            <span className="font-black text-app-text">{cop(s.expectedCash)}</span>
                                                        </div>
                                                        {!isOpen && (
                                                            <>
                                                                <div className="flex items-center justify-between text-sm">
                                                                    <span className="text-app-text-muted">Efectivo contado</span>
                                                                    <span className="font-bold text-app-text">{cop(s.closingAmount)}</span>
                                                                </div>
                                                                <div className={`flex items-center justify-between p-2.5 rounded-lg border text-sm font-black ${
                                                                    isOver
                                                                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                                                        : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                                                                }`}>
                                                                    <span className="flex items-center gap-1.5">
                                                                        {isOver
                                                                            ? <CheckCircle2 size={14} />
                                                                            : <AlertTriangle size={14} />
                                                                        }
                                                                        {isOver ? "Sobrante" : "Faltante"}
                                                                    </span>
                                                                    <span>{isOver ? "+" : ""}{cop(s.difference)}</span>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Expenses list */}
                                            {expenses.length > 0 && (
                                                <div className="px-5 pb-5">
                                                    <p className="text-[9px] font-black text-app-text-muted uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                                        <TrendingDown size={11} className="text-rose-400" />
                                                        Gastos del turno ({expenses.length})
                                                    </p>
                                                    <div className="bg-app-bg rounded-xl border border-app-border divide-y divide-app-border/50 overflow-hidden">
                                                        {expenses.map(m => (
                                                            <div key={m.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                                                                <div>
                                                                    <p className="text-app-text font-medium">{m.reason}</p>
                                                                    <p className="text-[10px] text-app-text-muted">{fDate(m.created_at)} {fTime(m.created_at)}</p>
                                                                </div>
                                                                <span className="font-bold text-rose-400 shrink-0">-{cop(Number(m.amount))}</span>
                                                            </div>
                                                        ))}
                                                        <div className="flex items-center justify-between px-4 py-2.5 text-sm font-black bg-rose-500/5">
                                                            <span className="text-app-text-muted">Total gastos</span>
                                                            <span className="text-rose-400">-{cop(s.totalExpenses)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Notes */}
                                            {a.notes && (
                                                <div className="px-5 pb-5">
                                                    <p className="text-[9px] font-black text-app-text-muted uppercase tracking-widest mb-1">Observaciones</p>
                                                    <p className="text-sm text-app-text-muted italic bg-app-bg rounded-xl border border-app-border px-4 py-2.5">{a.notes}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
