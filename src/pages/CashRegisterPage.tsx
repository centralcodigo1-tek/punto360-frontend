import { toast } from "../lib/toast";
import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import { api } from "../api/axios";
import { useAuth } from "../auth/AuthContext";
import {
    Lock, Unlock, DollarSign, Wallet, CreditCard, Building2,
    TrendingDown, Plus, CheckCircle2, AlertTriangle, Loader2,
    Clock, ClipboardList, ChevronDown, ChevronUp
} from "lucide-react";

interface CashMovement {
    id: string;
    type: string;
    amount: string;
    reason: string;
    created_at: string;
}

interface Session {
    id: string;
    name: string;
    status: string;
    opening_amount: string;
    opened_at: string;
    users: { name: string; user_name: string } | null;
    cash_movements: CashMovement[];
}

interface CloseSummary {
    session: Session;
    summary: {
        openingAmount: number;
        cashSales: number;
        cardSales: number;
        transferSales: number;
        consignmentItems: { name: string; total: number }[];
        totalSales: number;
        totalExpenses: number;
        totalIncomes: number;
        expectedCash: number;
        closingAmount: number;
        difference: number;
        ticketsCount: number;
    };
}

function formatCOP(val: number) {
    return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(val);
}

interface LiveStats {
    cashSales: number;
    cardSales: number;
    transferSales: number;
    totalSales: number;
    ticketsCount: number;
}

