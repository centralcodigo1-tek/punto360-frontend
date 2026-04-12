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
    <>
      <div className="bg-app-card backdrop-blur-md border border-app-border rounded-2xl shadow-xl overflow-hidden min-w-0">
        
        {/* VISTA DESKTOP: TABLA */}
        <div className="hidden md:block overflow-x-auto w-full">
          <table className="w-full text-sm text-left">
            <thead className="bg-app-accent/5 text-app-text-muted border-b border-app-border">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">SKU</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Producto</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Precio</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center">Stock</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center">Estado</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-app-border/20 text-app-text">
              {products.map((p) => (
                <tr
                  key={p.id}
                  className={`transition-all group ${p.is_active ? 'hover:bg-app-accent/5' : 'bg-black/10 opacity-50'}`}
                >
                  <td className="px-6 py-4 font-mono text-app-accent font-black tracking-tighter">{p.sku}</td>
                  <td className="px-6 py-4 font-black text-xs uppercase tracking-tight">{p.name}</td>
                  <td className="px-6 py-4 font-black">${Number(p.sale_price).toLocaleString()}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-black text-base">{p.stockCount.toLocaleString()}</span>
                    {p.unit_type === 'WEIGHT' && <span className="text-[10px] text-app-text-muted ml-1 font-black uppercase">Kg</span>}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${p.statusColor}`}>
                      {p.statusText}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2 opacity-50 group-hover:opacity-100 transition-opacity">
                    <button 
                       onClick={() => {
                          setPrintingProduct(p);
                          setLabelCount(Math.max(1, p.stockCount));
                       }}
                       className="p-2 bg-app-accent/10 text-app-accent hover:bg-app-accent/20 rounded-lg transition-all" 
                       title="Etiquetar"
                    >
                      <Printer size={16} />
                    </button>
                    <button 
                       onClick={() => onEdit?.(p)}
                       className="p-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-all" 
                       title="Editar"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                       onClick={() => handleToggleStatus(p.id, p.is_active)}
                       className={`p-2 rounded-lg transition-all ${p.is_active ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'}`} 
                       title={p.is_active ? "Desactivar" : "Reactivar"}
                    >
                      {p.is_active ? <PowerOff size={16} /> : <Power size={16} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* VISTA MÓVIL: CARDS */}
        <div className="md:hidden divide-y divide-app-border">
            {products.map((p) => (
                <div key={p.id} className={`p-4 flex flex-col gap-3 ${!p.is_active ? 'bg-black/10 opacity-50' : ''}`}>
                    <div className="flex justify-between items-start">
                        <div className="flex flex-col gap-1 min-w-0">
                            <span className="font-mono text-[10px] text-app-accent font-black tracking-tighter uppercase">{p.sku}</span>
                            <h4 className="font-black text-xs uppercase tracking-tight text-app-text truncate">{p.name}</h4>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="font-black text-base text-app-text">${Number(p.sale_price).toLocaleString()}</span>
                            <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${p.statusColor} mt-1`}>
                              {p.statusText}
                            </span>
                        </div>
                    </div>
                    
                    <div className="flex justify-between items-center bg-app-accent/5 p-3 rounded-xl border border-app-border/50">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-app-text-muted uppercase tracking-widest">Stock Disponible</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl font-black text-app-text">{p.stockCount.toLocaleString()}</span>
                                <span className="text-[10px] font-black text-app-text-muted uppercase">{p.unit_type === 'WEIGHT' ? 'Kg' : 'Un.'}</span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                              onClick={() => onEdit?.(p)}
                              className="p-3 bg-blue-500/10 text-blue-400 rounded-xl"
                          >
                              <Edit2 size={18} />
                          </button>
                          <button 
                              onClick={() => {
                                  setPrintingProduct(p);
                                  setLabelCount(Math.max(1, p.stockCount));
                              }}
                              className="p-3 bg-app-accent/10 text-app-accent rounded-xl"
                          >
                              <Printer size={18} />
                          </button>
                          <button 
                              onClick={() => handleToggleStatus(p.id, p.is_active)}
                              className={`p-3 rounded-xl ${p.is_active ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}
                          >
                              {p.is_active ? <PowerOff size={18} /> : <Power size={18} />}
                          </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
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
    </>
  );
}
