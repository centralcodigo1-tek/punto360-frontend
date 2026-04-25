import { toast } from "../lib/toast";
import { useEffect, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import { api } from "../api/axios";
import {
    Wallet, TrendingDown, Plus, Loader2,
    ArrowUpCircle, ArrowDownCircle, X, RefreshCw, Banknote, Building2, ArrowLeftRight
} from "lucide-react";

const cop = (v: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(v);

interface CarteraMovement {
    id: string;
    type: "INCOME" | "EXPENSE";
    amount: string;
    reason: string;
    reference_type?: string;
    created_at: string;
    users?: { name: string };
}

interface CarteraSummary {
    balance: number;
    totalIncomes: number;
    totalExpenses: number;
    movements: CarteraMovement[];
}

export default function CarteraPage() {
    const [summary, setSummary] = useState<CarteraSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showExpenseForm, setShowExpenseForm] = useState(false);
    const [amount, setAmount] = useState("");
    const [reason, setReason] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const [showConvertForm, setShowConvertForm] = useState(false);
    const [convertAmount, setConvertAmount] = useState("");
    const [isConverting, setIsConverting] = useState(false);
    const [filter, setFilter] = useState<"ALL" | "INCOME" | "EXPENSE">("ALL");

    const transferBalance = summary?.movements
        .filter(m => m.reason.includes('Transferencia'))
        .reduce((sum, m) => m.type === 'INCOME' ? sum + Number(m.amount) : sum - Number(m.amount), 0) ?? 0;

    const handleConvert = async () => {
        const parsed = parseFloat(convertAmount);
        if (isNaN(parsed) || parsed <= 0) return toast.error("Ingresa un monto válido.");
        setIsConverting(true);
        try {
            await api.post("/cartera/convert", { amount: parsed });
            setConvertAmount("");
            setShowConvertForm(false);
            fetchSummary();
        } catch (e: any) {
            alert(e.response?.data?.message || "Error al registrar la conversión.");
        } finally { setIsConverting(false); }
    };

    const fetchSummary = async () => {
        setIsLoading(true);
        try {
            const res = await api.get("/cartera");
            setSummary(res.data);
        } catch {
            setSummary(null);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchSummary(); }, []);

    const handleAddExpense = async () => {
        const parsed = parseFloat(amount);
        if (isNaN(parsed) || parsed <= 0) return toast.error("Ingresa un monto válido.");
        if (!reason.trim()) return toast.error("Ingresa el motivo del gasto.");
        setIsSaving(true);
        try {
            await api.post("/cartera/expenses", { amount: parsed, reason: reason.trim() });
            setAmount("");
            setReason("");
            setShowExpenseForm(false);
            fetchSummary();
        } catch (e: any) {
            alert(e.response?.data?.message || "Error al registrar el gasto.");
        } finally {
            setIsSaving(false);
        }
    };

    const filteredMovements = summary?.movements.filter(m =>
        filter === "ALL" ? true : m.type === filter
    ) ?? [];

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex justify-center items-center h-64 gap-3 text-app-text/40">
                    <Loader2 size={24} className="animate-spin text-app-accent" />
                    <span>Cargando cartera...</span>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-app-text">Cartera</h1>
                        <p className="text-app-text-muted text-sm mt-0.5">Fondo de cobros y pagos de cartera</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={fetchSummary}
                            className="p-2 rounded-xl bg-app-card border border-app-border text-app-text-muted hover:text-app-text transition-colors"
                            title="Actualizar"
                        >
                            <RefreshCw size={16} />
                        </button>
                        {transferBalance > 0 && (
                            <button
                                onClick={() => setShowConvertForm(true)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-violet-500/10 border border-violet-500/30 hover:bg-violet-500/20 text-violet-400 font-bold rounded-xl text-sm transition-all"
                            >
                                <ArrowLeftRight size={16} />
                                Pasar a Efectivo
                            </button>
                        )}
                        <button
                            onClick={() => setShowExpenseForm(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-app-accent hover:opacity-90 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-app-accent/20"
                        >
                            <Plus size={16} />
                            Registrar Gasto
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Saldo */}
                    <div className="col-span-2 lg:col-span-1 bg-app-card border border-app-border rounded-2xl p-6 flex flex-col items-center justify-center gap-2 shadow-xl">
                        <div className="flex items-center gap-2 text-app-text-muted">
                            <Wallet size={15} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Saldo Disponible</span>
                        </div>
                        <span className={`text-4xl font-black tracking-tight ${(summary?.balance ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {cop(summary?.balance ?? 0)}
                        </span>
                    </div>

                    {/* Ventas Efectivo */}
                    <div className="bg-app-card border border-app-border rounded-2xl p-5 flex flex-col gap-2 shadow">
                        <div className="flex items-center gap-2 text-emerald-400">
                            <Banknote size={16} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Efectivo</span>
                        </div>
                        <span className="text-2xl font-black text-app-text">
                            {cop(summary?.movements
                                .filter(m => m.reason.includes('Efectivo'))
                                .reduce((s, m) => m.type === 'INCOME' ? s + Number(m.amount) : s - Number(m.amount), 0) ?? 0)}
                        </span>
                        <span className="text-[10px] text-app-text-muted font-bold">
                            {summary?.movements.filter(m => m.type === 'INCOME' && m.reason.includes('Efectivo')).length ?? 0} entradas
                        </span>
                    </div>

                    {/* Ventas Transferencia */}
                    <div className="bg-app-card border border-app-border rounded-2xl p-5 flex flex-col gap-2 shadow">
                        <div className="flex items-center gap-2 text-violet-400">
                            <Building2 size={16} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Transferencias</span>
                        </div>
                        <span className="text-2xl font-black text-app-text">
                            {cop(summary?.movements
                                .filter(m => m.reason.includes('Transferencia'))
                                .reduce((s, m) => m.type === 'INCOME' ? s + Number(m.amount) : s - Number(m.amount), 0) ?? 0)}
                        </span>
                        <span className="text-[10px] text-app-text-muted font-bold">
                            {summary?.movements.filter(m => m.type === 'INCOME' && m.reason.includes('Transferencia')).length ?? 0} entradas
                        </span>
                    </div>

                    {/* Total gastado */}
                    <div className="bg-app-card border border-app-border rounded-2xl p-5 flex flex-col gap-2 shadow">
                        <div className="flex items-center gap-2 text-rose-400">
                            <TrendingDown size={16} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Total Gastado</span>
                        </div>
                        <span className="text-2xl font-black text-app-text">{cop(summary?.totalExpenses ?? 0)}</span>
                        <span className="text-[10px] text-app-text-muted font-bold">
                            {summary?.movements.filter(m => m.type === 'EXPENSE').length ?? 0} gastos registrados
                        </span>
                    </div>
                </div>

                {/* Movimientos */}
                <div className="bg-app-card border border-app-border rounded-2xl shadow-xl overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-app-border">
                        <h3 className="font-bold text-app-text">Movimientos</h3>
                        <div className="flex gap-1 bg-app-bg p-1 rounded-xl border border-app-border">
                            {(["ALL", "INCOME", "EXPENSE"] as const).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${filter === f ? 'bg-app-accent text-white' : 'text-app-text-muted hover:text-app-text'}`}
                                >
                                    {f === "ALL" ? "Todos" : f === "INCOME" ? "Cobros" : "Gastos"}
                                </button>
                            ))}
                        </div>
                    </div>

                    {filteredMovements.length === 0 ? (
                        <div className="py-16 text-center text-app-text-muted">
                            <Wallet size={40} className="mx-auto mb-3 opacity-20" />
                            <p className="text-sm font-bold">Sin movimientos registrados</p>
                            <p className="text-xs mt-1 opacity-60">Los abonos de clientes aparecerán aquí automáticamente</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-app-border">
                            {filteredMovements.map(m => (
                                <div key={m.id} className="flex items-center justify-between px-6 py-4 hover:bg-app-bg/30 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${m.type === 'INCOME' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                            {m.type === 'INCOME'
                                                ? <ArrowUpCircle size={18} />
                                                : <ArrowDownCircle size={18} />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-app-text">{m.reason}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] text-app-text-muted">
                                                    {new Date(m.created_at).toLocaleString("es-CO", {
                                                        day: "2-digit", month: "short", year: "numeric",
                                                        hour: "2-digit", minute: "2-digit"
                                                    })}
                                                </span>
                                                {m.users?.name && (
                                                    <span className="text-[10px] text-app-text-muted opacity-60">· {m.users.name}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <span className={`font-black text-base ${m.type === 'INCOME' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {m.type === 'INCOME' ? '+' : '-'}{cop(Number(m.amount))}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal conversión transferencia → efectivo */}
            {showConvertForm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowConvertForm(false)} />
                    <div className="relative w-full max-w-md bg-app-bg border border-app-border rounded-3xl shadow-2xl p-6 animate-in zoom-in duration-200">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-lg font-black text-app-text">Pasar Transferencias a Efectivo</h2>
                            <button onClick={() => setShowConvertForm(false)} className="text-app-text-muted hover:text-app-text transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <p className="text-xs text-app-text-muted mb-6">
                            Disponible en transferencias: <span className="text-violet-400 font-bold">${transferBalance.toLocaleString()}</span>
                        </p>

                        <div className="mb-4 bg-violet-500/5 border border-violet-500/20 rounded-2xl p-4 flex items-center gap-4">
                            <div className="flex flex-col items-center gap-1 flex-1">
                                <Building2 size={20} className="text-violet-400" />
                                <span className="text-[10px] font-black text-violet-400 uppercase tracking-widest">Transferencias</span>
                            </div>
                            <ArrowLeftRight size={20} className="text-app-text-muted shrink-0" />
                            <div className="flex flex-col items-center gap-1 flex-1">
                                <Banknote size={20} className="text-emerald-400" />
                                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Efectivo</span>
                            </div>
                        </div>

                        <div className="mb-6">
                            <label className="block text-xs font-bold text-app-text-muted uppercase tracking-widest mb-1.5">Monto a convertir</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-app-accent font-bold">$</span>
                                <input
                                    type="number"
                                    min="0"
                                    autoFocus
                                    value={convertAmount}
                                    onChange={e => setConvertAmount(e.target.value)}
                                    placeholder="0"
                                    className="w-full bg-app-card border border-app-border rounded-xl pl-8 pr-4 py-3 text-app-text text-xl font-black focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                                    onKeyDown={e => e.key === 'Enter' && handleConvert()}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setShowConvertForm(false)} className="flex-1 py-3 rounded-xl border border-app-border text-app-text-muted font-bold text-sm hover:text-app-text transition-colors">
                                Cancelar
                            </button>
                            <button onClick={handleConvert} disabled={isConverting} className="flex-1 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-black text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-900/20">
                                {isConverting ? <Loader2 size={16} className="animate-spin" /> : <ArrowLeftRight size={16} />}
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal gasto desde cartera */}
            {showExpenseForm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowExpenseForm(false)} />
                    <div className="relative w-full max-w-md bg-app-bg border border-app-border rounded-3xl shadow-2xl p-6 animate-in zoom-in duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-lg font-black text-app-text">Gasto desde Cartera</h2>
                                <p className="text-xs text-app-text-muted mt-0.5">
                                    Saldo disponible: <span className="text-emerald-400 font-bold">{cop(summary?.balance ?? 0)}</span>
                                </p>
                            </div>
                            <button onClick={() => setShowExpenseForm(false)} className="text-app-text-muted hover:text-app-text transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-app-text-muted uppercase tracking-widest mb-1.5">Monto</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-app-accent font-bold">$</span>
                                    <input
                                        type="number"
                                        min="0"
                                        autoFocus
                                        value={amount}
                                        onChange={e => setAmount(e.target.value)}
                                        placeholder="0"
                                        className="w-full bg-app-card border border-app-border rounded-xl pl-8 pr-4 py-3 text-app-text text-xl font-black focus:outline-none focus:ring-2 focus:ring-app-accent/30"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-app-text-muted uppercase tracking-widest mb-1.5">Motivo</label>
                                <input
                                    type="text"
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    placeholder="Ej: Pago proveedor, Gasto operativo..."
                                    className="w-full bg-app-card border border-app-border rounded-xl px-4 py-3 text-app-text placeholder-app-text-muted/50 text-sm focus:outline-none focus:ring-2 focus:ring-app-accent/30"
                                    onKeyDown={e => e.key === 'Enter' && handleAddExpense()}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowExpenseForm(false)}
                                className="flex-1 py-3 rounded-xl border border-app-border text-app-text-muted font-bold text-sm hover:text-app-text transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleAddExpense}
                                disabled={isSaving}
                                className="flex-1 py-3 rounded-xl bg-app-accent hover:opacity-90 text-white font-black text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-app-accent/20"
                            >
                                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                Registrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