export default function CashRegisterPage() {
    const { hasPermission } = useAuth();
    const canViewFinancials = hasPermission("reports.view");

    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [closeSummary, setCloseSummary] = useState<CloseSummary | null>(null);
    const [liveStats, setLiveStats] = useState<LiveStats | null>(null);

    // Formulario de apertura
    const [openingAmount, setOpeningAmount] = useState("");

    // Formulario de cierre
    const [closingAmount, setClosingAmount] = useState("");
    const [closingNotes, setClosingNotes] = useState("");
    const [showCloseForm, setShowCloseForm] = useState(false);

    // Formulario de gasto
    const [showExpenseForm, setShowExpenseForm] = useState(false);
    const [expenseAmount, setExpenseAmount] = useState("");
    const [expenseReason, setExpenseReason] = useState("");
    const [expenseSource, setExpenseSource] = useState<"CASH" | "CARTERA">("CASH");

    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchSession = useCallback(async () => {
        setIsLoading(true);
        try {
            const [sessionRes, statsRes] = await Promise.all([
                api.get("/cash-registers/current"),
                api.get("/cash-registers/current/stats"),
            ]);
            setSession(sessionRes.data);
            setLiveStats(statsRes.data);
        } catch {
            setSession(null);
            setLiveStats(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchSession(); }, [fetchSession]);

    const handleOpen = async () => {
        const amount = parseFloat(openingAmount);
        if (isNaN(amount) || amount < 0) return toast.error("Ingresa un monto inicial válido.");
        setIsSubmitting(true);
        try {
            await api.post("/cash-registers/open", { opening_amount: amount, name: "Caja Principal" });
            setOpeningAmount("");
            fetchSession();
        } catch (e: any) {
            alert(e.response?.data?.message || "Error al abrir la caja.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = async () => {
        if (!session) return;
        const amount = parseFloat(closingAmount);
        if (isNaN(amount) || amount < 0) return toast.error("Ingresa el monto de cierre.");
        if (!window.confirm("¿Confirmas el cierre de caja? Esta acción cerrará el turno actual.")) return;

        setIsSubmitting(true);
        try {
            const res = await api.post(`/cash-registers/${session.id}/close`, {
                closing_amount: amount,
                notes: closingNotes,
            });
            setCloseSummary(res.data);
            setSession(null);
            setShowCloseForm(false);
        } catch (e: any) {
            alert(e.response?.data?.message || "Error al cerrar la caja.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddExpense = async () => {
        if (!session) return;
        const amount = parseFloat(expenseAmount);
        if (isNaN(amount) || amount <= 0) return toast.error("Monto inválido.");
        if (!expenseReason.trim()) return toast.error("Ingresa el motivo del gasto.");

        setIsSubmitting(true);
        try {
            await api.post(`/cash-registers/${session.id}/expenses`, {
                amount,
                reason: expenseReason,
                source: expenseSource,
            });
            setExpenseAmount("");
            setExpenseReason("");
            setExpenseSource("CASH");
            setShowExpenseForm(false);
            fetchSession();
        } catch (e: any) {
            alert(e.response?.data?.message || "Error al registrar el gasto.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const movements = session?.cash_movements ?? [];
    const totalExpenses = movements
        .filter(m => m.type === "EXPENSE")
        .reduce((sum, m) => sum + Number(m.amount), 0);
    const totalIncomes = movements
        .filter(m => m.type === "INCOME")
        .reduce((sum, m) => sum + Number(m.amount), 0);

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex justify-center items-center h-64 gap-3 text-app-text-muted">
                    <Loader2 size={24} className="animate-spin" />
                    <span>Verificando sesión de caja...</span>
                </div>
            </DashboardLayout>
        );
    }

    // ── REPORTE POST-CIERRE ──────────────────────────────────────────────────
    if (closeSummary) {
        const { summary } = closeSummary;
        const isOver = summary.difference >= 0;
        return (
            <DashboardLayout>
                <div className="max-w-2xl mx-auto">
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
                            <CheckCircle2 size={40} className="text-emerald-400" />
                        </div>
                        <h1 className="text-3xl font-bold text-app-text">Caja Cerrada</h1>
                        <p className="text-app-text-muted mt-1">Reporte de cierre de turno</p>
                    </div>

                    <div className="bg-app-card border border-app-border rounded-2xl p-6 backdrop-blur-md shadow-xl mb-4">
                        <h2 className="font-bold text-app-text text-lg mb-4 pb-3 border-b border-app-border">Resumen del Turno</h2>
                        <div className="flex flex-col gap-3">
                            {[
                                { label: "Fondo inicial", value: summary.openingAmount, icon: <Wallet size={16}/>, color: "text-app-text-muted", show: true },
                                { label: "Ventas Efectivo", value: summary.cashSales, icon: <Wallet size={16}/>, color: "text-emerald-400", show: true },
                                { label: "Ventas Tarjeta", value: summary.cardSales, icon: <CreditCard size={16}/>, color: "text-blue-400", show: canViewFinancials },
                                { label: "Ventas Transferencia", value: summary.transferSales, icon: <Building2 size={16}/>, color: "text-violet-400", show: canViewFinancials },
                                ...(summary.consignmentItems ?? []).map(ci => ({ label: `Consig. ${ci.name}`, value: ci.total, icon: <DollarSign size={16}/>, color: "text-amber-400", show: true })),
                                { label: "Otros Ingresos (Abonos)", value: summary.totalIncomes ?? 0, icon: <DollarSign size={16}/>, color: "text-teal-400", show: (summary.totalIncomes ?? 0) > 0 },
                                { label: "Gastos de Caja", value: -summary.totalExpenses, icon: <TrendingDown size={16}/>, color: "text-rose-400", show: true },
                            ].filter(r => r.show).map(row => (
                                <div key={row.label} className="flex items-center justify-between text-sm">
                                    <span className="flex items-center gap-2 text-app-text-muted">{row.icon}{row.label}</span>
                                    <span className={`font-bold ${row.color}`}>{formatCOP(row.value)}</span>
                                </div>
                            ))}
                            <div className="flex items-center justify-between text-sm font-bold border-t border-app-border pt-3 mt-1">
                                <span className="text-app-text">Efectivo Esperado en Caja</span>
                                <span className="text-app-text font-bold">{formatCOP(summary.expectedCash)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm font-bold">
                                <span className="text-app-text">Efectivo Contado</span>
                                <span className="text-app-text font-bold">{formatCOP(summary.closingAmount)}</span>
                            </div>
                        </div>
                    </div>

                    <div className={`rounded-2xl p-6 border ${isOver ? "bg-emerald-500/10 border-emerald-500/30" : "bg-rose-500/10 border-rose-500/30"}`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {isOver ? <CheckCircle2 size={24} className="text-emerald-400" /> : <AlertTriangle size={24} className="text-rose-400" />}
                                <div>
                                    <p className="font-bold text-app-text">{isOver ? "Sobrante de Caja" : "Faltante de Caja"}</p>
                                    <p className="text-xs text-app-text-muted">{isOver ? "Hay más efectivo del esperado" : "Hay menos efectivo del esperado"}</p>
                                </div>
                            </div>
                            <span className={`text-2xl font-bold ${isOver ? "text-emerald-400" : "text-rose-400"}`}>
                                {isOver ? "+" : ""}{formatCOP(summary.difference)}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={() => setCloseSummary(null)}
                        className="w-full mt-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold hover:opacity-90 transition-opacity"
                    >
                        Abrir Nueva Caja
                    </button>
                </div>
            </DashboardLayout>
        );
    }

    // ── CAJA CERRADA → FORMULARIO APERTURA ──────────────────────────────────
    if (!session) {
        return (
            <DashboardLayout>
                <div className="max-w-md mx-auto mt-8">
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 mx-auto rounded-full bg-app-card border border-app-border flex items-center justify-center mb-4">
                            <Lock size={36} className="text-app-text-muted" />
                        </div>
                        <h1 className="text-3xl font-bold text-app-text">Caja Cerrada</h1>
                        <p className="text-app-text-muted mt-1">Ingresa el fondo inicial para comenzar el turno</p>
                    </div>

                    <div className="bg-app-card border border-app-border rounded-2xl p-6 backdrop-blur-md shadow-xl">
                        <label className="block text-sm font-medium text-app-text-muted mb-2">
                            Fondo Inicial (Efectivo en Caja)
                        </label>
                        <div className="relative mb-6">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-app-text-muted font-bold">$</span>
                            <input
                                type="number"
                                min="0"
                                step="100"
                                value={openingAmount}
                                onChange={e => setOpeningAmount(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && handleOpen()}
                                placeholder="0"
                                className="w-full bg-app-bg border border-app-border rounded-xl pl-8 pr-4 py-4 text-2xl font-bold text-app-text placeholder-app-text-muted/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                            />
                        </div>
                        <button
                            onClick={handleOpen}
                            disabled={isSubmitting}
                            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Unlock size={18} />}
                            Abrir Caja
                        </button>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    // ── CAJA ABIERTA ─────────────────────────────────────────────────────────
    const openedAt = new Date(session.opened_at);
    const now = new Date();
    const diffMs = now.getTime() - openedAt.getTime();
    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);

    return (
        <DashboardLayout>
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse" />
                        <h1 className="text-3xl font-bold text-app-text">{session.name}</h1>
                    </div>
                    <p className="text-app-text-muted text-sm flex items-center gap-2">
                        <Clock size={13} />
                        Abierta desde {openedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        <span className="text-app-text-muted">·</span>
                        {hours > 0 ? `${hours}h ` : ""}{minutes}min en turno
                        {session.users && <><span className="text-app-text-muted">·</span> por {session.users.name}</>}
                    </p>
                </div>
                <button
                    onClick={() => setShowCloseForm(!showCloseForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm font-bold hover:bg-rose-500/20 transition-colors"
                >
                    <Lock size={15} />
                    Cerrar Caja
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                    { label: "Fondo Inicial", value: formatCOP(Number(session.opening_amount)), icon: <Wallet size={18}/>, color: "from-slate-600 to-slate-500", show: true },
                    { label: "Ventas Efectivo", value: liveStats ? formatCOP(liveStats.cashSales) : "—", icon: <DollarSign size={18}/>, color: "from-emerald-600 to-teal-500", show: true },
                    { label: "Gastos de Caja", value: formatCOP(totalExpenses), icon: <TrendingDown size={18}/>, color: "from-rose-600 to-pink-500", show: true },
                    { label: "Total Ventas Turno", value: liveStats ? formatCOP(liveStats.totalSales) : "—", sub: liveStats ? `${liveStats.ticketsCount} tickets` : "", icon: <ClipboardList size={18}/>, color: "from-violet-600 to-purple-500", show: canViewFinancials },
                ].filter(c => c.show).map(c => (
                    <div key={c.label} className="bg-app-card border border-app-border rounded-2xl p-4 backdrop-blur-md">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs text-app-text-muted font-medium">{c.label}</span>
                            <div className={`p-1.5 rounded-lg bg-gradient-to-br ${c.color} text-white`}>{c.icon}</div>
                        </div>
                        <p className="text-xl font-bold text-app-text">{c.value}</p>
                        {c.sub && <p className="text-[10px] text-app-text-muted mt-0.5">{c.sub}</p>}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Ingresos adicionales (abonos de clientes, etc.) */}
                {movements.filter(m => m.type === "INCOME").length > 0 && (
                    <div className="lg:col-span-2 bg-app-card border border-app-border rounded-2xl backdrop-blur-md shadow-xl overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-app-border">
                            <h3 className="font-semibold text-app-text flex items-center gap-2">
                                <DollarSign size={16} className="text-emerald-400"/>
                                Otros Ingresos del Turno
                            </h3>
                            <span className="text-emerald-400 font-bold text-sm">+{formatCOP(totalIncomes)}</span>
                        </div>
                        <div className="divide-y divide-white/5 max-h-64 overflow-y-auto">
                            {movements.filter(m => m.type === "INCOME").map(m => (
                                <div key={m.id} className="flex items-center justify-between px-6 py-3">
                                    <div>
                                        <p className="text-sm font-medium text-app-text">{m.reason}</p>
                                        <p className="text-xs text-app-text-muted">{new Date(m.created_at).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}</p>
                                    </div>
                                    <span className="text-emerald-400 font-bold text-sm">+{formatCOP(Number(m.amount))}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Gastos */}
                <div className="bg-app-card border border-app-border rounded-2xl backdrop-blur-md shadow-xl overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-app-border">
                        <h3 className="font-semibold text-app-text flex items-center gap-2">
                            <TrendingDown size={16} className="text-rose-400"/>
                            Gastos del Turno
                        </h3>
                        <button
                            onClick={() => setShowExpenseForm(!showExpenseForm)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-xs font-bold hover:bg-rose-500/20 transition-colors"
                        >
                            <Plus size={13}/> Registrar Gasto
                        </button>
                    </div>

                    {showExpenseForm && (
                        <div className="px-6 py-4 bg-rose-500/5 border-b border-app-border">
                            <div className="flex flex-col gap-3">
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="Monto ($)"
                                    value={expenseAmount}
                                    onChange={e => setExpenseAmount(e.target.value)}
                                    className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-2.5 text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                                />
                                <input
                                    type="text"
                                    placeholder="Motivo del gasto (ej: Compra de bolsas)"
                                    value={expenseReason}
                                    onChange={e => setExpenseReason(e.target.value)}
                                    className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-2.5 text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                                />
                                {/* Fuente del gasto */}
                                <div className="flex gap-2 bg-app-bg p-1 rounded-xl border border-app-border">
                                    <button
                                        onClick={() => setExpenseSource("CASH")}
                                        className={`flex-1 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${expenseSource === "CASH" ? "bg-rose-500 text-white" : "text-app-text-muted hover:text-app-text"}`}
                                    >
                                        Sale de Caja
                                    </button>
                                    <button
                                        onClick={() => setExpenseSource("CARTERA")}
                                        className={`flex-1 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${expenseSource === "CARTERA" ? "bg-app-accent text-white" : "text-app-text-muted hover:text-app-text"}`}
                                    >
                                        Sale de Cartera
                                    </button>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setShowExpenseForm(false)} className="flex-1 py-2 rounded-lg border border-app-border text-app-text-muted text-sm hover:text-app-text transition-colors">
                                        Cancelar
                                    </button>
                                    <button onClick={handleAddExpense} disabled={isSubmitting} className="flex-1 py-2 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-bold text-sm transition-colors flex items-center justify-center gap-1">
                                        {isSubmitting ? <Loader2 size={14} className="animate-spin"/> : <Plus size={14}/>}
                                        Guardar
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="divide-y divide-white/5 max-h-64 overflow-y-auto">
                        {movements.filter(m => m.type === "EXPENSE").length === 0 ? (
                            <div className="px-6 py-8 text-center text-app-text-muted text-sm">Sin gastos registrados en este turno.</div>
                        ) : movements.filter(m => m.type === "EXPENSE").map(m => (
                            <div key={m.id} className="flex items-center justify-between px-6 py-3">
                                <div>
                                    <p className="text-sm font-medium text-app-text">{m.reason}</p>
                                    <p className="text-xs text-app-text-muted">{new Date(m.created_at).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}</p>
                                </div>
                                <span className="text-rose-400 font-bold text-sm">-{formatCOP(Number(m.amount))}</span>
                            </div>
                        ))}
                    </div>

                    {totalExpenses > 0 && (
                        <div className="px-6 py-3 border-t border-app-border flex justify-between text-sm font-bold">
                            <span className="text-app-text-muted">Total Gastos</span>
                            <span className="text-rose-400">{formatCOP(totalExpenses)}</span>
                        </div>
                    )}
                </div>

                {/* Cierre de Caja */}
                <div className="bg-app-card border border-app-border rounded-2xl backdrop-blur-md shadow-xl overflow-hidden">
                    <button
                        onClick={() => setShowCloseForm(!showCloseForm)}
                        className="w-full flex items-center justify-between px-6 py-4 border-b border-app-border hover:bg-app-card transition-colors"
                    >
                        <h3 className="font-semibold text-app-text flex items-center gap-2">
                            <Lock size={16} className="text-amber-400"/>
                            Cierre de Turno
                        </h3>
                        {showCloseForm ? <ChevronUp size={16} className="text-app-text-muted"/> : <ChevronDown size={16} className="text-app-text-muted"/>}
                    </button>

                    {showCloseForm ? (
                        <div className="p-6 flex flex-col gap-4">
                            <div>
                                <label className="block text-xs font-medium text-app-text-muted mb-1.5">Efectivo contado físicamente ($)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="100"
                                    value={closingAmount}
                                    onChange={e => setClosingAmount(e.target.value)}
                                    placeholder="0"
                                    className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-3 text-xl font-bold text-app-text placeholder-app-text-muted/40 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                                />
                            </div>
                            {closingAmount && (
                                <div className="bg-app-bg rounded-xl p-4 text-sm">
                                    <div className="flex justify-between mb-1">
                                        <span className="text-app-text-muted">Fondo inicial</span>
                                        <span className="text-app-text-muted">{formatCOP(Number(session.opening_amount))}</span>
                                    </div>
                                    <div className="flex justify-between mb-2">
                                        <span className="text-app-text-muted">Gastos descontados</span>
                                        <span className="text-rose-400">-{formatCOP(totalExpenses)}</span>
                                    </div>
                                    <div className="flex justify-between font-bold border-t border-app-border pt-2">
                                        <span className="text-app-text-muted">Efectivo contado</span>
                                        <span className="text-white">{formatCOP(parseFloat(closingAmount) || 0)}</span>
                                    </div>
                                </div>
                            )}
                            <textarea
                                rows={2}
                                placeholder="Observaciones (opcional)..."
                                value={closingNotes}
                                onChange={e => setClosingNotes(e.target.value)}
                                className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-3 text-sm text-app-text placeholder-app-text-muted/40 focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-none"
                            />
                            <button
                                onClick={handleClose}
                                disabled={isSubmitting || !closingAmount}
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-40"
                            >
                                {isSubmitting ? <Loader2 size={18} className="animate-spin"/> : <Lock size={18}/>}
                                Confirmar Cierre de Turno
                            </button>
                        </div>
                    ) : (
                        <div className="px-6 py-10 text-center text-app-text-muted text-sm">
                            <Lock size={32} className="mx-auto mb-3 opacity-20"/>
                            <p>Despliega este panel cuando termines el turno para generar el arqueo.</p>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
