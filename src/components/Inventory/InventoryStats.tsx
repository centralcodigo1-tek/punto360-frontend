import { Layers, AlertTriangle, TrendingDown, DollarSign } from "lucide-react";
import type { ProductRow } from "../../pages/InventoryPage";
import { useAuth } from "../../auth/AuthContext";

interface InventoryStatsProps {
    total: number;
    lowStock: number;
    outOfStock: number;
    valorizado: ProductRow[];
}

export default function InventoryStats({ total, lowStock, outOfStock, valorizado }: InventoryStatsProps) {
    const { hasPermission } = useAuth();
    const canViewFinancials = hasPermission("reports.view");
    const totalValue = valorizado.reduce((acc, p) => acc + (p.cost_price * p.stockCount), 0);

    const formatCurrency = (v: number) => 
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);

    return (
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 ${canViewFinancials ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
            
            <div className="bg-app-card backdrop-blur-md rounded-2xl p-5 md:p-6 border border-app-border shadow-lg relative overflow-hidden group">
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-xl group-hover:scale-110 transition-transform">
                            <Layers size={20} />
                        </div>
                    </div>
                    <p className="text-[10px] font-black text-app-text-muted uppercase tracking-widest leading-none mb-1 opacity-70">Total Productos</p>
                    <h3 className="text-2xl md:text-3xl font-black text-app-text tracking-tight">{total}</h3>
                </div>
                <div className="absolute -right-4 -bottom-4 text-cyan-500/5 rotate-12 group-hover:scale-110 group-hover:rotate-0 transition-all duration-500">
                    <Layers size={100} />
                </div>
            </div>

            <div className="bg-app-card backdrop-blur-md rounded-2xl p-5 md:p-6 border border-app-border shadow-lg relative overflow-hidden group">
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                        <div className={`p-2.5 rounded-xl group-hover:scale-110 transition-transform ${lowStock > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-app-accent/10 text-app-accent'}`}>
                            <AlertTriangle size={20} />
                        </div>
                    </div>
                    <p className="text-[10px] font-black text-app-text-muted uppercase tracking-widest leading-none mb-1 opacity-70">Stock Bajo</p>
                    <h3 className="text-2xl md:text-3xl font-black text-app-text tracking-tight">{lowStock}</h3>
                </div>
                 <div className="absolute -right-4 -bottom-4 text-amber-500/5 rotate-12 group-hover:scale-110 group-hover:rotate-0 transition-all duration-500">
                    <AlertTriangle size={100} />
                </div>
            </div>

            <div className="bg-app-card backdrop-blur-md rounded-2xl p-5 md:p-6 border border-app-border shadow-lg relative overflow-hidden group">
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                        <div className={`p-2.5 rounded-xl group-hover:scale-110 transition-transform ${outOfStock > 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-app-accent/10 text-app-accent'}`}>
                            <TrendingDown size={20} />
                        </div>
                    </div>
                    <p className="text-[10px] font-black text-app-text-muted uppercase tracking-widest leading-none mb-1 opacity-70">Sin Inventario</p>
                    <h3 className="text-2xl md:text-3xl font-black text-app-text tracking-tight">{outOfStock}</h3>
                </div>
                <div className="absolute -right-4 -bottom-4 text-rose-500/5 rotate-12 group-hover:scale-110 group-hover:rotate-0 transition-all duration-500">
                    <TrendingDown size={100} />
                </div>
            </div>

            {canViewFinancials && <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5 md:p-6 backdrop-blur-md shadow-sm relative overflow-hidden group">
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl group-hover:scale-110 transition-transform">
                            <DollarSign size={20} />
                        </div>
                    </div>
                    <p className="text-[10px] font-black text-emerald-500/80 uppercase tracking-widest leading-none mb-1 opacity-70">Capital Activo</p>
                    <h3 className="text-2xl md:text-3xl font-black text-app-text tracking-tight">{formatCurrency(totalValue)}</h3>
                </div>
                <div className="absolute -right-4 -bottom-4 text-emerald-500/10 rotate-12 group-hover:scale-110 group-hover:rotate-0 transition-all duration-500">
                    <DollarSign size={100} />
                </div>
            </div>}

        </div>
    );
}
