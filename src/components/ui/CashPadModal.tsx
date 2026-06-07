import { useState } from "react";
import { X, Delete, CheckCircle2 } from "lucide-react";

interface Props {
    total: number;
    onConfirm: (received: number) => void;
    onClose: () => void;
    showBillImages?: boolean;
}

const COP = (v: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(v);

const BILLS = [100_000, 50_000, 20_000, 10_000, 5_000, 2_000];
const COINS = [1_000, 500, 200, 100, 50];

const BILL_IMAGES: Record<number, string> = {
    100_000: "/bills/bill_100000.jpg",
    50_000:  "/bills/bill_50000.jpg",
    20_000:  "/bills/bill_20000.jpg",
    10_000:  "/bills/bill_10000.jpg",
    5_000:   "/bills/bill_5000.jpg",
    2_000:   "/bills/bill_2000.jpg",
};

export default function CashPadModal({ total, onConfirm, onClose, showBillImages = false }: Props) {
    const [received, setReceived] = useState(0);
    const change = Math.max(0, received - total);
    const enough = received >= total;

    const add = (amount: number) => setReceived(prev => prev + amount);
    const clear = () => setReceived(0);

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
                    {showBillImages ? (
                        <div className="grid grid-cols-3 gap-2">
                            {BILLS.map(b => {
                                const img = BILL_IMAGES[b];
                                return img ? (
                                    <button
                                        key={b}
                                        onClick={() => add(b)}
                                        className="relative overflow-hidden rounded-xl border-2 border-violet-500/20 active:scale-95 transition-all select-none cursor-pointer group shadow-md"
                                        style={{ aspectRatio: "2/1" }}
                                    >
                                        <img
                                            src={img}
                                            alt={`$${b.toLocaleString('es-CO')}`}
                                            className="w-full h-full object-cover"
                                            draggable={false}
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-active:bg-black/20 transition-colors" />
                                        <span className="absolute bottom-1 right-1.5 text-white text-[10px] font-black drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                                            {b >= 1000 ? `$${b / 1000}K` : `$${b}`}
                                        </span>
                                    </button>
                                ) : (
                                    <button
                                        key={b}
                                        onClick={() => add(b)}
                                        className="flex flex-col items-center justify-center rounded-xl border-2 border-violet-500/30 bg-violet-500/10 text-violet-300 active:scale-95 transition-all py-3 font-black text-sm select-none cursor-pointer"
                                    >
                                        <span className="text-[10px] opacity-60">$</span>
                                        <span>{b >= 1000 ? `${b / 1000}K` : b}</span>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="grid grid-cols-4 gap-2">
                            {BILLS.map(b => (
                                <button key={b} onClick={() => add(b)}
                                    className="flex flex-col items-center justify-center rounded-2xl border-2 border-violet-500/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 active:scale-95 transition-all py-3 font-black text-sm select-none cursor-pointer">
                                    <span className="text-[10px] opacity-60">$</span>
                                    <span>{b >= 1000 ? `${b / 1000}K` : b}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Monedas */}
                <div className="px-5 pb-4">
                    <p className="text-[9px] font-black text-app-text-muted uppercase tracking-widest mb-2">Monedas</p>
                    <div className="grid grid-cols-5 gap-2">
                        {COINS.map(c => (
                            <button key={c} onClick={() => add(c)}
                                className="flex flex-col items-center justify-center rounded-2xl border-2 border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 active:scale-95 transition-all py-3 font-black text-sm select-none cursor-pointer">
                                <span className="text-[10px] opacity-60">$</span>
                                <span>{c >= 1000 ? `${c / 1000}K` : c}</span>
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
