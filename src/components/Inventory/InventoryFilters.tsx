import { NavLink } from "react-router-dom";
import { Plus, Search, Filter } from "lucide-react";

interface InventoryFiltersProps {
    searchQuery: string;
    setSearchQuery: (val: string) => void;
    filterType: "all" | "low" | "out";
    setFilterType: (val: "all" | "low" | "out") => void;
}

export default function InventoryFilters({ searchQuery, setSearchQuery, filterType, setFilterType }: InventoryFiltersProps) {
    return (
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl space-y-5">
            {/* Cabecera y Botón Nuevo */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <Filter className="text-cyan-400" size={20} />
                    <h3 className="text-lg font-semibold text-white/90">Filtros Activos</h3>
                </div>

                <NavLink 
                    to="/nuevo_producto"
                    className="group flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5"
                >
                    <Plus size={18} className="transition-transform group-hover:rotate-90" />
                    NUEVO PRODUCTO
                </NavLink>
            </div>

            {/* Fila de Controles */}
            <div className="flex flex-col md:flex-row gap-4">
                {/* Opciones Rápidas */}
                <div className="flex flex-1 gap-2 p-1 bg-black/20 rounded-xl border border-white/5">
                    <button 
                       onClick={() => setFilterType("all")}
                       className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${filterType === "all" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "text-white/50 hover:bg-white/5 hover:text-white"}`}>
                        Todos
                    </button>
                    <button 
                       onClick={() => setFilterType("low")}
                       className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${filterType === "low" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "text-white/50 hover:bg-white/5 hover:text-white"}`}>
                        Bajo Stock
                    </button>
                    <button 
                       onClick={() => setFilterType("out")}
                       className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${filterType === "out" ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" : "text-rose-400/50 hover:bg-rose-500/10 hover:text-rose-400"}`}>
                        Sin Stock
                    </button>
                </div>

                {/* Búsqueda */}
                <div className="relative flex-[2]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                    <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        type="text"
                        placeholder="Buscar por SKU O Nombre..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all font-medium"
                    />
                </div>
            </div>
        </div>
    );
}
