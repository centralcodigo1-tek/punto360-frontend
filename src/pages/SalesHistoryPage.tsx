import React, { useEffect, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import { History, Search, ChevronDown, ChevronUp, AlertOctagon, CheckCircle2, RotateCcw } from "lucide-react";
import { api } from "../api/axios";

const cop = (v: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(v);

interface SaleItem {
    id: string;
    product_id: string;
    quantity: number;
    price: number;
    subtotal: number;
    products: {
        name: string;
        sku: string;
        unit_type: "UNIT" | "WEIGHT";
    };
}

interface Sale {
    id: string;
    created_at: string;
    total: number;
    payment_method: string;
    status: string;
    sale_items: SaleItem[];
    branches: { name: string };
}

export default function SalesHistoryPage() {
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const [startDate, setStartDate] = useState(sevenDaysAgo);
    const [endDate, setEndDate] = useState(today);
    const [sales, setSales] = useState<Sale[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const fetchSales = async () => {
        setIsLoading(true);
        try {
            const res = await api.get(`/sales?startDate=${startDate}&endDate=${endDate}`);
            setSales(res.data);
        } catch (e) {
            console.error("Error fetching sales history", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSales();
    }, []);

    const toggleExpand = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const totalCalculated = sales
        .filter(s => s.status !== 'CANCELLED')
        .reduce((sum, s) => sum + Number(s.total), 0);


    const handleCancelSale = async (id: string) => {
        if (!window.confirm("¿Estás súper seguro de anular esta venta? Esta acción no se puede deshacer y devolverá el inventario a la bodega.")) {
            return;
        }

        try {
            await api.put(`/sales/${id}/cancel`);
            alert("Venta anulada con éxito.");
            fetchSales(); // Refresh list to see updated status
        } catch (e: any) {
            alert(e.response?.data?.message || "Ocurrió un error al intentar anular.");
        }
    };

    const translatePayment = (method: string) => {
        const dictionary: Record<string, string> = {
            CASH: 'Efectivo',
            CARD: 'Tarjeta',
            TRANSFER: 'Transferencia'
        };
        return dictionary[method] || method;
    };

    return (
        <DashboardLayout>
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6 md:mb-8">
                <div>
                    <h1 className="text-xl md:text-3xl font-black text-app-text tracking-tight uppercase">
                        Auditoría de Caja
                    </h1>
                    <p className="text-app-text-muted font-bold text-[10px] md:text-xs uppercase tracking-widest opacity-60">Control histórico de transacciones</p>
                </div>
                <div className="hidden md:flex p-3 bg-app-accent/10 text-app-accent rounded-xl shadow-lg border border-app-accent/20">
                    <History size={24} />
                </div>
            </div>

            {/* Barra de Filtros (Responsive) */}
            <div className="bg-app-card backdrop-blur-md rounded-2xl p-4 md:p-5 border border-app-border shadow-lg mb-6 flex flex-col md:flex-row gap-4 items-end">
                <div className="grid grid-cols-2 lg:grid-cols-2 gap-3 w-full flex-1">
                    <div className="relative">
                        <label className="block text-[9px] font-black text-app-text-muted mb-1 ml-1 uppercase tracking-widest">
                            Desde
                        </label>
                        <input 
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full bg-app-bg border border-app-border rounded-xl px-3 py-2.5 md:px-4 md:py-3 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-app-accent/30"
                        />
                    </div>
                    <div className="relative">
                        <label className="block text-[9px] font-black text-app-text-muted mb-1 ml-1 uppercase tracking-widest">
                            Hasta
                        </label>
                        <input 
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full bg-app-bg border border-app-border rounded-xl px-3 py-2.5 md:px-4 md:py-3 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-app-accent/30"
                        />
                    </div>
                </div>
                <button 
                    onClick={fetchSales}
                    disabled={isLoading}
                    className="w-full md:w-auto px-8 py-3 bg-app-accent hover:bg-app-accent-hover text-white font-black uppercase tracking-[0.2em] text-xs rounded-xl shadow-xl shadow-app-accent/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                    <Search size={16} />
                    {isLoading ? "CARGANDO..." : "FILTRAR"}
                </button>
            </div>

            {/* Tarjetas de Resumen (Responsive) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6">
                <div className="bg-app-accent/5 border border-app-accent/20 rounded-2xl p-5 md:p-6 backdrop-blur-3xl shadow-sm relative overflow-hidden group">
                    <div className="relative z-10">
                        <p className="text-app-accent font-black text-[9px] uppercase tracking-[0.3em] mb-1">VENTAS DEL PERIODO</p>
                        <h3 className="text-2xl md:text-3xl font-black text-app-text tracking-tight">{cop(totalCalculated)}</h3>
                        <p className="text-[9px] text-app-text-muted mt-2 flex items-center gap-1 font-bold italic opacity-60">
                             {sales.filter(s => s.status !== 'CANCELLED').length} Tickets efectivos
                        </p>
                    </div>
                    <div className="absolute -right-4 -bottom-4 text-app-accent/5 rotate-12 transition-transform group-hover:scale-110 duration-500">
                        <CheckCircle2 size={100} />
                    </div>
                </div>
            </div>

            {/* Canvas de Resultados */}
            <div className="bg-app-card backdrop-blur-md border border-app-border shadow-2xl rounded-2xl overflow-hidden min-w-0">
                
                {/* VISTA DESKTOP: TABLA */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-app-border bg-app-accent/5">
                                <th className="px-6 py-4 text-[10px] font-black text-app-text-muted uppercase tracking-widest">Detalles</th>
                                <th className="px-6 py-4 text-[10px] font-black text-app-text-muted uppercase tracking-widest">Sede</th>
                                <th className="px-6 py-4 text-[10px] font-black text-app-text-muted uppercase tracking-widest">Fecha / Hora</th>
                                <th className="px-6 py-4 text-[10px] font-black text-app-text-muted uppercase tracking-widest">Ticket</th>
                                <th className="px-6 py-4 text-[10px] font-black text-app-text-muted uppercase tracking-widest">Pago</th>
                                <th className="px-6 py-4 text-[10px] font-black text-app-text-muted uppercase tracking-widest">Estado</th>
                                <th className="px-6 py-4 text-[10px] font-black text-app-text-muted uppercase tracking-widest text-right">Monto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-app-border">
                            {sales.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-app-text-muted font-bold uppercase tracking-widest opacity-30 text-xs">
                                        Sin registros para este periodo.
                                    </td>
                                </tr>
                            ) : sales.map((sale) => {
                                const isCancelled = sale.status === 'CANCELLED';
                                const totalItems = sale.sale_items.length;
                                const isExpanded = expandedId === sale.id;

                                return (
                                    <React.Fragment key={sale.id}>
                                        <tr className={`transition-colors hover:bg-app-accent/5 ${isCancelled ? 'opacity-40 grayscale' : ''}`}>
                                            <td className="px-6 py-4">
                                                <button onClick={() => toggleExpand(sale.id)} className="p-2.5 bg-app-accent/10 rounded-xl text-app-accent hover:bg-app-accent/20 transition-all border border-app-accent/20">
                                                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-app-accent bg-app-accent/5 border border-app-accent/10 px-2.5 py-1 rounded-lg">
                                                    {sale.branches?.name || 'Local'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col text-sm">
                                                    <span className="font-bold text-app-text">{new Date(sale.created_at).toLocaleDateString()}</span>
                                                    <span className="text-[10px] font-black text-app-text-muted uppercase tracking-tighter">{new Date(sale.created_at).toLocaleTimeString()}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-mono text-app-accent text-xs font-black">#{sale.id.split('-')[0].toUpperCase()}</span>
                                                    <span className="text-[9px] text-app-text-muted font-black uppercase tracking-widest">{totalItems} productos</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-[10px] font-black text-app-text uppercase tracking-[0.1em]">
                                                {translatePayment(sale.payment_method)}
                                            </td>
                                            <td className="px-6 py-4">
                                                {isCancelled ? 
                                                    <span className="inline-flex items-center gap-1.5 text-[9px] font-black text-rose-500 bg-rose-500/10 px-2.5 py-1.5 rounded-lg uppercase tracking-widest border border-rose-500/10 shadow-sm shadow-rose-500/10">
                                                        <AlertOctagon size={12}/> Anulado
                                                    </span> : 
                                                    <span className="inline-flex items-center gap-1.5 text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-2.5 py-1.5 rounded-lg uppercase tracking-widest border border-emerald-500/10 shadow-sm shadow-emerald-500/10">
                                                        <CheckCircle2 size={12}/> Cobrado
                                                    </span>
                                                }
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`text-lg font-black tracking-tighter ${isCancelled ? 'line-through text-app-text-muted' : 'text-emerald-500'}`}>
                                                    ${Number(sale.total).toLocaleString()}
                                                </span>
                                            </td>
                                        </tr>
                                        {isExpanded && (
                                            <tr className="bg-app-accent/5 border-none">
                                                <td colSpan={7} className="p-0">
                                                    <div className="px-10 py-6">
                                                        <div className="bg-app-card rounded-2xl border border-app-border p-6 flex flex-col gap-4 shadow-2xl">
                                                            <h4 className="text-[10px] font-black text-app-text-muted uppercase tracking-[0.5em] border-b border-app-border pb-3">Detalle del Ticket</h4>
                                                            <div className="flex flex-col gap-3">
                                                                {sale.sale_items.map((item) => (
                                                                    <div key={item.id} className="flex justify-between items-center text-sm border-b border-app-border/20 pb-3 last:border-0">
                                                                        <div className="flex items-center gap-6">
                                                                            <span className="w-16 font-mono text-[10px] text-app-accent font-black opacity-60">{item.products?.sku}</span>
                                                                            <span className="text-app-text font-black text-xs uppercase tracking-tight w-64 truncate">{item.products?.name}</span>
                                                                        </div>
                                                                        <div className="flex gap-10">
                                                                            <span className="text-app-text-muted w-20 text-right font-black text-xs uppercase opacity-70">
                                                                                {Number(item.quantity).toLocaleString()} {item.products?.unit_type === "WEIGHT" ? "Kg" : "Un."}
                                                                            </span>
                                                                            <span className="text-app-text-muted w-24 text-right text-xs opacity-50">${Number(item.price).toLocaleString()}</span>
                                                                            <span className="text-app-text font-black w-28 text-right text-base">${Number(item.subtotal).toLocaleString()}</span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            {!isCancelled && (
                                                                <div className="mt-4 pt-4 border-t border-app-border flex justify-end">
                                                                    <button 
                                                                        onClick={() => handleCancelSale(sale.id)}
                                                                        className="px-5 py-3 bg-rose-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl flex items-center gap-2 hover:bg-rose-600 transition-all shadow-xl shadow-rose-500/20 active:scale-95"
                                                                    >
                                                                        <RotateCcw size={14} /> Anular Registro
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* VISTA MÓVIL: LISTA DE TARJETAS */}
                <div className="md:hidden divide-y divide-app-border">
                    {sales.length === 0 ? (
                        <div className="px-6 py-12 text-center text-app-text-muted font-bold uppercase tracking-widest opacity-30 text-[10px]">
                            Sin registros.
                        </div>
                    ) : sales.map((sale) => {
                        const isCancelled = sale.status === 'CANCELLED';
                        const isExpanded = expandedId === sale.id;
                        return (
                            <div key={sale.id} className={`p-4 transition-colors ${isCancelled ? 'opacity-40 grayscale' : ''}`}>
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex flex-col">
                                        <span className="font-mono text-app-accent text-xs font-black">#{sale.id.split('-')[0].toUpperCase()}</span>
                                        <span className="text-[10px] font-black text-app-text mt-1">{new Date(sale.created_at).toLocaleDateString()} · {new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className={`text-base font-black tracking-tighter ${isCancelled ? 'line-through text-app-text-muted' : 'text-emerald-500'}`}>
                                            ${Number(sale.total).toLocaleString()}
                                        </span>
                                        <span className="text-[9px] font-black text-app-text-muted uppercase tracking-widest">{translatePayment(sale.payment_method)}</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="flex gap-2">
                                        <span className={`inline-flex items-center gap-1 text-[8px] font-black px-2 py-1 rounded-md uppercase tracking-widest border border-current ${isCancelled ? 'text-rose-500 bg-rose-500/10' : 'text-emerald-500 bg-emerald-500/10'}`}>
                                            {isCancelled ? 'Anulado' : 'Cobrado'}
                                        </span>
                                        <span className="text-[8px] font-black text-app-accent/80 bg-app-accent/5 px-2 py-1 rounded-md uppercase tracking-widest border border-app-accent/10 whitespace-nowrap">
                                            {sale.branches?.name || 'Local'}
                                        </span>
                                    </div>
                                    <button 
                                        onClick={() => toggleExpand(sale.id)}
                                        className="flex items-center gap-1 text-[10px] font-black text-app-accent uppercase tracking-widest py-1 px-3 bg-app-accent/10 rounded-lg border border-app-accent/10"
                                    >
                                        Detalle
                                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                    </button>
                                </div>

                                {isExpanded && (
                                    <div className="mt-4 pt-4 border-t border-app-border/50 animate-in slide-in-from-top-2 duration-300">
                                        <div className="space-y-3">
                                            {sale.sale_items.map((item) => (
                                                <div key={item.id} className="flex justify-between text-[11px] items-center">
                                                    <div className="flex flex-col">
                                                        <span className="text-app-text font-black uppercase tracking-tight mb-0.5">{item.products?.name}</span>
                                                        <span className="text-[9px] text-app-text-muted font-black opacity-60">{item.products?.sku} · {Number(item.quantity).toLocaleString()} {item.products?.unit_type === "WEIGHT" ? "Kg" : "Un."}</span>
                                                    </div>
                                                    <span className="font-black text-app-text text-sm">${Number(item.subtotal).toLocaleString()}</span>
                                                </div>
                                            ))}
                                        </div>
                                        {!isCancelled && (
                                            <button 
                                                onClick={() => handleCancelSale(sale.id)}
                                                className="w-full mt-5 py-3 bg-rose-500 text-white font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-rose-600 transition-all shadow-lg active:scale-95"
                                            >
                                                Anular Venta
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </DashboardLayout>
    );
}
