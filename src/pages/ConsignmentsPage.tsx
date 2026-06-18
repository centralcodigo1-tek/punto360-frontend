import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import { api } from "../api/axios";
import { useAuth } from "../auth/AuthContext";
import { toast } from "../lib/toast";
import {
  Handshake, Search, Trash2, ChevronDown, ChevronUp,
  Loader2, CheckCircle2, Ban, AlertTriangle, User, Phone, X, Layers
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
interface VariantOption {
  id: string; sku: string; sale_price: number; cost_price: number;
  values: { attribute_value: { value: string; attribute: { name: string } } }[];
}
interface VariantEntry {
  variantId: string; label: string; sku: string; quantity: string; consignorPrice: string;
}
interface Product {
  id: string; name: string; sku: string; unit_type: string; has_variants: boolean;
  cost_price: number; sale_price: number;
}
interface ConsignmentItem {
  productId: string; productName: string; sku: string; unit_type: string;
  quantity: number; consignorPrice: number; variantId?: string; variantLabel?: string;
}
interface ConsignmentRecord {
  id: string; consignor_name: string; consignor_phone?: string; notes?: string;
  status: string; created_at: string;
  items: {
    id: string; product_id: string; variant_id?: string;
    quantity: number; consignor_price: number;
    current_stock: number; sold_quantity: number; amount_owed: number;
    product: { name: string; sku: string; unit_type: string; category_id?: string; categories?: { id: string; name: string } | null } | null;
  }[];
}

const cop = (v: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(v);
const variantLabel = (v: VariantOption) =>
  v.values.map(x => `${x.attribute_value.attribute.name}: ${x.attribute_value.value}`).join(" / ") || v.sku;

export default function ConsignmentsPage() {
  const { user, hasPermission } = useAuth();
  const canManage = hasPermission("purchases.manage") || hasPermission("inventory.manage") || user?.role === "ADMIN";

  // ── Consignors ─────────────────────────────────────────────────────────────
  const [consignors, setConsignors] = useState<{ name: string; phone: string | null }[]>([]);

  // ── Products ───────────────────────────────────────────────────────────────
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  // ── Variant picker ─────────────────────────────────────────────────────────
  const [variantPickerProduct, setVariantPickerProduct] = useState<Product | null>(null);
  const [variantEntries, setVariantEntries] = useState<VariantEntry[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);

  // ── Form state ─────────────────────────────────────────────────────────────
  const [consignorName, setConsignorName] = useState("");
  const [consignorPhone, setConsignorPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ConsignmentItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── History ────────────────────────────────────────────────────────────────
  const [consignments, setConsignments] = useState<ConsignmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  const allCategories = useMemo(() => {
    const map = new Map<string, string>();
    consignments.forEach(c =>
      (c.items ?? []).forEach(item => {
        const cat = item.product?.categories;
        if (cat) map.set(cat.id, cat.name);
      })
    );
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [consignments]);

  const filteredProducts = useMemo(() =>
    productSearch.trim()
      ? allProducts.filter(p =>
          p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
          p.sku.toLowerCase().includes(productSearch.toLowerCase())
        ).slice(0, 8)
      : [],
    [allProducts, productSearch]
  );

  useEffect(() => {
    api.get("/products").then(r => setAllProducts(r.data));
    api.get("/consignments/consignors").then(r => setConsignors(r.data)).catch(() => {});
    fetchConsignments();
  }, []);

  const fetchConsignments = async () => {
    setIsLoading(true);
    try {
      const r = await api.get("/consignments");
      setConsignments(r.data);
    } catch { toast.error("Error al cargar consignaciones."); }
    finally { setIsLoading(false); }
  };

  const addItem = async (product: Product) => {
    setProductSearch(""); setShowDropdown(false);

    if (product.has_variants) {
      setLoadingVariants(true);
      try {
        const res = await api.get(`/products/${product.id}/variants`);
        const variants: VariantOption[] = res.data;
        setVariantEntries(variants.map(v => ({
          variantId: v.id,
          label: variantLabel(v),
          sku: v.sku,
          quantity: "",
          consignorPrice: String(Number(v.cost_price) || 0),
        })));
        setVariantPickerProduct(product);
      } catch { toast.error("No se pudieron cargar las variantes"); }
      finally { setLoadingVariants(false); }
      return;
    }

    if (items.find(i => i.productId === product.id && !i.variantId)) return;
    setItems(prev => [...prev, {
      productId: product.id, productName: product.name,
      sku: product.sku, unit_type: product.unit_type,
      quantity: 1, consignorPrice: Number(product.cost_price) || 0,
    }]);
  };

  const confirmVariantEntries = () => {
    if (!variantPickerProduct) return;
    const toAdd = variantEntries.filter(e => parseFloat(e.quantity) > 0);
    if (toAdd.length === 0) { toast.warning("Ingresa cantidad en al menos una variante"); return; }

    const newItems: ConsignmentItem[] = toAdd
      .filter(e => !items.find(i => i.variantId === e.variantId))
      .map(e => ({
        productId: variantPickerProduct.id,
        productName: variantPickerProduct.name,
        sku: e.sku,
        unit_type: variantPickerProduct.unit_type,
        quantity: parseFloat(e.quantity),
        consignorPrice: parseFloat(e.consignorPrice) || 0,
        variantId: e.variantId,
        variantLabel: e.label,
      }));

    const updated = items.map(item => {
      const entry = toAdd.find(e => e.variantId === item.variantId);
      if (!entry) return item;
      return { ...item, quantity: parseFloat(entry.quantity), consignorPrice: parseFloat(entry.consignorPrice) || 0 };
    });

    setItems([...updated, ...newItems]);
    setVariantPickerProduct(null);
    setVariantEntries([]);
  };

  const updateEntry = (idx: number, field: keyof VariantEntry, value: string) => {
    setVariantEntries(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  };

  const updateItem = (idx: number, field: "quantity" | "consignorPrice", value: number) => {
    setItems(prev => prev.map((i, n) => n === idx ? { ...i, [field]: value } : i));
  };

  const removeItem = (idx: number) => setItems(prev => prev.filter((_, n) => n !== idx));

  const handleSubmit = async () => {
    if (!consignorName.trim()) return toast.error("Ingresa el nombre del consignador.");
    if (items.length === 0) return toast.error("Agrega al menos un producto.");
    if (items.some(i => i.quantity <= 0)) return toast.error("Las cantidades deben ser mayores a 0.");
    setIsSubmitting(true);
    try {
      await api.post("/consignments", {
        consignorName: consignorName.trim(),
        consignorPhone: consignorPhone.trim() || undefined,
        notes: notes.trim() || undefined,
        items: items.map(i => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
          consignorPrice: i.consignorPrice,
        })),
      });
      toast.success("Consignación registrada. El stock fue actualizado.");
      setConsignorName(""); setConsignorPhone(""); setNotes(""); setItems([]);
      fetchConsignments();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Error al registrar la consignación.");
    } finally { setIsSubmitting(false); }
  };

  const handleCancel = async () => {
    if (!cancelConfirm) return;
    setIsCancelling(true);
    try {
      await api.delete(`/consignments/${cancelConfirm}`);
      toast.success("Consignación anulada. El stock fue revertido.");
      setCancelConfirm(null);
      fetchConsignments();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Error al anular.");
    } finally { setIsCancelling(false); }
  };

  const filterItemsByCategory = (items: ConsignmentRecord["items"]) =>
    categoryFilter === "ALL"
      ? items
      : items.filter(i => i.product?.categories?.id === categoryFilter);

  const totalOwed = (items: ConsignmentRecord["items"]) =>
    items.reduce((sum, i) => sum + i.amount_owed, 0);
  const totalConsigned = (items: ConsignmentRecord["items"]) =>
    items.reduce((sum, i) => sum + i.quantity * i.consignor_price, 0);

  return (
    <DashboardLayout>
      {/* ── Modal Anular ── */}
      {cancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCancelConfirm(null)} />
          <div className="relative w-full max-w-sm bg-app-card border border-rose-500/30 rounded-2xl shadow-2xl z-10 p-6 flex flex-col gap-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} className="text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-app-text text-lg">Anular Consignación</h3>
                <p className="text-sm text-app-text-muted mt-1">Se revertirá el stock ingresado. Esta acción no se puede deshacer.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setCancelConfirm(null)} className="flex-1 py-2.5 rounded-xl border border-app-border text-app-text-muted text-sm hover:text-app-text transition-colors">Cancelar</button>
              <button onClick={handleCancel} disabled={isCancelling} className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-40">
                {isCancelling ? <Loader2 size={15} className="animate-spin" /> : <Ban size={15} />} Anular
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Variantes ── */}
      {variantPickerProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setVariantPickerProduct(null); setVariantEntries([]); }} />
          <div className="relative w-full max-w-2xl bg-app-card border border-app-border rounded-2xl shadow-2xl z-10 flex flex-col max-h-[90vh]">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-app-border">
              <Layers size={18} className="text-amber-400" />
              <div className="flex-1">
                <p className="font-bold text-app-text">{variantPickerProduct.name}</p>
                <p className="text-xs text-app-text-muted">Ingresa la cantidad por variante</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {variantEntries.length === 0 ? (
                <p className="text-center text-sm text-app-text-muted py-8">Este producto no tiene variantes creadas.</p>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-12 gap-2 px-1 text-[10px] font-bold text-app-text-muted uppercase">
                    <span className="col-span-4">Variante</span>
                    <span className="col-span-3">SKU</span>
                    <span className="col-span-2 text-center">Cantidad</span>
                    <span className="col-span-3 text-center">Precio consignador</span>
                  </div>
                  {variantEntries.map((entry, idx) => (
                    <div key={entry.variantId} className="grid grid-cols-12 gap-2 items-center bg-app-bg border border-app-border rounded-xl px-3 py-2">
                      <div className="col-span-4">
                        <p className="text-xs font-bold text-amber-300 truncate">{entry.label}</p>
                      </div>
                      <div className="col-span-3">
                        <p className="text-xs font-mono text-app-text-muted truncate">{entry.sku}</p>
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number" min="0" step="1" placeholder="0"
                          value={entry.quantity}
                          onChange={e => updateEntry(idx, "quantity", e.target.value)}
                          className="w-full bg-app-card border border-app-border rounded-lg px-2 py-1.5 text-sm text-app-text text-center focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number" min="0" step="100"
                          value={entry.consignorPrice}
                          onChange={e => updateEntry(idx, "consignorPrice", e.target.value)}
                          className="w-full bg-amber-500/5 border border-amber-500/20 rounded-lg px-2 py-1.5 text-sm text-amber-400 text-center focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-app-border">
              <button onClick={() => { setVariantPickerProduct(null); setVariantEntries([]); }} className="flex-1 py-2.5 rounded-xl border border-app-border text-app-text-muted text-sm hover:text-app-text transition-colors">Cancelar</button>
              <button onClick={confirmVariantEntries} disabled={variantEntries.length === 0} className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-40">
                <CheckCircle2 size={16} /> Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-app-text flex items-center gap-3">
          <Handshake size={28} className="text-amber-400" />
          Consignaciones
        </h1>
        <p className="text-app-text-muted mt-1 text-sm">Registra mercancía recibida en consignación — el stock se actualiza sin generar una compra.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* ── FORMULARIO ── */}
        <div className="bg-app-card border border-app-border rounded-2xl shadow-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-app-border flex items-center gap-2">
            <Handshake size={16} className="text-amber-400" />
            <h2 className="font-bold text-app-text">Nueva Consignación</h2>
          </div>
          <div className="p-6 flex flex-col gap-5">

            {/* Consignador */}
            <div className="flex flex-col gap-3">
              <h3 className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Consignador</h3>

              {consignors.length > 0 && (
                <select
                  onChange={e => {
                    const c = consignors.find(c => c.name === e.target.value);
                    if (c) { setConsignorName(c.name); setConsignorPhone(c.phone ?? ""); }
                    else { setConsignorName(""); setConsignorPhone(""); }
                  }}
                  defaultValue=""
                  className="w-full bg-app-bg border border-amber-500/30 rounded-xl px-4 py-2.5 text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                >
                  <option value="">— Seleccionar consignador existente —</option>
                  {consignors.map(c => (
                    <option key={c.name} value={c.name}>{c.name}{c.phone ? ` · ${c.phone}` : ""}</option>
                  ))}
                </select>
              )}

              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-text-muted" />
                <input type="text" placeholder="Nombre del consignador *" value={consignorName} onChange={e => setConsignorName(e.target.value)}
                  className="w-full bg-app-bg border border-app-border rounded-xl pl-9 pr-4 py-2.5 text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40" />
              </div>
              <div className="relative">
                <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-text-muted" />
                <input type="text" placeholder="Teléfono (opcional)" value={consignorPhone} onChange={e => setConsignorPhone(e.target.value)}
                  className="w-full bg-app-bg border border-app-border rounded-xl pl-9 pr-4 py-2.5 text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40" />
              </div>
              <input type="text" placeholder="Notas (opcional)" value={notes} onChange={e => setNotes(e.target.value)}
                className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-2.5 text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40" />
            </div>

            {/* Buscar productos */}
            <div>
              <h3 className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-2">Productos</h3>
              <div className="relative">
                {loadingVariants
                  ? <Loader2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400 animate-spin" />
                  : <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-text-muted" />
                }
                <input type="text" placeholder="Buscar por nombre o SKU..."
                  value={productSearch}
                  onChange={e => { setProductSearch(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  className="w-full bg-app-bg border border-app-border rounded-xl pl-9 pr-4 py-2.5 text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                />
                {showDropdown && productSearch && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-app-bg border border-app-border rounded-xl shadow-2xl z-20 overflow-hidden">
                    {filteredProducts.map(p => (
                      <button key={p.id} onClick={() => addItem(p)} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-app-card text-left transition-colors">
                        <span className="text-amber-400 font-mono text-xs w-24 shrink-0">{p.sku}</span>
                        <span className="text-app-text text-sm flex-1">{p.name}</span>
                        {p.has_variants && (
                          <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                            <Layers size={9} /> Variantes
                          </span>
                        )}
                        <span className="text-app-text-muted text-xs">{p.unit_type === "WEIGHT" ? "Kg" : "Unid."}</span>
                      </button>
                    ))}
                    {filteredProducts.length === 0 && <p className="px-4 py-2.5 text-sm text-app-text-muted">No se encontraron resultados</p>}
                    <button onClick={() => setShowDropdown(false)} className="w-full flex items-center gap-2 px-4 py-2.5 border-t border-app-border text-app-text-muted hover:text-app-text text-xs transition-colors">
                      <X size={13} /> Cerrar
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Tabla de ítems */}
            {items.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-12 gap-2 px-1 text-[10px] font-bold text-app-text-muted uppercase">
                  <span className="col-span-4">Producto</span>
                  <span className="col-span-3 text-center">Cantidad</span>
                  <span className="col-span-4 text-center">Precio consignador</span>
                  <span className="col-span-1" />
                </div>
                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-app-bg rounded-xl px-3 py-2 border border-app-border">
                    <div className="col-span-4">
                      <p className="text-sm font-medium text-app-text truncate">{item.productName}</p>
                      {item.variantLabel && <p className="text-[10px] text-amber-400 font-bold truncate">{item.variantLabel}</p>}
                      <p className="text-[10px] text-app-text-muted">{item.sku} · {item.unit_type === "WEIGHT" ? "Kg" : "Unid."}</p>
                    </div>
                    <div className="col-span-3">
                      <input type="number" min="0.001" step={item.unit_type === "WEIGHT" ? "0.001" : "1"}
                        value={item.quantity} onChange={e => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)}
                        className="w-full bg-app-bg border border-app-border rounded-lg px-2 py-1.5 text-app-text text-sm text-center focus:outline-none focus:ring-1 focus:ring-amber-500/40" />
                    </div>
                    <div className="col-span-4">
                      <input type="number" min="0" step="100"
                        value={item.consignorPrice} onChange={e => updateItem(idx, "consignorPrice", parseFloat(e.target.value) || 0)}
                        className="w-full bg-amber-500/5 border border-amber-500/20 rounded-lg px-2 py-1.5 text-amber-400 text-sm text-center focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                        placeholder="$0" />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <button onClick={() => removeItem(idx)} className="text-app-text-muted hover:text-rose-400 transition-colors p-1">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}

                <div className="mt-2 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Total a pagar al consignador</p>
                    <p className="text-[10px] text-app-text-muted">Si se vende todo el stock recibido</p>
                  </div>
                  <p className="text-xl font-black text-amber-400">
                    {cop(items.reduce((s, i) => s + i.quantity * i.consignorPrice, 0))}
                  </p>
                </div>

                <button onClick={handleSubmit} disabled={isSubmitting}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-amber-900/20 disabled:opacity-40">
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                  Registrar Consignación
                </button>
              </div>
            )}

            {items.length === 0 && (
              <div className="text-center py-10 text-app-text-muted">
                <Handshake size={40} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm">Busca y agrega los productos recibidos en consignación</p>
              </div>
            )}
          </div>
        </div>

        {/* ── HISTORIAL ── */}
        <div className="bg-app-card border border-app-border rounded-2xl shadow-xl overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-app-border flex items-center gap-3 flex-wrap">
            <Handshake size={16} className="text-amber-400 shrink-0" />
            <h2 className="font-bold text-app-text flex-1">Historial de Consignaciones</h2>
            {allCategories.length > 0 && (
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="bg-app-bg border border-amber-500/30 rounded-xl px-3 py-1.5 text-app-text text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              >
                <option value="ALL">Todas las categorías</option>
                {allCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-app-border">
            {isLoading ? (
              <div className="flex justify-center items-center py-16 gap-2 text-app-text-muted">
                <Loader2 size={20} className="animate-spin" /> Cargando...
              </div>
            ) : consignments.length === 0 ? (
              <div className="text-center py-16 text-app-text-muted text-sm">
                <Handshake size={36} className="mx-auto mb-3 opacity-20" />
                No hay consignaciones registradas.
              </div>
            ) : consignments.map(c => {
              const isOpen = expandedId === c.id;
              const filteredItems = filterItemsByCategory(c.items ?? []);
              const owed = totalOwed(filteredItems);
              if (categoryFilter !== "ALL" && filteredItems.length === 0) return null;
              return (
                <div key={c.id}>
                  <button onClick={() => setExpandedId(isOpen ? null : c.id)}
                    className="w-full flex items-center gap-4 px-6 py-4 hover:bg-app-card transition-colors text-left">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-amber-500/20">
                      <User size={16} className="text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-app-text truncate">{c.consignor_name}</p>
                        {c.status === 'CANCELLED' && (
                          <span className="text-[8px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 px-1.5 py-0.5 rounded uppercase">Anulada</span>
                        )}
                      </div>
                      <p className="text-xs text-app-text-muted">
                        {new Date(c.created_at).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
                        <span className="mx-2">·</span>
                        {c.items?.length || 0} producto{(c.items?.length || 0) !== 1 ? "s" : ""}
                        {c.consignor_phone && <><span className="mx-2">·</span>{c.consignor_phone}</>}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-amber-400 font-bold text-sm">{cop(owed)}</p>
                      <p className="text-[10px] text-app-text-muted">por pagar</p>
                    </div>
                    {isOpen ? <ChevronUp size={15} className="text-app-text-muted shrink-0" /> : <ChevronDown size={15} className="text-app-text-muted shrink-0" />}
                  </button>

                  {isOpen && (
                    <div className="px-6 pb-4 animate-in zoom-in-95 duration-200">
                      {c.notes && <p className="text-xs text-app-text-muted mb-3 italic">{c.notes}</p>}

                      {/* Resumen de ventas */}
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <div className="bg-app-bg border border-app-border rounded-xl p-3 text-center">
                          <p className="text-[10px] text-app-text-muted uppercase font-bold mb-1">Consignado</p>
                          <p className="text-sm font-black text-app-text">{cop(totalConsigned(filteredItems))}</p>
                        </div>
                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 text-center">
                          <p className="text-[10px] text-emerald-400 uppercase font-bold mb-1">Vendido</p>
                          <p className="text-sm font-black text-emerald-400">
                            {filteredItems.reduce((s, i) => s + i.sold_quantity, 0)} uds
                          </p>
                        </div>
                        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-center">
                          <p className="text-[10px] text-amber-400 uppercase font-bold mb-1">Por pagar</p>
                          <p className="text-sm font-black text-amber-400">{cop(owed)}</p>
                        </div>
                      </div>

                      <div className="bg-app-bg rounded-xl overflow-hidden border border-app-border">
                        <div className="grid grid-cols-12 gap-1 px-4 py-2 text-[10px] font-bold text-app-text-muted uppercase border-b border-app-border">
                          <span className="col-span-4">Producto</span>
                          <span className="col-span-2 text-right">Consignado</span>
                          <span className="col-span-2 text-right">En stock</span>
                          <span className="col-span-2 text-right">Vendido</span>
                          <span className="col-span-2 text-right">Por pagar</span>
                        </div>
                        {filteredItems.map((item, idx) => (
                          <div key={idx} className="grid grid-cols-12 gap-1 px-4 py-2.5 border-b border-app-border last:border-0">
                            <div className="col-span-4">
                              <p className="text-sm text-app-text truncate">{item.product?.name || 'N/A'}</p>
                              <p className="text-[10px] text-app-text-muted">{item.product?.sku}</p>
                            </div>
                            <span className="col-span-2 text-right text-sm text-app-text-muted">{item.quantity}</span>
                            <span className="col-span-2 text-right text-sm text-cyan-400">{item.current_stock}</span>
                            <span className="col-span-2 text-right text-sm font-bold text-emerald-400">{item.sold_quantity}</span>
                            <span className="col-span-2 text-right text-sm font-bold text-amber-400">{cop(item.amount_owed)}</span>
                          </div>
                        ))}
                      </div>
                      {c.status !== 'CANCELLED' && canManage && (
                        <div className="mt-4 flex justify-end">
                          <button onClick={() => setCancelConfirm(c.id)}
                            className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold rounded-xl transition-all flex items-center gap-2">
                            <Ban size={14} /> Anular Consignación
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
