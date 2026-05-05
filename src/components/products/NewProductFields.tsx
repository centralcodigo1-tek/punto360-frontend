import { useEffect, useState } from "react";
import { api } from "../../api/axios";
import { PlusCircle, Loader2, Layers, Trash2, Plus, X, ChevronDown, ChevronUp, CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "../../lib/toast";
import type { ProductRow } from "../../pages/InventoryPage";

interface AttributeValue { id: string; value: string; position: number; }
interface Attribute { id: string; name: string; values: AttributeValue[]; }
interface VariantRow {
  id: string;
  sku: string;
  barcode?: string | null;
  sale_price: number;
  cost_price: number;
  is_active: boolean;
  stock: { quantity: number }[];
  values: { attribute_value: { id: string; value: string; attribute: { name: string } } }[];
}
interface PendingVariant {
  label: string;
  sku: string;
  barcode: string;
  sale_price: string;
  cost_price: string;
  stock: string;
  valueIds: string[];
}
interface Category { id: string; name: string; }

interface NewProductFieldsProps {
  initialData?: ProductRow;
  onSaveSuccess?: () => void;
  onCancel?: () => void;
}

// Producto cartesiano de arrays
function cartesian<T>(arrays: T[][]): T[][] {
  return arrays.reduce<T[][]>(
    (acc, arr) => acc.flatMap(a => arr.map(b => [...a, b])),
    [[]]
  );
}

export default function NewProductFields({ initialData, onSaveSuccess, onCancel }: NewProductFieldsProps) {
  const isEdit = !!initialData;
  const [activeProductId, setActiveProductId] = useState<string | null>(initialData?.id ?? null);
  const [productJustCreated, setProductJustCreated] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  // Variantes
  const [showVariants, setShowVariants] = useState(false);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [newAttrName, setNewAttrName] = useState("");
  const [newAttrValues, setNewAttrValues] = useState("");
  const [addingAttr, setAddingAttr] = useState(false);

  // Variantes pendientes de confirmar (generación automática)
  const [pendingVariants, setPendingVariants] = useState<PendingVariant[]>([]);
  const [savingPending, setSavingPending] = useState(false);

  const [form, setForm] = useState({
    name: "",
    sku: "",
    barcode: "",
    category_id: "",
    cost_price: "",
    sale_price: "",
    unit_type: "UNIT",
    stock: "",
    is_active: true,
    is_consignment: false,
    has_variants: true,
  });

  const fetchCategoriesAndSku = async () => {
    try {
      if (isEdit) {
        const catRes = await api.get("/categories");
        setCategories(catRes.data);
        setForm({
          name: initialData.name,
          sku: initialData.sku,
          barcode: (initialData as any).barcode || "",
          category_id: initialData.category_id || "",
          cost_price: String(initialData.cost_price),
          sale_price: String(initialData.sale_price),
          unit_type: initialData.unit_type || "UNIT",
          stock: String(initialData.stockCount),
          is_active: initialData.is_active,
          is_consignment: initialData.is_consignment ?? false,
          has_variants: initialData.has_variants ?? false,
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

  useEffect(() => { fetchCategoriesAndSku(); }, [initialData]);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      setIsCreatingCategory(true);
      const res = await api.post("/categories", { name: newCategoryName });
      setCategories([...categories, res.data]);
      setForm({ ...form, category_id: res.data.id });
      setNewCategoryName("");
    } catch {
      console.error("Error creando categoría");
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const fetchVariantData = async (productId: string) => {
    const [attrRes, varRes] = await Promise.all([
      api.get(`/products/${productId}/attributes`),
      api.get(`/products/${productId}/variants`),
    ]);
    setAttributes(attrRes.data);
    setVariants(varRes.data);
    setShowVariants(true);
  };

  const handleAddAttribute = async () => {
    if (!activeProductId || !newAttrName.trim() || !newAttrValues.trim()) return;
    const values = newAttrValues.split(",").map(v => v.trim()).filter(Boolean);
    if (values.length === 0) return;
    setAddingAttr(true);
    try {
      await api.post(`/products/${activeProductId}/attributes`, { name: newAttrName, values });
      setNewAttrName("");
      setNewAttrValues("");
      setPendingVariants([]); // resetear pendientes al cambiar atributos
      await fetchVariantData(activeProductId);
      toast.success("Atributo agregado");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Error al agregar atributo");
    } finally { setAddingAttr(false); }
  };

  const handleDeleteAttribute = async (attrId: string) => {
    if (!activeProductId) return;
    if (!window.confirm("¿Eliminar este atributo y todas sus variantes?")) return;
    try {
      await api.delete(`/products/${activeProductId}/attributes/${attrId}`);
      setPendingVariants([]);
      await fetchVariantData(activeProductId);
      toast.success("Atributo eliminado");
    } catch { toast.error("Error al eliminar atributo"); }
  };

  const handleDeleteVariant = async (variantId: string) => {
    if (!activeProductId) return;
    if (!window.confirm("¿Eliminar esta variante?")) return;
    try {
      await api.delete(`/products/${activeProductId}/variants/${variantId}`);
      await fetchVariantData(activeProductId);
      toast.success("Variante eliminada");
    } catch { toast.error("Error al eliminar variante"); }
  };

  // Generar producto cartesiano de todos los atributos
  const handleGenerateVariants = () => {
    if (attributes.length === 0) return;

    const perAttr = attributes.map(a => a.values);
    const combos = cartesian(perAttr);

    // Filtrar combinaciones que ya existen
    const existingValueSets = variants.map(v =>
      v.values.map(x => x.attribute_value.id).sort().join("|")
    );

    const newPending: PendingVariant[] = combos
      .map(combo => {
        const valueIds = combo.map(v => v.id);
        const key = [...valueIds].sort().join("|");
        if (existingValueSets.includes(key)) return null;

        const labels = combo.map(v => v.value.toUpperCase().replace(/\s+/g, ""));
        const label = combo.map(v => v.value).join(" / ");
        const sku = `${form.sku}-${labels.join("-")}`;

        return {
          label,
          sku,
          barcode: "",
          sale_price: form.sale_price,
          cost_price: form.cost_price,
          stock: "0",
          valueIds,
        };
      })
      .filter((x): x is PendingVariant => x !== null);

    if (newPending.length === 0) {
      toast.info("Todas las combinaciones ya existen");
      return;
    }

    setPendingVariants(newPending);
  };

  const updatePending = (idx: number, field: keyof PendingVariant, value: string) => {
    setPendingVariants(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const removePending = (idx: number) => {
    setPendingVariants(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSavePendingVariants = async () => {
    if (!activeProductId || pendingVariants.length === 0) return;
    setSavingPending(true);
    let created = 0;
    let errors = 0;
    for (const v of pendingVariants) {
      try {
        await api.post(`/products/${activeProductId}/variants`, {
          sku: v.sku,
          barcode: v.barcode || undefined,
          sale_price: Number(v.sale_price),
          cost_price: Number(v.cost_price) || 0,
          stock: Number(v.stock) || 0,
          attribute_value_ids: v.valueIds,
        });
        created++;
      } catch { errors++; }
    }
    setPendingVariants([]);
    await fetchVariantData(activeProductId);
    setSavingPending(false);
    if (errors === 0) toast.success(`${created} variante${created !== 1 ? "s" : ""} creada${created !== 1 ? "s" : ""}`);
    else toast.warning(`${created} creadas, ${errors} con error`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      const payload = {
        ...form,
        cost_price: form.is_consignment ? 0 : Number(form.cost_price),
        sale_price: form.is_consignment ? 0 : Number(form.sale_price),
        stock: form.is_consignment ? 0 : Number(form.stock),
      };

      if (isEdit && initialData?.id) {
        await api.put(`/products/${initialData.id}`, payload);
        toast.success("Producto actualizado exitosamente");
        if (onSaveSuccess) onSaveSuccess();
      } else {
        const res = await api.post("/products", payload);
        const newProductId: string = res.data.id;

        if (form.has_variants) {
          setActiveProductId(newProductId);
          setProductJustCreated(true);
          setShowVariants(true);
          toast.success("Producto creado. Ahora agrega sus variantes.");
        } else {
          toast.success("Producto creado exitosamente");
          if (onSaveSuccess) onSaveSuccess();
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("Error al procesar el producto");
    } finally {
      setIsLoading(false);
    }
  };

  const cost = parseFloat(form.cost_price) || 0;
  const sale = parseFloat(form.sale_price) || 0;
  const margin = cost > 0 && sale > 0 ? ((sale - cost) / cost) * 100 : null;
  const marginColor = margin === null ? '' : margin >= 30 ? 'text-emerald-400' : margin >= 10 ? 'text-amber-400' : 'text-rose-400';
  const showVariantPanel = !!activeProductId && form.has_variants;

  return (
    <form onSubmit={handleSubmit} className="bg-app-card border border-app-border rounded-2xl p-6 shadow-2xl">

      {/* Banner post-creación */}
      {productJustCreated && (
        <div className="flex items-center gap-3 mb-6 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <p className="text-sm font-medium">Producto creado correctamente. Agrega los atributos y variantes, y cuando termines pulsa <strong>Finalizar</strong>.</p>
        </div>
      )}

      {/* Campos del producto */}
      {!productJustCreated && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* Columna Izquierda */}
          <div className="space-y-5">
            <h3 className="text-xl font-semibold text-app-text mb-4 border-b border-app-border pb-2">Datos Principales</h3>

            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">Nombre del Producto</label>
              <input
                required
                className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-3 text-app-text placeholder-app-text-muted/50 focus:outline-none focus:ring-2 focus:ring-app-accent/50 transition-all"
                placeholder="Ej. Tenis Deportivos Azules"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">SKU (Código)</label>
              <input
                disabled
                className="w-full bg-app-bg/50 border border-app-border rounded-xl px-4 py-3 text-app-accent font-mono focus:outline-none"
                value={form.sku || "Cargando..."}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">Código de Barras <span className="opacity-50 font-normal">(opcional)</span></label>
              <input
                type="text"
                className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-3 text-app-text font-mono placeholder-app-text-muted/40 focus:outline-none focus:ring-2 focus:ring-app-accent/50 transition-all"
                placeholder="Ej. 7702009040393"
                value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">Categoría</label>
              <select
                required
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-3 text-app-text focus:outline-none focus:ring-2 focus:ring-app-accent/50 transition-all"
              >
                <option value="">Seleccione una categoría...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <div className="mt-3 flex gap-2">
                <input
                  placeholder="O nombra una categoría nueva..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 bg-app-bg border border-app-border rounded-lg px-3 py-2 text-sm text-app-text focus:outline-none focus:border-app-accent/50"
                />
                <button
                  type="button" onClick={handleCreateCategory}
                  disabled={isCreatingCategory || !newCategoryName.trim()}
                  className="px-3 py-2 bg-app-accent/10 hover:bg-app-accent/20 text-app-accent rounded-lg flex items-center gap-2 focus:outline-none transition-colors border border-app-accent/20"
                >
                  {isCreatingCategory ? <Loader2 size={16} className="animate-spin" /> : <PlusCircle size={16} />}
                  <span className="text-sm font-medium">Crear</span>
                </button>
              </div>
            </div>
          </div>

          {/* Columna Derecha */}
          <div className="space-y-5">
            <h3 className="text-xl font-semibold text-app-text mb-4 border-b border-app-border pb-2">Precios y Stock</h3>

           {form.is_consignment ? (
             <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-500/30 bg-amber-500/10">
               <span className="text-amber-400 text-sm">El precio lo ingresa el cajero en cada venta.</span>
             </div>
           ) : (
             <>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium text-app-text-muted mb-1">Precio Costo ($)</label>
                   <input
                     required
                     type="number" step="0.01"
                     className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-3 text-app-text focus:outline-none focus:ring-2 focus:ring-app-accent/50 transition-all"
                     placeholder="0.00"
                     value={form.cost_price}
                     onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-app-text-muted mb-1">Precio Venta ($)</label>
                   <input
                     required
                     type="number" step="0.01"
                     className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-3 text-emerald-400 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                     placeholder="0.00"
                     value={form.sale_price}
                     onChange={(e) => setForm({ ...form, sale_price: e.target.value })}
                   />
                 </div>
               </div>

               {margin !== null && (
                 <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${margin >= 30 ? 'bg-emerald-500/10 border-emerald-500/20' : margin >= 10 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
                   <span className="text-xs font-bold text-app-text-muted uppercase tracking-widest">Rentabilidad</span>
                   <span className={`text-xl font-black ${marginColor}`}>{margin.toFixed(1)}%</span>
                 </div>
               )}
             </>
           )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-full">
                <label className="block text-sm font-medium text-app-accent mb-1">Forma de Venta</label>
                <select
                  disabled={isEdit}
                  className={`w-full border border-app-border rounded-xl px-4 py-3 focus:outline-none transition-all ${isEdit ? 'bg-app-bg/50 text-app-text-muted cursor-not-allowed' : 'bg-app-bg text-app-text focus:ring-2 focus:ring-app-accent/50'}`}
                  value={form.unit_type}
                  onChange={(e) => setForm({ ...form, unit_type: e.target.value })}
                >
                  <option value="UNIT">Por Unidad / Pieza (1, 2, 3)</option>
                  <option value="WEIGHT">A Granel / Fracciones (Kg, Lts, Mts)</option>
                </select>
              </div>

             {!form.is_consignment && (
               <div>
                 <label className="block flex justify-between text-sm font-medium text-app-text-muted mb-1">
                     Stock {form.unit_type === "WEIGHT" ? "(Cantidad ej. 1.5)" : "(Unidades)"}
                     {isEdit && <span className="text-[10px] text-rose-400 font-normal ml-2" title="Requiere ajuste formal">(Protegido)</span>}
                 </label>
                 <input
                   required
                   type="number"
                   step={form.unit_type === "WEIGHT" ? "0.001" : "1"}
                   disabled={isEdit}
                   className={`w-full border rounded-xl px-4 py-3 focus:outline-none transition-all ${isEdit ? 'bg-app-bg/30 border-rose-500/20 text-app-text-muted cursor-not-allowed' : 'bg-app-bg border-app-border text-app-text focus:ring-2 focus:ring-app-accent/50'}`}
                   placeholder={form.unit_type === "WEIGHT" ? "Ej. 25.500" : "Ej. 50"}
                   value={form.stock}
                   onChange={(e) => setForm({ ...form, stock: e.target.value })}
                 />
               </div>
             )}
              <div>
                <label className="block text-sm font-medium text-app-text-muted mb-1">Estado</label>
                <select
                  className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-3 text-app-text focus:outline-none transition-all"
                  value={form.is_active ? "yes" : "no"}
                  onChange={(e) => setForm({ ...form, is_active: e.target.value === "yes" })}
                >
                  <option value="yes">Activo (Venta)</option>
                  <option value="no">Inactivo (Pausado)</option>
                </select>
              </div>

              <div className="col-span-full">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, is_consignment: !form.is_consignment })}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${form.is_consignment ? 'bg-amber-500/10 border-amber-500/40 text-amber-400' : 'bg-app-bg border-app-border text-app-text-muted'}`}
                >
                  <div className="text-left">
                    <p className="text-sm font-medium">Producto de Consignación</p>
                    <p className="text-xs opacity-70">No descuenta inventario al vender</p>
                  </div>
                  <div className={`w-10 h-6 rounded-full transition-all flex items-center px-1 ${form.is_consignment ? 'bg-amber-500 justify-end' : 'bg-app-border justify-start'}`}>
                    <div className="w-4 h-4 rounded-full bg-white shadow" />
                  </div>
                </button>
              </div>

              <div className="col-span-full">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, has_variants: !form.has_variants })}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${form.has_variants ? 'bg-violet-500/10 border-violet-500/40 text-violet-400' : 'bg-app-bg border-app-border text-app-text-muted'}`}
                >
                  <div className="text-left">
                    <p className="text-sm font-medium">¿Producto con variantes?</p>
                    <p className="text-xs opacity-70">Talla, Color u otros atributos</p>
                  </div>
                  <div className={`w-10 h-6 rounded-full transition-all flex items-center px-1 ${form.has_variants ? 'bg-violet-500 justify-end' : 'bg-app-border justify-start'}`}>
                    <div className="w-4 h-4 rounded-full bg-white shadow" />
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Panel de Variantes ── */}
      {showVariantPanel && (
        <div className={productJustCreated ? "" : "mt-8 border-t border-app-border pt-6"}>

          {/* Toggle colapsable (solo en edición normal) */}
          {!productJustCreated && (
            <button
              type="button"
              onClick={() => {
                if (!showVariants) fetchVariantData(activeProductId!);
                else setShowVariants(false);
              }}
              className="flex items-center gap-3 w-full text-left group"
            >
              <div className="p-2 bg-violet-500/10 text-violet-400 rounded-lg group-hover:bg-violet-500/20 transition-colors">
                <Layers size={18} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-app-text text-sm">Variantes del producto</p>
                <p className="text-xs text-app-text-muted">Talla, Color u otros atributos</p>
              </div>
              {showVariants ? <ChevronUp size={16} className="text-app-text-muted" /> : <ChevronDown size={16} className="text-app-text-muted" />}
            </button>
          )}

          {(showVariants || productJustCreated) && (
            <div className={`space-y-6 ${productJustCreated ? "" : "mt-4"}`}>

              {/* ── Atributos existentes ── */}
              {attributes.length > 0 && (
                <div className="space-y-2">
                  {attributes.map(attr => (
                    <div key={attr.id} className="bg-app-bg border border-app-border rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm text-app-text">{attr.name}</span>
                        <button type="button" onClick={() => handleDeleteAttribute(attr.id)} className="text-app-text-muted hover:text-rose-400 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {attr.values.map(v => (
                          <span key={v.id} className="px-2 py-0.5 bg-violet-500/10 text-violet-400 text-[11px] font-bold rounded-full border border-violet-500/20">{v.value}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Agregar atributo ── */}
              <div className="bg-app-bg border border-app-border rounded-xl p-4 space-y-3">
                <p className="text-xs font-black uppercase tracking-widest text-app-text-muted">Agregar atributo</p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text" placeholder="Nombre (ej. Talla)"
                    value={newAttrName} onChange={e => setNewAttrName(e.target.value)}
                    className="bg-app-card border border-app-border rounded-lg px-3 py-2 text-sm text-app-text focus:outline-none focus:border-violet-500/50"
                  />
                  <input
                    type="text" placeholder="Valores: S, M, L, XL"
                    value={newAttrValues} onChange={e => setNewAttrValues(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), handleAddAttribute())}
                    className="bg-app-card border border-app-border rounded-lg px-3 py-2 text-sm text-app-text focus:outline-none focus:border-violet-500/50"
                  />
                </div>
                <button
                  type="button" onClick={handleAddAttribute}
                  disabled={addingAttr || !newAttrName.trim() || !newAttrValues.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 rounded-lg text-sm font-bold transition-colors border border-violet-500/20 disabled:opacity-40"
                >
                  {addingAttr ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Agregar atributo
                </button>
              </div>

              {/* ── Botón generar variantes ── */}
              {attributes.length > 0 && (
                <button
                  type="button"
                  onClick={handleGenerateVariants}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-black text-sm transition-colors shadow-lg shadow-violet-900/30"
                >
                  <Sparkles size={16} />
                  Generar variantes automáticamente
                  <span className="text-violet-300 text-xs font-normal">
                    ({attributes.reduce((acc, a) => acc * a.values.length, 1)} combinaciones)
                  </span>
                </button>
              )}

              {/* ── Lista editable de variantes pendientes ── */}
              {pendingVariants.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black uppercase tracking-widest text-violet-400">
                      Variantes generadas — edita y confirma
                    </p>
                    <button
                      type="button"
                      onClick={() => setPendingVariants([])}
                      className="text-xs text-app-text-muted hover:text-rose-400 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>

                  {/* Cabecera */}
                  <div className="grid grid-cols-12 gap-2 px-2 text-[10px] font-bold text-app-text-muted uppercase">
                    <span className="col-span-2">Combinación</span>
                    <span className="col-span-2">SKU</span>
                    <span className="col-span-3">Código Barras</span>
                    <span className="col-span-2 text-center">Costo</span>
                    <span className="col-span-1 text-center">Venta</span>
                    <span className="col-span-1 text-center">Stock</span>
                    <span className="col-span-1" />
                  </div>

                  {pendingVariants.map((v, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-app-bg border border-violet-500/20 rounded-xl px-3 py-2">
                      <div className="col-span-2">
                        <p className="text-xs font-bold text-violet-300">{v.label}</p>
                      </div>
                      <div className="col-span-2">
                        <input
                          type="text" value={v.sku}
                          onChange={e => updatePending(idx, "sku", e.target.value)}
                          className="w-full bg-app-card border border-app-border rounded-lg px-2 py-1.5 text-xs font-mono text-app-accent focus:outline-none focus:border-violet-500/50"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="text" value={v.barcode} placeholder="Ej. 77020090..."
                          onChange={e => updatePending(idx, "barcode", e.target.value)}
                          className="w-full bg-app-card border border-app-border rounded-lg px-2 py-1.5 text-xs font-mono text-app-text focus:outline-none focus:border-violet-500/50"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number" value={v.cost_price}
                          onChange={e => updatePending(idx, "cost_price", e.target.value)}
                          className="w-full bg-app-card border border-app-border rounded-lg px-2 py-1.5 text-xs text-app-text text-center focus:outline-none focus:border-violet-500/50"
                        />
                      </div>
                      <div className="col-span-1">
                        <input
                          type="number" value={v.sale_price}
                          onChange={e => updatePending(idx, "sale_price", e.target.value)}
                          className="w-full bg-app-card border border-emerald-500/20 rounded-lg px-2 py-1.5 text-xs text-emerald-400 font-bold text-center focus:outline-none focus:border-emerald-500/50"
                        />
                      </div>
                      <div className="col-span-1">
                        <input
                          type="number" value={v.stock}
                          onChange={e => updatePending(idx, "stock", e.target.value)}
                          className="w-full bg-app-card border border-app-border rounded-lg px-2 py-1.5 text-xs text-app-text text-center focus:outline-none focus:border-violet-500/50"
                        />
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <button type="button" onClick={() => removePending(idx)} className="text-app-text-muted hover:text-rose-400 transition-colors">
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={handleSavePendingVariants}
                    disabled={savingPending || pendingVariants.length === 0}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-sm transition-colors shadow-lg shadow-emerald-900/20 disabled:opacity-40"
                  >
                    {savingPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    Confirmar {pendingVariants.length} variante{pendingVariants.length !== 1 ? "s" : ""}
                  </button>
                </div>
              )}

              {/* ── Variantes ya guardadas ── */}
              {variants.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-black uppercase tracking-widest text-app-text-muted">Variantes guardadas ({variants.length})</p>
                  {variants.map(v => (
                    <div key={v.id} className="flex items-center justify-between bg-app-bg border border-app-border rounded-xl px-4 py-3">
                      <div>
                        <div className="flex flex-wrap gap-1 mb-1">
                          {v.values.map((x, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-violet-500/10 text-violet-400 text-[10px] font-bold rounded">
                              {x.attribute_value.attribute.name}: {x.attribute_value.value}
                            </span>
                          ))}
                        </div>
                        <span className="font-mono text-app-accent text-xs">{v.sku}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-emerald-400 font-black text-sm">${Number(v.sale_price).toLocaleString()}</p>
                          <p className="text-app-text-muted text-[10px]">{v.stock[0]?.quantity ?? 0} un. stock</p>
                        </div>
                        <input
                          type="text"
                          defaultValue={v.barcode ?? ""}
                          placeholder="Código barras"
                          onBlur={async (e) => {
                            const val = e.target.value.trim();
                            if (val === (v.barcode ?? "")) return;
                            try {
                              await api.put(`/products/${activeProductId}/variants/${v.id}`, { barcode: val || null });
                              toast.success("Barcode actualizado");
                            } catch { toast.error("Error al guardar barcode"); }
                          }}
                          className="w-32 bg-app-bg border border-app-border rounded-lg px-2 py-1 text-xs font-mono text-app-text focus:outline-none focus:border-app-accent/50"
                        />
                        <button type="button" onClick={() => handleDeleteVariant(v.id)} className="text-app-text-muted hover:text-rose-400 transition-colors">
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Botones ── */}
      <div className="mt-8 pt-6 border-t border-app-border flex justify-end gap-4">
        {onCancel && !productJustCreated && (
          <button
            type="button" onClick={onCancel}
            className="px-6 py-3 rounded-xl border border-app-border text-app-text-muted hover:bg-app-accent/5 hover:text-app-text transition-all font-medium"
          >
            Cancelar
          </button>
        )}

        {productJustCreated ? (
          <button
            type="button"
            onClick={() => { if (onSaveSuccess) onSaveSuccess(); }}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20 transition-all font-semibold flex items-center gap-2"
          >
            <CheckCircle2 size={18} />
            Finalizar e ir al Inventario
          </button>
        ) : (
          <button
            type="submit" disabled={isLoading}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 transition-all font-semibold flex items-center gap-2"
          >
            {isLoading && <Loader2 size={18} className="animate-spin" />}
            {isEdit ? "Guardar Cambios" : form.has_variants ? "Guardar y agregar variantes" : "Guardar Producto"}
          </button>
        )}
      </div>

    </form>
  );
}
