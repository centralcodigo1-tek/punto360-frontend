import { useEffect, useState } from "react";
import InventoryStats from "../components/Inventory/InventoryStats";
import InventoryFilters from "../components/Inventory/InventoryFilters";
import InventoryTable from "../components/Inventory/InventoryTable";
import DashboardLayout from "../layouts/DashboardLayout";
import { useAuth } from "../auth/AuthContext";
import { PackageOpen, X } from "lucide-react";
import { api } from "../api/axios";
import NewProductFields from "../components/products/NewProductFields";

export interface ProductRow {
  id: string;
  sku: string;
  name: string;
  cost_price: number;
  sale_price: number;
  stockCount: number;
  statusText: string;
  statusColor: string;
  is_active: boolean;
  unit_type: "UNIT" | "WEIGHT";
  category_id?: string;
}

export default function InventoryPage() {
    const { user, hasPermission } = useAuth();
    const canManageInventory = hasPermission("inventory.manage") || user?.role === "ADMIN";
    
    // Core State
    const [allProducts, setAllProducts] = useState<ProductRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Filtros de UI
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState<"all" | "low" | "out">("all");

    // Edición Pop-up
    const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);

    // Fetch Central
    const fetchProducts = async () => {
        setIsLoading(true);
        try {
            const res = await api.get("/products");
            
            const mapped = res.data.map((p: any) => {
                const currentStock = p.stock && p.stock.length > 0 ? p.stock[0].quantity : 0;
                
                let statusText = "Activo";
                let statusColor = "bg-emerald-500/20 text-emerald-400 border-emerald-500/20";
      
                if (currentStock === 0) {
                  statusText = "SIN STOCK";
                  statusColor = "bg-rose-500/20 text-rose-400 border-rose-500/20";
                } else if (currentStock <= 5) {
                  statusText = "Stock Bajo";
                  statusColor = "bg-amber-500/20 text-amber-400 border-amber-500/20";
                } else if (!p.is_active) {
                  statusText = "Inactivo";
                  statusColor = "bg-slate-500/20 text-app-text-muted border-slate-500/20";
                }
      
                return {
                  id: p.id,
                  sku: p.sku,
                  name: p.name,
                  cost_price: p.cost_price,
                  sale_price: p.sale_price,
                  stockCount: currentStock,
                  statusText,
                  statusColor,
                  is_active: p.is_active,
                  unit_type: p.unit_type || "UNIT",
                  category_id: p.category_id
                };
            });
            setAllProducts(mapped);
        } catch (error) {
            console.error("Error fetching products", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    // Derived States
    const totalProducts = allProducts.length;
    const lowStockCount = allProducts.filter(p => p.stockCount > 0 && p.stockCount <= 5).length;
    const outOfStockCount = allProducts.filter(p => p.stockCount === 0).length;

    // Filter Logic
    const filteredProducts = allProducts.filter(p => {
        // 1. Ocultar productos inactivos a menos que estemos buscando algo explícito y queramos verlos?
        // En punto de venta, lo usual es ver todo para poder re-activarlos.
        
        let matchesFilter = true;
        if (filterType === "low") matchesFilter = (p.stockCount > 0 && p.stockCount <= 5);
        if (filterType === "out") matchesFilter = (p.stockCount === 0);

        let matchesSearch = true;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            matchesSearch = p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
        }

        return matchesFilter && matchesSearch;
    });

    return (
        <DashboardLayout>
            <div className="space-y-6">
                
                {/* Título */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-lg">
                        <PackageOpen size={28} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-app-text drop-shadow-md">Inventario</h1>
                        <p className="text-app-text-muted text-sm font-medium">Gestiona los productos de {user?.companyName || "tu negocio"}</p>
                    </div>
                </div>

                {/* Stats */}
                <InventoryStats 
                   total={totalProducts} 
                   lowStock={lowStockCount} 
                   outOfStock={outOfStockCount} 
                   valorizado={allProducts}
                />

                {/* Filtros */}
                <InventoryFilters
                   searchQuery={searchQuery}
                   setSearchQuery={setSearchQuery}
                   filterType={filterType}
                   setFilterType={setFilterType}
                   canCreate={canManageInventory}
                />

                {/* Tabla */}
                <InventoryTable 
                   products={filteredProducts} 
                   isLoading={isLoading} 
                   onRefresh={fetchProducts}
                   onEdit={(p) => setEditingProduct(p)}
                />

            </div>

            {/* Modal de Edición Glassmorphism */}
            {editingProduct && (
                <div className="fixed inset-0 z-50 flex justify-center items-center p-4">
                    <div className="absolute inset-0 bg-app-bg backdrop-blur-sm" onClick={() => setEditingProduct(null)}></div>
                    <div className="relative w-full max-w-4xl bg-app-bg rounded-2xl shadow-2xl border border-app-border max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 z-10 flex justify-between items-center p-4 bg-app-bg/90 backdrop-blur border-b border-app-border">
                            <h2 className="text-xl font-bold text-app-text">Editar Producto</h2>
                            <button onClick={() => setEditingProduct(null)} className="p-2 text-app-text-muted hover:text-white bg-app-card rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-4">
                            <NewProductFields 
                                initialData={editingProduct} 
                                onSaveSuccess={() => {
                                    fetchProducts();
                                    setEditingProduct(null);
                                }}
                                onCancel={() => setEditingProduct(null)}
                            />
                        </div>
                    </div>
                </div>
            )}

        </DashboardLayout>
    );
}
