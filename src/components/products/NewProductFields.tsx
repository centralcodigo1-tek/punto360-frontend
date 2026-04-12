import { useEffect, useState } from "react";
import { api } from "../../api/axios";
import { PlusCircle, Loader2 } from "lucide-react";
import type { ProductRow } from "../../pages/InventoryPage";

interface Category {
  id: string;
  name: string;
}

interface NewProductFieldsProps {
  initialData?: ProductRow;
  onSaveSuccess?: () => void;
  onCancel?: () => void;
}

export default function NewProductFields({ initialData, onSaveSuccess, onCancel }: NewProductFieldsProps) {
  const isEdit = !!initialData;
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const [form, setForm] = useState({
    name: "",
    sku: "",
    category_id: "",
    cost_price: "",
    sale_price: "",
    unit_type: "UNIT",
    stock: "",
    is_active: true,
  });

  const fetchCategoriesAndSku = async () => {
    try {
      if (isEdit) {
        // En modo edición solo necesitamos las categorías
        const catRes = await api.get("/categories");
        setCategories(catRes.data);
        
        // Rellenar formulario
        setForm({
          name: initialData.name,
          sku: initialData.sku,
          category_id: initialData.category_id || "",
          cost_price: String(initialData.cost_price),
          sale_price: String(initialData.sale_price),
          unit_type: initialData.unit_type || "UNIT",
          stock: String(initialData.stockCount),
          is_active: initialData.is_active,
        });
      } else {
        const [catRes, skuRes] = await Promise.all([
          api.get("/categories"),
          api.get("/products/next-sku"),
        ]);
        setCategories(catRes.data);
        setForm((prev) => ({ ...prev, sku: skuRes.data.sku }));
      }
    } catch (error) {
      console.error("Error cargando datos iniciales:", error);
    }
  };

  useEffect(() => {
    fetchCategoriesAndSku();
  }, [initialData]);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      setIsCreatingCategory(true);
      const res = await api.post("/categories", { name: newCategoryName });
      setCategories([...categories, res.data]);
      setForm({ ...form, category_id: res.data.id });
      setNewCategoryName("");
    } catch (error) {
      console.error("Error creando categoría", error);
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      
      const payload = {
        ...form,
        cost_price: Number(form.cost_price),
        sale_price: Number(form.sale_price),
        stock: Number(form.stock),
      };

      if (isEdit && initialData?.id) {
        // ACTUALIZAR MODO
        await api.put(`/products/${initialData.id}`, payload);
        alert("Producto actualizado exitosamente");
      } else {
        // CREAR MODO
        await api.post("/products", payload);
        
        const skuRes = await api.get("/products/next-sku");
        setForm((prev) => ({ 
          ...prev, 
          name: "", 
          cost_price: "", 
          sale_price: "", 
          stock: "",
          sku: skuRes.data.sku 
        }));
        alert("Producto creado exitosamente");
      }

      if (onSaveSuccess) onSaveSuccess();
      
    } catch (error) {
      console.error(error);
      alert("Error al procesar el producto");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Columna Izquierda */}
        <div className="space-y-5">
          <h3 className="text-xl font-semibold text-white/90 mb-4 border-b border-white/10 pb-2">Datos Principales</h3>
          
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">Nombre del Producto</label>
            <input
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
              placeholder="Ej. Tenis Deportivos Azules"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">SKU (Código)</label>
            <input
              disabled
              className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-cyan-400 font-mono focus:outline-none"
              value={form.sku || "Cargando..."}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">Categoría</label>
            <div className="flex gap-2 items-center">
              <select
                required
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="flex-1 bg-[#1e293b] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
              >
                <option value="">Seleccione una categoría...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            
            {/* Quick Add Inline - Solo habilitado razonablemente si quieren */}
            <div className="mt-3 flex gap-2">
              <input 
                placeholder="O nombra una categoría nueva..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50"
              />
              <button 
                type="button" 
                onClick={handleCreateCategory}
                disabled={isCreatingCategory || !newCategoryName.trim()}
                className="px-3 py-2 bg-white/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg flex items-center gap-2 focus:outline-none transition-colors border border-transparent hover:border-cyan-500/50"
              >
                {isCreatingCategory ? <Loader2 size={16} className="animate-spin" /> : <PlusCircle size={16} />} 
                <span className="text-sm font-medium">Crear</span>
              </button>
            </div>
          </div>
        </div>

        {/* Columna Derecha */}
        <div className="space-y-5">
           <h3 className="text-xl font-semibold text-white/90 mb-4 border-b border-white/10 pb-2">Precios y Stock</h3>
           
           <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Precio Costo ($)</label>
                <input
                  required
                  type="number" step="0.01"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                  placeholder="0.00"
                  value={form.cost_price}
                  onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Precio Venta ($)</label>
                <input
                  required
                  type="number" step="0.01"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-emerald-400 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                  placeholder="0.00"
                  value={form.sale_price}
                  onChange={(e) => setForm({ ...form, sale_price: e.target.value })}
                />
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-full">
                <label className="block text-sm font-medium text-cyan-400 mb-1">Forma de Venta</label>
                <select
                  disabled={isEdit}
                  title={isEdit ? "No se puede cambiar la forma de venta después de creado" : ""}
                  className={`w-full border border-white/10 rounded-xl px-4 py-3 focus:outline-none transition-all ${isEdit ? 'bg-black/20 text-white/50 cursor-not-allowed' : 'bg-[#1e293b] text-white focus:ring-2 focus:ring-cyan-500/50'}`}
                  value={form.unit_type}
                  onChange={(e) => setForm({ ...form, unit_type: e.target.value })}
                >
                  <option value="UNIT">Por Unidad / Pieza (1, 2, 3)</option>
                  <option value="WEIGHT">A Granel / Fracciones (Kg, Lts, Mts)</option>
                </select>
              </div>

             <div>
                <label className="block flex justify-between text-sm font-medium text-white/70 mb-1">
                    Stock {form.unit_type === "WEIGHT" ? "(Cantidad ej. 1.5)" : "(Unidades)"}
                    {isEdit && <span className="text-[10px] text-rose-400 font-normal ml-2" title="Requiere ajuste formal">(Protegido)</span>}
                </label>
                <input
                  required
                  type="number"
                  step={form.unit_type === "WEIGHT" ? "0.001" : "1"}
                  disabled={isEdit}
                  className={`w-full border rounded-xl px-4 py-3 focus:outline-none transition-all ${isEdit ? 'bg-black/40 border-rose-500/20 text-white/50 cursor-not-allowed' : 'bg-white/5 border-white/10 text-white focus:ring-2 focus:ring-cyan-500/50'}`}
                  placeholder={form.unit_type === "WEIGHT" ? "Ej. 25.500" : "Ej. 50"}
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Estado</label>
                <select
                  className="w-full bg-[#1e293b] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none transition-all"
                  value={form.is_active ? "yes" : "no"}
                  onChange={(e) => setForm({ ...form, is_active: e.target.value === "yes" })}
                >
                  <option value="yes">Activo (Venta)</option>
                  <option value="no">Inactivo (Pausado)</option>
                </select>
              </div>
           </div>

        </div>

      </div>

      <div className="mt-8 pt-6 border-t border-white/10 flex justify-end gap-4">
        {onCancel && (
            <button 
              type="button" 
              onClick={onCancel}
              className="px-6 py-3 rounded-xl border border-white/10 text-white/70 hover:bg-white/5 hover:text-white transition-all font-medium"
            >
              Cancelar
            </button>
        )}
        <button 
          type="submit" 
          disabled={isLoading}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 transition-all font-semibold flex items-center gap-2"
        >
          {isLoading && <Loader2 size={18} className="animate-spin" />}
          {isEdit ? "Guardar Cambios" : "Guardar Producto"}
        </button>
      </div>

    </form>
  );
}
