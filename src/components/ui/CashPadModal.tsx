import { useState } from "react";
import { X, Delete, CheckCircle2 } from "lucide-react";

interface Props {
    total: number;
    onConfirm: (received: number) => void;
    onClose: () => void;
}

const COP = (v: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(v);

const BILLS = [200_000, 100_000, 50_000, 20_000, 10_000, 5_000, 2_000, 1_000];
const COINS = [500, 200, 100, 50];

export default function CashPadModal({ total, onConfirm, onClose }: Props) {
    const [received, setReceived] = useState(0);
    const change = Math.max(0, received - total);
    const enough = received >= total;

    const add = (amount: number) => setReceived(prev => prev + amount);
    const clear = () => setReceived(0);
    const billCls = "flex flex-col items-center justify-center rounded-2xl border-2 active:scale-95 transition-all select-none cursor-pointer font-black";

    return (
        <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full sm:max-w-lg bg-app-bg border border-app-border rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3">
                    <div>
                        <p className="text-[10px] font-black text-app-text-muted uppercase tracking-widest">Total a cobrar</p>
                        <p className="text-3xl font-black text-app-text">{COP(total)}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-app-card text-app-text-muted">
                        <X size={20} />
                    </button>
                </div>

                {/* Recibido / Cambio */}
                <div className="grid grid-cols-2 gap-3 px-5 pb-4">
                    <div className={`rounded-2xl p-3 border-2 ${enough ? "border-emerald-500/40 bg-emerald-500/10" : "border-app-border bg-app-card"}`}>
                        <p className="text-[9px] font-black text-app-text-muted uppercase tracking-widest mb-0.5">Recibido</p>
                        <p className={`text-2xl font-black ${enough ? "text-emerald-400" : "text-app-text"}`}>{COP(received)}</p>
                    </div>
                    <div className={`rounded-2xl p-3 border-2 ${enough ? "border-emerald-500/40 bg-emerald-500/10" : "border-app-border bg-app-card"}`}>
                        <p className="text-[9px] font-black text-app-text-muted uppercase tracking-widest mb-0.5">Cambio</p>
                        <p className="text-2xl font-black text-emerald-400">{enough ? COP(change) : "—"}</p>
                    </div>
                </div>

                {/* Billetes */}
                <div className="px-5 pb-3">
                    <p className="text-[9px] font-black text-app-text-muted uppercase tracking-widest mb-2">Billetes</p>
                    <div className="grid grid-cols-4 gap-2">
                        {BILLS.map(b => (
                            <button key={b} onClick={() => add(b)}
                                className={`${billCls} py-3 border-violet-500/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 text-sm`}>
                                <span className="text-[10px] opacity-60">$</span>
                                <span>{b >= 1000 ? `${b / 1000}K` : b}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Monedas */}
                <div className="px-5 pb-4">
                    <p className="text-[9px] font-black text-app-text-muted uppercase tracking-widest mb-2">Monedas</p>
                    <div className="grid grid-cols-4 gap-2">
                        {COINS.map(c => (
                            <button key={c} onClick={() => add(c)}
                                className={`${billCls} py-3 border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 text-sm`}>
                                <span className="text-[10px] opacity-60">$</span>
                                <span>{c}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Acciones */}
                <div className="flex gap-3 px-5 pb-6">
                    <button onClick={clear}
                        className="flex items-center gap-2 px-4 py-3 rounded-2xl border border-app-border text-app-text-muted hover:text-app-text hover:bg-app-card transition-colors font-bold text-sm">
                        <Delete size={16} /> Limpiar
                    </button>
                    <button
                        onClick={() => { if (enough) onConfirm(received); }}
                        disabled={!enough}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-sm transition-all active:scale-95 ${enough ? "bg-app-accent text-white shadow-lg shadow-app-accent/30" : "bg-app-card text-app-text-muted border border-app-border cursor-not-allowed"}`}>
                        <CheckCircle2 size={18} />
                        {enough ? `Cobrar · Cambio ${COP(change)}` : "Monto insuficiente"}
                    </button>
                </div>
            </div>
        </div>
    );
}
