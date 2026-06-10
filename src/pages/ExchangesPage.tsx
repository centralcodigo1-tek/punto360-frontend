import { useEffect, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import { api } from "../api/axios";
import {
  ArrowLeftRight, Search, ChevronDown, CheckCircle2,
  Loader2, ArrowRight, Clock, User, RefreshCw,
  Banknote, CreditCard, Building2, DollarSign, Package
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Product { id: string; name: string; sku: string; sale_price: number; has_variants: boolean; }
interface Variant { id: string; sku: string; sale_price: number; label?: string; stock?: number; }
interface ExchangeRecord {
  id: string; created_at: string; difference: number; payment_method: string | null; notes: string | null;
  returnedProduct: { name: string; sku: string } | null;
  returnedVariant: { label: string; sku: string } | null;
  newProduct: { name: string; sku: string } | null;
  newVariant: { label: string; sku: string } | null;
  cashier: { name: string } | null;
  returned_price: number; new_price: number;
}

const cop = (v: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(v);
const fDate = (d: string) => new Date(d).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

// ── Product Selector ──────────────────────────────────────────────────────────
function ProductSelector({
  label, products, value, variant, onSelect, onVariantSelect
}: {
  label: string;
  products: Product[];
  value: Product | null;
  variant: Variant | null;
  onSelect: (p: Product | null) => void;
  onVariantSelect: (v: Variant | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);

  const filtered = query.length > 0
    ? products.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.sku.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : [];

  const handleSelect = async (p: Product) => {
    onSelect(p);
    onVariantSelect(null);
    setQuery("");
    if (p.has_variants) {
      setLoadingVariants(true);
      try {
        const res = await api.get(`/products/${p.id}/variants`);
        const enriched = res.data.map((v: any) => ({
          id: v.id,
          sku: v.sku,
          sale_price: Number(v.sale_price),
          stock: v.stock ?? 0,
          label: v.values?.map((vv: any) => vv.attribute_value?.value ?? vv.value).join(" / ") ?? v.sku,
        }));
        setVariants(enriched);
      } catch { setVariants([]); }
      finally { setLoadingVariants(false); }
    } else {
      setVariants([]);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-black uppercase tracking-widest text-app-text-muted">{label}</p>

      {value ? (
        <div className="bg-app-bg border border-app-accent/40 rounded-xl p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-bold text-app-text text-sm">{value.name}</p>
              <p className="text-[11px] text-app-accent font-mono">{value.sku}</p>
              {variant && (
                <p className="text-xs text-violet-400 mt-1 font-semibold">{variant.label} · {variant.sku}</p>
              )}
            </div>
            <button onClick={() => { onSelect(null); onVariantSelect(null); setVariants([]); }}
              className="text-xs text-app-text-muted hover:text-rose-400 transition-colors shrink-0">
              Cambiar
            </button>
          </div>
        </div>
      ) : (
        <div className="relative">
          <div className="flex items-center gap-2 bg-app-bg border border-app-border rounded-xl px-3 py-2.5">
            <Search size={14} className="text-app-text-muted shrink-0" />
            <input
              autoComplete="off"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar por nombre o SKU..."
              className="bg-transparent text-sm text-app-text placeholder:text-app-text-muted focus:outline-none flex-1"
            />
          </div>
          {filtered.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-app-card border border-app-border rounded-xl shadow-2xl z-50 overflow-hidden">
              {filtered.map(p => (
                <button key={p.id} onClick={() => handleSelect(p)}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-app-bg text-left transition-colors">
                  <div>
                    <p className="text-sm font-bold text-app-text">{p.name}</p>
                    <p className="text-[10px] text-app-accent font-mono">{p.sku}</p>
                  </div>
                  <p className="text-xs font-black text-emerald-400">{cop(p.sale_price)}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {value?.has_variants && !variant && (
        <div className="space-y-1.5">
          <p className="text-[11px] text-app-text-muted font-bold">Selecciona variante:</p>
          {loadingVariants ? (
            <div className="flex items-center gap-2 text-app-text-muted text-xs py-2">
              <Loader2 size={13} className="animate-spin" /> Cargando variantes...
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {variants.map(v => (
                <button key={v.id} onClick={() => onVariantSelect(v)}
                  className="text-left px-3 py-2 rounded-lg border border-app-border bg-app-bg hover:border-app-accent/40 hover:bg-app-accent/5 transition-all">
                  <p className="text-xs font-bold text-app-text">{v.label}</p>
                  <p className="text-[10px] text-app-text-muted font-mono">{v.sku}</p>
                  <p className="text-[10px] text-emerald-400 font-black mt-0.5">{cop(v.sale_price)}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ExchangesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [history, setHistory] = useState<ExchangeRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Form state
  const [retProduct, setRetProduct] = useState<Product | null>(null);
  const [retVariant, setRetVariant] = useState<Variant | null>(null);
  const [retPrice, setRetPrice] = useState("");

  const [newProduct, setNewProduct] = useState<Product | null>(null);
  const [newVariant, setNewVariant] = useState<Variant | null>(null);
  const [newPrice, setNewPrice] = useState("");

  const [payMethod, setPayMethod] = useState("CASH");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    api.get("/products").then(res => setProducts(res.data)).catch(console.error);
    fetchHistory();
  }, []);

  const fetchHistory = () => {
    setLoadingHistory(true);
    api.get("/exchanges").then(res => setHistory(res.data)).catch(console.error).finally(() => setLoadingHistory(false));
  };

  // Auto-fill new price when product/variant selected
  useEffect(() => {
    if (newVariant) setNewPrice(String(newVariant.sale_price));
    else if (newProduct && !newProduct.has_variants) setNewPrice(String(newProduct.sale_price));
  }, [newVariant, newProduct]);

  const retPriceNum = parseFloat(retPrice) || 0;
  const newPriceNum = parseFloat(newPrice) || 0;
  const difference = newPriceNum - retPriceNum;

  const canSubmit =
    retProduct &&
    (!retProduct.has_variants || retVariant) &&
    retPriceNum > 0 &&
    newProduct &&
    (!newProduct.has_variants || newVariant) &&
    newPriceNum > 0;

  const handleSubmit = async () => {
    if (!canSubmit || !retProduct || !newProduct) return;
    setIsSaving(true);
    try {
      await api.post("/exchanges", {
        returnedProductId: retProduct.id,
        returnedVariantId: retVariant?.id,
        returnedQuantity: 1,
        returnedPrice: retPriceNum,
        newProductId: newProduct.id,
        newVariantId: newVariant?.id,
        newQuantity: 1,
        newPrice: newPriceNum,
        paymentMethod: difference !== 0 ? payMethod : null,
        notes: notes || null,
      });
      // Reset
      setRetProduct(null); setRetVariant(null); setRetPrice("");
      setNewProduct(null); setNewVariant(null); setNewPrice("");
      setNotes(""); setPayMethod("CASH");
      setSuccessMsg("Cambio registrado correctamente");
      setTimeout(() => setSuccessMsg(""), 4000);
      fetchHistory();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? "Error al registrar el cambio");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-500/20 text-violet-400 rounded-xl">
              <ArrowLeftRight size={26} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-app-text">Cambio de Producto</h1>
              <p className="text-app-text-muted text-sm">Registra cambios sin necesidad de venta en el sistema</p>
            </div>
          </div>
          <button onClick={() => { setShowHistory(h => !h); if (!showHistory) fetchHistory(); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-app-border bg-app-card text-app-text-muted hover:text-app-text text-sm font-bold transition-all">
            <Clock size={14} /> Historial
            <ChevronDown size={14} className={`transition-transform ${showHistory ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Success */}
        {successMsg && (
          <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl px-4 py-3 text-sm font-bold">
            <CheckCircle2 size={16} /> {successMsg}
          </div>
        )}

        {/* History panel */}
        {showHistory && (
          <div className="bg-app-card border border-app-border rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-app-border flex items-center justify-between">
              <p className="text-sm font-black text-app-text">Historial de Cambios</p>
              <button onClick={fetchHistory} className="text-app-text-muted hover:text-app-text transition-colors">
                <RefreshCw size={14} />
              </button>
            </div>
            {loadingHistory ? (
              <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-app-text-muted" /></div>
            ) : history.length === 0 ? (
              <div className="py-10 text-center text-app-text-muted text-sm">Sin cambios registrados aún</div>
            ) : (
              <div className="divide-y divide-app-border max-h-64 overflow-y-auto custom-scrollbar">
                {history.map(e => (
                  <div key={e.id} className="px-5 py-3 flex items-center gap-4">
                    <div className="flex-1 min-w-0 grid grid-cols-3 gap-3 items-center">
                      <div className="min-w-0">
                        <p className="text-xs text-rose-400 font-bold truncate">↩ {e.returnedProduct?.name ?? '—'}</p>
                        {e.returnedVariant && <p className="text-[10px] text-rose-400/60">{e.returnedVariant.label}</p>}
                        <p className="text-[10px] text-app-text-muted">{cop(Number(e.returned_price))}</p>
                      </div>
                      <div className="flex justify-center"><ArrowRight size={14} className="text-app-text-muted" /></div>
                      <div className="min-w-0">
                        <p className="text-xs text-emerald-400 font-bold truncate">↗ {e.newProduct?.name ?? '—'}</p>
                        {e.newVariant && <p className="text-[10px] text-emerald-400/60">{e.newVariant.label}</p>}
                        <p className="text-[10px] text-app-text-muted">{cop(Number(e.new_price))}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-xs font-black ${Number(e.difference) > 0 ? 'text-emerald-400' : Number(e.difference) < 0 ? 'text-rose-400' : 'text-app-text-muted'}`}>
                        {Number(e.difference) > 0 ? '+' : ''}{cop(Number(e.difference))}
                      </p>
                      <p className="text-[10px] text-app-text-muted">{fDate(e.created_at)}</p>
                      {e.cashier && <p className="text-[10px] text-app-text-muted flex items-center gap-1 justify-end"><User size={9} />{e.cashier.name}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Main form */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Producto devuelto */}
          <div className="bg-app-card border border-rose-500/20 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-rose-400" />
              <p className="font-black text-app-text text-sm uppercase tracking-wider">Producto que devuelve</p>
            </div>
            <ProductSelector
              label="Buscar producto devuelto"
              products={products}
              value={retProduct}
              variant={retVariant}
              onSelect={p => { setRetProduct(p); setRetVariant(null); }}
              onVariantSelect={setRetVariant}
            />
            {retProduct && (!retProduct.has_variants || retVariant) && (
              <div>
                <label className="text-[11px] font-black uppercase text-app-text-muted tracking-wider">Precio original pagado</label>
                <div className="flex items-center gap-2 mt-1.5 bg-app-bg border border-app-border rounded-xl px-3 py-2.5">
                  <DollarSign size={14} className="text-app-text-muted shrink-0" />
                  <input
                    type="number" value={retPrice} onChange={e => setRetPrice(e.target.value)}
                    placeholder="0"
                    className="bg-transparent text-sm text-app-text flex-1 focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-app-text-muted mt-1">Ingresa el precio que pagó el cliente originalmente</p>
              </div>
            )}
          </div>

          {/* Producto nuevo */}
          <div className="bg-app-card border border-emerald-500/20 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <p className="font-black text-app-text text-sm uppercase tracking-wider">Producto que se lleva</p>
            </div>
            <ProductSelector
              label="Buscar producto nuevo"
              products={products}
              value={newProduct}
              variant={newVariant}
              onSelect={p => { setNewProduct(p); setNewVariant(null); setNewPrice(""); }}
              onVariantSelect={v => { setNewVariant(v); if (v) setNewPrice(String(v.sale_price)); }}
            />
            {newProduct && (!newProduct.has_variants || newVariant) && (
              <div>
                <label className="text-[11px] font-black uppercase text-app-text-muted tracking-wider">Precio del producto nuevo</label>
                <div className="flex items-center gap-2 mt-1.5 bg-app-bg border border-app-border rounded-xl px-3 py-2.5">
                  <DollarSign size={14} className="text-app-text-muted shrink-0" />
                  <input
                    type="number" value={newPrice} onChange={e => setNewPrice(e.target.value)}
                    placeholder="0"
                    className="bg-transparent text-sm text-app-text flex-1 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Diferencia + confirmar */}
        {canSubmit && (
          <div className="bg-app-card border border-app-border rounded-2xl p-6 space-y-5">

            {/* Resumen diferencia */}
            <div className={`rounded-xl p-4 border flex items-center justify-between ${
              difference > 0 ? 'bg-emerald-500/10 border-emerald-500/30' :
              difference < 0 ? 'bg-rose-500/10 border-rose-500/30' :
              'bg-app-bg border-app-border'
            }`}>
              <div className="flex items-center gap-3">
                <ArrowLeftRight size={20} className={difference > 0 ? 'text-emerald-400' : difference < 0 ? 'text-rose-400' : 'text-app-text-muted'} />
                <div>
                  <p className="text-xs font-black uppercase text-app-text-muted tracking-wider">
                    {difference > 0 ? 'El cliente paga la diferencia' : difference < 0 ? 'La tienda devuelve la diferencia' : 'Cambio parejo — sin diferencia'}
                  </p>
                  <p className={`text-2xl font-black ${difference > 0 ? 'text-emerald-400' : difference < 0 ? 'text-rose-400' : 'text-app-text-muted'}`}>
                    {difference > 0 ? '+' : ''}{cop(difference)}
                  </p>
                </div>
              </div>
              <div className="text-right text-xs text-app-text-muted space-y-1">
                <p>Devuelto: <span className="font-bold text-app-text">{cop(retPriceNum)}</span></p>
                <p>Nuevo: <span className="font-bold text-app-text">{cop(newPriceNum)}</span></p>
              </div>
            </div>

            {/* Método de pago (solo si hay diferencia) */}
            {difference !== 0 && (
              <div>
                <p className="text-[11px] font-black uppercase text-app-text-muted tracking-wider mb-2">
                  {difference > 0 ? 'Método de pago del cliente' : 'Método de devolución'}
                </p>
                <div className="flex gap-2">
                  {[{ k: 'CASH', label: 'Efectivo', icon: <Banknote size={14} /> }, { k: 'CARD', label: 'Tarjeta', icon: <CreditCard size={14} /> }, { k: 'TRANSFER', label: 'Transferencia', icon: <Building2 size={14} /> }].map(m => (
                    <button key={m.k} onClick={() => setPayMethod(m.k)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition-all ${payMethod === m.k ? 'bg-app-accent/20 border-app-accent text-app-accent' : 'bg-app-bg border-app-border text-app-text-muted hover:text-app-text'}`}>
                      {m.icon} {m.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Observaciones */}
            <div>
              <label className="text-[11px] font-black uppercase text-app-text-muted tracking-wider">Observaciones (opcional)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                placeholder="Motivo del cambio, condición del producto, etc."
                className="mt-1.5 w-full bg-app-bg border border-app-border rounded-xl px-3 py-2.5 text-sm text-app-text placeholder:text-app-text-muted focus:outline-none focus:border-app-accent/50 resize-none"
              />
            </div>

            <button onClick={handleSubmit} disabled={isSaving}
              className="w-full py-3 bg-app-accent text-white font-black rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
              {isSaving ? "Registrando..." : "Confirmar Cambio"}
            </button>
          </div>
        )}

        {!canSubmit && !retProduct && !newProduct && (
          <div className="bg-app-card border border-app-border rounded-2xl p-10 text-center">
            <Package size={36} className="mx-auto text-app-text-muted opacity-20 mb-3" />
            <p className="text-app-text-muted text-sm">Selecciona los productos para registrar el cambio</p>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
