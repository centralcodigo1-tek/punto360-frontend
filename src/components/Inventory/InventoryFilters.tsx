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
        <div className="bg-app-card backdrop-blur-md border border-app-border rounded-2xl p-4 md:p-6 shadow-xl space-y-5">
            {/* Cabecera y Botón Nuevo */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-app-accent/10 text-app-accent rounded-lg">
                        <Filter size={16} />
                    </div>
                    <h3 className="text-[10px] font-black text-app-text-muted uppercase tracking-[0.3em]">Gestión de Filtros</h3>
                </div>

                <NavLink 
                    to="/nuevo_producto"
                    className="group flex items-center gap-2 bg-app-accent hover:bg-app-accent-hover text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-app-accent/20 transition-all active:scale-95 w-full sm:w-auto justify-center"
                >
                    <Plus size={16} className="transition-transform group-hover:rotate-90" />
                    Nuevo Producto
                </NavLink>
            </div>

            {/* Fila de Controles */}
            <div className="flex flex-col md:flex-row gap-4">
                {/* Opciones Rápidas */}
                <div className="flex flex-1 gap-1 p-1 bg-app-bg rounded-xl border border-app-border">
                    <button 
                       onClick={() => setFilterType("all")}
                       className={`flex-1 px-3 py-2 text-[10px] font-black uppercase tracking-tighter rounded-lg transition-all ${filterType === "all" ? "bg-app-accent text-white shadow-lg" : "text-app-text-muted hover:bg-app-accent/5"}`}>
                        Todos
                    </button>
                    <button 
                       onClick={() => setFilterType("low")}
                       className={`flex-1 px-3 py-2 text-[10px] font-black uppercase tracking-tighter rounded-lg transition-all ${filterType === "low" ? "bg-amber-500 text-white shadow-lg" : "text-app-text-muted hover:bg-amber-500/5"}`}>
                        Bajos
                    </button>
                    <button 
                       onClick={() => setFilterType("out")}
                       className={`flex-1 px-3 py-2 text-[10px] font-black uppercase tracking-tighter rounded-lg transition-all ${filterType === "out" ? "bg-rose-500 text-white shadow-lg" : "text-app-text-muted hover:bg-rose-500/5"}`}>
                        Agotados
                    </button>
                </div>

                {/* Búsqueda */}
                <div className="relative flex-[2]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-app-text-muted opacity-40" size={18} />
                    <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        type="text"
                        placeholder="Buscar por SKU o Nombre..."
                        className="w-full bg-app-bg border border-app-border rounded-xl pl-12 pr-4 py-3 text-app-text text-sm placeholder-app-text-muted/30 focus:outline-none focus:ring-2 focus:ring-app-accent/30 transition-all font-bold"
                    />
                </div>
            </div>
        </div>
    );
}
