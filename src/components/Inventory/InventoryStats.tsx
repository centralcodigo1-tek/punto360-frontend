import StatCard from "../StatCard";
import { Layers, AlertTriangle, XOctagon, DollarSign, Wallet } from "lucide-react";
import type { ProductRow } from "../../pages/InventoryPage";

interface InventoryStatsProps {
    total: number;
    lowStock: number;
    outOfStock: number;
    valorizado: ProductRow[];
}

export default function InventoryStats({ total, lowStock, outOfStock, valorizado }: InventoryStatsProps) {
    const totalCost = valorizado.reduce((acc, p) => acc + (Number(p.cost_price) * p.stockCount), 0);
    const totalSale = valorizado.reduce((acc, p) => acc + (Number(p.sale_price) * p.stockCount), 0);

    const stats = [
        { label: "Inv. Total", value: total, suffix: "Unid.", icon: <Layers size={24} /> },
        { label: "Valor Costo", value: "$" + totalCost.toFixed(2), suffix: "Capital Invertido", icon: <Wallet size={24} /> },
        { label: "Valor Venta", value: "$" + totalSale.toFixed(2), suffix: "Proyección Brut.", icon: <DollarSign size={24} /> },
        { label: "Stock Bajo", value: lowStock, suffix: "Prod.", icon: <AlertTriangle size={24} /> },
        { label: "Sin Stock", value: outOfStock, suffix: "Prod.", icon: <XOctagon size={24} /> },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 inventory_cards">
            {stats.map((item, index) => (
                <StatCard 
                    key={index}
                    title={item.label} 
                    value={item.value as string}
                    subtitle={item.suffix}
                    icon={item.icon}
                    colorFrom={
                        index === 1 ? "from-emerald-600" :
                        index === 2 ? "from-cyan-600" :
                        index === 3 ? "from-amber-500" : 
                        index === 4 ? "from-rose-500" : 
                        "from-slate-600"
                    } 
                    colorTo={
                        index === 1 ? "to-teal-600" :
                        index === 2 ? "to-blue-600" :
                        index === 3 ? "to-orange-600" : 
                        index === 4 ? "to-red-600" : 
                        "to-slate-800"
                    } 
                />
            ))}
        </div>
    );
}
