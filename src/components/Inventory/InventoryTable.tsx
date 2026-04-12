import { Edit2, PackageSearch, Power, PowerOff, Printer, X } from "lucide-react";
import { useState } from "react";
import { ProductLabel } from "./ProductLabel";
import { api } from "../../api/axios";
import type { ProductRow } from "../../pages/InventoryPage";

interface InventoryTableProps {
  products: ProductRow[];
  isLoading: boolean;
  onRefresh: () => void;
  onEdit?: (product: ProductRow) => void;
}

export default function InventoryTable({ products, isLoading, onRefresh, onEdit }: InventoryTableProps) {
  const [printingProduct, setPrintingProduct] = useState<ProductRow | null>(null);
  const [labelCount, setLabelCount] = useState<number>(1);



  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    const confirmMessage = currentStatus 
        ? "¿Estás seguro que deseas desactivar este producto? No aparecerá en la caja registradora." 
        : "¿Deseas reactivar este producto?";
        
    if (!window.confirm(confirmMessage)) return;

    try {
      await api.patch(`/products/${id}/toggle`);
      onRefresh(); // Dispara la recarga de la tabla en el padre
    } catch (error) {
      console.error("Error cambiando estado del producto", error);
      alert("No se pudo cambiar el estado del producto");
    }
  };

  if (isLoading) {
    return <div className="text-center py-10 text-app-text-muted">Cargando inventario...</div>;
  }

  if (products.length === 0) {
    return (
      <div className="bg-app-card backdrop-blur-md border border-app-border rounded-2xl p-12 text-center shadow-xl">
         <PackageSearch className="mx-auto text-app-text-muted mb-4" size={48} />
         <h3 className="text-xl font-medium text-app-text">Inventario Vacío o Sin Resultados</h3>
         <p className="text-app-text-muted mt-2">No se encontraron productos con estos filtros.</p>
      </div>
    );
  }

  return (
    <div className="bg-app-card backdrop-blur-md border border-app-border rounded-2xl shadow-xl overflow-hidden">
      <div className="overflow-x-auto w-full">
        <table className="w-full text-sm text-left">
          <thead className="bg-black/10 text-app-text-muted border-b border-app-border">
            <tr>
              <th className="px-6 py-4 font-semibold">SKU</th>
              <th className="px-6 py-4 font-semibold">Producto</th>
              <th className="px-6 py-4 font-semibold">Precio</th>
              <th className="px-6 py-4 font-semibold text-center">Stock</th>
              <th className="px-6 py-4 font-semibold text-center">Estado</th>
              <th className="px-6 py-4 font-semibold text-right min-w-[150px]">Acciones</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-app-border/10 text-app-text">
            {products.map((p) => (
              <tr
                key={p.id}
                className={`transition-colors group cursor-default ${p.is_active ? 'hover:bg-app-accent/5' : 'bg-black/10 opacity-60'}`}
              >
                <td className="px-6 py-4 font-mono text-app-accent font-bold">{p.sku}</td>
                <td className="px-6 py-4 font-medium">{p.name}</td>
                <td className="px-6 py-4">${Number(p.sale_price).toLocaleString()}</td>
                <td className="px-6 py-4 text-center font-bold text-app-text">
                  {p.stockCount} {p.unit_type === 'WEIGHT' ? <span className="text-[10px] text-app-text-muted ml-1">Kg / Lts</span> : ""}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${p.statusColor}`}>
                    {p.statusText}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-3 opacity-50 group-hover:opacity-100 transition-opacity">
                  <button 
                     onClick={() => {
                        setPrintingProduct(p);
                        setLabelCount(Math.max(1, p.stockCount)); // Por defecto la cantidad en stock
                     }}
                     className="text-indigo-400 hover:text-indigo-300 transition-colors" 
                     title="Imprimir Etiqueta"
                  >
                    <Printer size={18} />
                  </button>
                  <button 
                     onClick={() => onEdit?.(p)}
                     className="text-blue-400 hover:text-blue-300 transition-colors" 
                     title="Editar"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                     onClick={() => handleToggleStatus(p.id, p.is_active)}
                     className={`${p.is_active ? 'text-rose-400 hover:text-rose-300' : 'text-emerald-400 hover:text-emerald-300'} transition-colors`} 
                     title={p.is_active ? "Desactivar" : "Activar"}
                  >
                    {p.is_active ? <PowerOff size={18} /> : <Power size={18} />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de Impresión de Etiqueta */}
      {printingProduct && (
        <div className="fixed inset-0 z-[60] flex justify-center items-center p-4 print:hidden">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setPrintingProduct(null)}></div>
            <div className="relative w-full max-w-sm bg-app-bg rounded-2xl shadow-2xl border border-app-border p-6 flex flex-col items-center">
                <div className="flex justify-between items-center w-full mb-6 border-b border-app-border pb-2">
                    <h3 className="text-app-text font-bold">Configuración de Etiquetas</h3>
                    <button onClick={() => setPrintingProduct(null)} className="text-app-text-muted hover:text-app-text transition-colors"><X size={18}/></button>
                </div>

                <div className="w-full mb-6 text-left">
                    <label className="block text-[10px] font-bold text-app-text-muted uppercase mb-2">Cantidad a Imprimir</label>
                    <div className="flex items-center gap-3">
                        <input 
                            type="number" 
                            min="1"
                            value={labelCount}
                            onChange={(e) => setLabelCount(parseInt(e.target.value) || 1)}
                            className="flex-1 bg-black/10 border border-app-border rounded-xl px-4 py-3 text-app-text font-bold text-lg focus:outline-none focus:ring-1 focus:ring-app-accent/50"
                        />
                        <button 
                            onClick={() => setLabelCount(printingProduct.stockCount)}
                            className="px-3 py-3 bg-app-card border border-app-border rounded-xl text-xs text-app-text-muted hover:text-app-text hover:bg-app-accent/10 transition-all font-bold"
                        >
                            Toda la Existencia ({printingProduct.stockCount})
                        </button>
                    </div>
                </div>
                
                <div className="bg-white p-4 rounded shadow-inner mb-6 max-h-[200px] overflow-y-auto w-full custom-scrollbar">
                    <div className="flex flex-col gap-2 scale-90 origin-top">
                        {Array.from({ length: Math.min(labelCount, 100) }).map((_, i) => (
                            <ProductLabel 
                                key={i}
                                name={printingProduct.name} 
                                price={printingProduct.sale_price} 
                                sku={printingProduct.sku} 
                            />
                        ))}
                        {labelCount > 100 && <p className="text-[10px] text-black/50 text-center italic">... y {labelCount - 100} etiquetas más</p>}
                    </div>
                </div>

                <div className="flex flex-col w-full gap-3">
                    <button 
                        onClick={() => window.print()}
                        className="w-full py-4 bg-app-accent hover:bg-app-accent-hover text-white font-black rounded-xl shadow-lg shadow-app-accent/20 transition-all flex items-center justify-center gap-3"
                    >
                        <Printer size={20} /> IMPRIMIR {labelCount} ETIQUETAS
                    </button>
                    <p className="text-[10px] text-app-text-muted text-center uppercase tracking-widest font-bold">Cada etiqueta saldrá en una hoja/sticker diferente</p>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
