import React, { useEffect, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import { History, Search, Calendar, ChevronDown, ChevronUp, AlertOctagon, CheckCircle2, RotateCcw } from "lucide-react";
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
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                        Auditoría de Caja
                    </h1>
                    <p className="text-white/40 font-medium">Revisa las ventas históricas de tu negocio</p>
                </div>
                <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
                    <History size={24} />
                </div>
            </div>

            {/* Barra de Búsqueda */}
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-lg mb-6 flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full relative">
                    <label className="block text-xs font-medium text-white/50 mb-1 ml-1 flex items-center gap-1">
                        <Calendar size={12}/> Fecha Desde
                    </label>
                    <input 
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-[#1e293b] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                </div>
                <div className="flex-1 w-full relative">
                    <label className="block text-xs font-medium text-white/50 mb-1 ml-1 flex items-center gap-1">
                        <Calendar size={12}/> Fecha Hasta
                    </label>
                    <input 
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full bg-[#1e293b] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                </div>
                <button 
                    onClick={fetchSales}
                    disabled={isLoading}
                    className="w-full md:w-auto px-8 py-3 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                    <Search size={18} />
                    {isLoading ? "Buscando..." : "Explorar"}
                </button>
            </div>

            {/* Tarjeta de Resumen */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border border-emerald-500/30 rounded-2xl p-6 backdrop-blur-xl shadow-lg relative overflow-hidden group">
                    <div className="relative z-10">
                        <p className="text-emerald-400/60 text-xs font-bold uppercase tracking-wider mb-1">Total Cobrado (Periodo)</p>
                        <h3 className="text-3xl font-black text-white tracking-tight">{cop(totalCalculated)}</h3>
                        <p className="text-[10px] text-emerald-400/40 mt-2 flex items-center gap-1">
                            <CheckCircle2 size={10}/> Basado en {sales.filter(s => s.status !== 'CANCELLED').length} tickets efectivos
                        </p>
                    </div>
                    <div className="absolute -right-4 -bottom-4 text-emerald-500/10 rotate-12 transition-transform group-hover:scale-110 duration-500">
                        <CheckCircle2 size={120} />
                    </div>
                </div>
            </div>

            {/* Canvas de Resultados */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/10 bg-black/20">
                                <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider">Detalles</th>
                                <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider">Sucursal</th>
                                <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider">Fecha / Hora</th>
                                <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider">Ticket / Items</th>
                                <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider">Pago</th>
                                <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-wider text-right">Monto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {sales.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-white/40">
                                        No se encontraron ventas para este rango de fechas.
                                    </td>
                                </tr>
                            ) : sales.map((sale) => {
                                const isCancelled = sale.status === 'CANCELLED';
                                const totalItems = sale.sale_items.length;
                                const isExpanded = expandedId === sale.id;

                                return (
                                    <React.Fragment key={sale.id}>
                                        <tr className={`transition-colors hover:bg-white/5 ${isCancelled ? 'opacity-60' : ''}`}>
                                            <td className="px-6 py-4">
                                                <button onClick={() => toggleExpand(sale.id)} className="p-1.5 bg-white/10 rounded-md text-white/60 hover:text-white transition-colors">
                                                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-medium text-cyan-400/80 bg-cyan-400/5 px-2 py-1 rounded-lg">
                                                    {sale.branches?.name || 'Local'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col text-sm">
                                                    <span className="font-semibold text-white/80">{new Date(sale.created_at).toLocaleDateString()}</span>
                                                    <span className="text-xs text-white/40">{new Date(sale.created_at).toLocaleTimeString()}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-mono text-cyan-400/80 text-xs truncate max-w-[150px]">#{sale.id.split('-')[0]}</span>
                                                    <span className="text-xs text-white/50">{totalItems} productos</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-white/70">
                                                {translatePayment(sale.payment_method)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1">
                                                    {isCancelled ? 
                                                        <span className="flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-1 rounded-lg uppercase tracking-wider">
                                                            <AlertOctagon size={12}/> Nulo
                                                        </span> : 
                                                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg uppercase tracking-wider">
                                                            <CheckCircle2 size={12}/> Cobrado
                                                        </span>
                                                    }
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`text-lg font-bold ${isCancelled ? 'line-through text-white/30' : 'text-emerald-400'}`}>
                                                    ${Number(sale.total).toFixed(2)}
                                                </span>
                                            </td>
                                        </tr>
                                        {isExpanded && (
                                            <tr className="bg-black/20 border-b border-none">
                                                <td colSpan={7} className="p-0">
                                                    <div className="px-10 py-6">
                                                        <div className="bg-[#0f172a] rounded-xl border border-white/5 p-4 flex flex-col gap-4">
                                                            <h4 className="text-sm font-bold text-white/80 border-b border-white/10 pb-2">Desglose del Ticket</h4>
                                                            
                                                            <div className="flex flex-col gap-2">
                                                                {sale.sale_items.map((item) => (
                                                                    <div key={item.id} className="flex justify-between items-center text-sm">
                                                                        <div className="flex gap-4">
                                                                            <span className="w-16 font-mono text-xs text-cyan-500/60">{item.products?.sku}</span>
                                                                            <span className="text-white/70 font-medium w-48 truncate">{item.products?.name}</span>
                                                                        </div>
                                                                        <div className="flex gap-6">
                                                                            <span className="text-white/40 w-16 text-right">
                                                                                {Number(item.quantity)} {item.products?.unit_type === "WEIGHT" ? "Kg" : "Un."}
                                                                            </span>
                                                                            <span className="text-white/50 w-20 text-right">${Number(item.price).toFixed(2)}</span>
                                                                            <span className="text-white font-bold w-24 text-right">${Number(item.subtotal).toFixed(2)}</span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>

                                                            {!isCancelled && (
                                                                <div className="mt-4 pt-4 border-t border-white/5 flex justify-end">
                                                                    <button 
                                                                        onClick={() => handleCancelSale(sale.id)}
                                                                        className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-sm rounded-lg flex items-center gap-2 transition-colors border border-rose-500/20"
                                                                    >
                                                                        <RotateCcw size={14} /> Anular Ticket Permanentemente
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
            </div>
        </DashboardLayout>
    );
}
