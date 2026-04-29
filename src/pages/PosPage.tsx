import { toast } from "../lib/toast";
import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import { ShoppingCart, Search, CreditCard, Banknote, Building2, Plus, Minus, Trash2, CheckCircle2, Loader2, AlertTriangle, TrendingUp, Receipt, Wallet, UserCheck, X, Pause, Clock, Layers } from "lucide-react";
import { api } from "../api/axios";
import type { ProductRow } from "./InventoryPage";

interface VariantOption {
  id: string;
  sku: string;
  sale_price: number;
  cost_price: number;
  is_active: boolean;
  stock: { quantity: number }[];
  values: {
    attribute_value: {
      id: string;
      value: string;
      attribute: { id: string; name: string };
    };
  }[];
}

function variantLabel(v: VariantOption) {
  return v.values.map(x => `${x.attribute_value.attribute.name}: ${x.attribute_value.value}`).join(" / ");
}

interface CustomerOption {
  id: string;
  name: string;
  phone?: string;
  balance: number;
  credit_limit?: number;
}

interface ShiftStats {
  cashSales: number;
  cardSales: number;
  transferSales: number;
  totalSales: number;
  ticketsCount: number;
}

const cop = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

interface CartItem {
  product: ProductRow;
  quantity: number;
  customPrice: number;
  variantId?: string;
  variantLabel?: string;
}

export default function PosPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "TRANSFER" | "CREDIT">("CASH");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const customerSearchRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [weightPrompt, setWeightPrompt] = useState<ProductRow | null>(null);
  const [weightInput, setWeightInput] = useState("");
  const [consignmentPrompt, setConsignmentPrompt] = useState<ProductRow | null>(null);
  const [consignmentPrice, setConsignmentPrice] = useState("");
  const [hasCashSession, setHasCashSession] = useState<boolean | null>(null);
  
  const [cashReceived, setCashReceived] = useState<string>("");
  const [isPriceEditing, setIsPriceEditing] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"catalog" | "cart">("catalog");
  const [shiftStats, setShiftStats] = useState<ShiftStats | null>(null);
  const [pendingSales, setPendingSales] = useState<any[]>([]);
  const [showPending, setShowPending] = useState(false);
  const [variantPrompt, setVariantPrompt] = useState<{ product: ProductRow; variants: VariantOption[] } | null>(null);

  const fetchShiftStats = async () => {
    try {
      const res = await api.get("/cash-registers/current/stats");
      if (res.data) setShiftStats(res.data);
    } catch { /* silencioso */ }
  };

  const fetchPendingSales = async () => {
    try {
      const res = await api.get("/sales/pending");
      setPendingSales(res.data);
    } catch { /* silencioso */ }
  };

  const handleHoldSale = async () => {
    if (cart.length === 0) return;
    try {
      await api.post("/sales/pending", {
        items: cart.map(c => ({ productId: c.product.id, quantity: c.quantity, price: c.customPrice })),
        total: cartTotal,
      });
      setCart([]);
      setCashReceived("");
      setSelectedCustomer(null);
      setCustomerSearch("");
      fetchPendingSales();
    } catch (error: any) {
      alert(error.response?.data?.message || "Error al guardar la factura.");
    }
  };

  const handleResumeSale = (sale: any) => {
    const items = sale.sale_items.map((item: any) => ({
      product: {
        id: item.product_id,
        name: item.products.name,
        sku: item.products.sku,
        sale_price: Number(item.price),
        unit_type: "UNIT",
        stockCount: 999,
        is_active: true,
        cost_price: 0,
      },
      quantity: Number(item.quantity),
      customPrice: Number(item.price),
    }));
    setCart(items);
    setShowPending(false);
    api.delete(`/sales/${sale.id}/discard`).then(fetchPendingSales);
  };

  const handleDiscardPending = async (id: string) => {
    if (!window.confirm("¿Descartar esta factura pendiente?")) return;
    await api.delete(`/sales/${id}/discard`);
    fetchPendingSales();
  };

  const fetchCustomers = async () => {
    try {
      const res = await api.get("/customers");
      setCustomers(res.data.map((c: any) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        balance: Number(c.balance ?? 0),
        credit_limit: c.credit_limit ? Number(c.credit_limit) : undefined,
      })));
    } catch { /* silencioso */ }
  };

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    api.get("/cash-registers/current")
      .then(res => {
        setHasCashSession(!!res.data);
        if (res.data) { fetchShiftStats(); fetchPendingSales(); }
      })
      .catch(() => setHasCashSession(false));
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await api.get("/products");
      const mapped = res.data.map((p: any) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        cost_price: p.cost_price,
        sale_price: Number(p.sale_price),
        unit_type: p.unit_type || "UNIT",
        stockCount: p.stock && p.stock.length > 0 ? Number(p.stock[0].quantity) : 0,
        is_active: p.is_active,
        is_consignment: p.is_consignment ?? false,
        has_variants: p.has_variants ?? false,
      }));
      setProducts(mapped);
    } catch (error) {
      console.error("Error fetching POS products", error);
    }
  };

  const visibleProducts = useMemo(() => {
    return products
      .filter((p) => p.is_active)
      .filter((p) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
      });
  }, [products, searchQuery]);

  const commitConsignmentSale = () => {
    if (!consignmentPrompt) return;
    const parsedPrice = parseFloat(consignmentPrice);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      toast.error("Ingresa un valor válido mayor a cero.");
      return;
    }
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === consignmentPrompt.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === consignmentPrompt.id ? { ...item, customPrice: parsedPrice } : item
        );
      }
      return [...prev, { product: consignmentPrompt, quantity: 1, customPrice: parsedPrice }];
    });
    setConsignmentPrompt(null);
    setConsignmentPrice("");
  };

  const addToCart = async (product: ProductRow) => {
    if (product.has_variants) {
      try {
        const res = await api.get(`/products/${product.id}/variants`);
        setVariantPrompt({ product, variants: res.data });
      } catch {
        toast.error("No se pudieron cargar las variantes");
      }
      return;
    }

    if (!product.is_consignment && product.stockCount === 0) return;

    if (product.is_consignment) {
      setConsignmentPrompt(product);
      setConsignmentPrice("");
      return;
    }

    if (product.unit_type === "WEIGHT") {
      setWeightPrompt(product);
      setWeightInput("");
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id && !item.variantId);
      if (existing) {
        if (existing.quantity >= product.stockCount) return prev;
        return prev.map((item) =>
          item.product.id === product.id && !item.variantId ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1, customPrice: product.sale_price }];
    });
  };

  const addVariantToCart = (product: ProductRow, variant: VariantOption) => {
    const stock = variant.stock[0]?.quantity ?? 0;
    if (stock === 0) { toast.error("Esta variante no tiene stock disponible"); return; }
    const label = variantLabel(variant);
    setCart((prev) => {
      const existing = prev.find((item) => item.variantId === variant.id);
      if (existing) {
        if (existing.quantity >= stock) return prev;
        return prev.map((item) => item.variantId === variant.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1, customPrice: variant.sale_price, variantId: variant.id, variantLabel: label }];
    });
    setVariantPrompt(null);
    setSearchQuery("");
  };

  const commitWeightSale = () => {
    if (!weightPrompt) return;
    const parsedWeight = parseFloat(weightInput);
    if (isNaN(parsedWeight) || parsedWeight <= 0) {
      toast.error("Ingresa un peso válido mayor a cero.");
      return;
    }
    if (parsedWeight > weightPrompt.stockCount) {
      alert(`No hay suficiente inventario (Max: ${weightPrompt.stockCount}).`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === weightPrompt.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === weightPrompt.id ? { ...item, quantity: parsedWeight } : item
        );
      }
      return [...prev, { product: weightPrompt, quantity: parsedWeight, customPrice: weightPrompt.sale_price }];
    });
    setWeightPrompt(null);
  };

  const cartKey = (item: CartItem) => item.variantId ?? item.product.id;

  const updateQuantity = (key: string, delta: number) => {
    setCart((prev) => prev.map(item => {
      if (cartKey(item) !== key) return item;
      const newQty = item.quantity + delta;
      if (newQty <= 0) return item;
      const maxStock = item.variantId
        ? variantPrompt?.variants.find(v => v.id === item.variantId)?.stock[0]?.quantity ?? 9999
        : item.product.stockCount;
      if (newQty > maxStock) return item;
      return { ...item, quantity: newQty };
    }));
  };

  const removeFromCart = (key: string) => {
    setCart((prev) => prev.filter((item) => cartKey(item) !== key));
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + (item.customPrice * item.quantity), 0);
  }, [cart]);

  const change = useMemo(() => {
    const received = parseFloat(cashReceived);
    if (isNaN(received) || received < cartTotal) return 0;
    return received - cartTotal;
  }, [cashReceived, cartTotal]);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (paymentMethod === 'CREDIT' && !selectedCustomer) {
      toast.warning("Selecciona un cliente para registrar una venta a crédito.");
      return;
    }
    setIsProcessing(true);
    try {
      const payload: any = {
        items: cart.map(c => ({
          productId: c.product.id,
          variantId: c.variantId,
          quantity: c.quantity,
          price: c.customPrice,
        })),
        total: cartTotal,
        paymentMethod,
      };
      if (paymentMethod === 'CREDIT' && selectedCustomer) {
        payload.customerId = selectedCustomer.id;
      }
      await api.post("/sales", payload);
      setCart([]);
      setCashReceived("");
      setSelectedCustomer(null);
      setCustomerSearch("");
      toast.success("¡Venta registrada con éxito!");
      fetchProducts();
      fetchShiftStats();
    } catch (error: any) {
      alert(error.response?.data?.message || "Error al procesar la venta.");
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (hasCashSession === null) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64 gap-3 text-app-text/40">
          <Loader2 size={24} className="animate-spin text-app-accent" />
          <span>Verificando sesión de caja...</span>
        </div>
      </DashboardLayout>
    );
  }

  // ── Caja Cerrada → Bloqueo ─────────────────────────────────────────────────
  if (hasCashSession === false) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-120px)] text-center gap-6">
          <div className="w-24 h-24 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
            <AlertTriangle size={44} className="text-rose-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-app-text mb-2">Caja Cerrada</h2>
            <p className="text-app-text-muted max-w-sm text-sm leading-relaxed">
              Para registrar ventas primero debes abrir una sesión de caja.<br />
              Ingresa el fondo inicial y comienza el turno.
            </p>
          </div>
          <button
            onClick={() => navigate("/caja")}
            className="px-8 py-3 bg-app-accent text-white font-bold rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-app-accent/20"
          >
            Abrir Caja →
          </button>
        </div>
      </DashboardLayout>
    );
  }

  // ── POS Activo ─────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="flex flex-col lg:flex-row gap-6 lg:h-[calc(100vh-120px)] relative">

        {/* LADO IZQUIERDO: CATÁLOGO */}
        <div className={`flex-1 flex flex-col h-full space-y-4 ${activeTab === 'catalog' ? 'flex' : 'hidden lg:flex'}`}>
          <div className="flex items-center gap-3 md:gap-4 bg-app-card backdrop-blur-md rounded-2xl p-3 md:p-4 border border-app-border shadow-lg">
            <div className="p-2 bg-app-accent/10 text-app-accent rounded-lg hidden md:block">
              <ShoppingCart size={24} />
            </div>
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-app-text-muted" size={18} />
              <input
                type="text"
                placeholder="Escanear o buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-app-bg border border-app-border rounded-xl pl-12 pr-4 py-2.5 md:py-3 text-app-text placeholder-app-text-muted focus:outline-none focus:border-app-accent/50 shadow-inner font-medium text-sm md:text-lg"
                autoFocus
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar pb-24 lg:pb-0">
            {searchQuery === '' ? (
              /* ── Resumen de turno ── */
              <div className="flex flex-col gap-4 animate-in fade-in duration-300">
                {/* Total ventas */}
                <div className="bg-app-card border border-app-border rounded-2xl p-6 flex flex-col items-center justify-center gap-2 shadow-lg">
                  <div className="flex items-center gap-2 text-app-text-muted">
                    <TrendingUp size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Total ventas del turno</span>
                  </div>
                  <span className="text-4xl font-black text-app-text tracking-tight">
                    {shiftStats ? cop(shiftStats.totalSales) : '—'}
                  </span>
                  <div className="flex items-center gap-1.5 text-app-text-muted mt-1">
                    <Receipt size={13} />
                    <span className="text-[11px] font-bold">
                      {shiftStats ? `${shiftStats.ticketsCount} ticket${shiftStats.ticketsCount !== 1 ? 's' : ''}` : '0 tickets'}
                    </span>
                  </div>
                </div>

                {/* Desglose por método de pago */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-app-card border border-app-border rounded-2xl p-4 flex flex-col gap-1.5 shadow">
                    <div className="flex items-center gap-1.5 text-emerald-500">
                      <Banknote size={15} />
                      <span className="text-[9px] font-black uppercase tracking-widest">Efectivo</span>
                    </div>
                    <span className="text-xl font-black text-app-text">
                      {shiftStats ? cop(shiftStats.cashSales) : '—'}
                    </span>
                  </div>
                  <div className="bg-app-card border border-app-border rounded-2xl p-4 flex flex-col gap-1.5 shadow">
                    <div className="flex items-center gap-1.5 text-blue-400">
                      <CreditCard size={15} />
                      <span className="text-[9px] font-black uppercase tracking-widest">Tarjeta</span>
                    </div>
                    <span className="text-xl font-black text-app-text">
                      {shiftStats ? cop(shiftStats.cardSales) : '—'}
                    </span>
                  </div>
                  <div className="bg-app-card border border-app-border rounded-2xl p-4 flex flex-col gap-1.5 shadow">
                    <div className="flex items-center gap-1.5 text-violet-400">
                      <Wallet size={15} />
                      <span className="text-[9px] font-black uppercase tracking-widest">Transf.</span>
                    </div>
                    <span className="text-xl font-black text-app-text">
                      {shiftStats ? cop(shiftStats.transferSales) : '—'}
                    </span>
                  </div>
                </div>

                <p className="text-center text-[10px] font-black uppercase tracking-widest text-app-text-muted opacity-40 mt-2">
                  Escanea o busca un producto para agregar al ticket
                </p>
              </div>
            ) : (
              /* ── Resultados de búsqueda ── */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                {visibleProducts.map(p => {
                  const agotado = !p.is_consignment && !p.has_variants && p.stockCount === 0;
                  return (
                    <button
                      key={p.id}
                      onClick={() => addToCart(p)}
                      disabled={agotado}
                      className={`relative bg-app-card backdrop-blur-md border ${agotado ? 'border-rose-500/20' : 'border-app-border hover:border-app-accent/50'} rounded-2xl p-4 flex flex-col text-left transition-all ${agotado ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:-translate-y-1 hover:shadow-xl active:scale-95'}`}
                    >
                      {agotado && !p.has_variants && (
                        <div className="absolute top-2 right-2 px-2 py-0.5 bg-rose-500/20 text-rose-500 text-[10px] font-black rounded uppercase">Agotado</div>
                      )}
                      {p.is_consignment && (
                        <div className="absolute top-2 right-2 px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-black rounded uppercase">Consig.</div>
                      )}
                      {p.has_variants && (
                        <div className="absolute top-2 right-2 px-2 py-0.5 bg-violet-500/20 text-violet-400 text-[10px] font-black rounded uppercase flex items-center gap-1"><Layers size={9}/>Variantes</div>
                      )}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-app-bg border border-app-border flex items-center justify-center font-black text-app-accent text-lg overflow-hidden shadow-inner shrink-0 leading-none">
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-app-accent font-mono text-[10px] font-black leading-none">{p.sku}</span>
                          <h4 className="text-app-text font-bold text-xs leading-none mt-1 truncate">{p.name}</h4>
                        </div>
                      </div>
                      <div className="flex items-end justify-between w-full mt-auto">
                        <span className="text-emerald-500 font-bold text-lg leading-none">${p.sale_price.toLocaleString()}</span>
                        {!p.is_consignment && (
                          <span className="text-app-text-muted text-[10px] font-black uppercase">{p.unit_type === 'WEIGHT' ? `${p.stockCount} Kg` : `${p.stockCount} Un.`}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* LADO DERECHO: TICKET */}
        <div className={`w-full lg:w-96 flex flex-col bg-app-sidebar backdrop-blur-3xl rounded-2xl border border-app-border shadow-2xl overflow-hidden lg:h-full ${activeTab === 'cart' ? 'flex fixed inset-0 h-full z-[70] lg:relative lg:inset-auto' : 'hidden lg:flex'}`}>
          <div className="bg-app-accent/10 p-4 border-b border-app-border flex justify-between items-center gap-2">
            <h3 className="text-sm font-black text-app-text uppercase tracking-widest">Resumen Ticket</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { fetchPendingSales(); setShowPending(true); }}
                className="relative p-2 text-app-text-muted hover:text-amber-400 transition-colors"
                title="Facturas pendientes"
              >
                <Clock size={18} />
                {pendingSales.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 text-black text-[9px] font-black rounded-full flex items-center justify-center">
                    {pendingSales.length}
                  </span>
                )}
              </button>
              {cart.length > 0 && (
                <button
                  onClick={handleHoldSale}
                  className="p-2 text-app-text-muted hover:text-amber-400 transition-colors"
                  title="Guardar factura"
                >
                  <Pause size={18} />
                </button>
              )}
              <button
                onClick={() => setActiveTab('catalog')}
                className="lg:hidden p-2 text-app-text-muted hover:text-white"
              >
                <Plus size={20} className="rotate-45" />
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-app-text-muted opacity-30 space-y-4">
                <ShoppingCart size={48} />
                <p className="font-black uppercase tracking-widest text-xs">Carrito vacío</p>
              </div>
            ) : (
              cart.map((item) => {
                const key = cartKey(item);
                return (
                <div key={key} className="flex flex-col bg-app-card rounded-xl p-3 border border-app-border group/cart transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-app-text font-bold text-sm pr-2 leading-tight truncate">{item.product.name}</span>
                        {item.variantLabel ? (
                          <span className="text-app-accent text-[9px] font-black tracking-wide">{item.variantLabel}</span>
                        ) : (
                          <span className="text-app-text-muted text-[9px] uppercase font-black tracking-widest">{item.product.sku}</span>
                        )}
                    </div>
                    <button onClick={() => removeFromCart(key)} className="text-app-text-muted hover:text-rose-500 transition-colors shrink-0">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-auto gap-2">
                    <div className="flex-1 min-w-0">
                        {isPriceEditing === key ? (
                            <div className="flex items-center gap-1">
                                <span className="text-app-accent font-bold">$</span>
                                <input
                                    type="number"
                                    autoFocus
                                    className="w-full bg-app-bg border border-app-accent rounded px-1.5 py-1 text-sm font-bold text-app-accent focus:outline-none shadow-inner"
                                    value={item.customPrice}
                                    onChange={(e) => {
                                        const newP = parseFloat(e.target.value) || 0;
                                        setCart(prev => prev.map(i => cartKey(i) === key ? { ...i, customPrice: newP } : i));
                                    }}
                                    onBlur={() => setIsPriceEditing(null)}
                                    onKeyDown={(e) => e.key === 'Enter' && setIsPriceEditing(null)}
                                />
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsPriceEditing(key)}
                                className="text-app-accent font-black text-base hover:bg-app-accent/5 px-1 py-0.5 rounded transition-colors truncate w-full text-left"
                                title="Click para editar"
                            >
                                ${Number(item.customPrice).toLocaleString()}
                                <span className="text-[9px] text-app-text-muted ml-1 font-black italic opacity-0 group-hover/cart:opacity-100 transition-opacity uppercase tracking-tighter">✎</span>
                            </button>
                        )}
                    </div>

                    {item.product.unit_type === "WEIGHT" ? (
                      <span className="text-[10px] font-black text-amber-500 px-2 py-1 bg-amber-500/10 rounded-lg shrink-0 border border-amber-500/20 uppercase tracking-tighter">{item.quantity} Kg</span>
                    ) : (
                      <div className="flex items-center bg-app-accent/10 rounded-lg p-0.5 border border-app-accent/10 shrink-0">
                        <button onClick={() => updateQuantity(key, -1)} className="p-1 hover:bg-app-accent/20 rounded-md text-app-accent transition-colors"><Minus size={14} /></button>
                        <span className="w-8 text-center text-xs font-black text-app-text">{item.quantity}</span>
                        <button onClick={() => updateQuantity(key, 1)} className="p-1 hover:bg-app-accent/20 rounded-md text-app-accent transition-colors"><Plus size={14} /></button>
                      </div>
                    )}
                  </div>
                </div>
                );
              })
            )}
          </div>

          {/* Checkout Area */}
          <div className="bg-app-accent/5 p-4 md:p-5 border-t border-app-border space-y-4 shrink-0">
            <div className="grid grid-cols-4 gap-1.5 bg-app-bg p-1 rounded-xl border border-app-border shadow-inner">
              {([
                { key: "CASH",     label: "Efectivo", icon: <Banknote size={14} /> },
                { key: "CARD",     label: "Tarjeta",  icon: <CreditCard size={14} /> },
                { key: "TRANSFER", label: "Transf.",  icon: <Building2 size={14} /> },
                { key: "CREDIT",   label: "Crédito",  icon: <UserCheck size={14} /> },
              ] as const).map(m => (
                <button
                  key={m.key}
                  onClick={() => { setPaymentMethod(m.key); setSelectedCustomer(null); setCustomerSearch(""); }}
                  className={`flex flex-col items-center py-2 rounded-lg transition-all ${paymentMethod === m.key ? 'bg-app-accent text-white shadow-lg shadow-app-accent/20 scale-105' : 'text-app-text-muted hover:bg-app-accent/10'}`}
                >
                  {m.icon}
                  <span className="text-[9px] font-black uppercase tracking-tighter mt-1">{m.label}</span>
                </button>
              ))}
            </div>

            {paymentMethod === 'CREDIT' && (
              <div className="relative animate-in slide-in-from-bottom-2 duration-200">
                {selectedCustomer ? (
                  <div className="flex items-center justify-between bg-app-accent/10 border border-app-accent/30 rounded-xl px-3 py-2.5">
                    <div className="flex flex-col">
                      <span className="text-app-accent font-black text-sm">{selectedCustomer.name}</span>
                      <span className="text-[10px] text-app-text-muted font-bold">
                        Saldo: <span className={selectedCustomer.balance > 0 ? 'text-rose-400' : 'text-emerald-400'}>${selectedCustomer.balance.toLocaleString()}</span>
                        {selectedCustomer.credit_limit !== undefined && (
                          <span className="ml-2 opacity-60">/ Límite: ${selectedCustomer.credit_limit.toLocaleString()}</span>
                        )}
                      </span>
                    </div>
                    <button onClick={() => { setSelectedCustomer(null); setCustomerSearch(""); }} className="text-app-text-muted hover:text-rose-400 transition-colors ml-2">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-text-muted" />
                      <input
                        ref={customerSearchRef}
                        type="text"
                        placeholder="Buscar cliente..."
                        value={customerSearch}
                        onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }}
                        onFocus={() => setShowCustomerDropdown(true)}
                        onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 150)}
                        className="w-full bg-app-bg border border-app-border rounded-xl pl-9 pr-4 py-2.5 text-app-text placeholder-app-text-muted focus:outline-none focus:border-app-accent/50 text-sm"
                      />
                    </div>
                    {showCustomerDropdown && (
                      <div className="absolute bottom-full left-0 right-0 mb-1 bg-app-card border border-app-border rounded-xl shadow-2xl overflow-hidden z-20 max-h-48 overflow-y-auto">
                        {customers
                          .filter(c => !customerSearch || c.name.toLowerCase().includes(customerSearch.toLowerCase()) || (c.phone && c.phone.includes(customerSearch)))
                          .slice(0, 6)
                          .map(c => (
                            <button
                              key={c.id}
                              onMouseDown={() => { setSelectedCustomer(c); setCustomerSearch(""); setShowCustomerDropdown(false); }}
                              className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-app-accent/10 transition-colors border-b border-app-border last:border-0 text-left"
                            >
                              <div className="flex flex-col">
                                <span className="text-app-text font-bold text-sm">{c.name}</span>
                                {c.phone && <span className="text-app-text-muted text-[10px]">{c.phone}</span>}
                              </div>
                              {c.balance > 0 && (
                                <span className="text-rose-400 font-black text-xs">${c.balance.toLocaleString()}</span>
                              )}
                            </button>
                          ))}
                        {customers.filter(c => !customerSearch || c.name.toLowerCase().includes(customerSearch.toLowerCase())).length === 0 && (
                          <div className="px-3 py-3 text-app-text-muted text-xs text-center">Sin resultados</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col border-b border-app-border pb-4 space-y-3">
                <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-black text-app-text-muted uppercase tracking-widest">A pagar</span>
                    <span className="text-2xl font-black text-app-text tracking-tight animate-in zoom-in duration-300">${cartTotal.toLocaleString()}</span>
                </div>
                
                {paymentMethod === 'CASH' && cartTotal > 0 && (
                    <div className="space-y-3 pt-2 animate-in slide-in-from-bottom-2 duration-300">
                        <div className="flex justify-between items-center">
                            <span className="font-black text-[9px] uppercase text-app-text-muted tracking-widest">Recibido</span>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-app-accent font-bold text-xs">$</span>
                                <input 
                                    type="number"
                                    value={cashReceived}
                                    onChange={(e) => setCashReceived(e.target.value)}
                                    placeholder="0"
                                    className="w-28 bg-app-bg border border-app-accent/30 rounded-lg pl-6 pr-2 py-1.5 text-right text-app-accent font-black text-base focus:outline-none focus:ring-2 focus:ring-app-accent/20"
                                />
                            </div>
                        </div>
                        <div className="flex justify-between items-center bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
                            <span className="text-emerald-500 font-black text-[9px] uppercase tracking-widest">Cambio</span>
                            <span className="text-xl font-black text-emerald-500 animate-in fade-in duration-500">${change.toLocaleString()}</span>
                        </div>
                    </div>
                )}
            </div>

            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || isProcessing || (paymentMethod === 'CASH' && (parseFloat(cashReceived) < cartTotal || !cashReceived)) || (paymentMethod === 'CREDIT' && !selectedCustomer)}
              className={`w-full py-4 rounded-xl font-black uppercase tracking-[0.2em] flex justify-center items-center gap-2 transition-all shadow-xl ${cart.length === 0 || (paymentMethod === 'CASH' && parseFloat(cashReceived) < cartTotal) || (paymentMethod === 'CREDIT' && !selectedCustomer) ? 'bg-app-accent/5 text-app-text-muted cursor-not-allowed border border-app-border' : 'bg-app-accent hover:bg-app-accent-hover text-white shadow-app-accent/40 active:scale-95'}`}
            >
              {isProcessing ? <Loader2 size={24} className="animate-spin" /> : <CheckCircle2 size={24} />}
              {isProcessing ? "PROCESANDO..." : "COBRAR TICKET"}
            </button>
          </div>
        </div>

        {/* BOTÓN FLOTANTE CARRITO (MOBILE) */}
        {activeTab === 'catalog' && cart.length > 0 && (
            <div className="fixed bottom-6 right-6 z-50 lg:hidden animate-in fade-in slide-in-from-bottom-5 duration-500">
                <button 
                    onClick={() => setActiveTab('cart')}
                    className="h-16 px-6 bg-app-accent text-white rounded-2xl shadow-2xl shadow-app-accent/40 flex items-center gap-4 border border-white/20 active:scale-95 transition-all"
                >
                    <div className="relative">
                        <ShoppingCart size={24} />
                        <span className="absolute -top-3 -right-3 w-6 h-6 bg-white text-app-accent rounded-full text-[10px] font-black flex items-center justify-center border-2 border-app-accent">
                            {cart.length}
                        </span>
                    </div>
                    <div className="flex flex-col items-start pr-2">
                        <span className="text-[10px] font-black uppercase tracking-widest leading-none mb-1 opacity-70">Ver Ticket</span>
                        <span className="text-lg font-black leading-none">${cartTotal.toLocaleString()}</span>
                    </div>
                </button>
            </div>
        )}

      </div>

      {/* Modal Facturas Pendientes */}
      {showPending && (
        <div className="fixed inset-0 z-[100] flex justify-center items-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowPending(false)} />
          <div className="relative w-full max-w-md bg-app-bg rounded-2xl shadow-2xl border border-app-border flex flex-col max-h-[80vh] animate-in zoom-in duration-200">
            <div className="flex items-center justify-between p-5 border-b border-app-border">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-amber-400" />
                <h3 className="font-black text-app-text uppercase tracking-widest text-sm">Facturas Pendientes</h3>
              </div>
              <button onClick={() => setShowPending(false)} className="text-app-text-muted hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
              {pendingSales.length === 0 ? (
                <p className="text-center text-app-text-muted text-sm py-8 font-bold">No hay facturas pendientes</p>
              ) : pendingSales.map((sale: any) => (
                <div key={sale.id} className="bg-app-card border border-app-border rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-black text-app-text-muted uppercase tracking-widest">
                        {new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-xs text-app-text-muted mt-1">
                        {sale.sale_items.length} producto{sale.sale_items.length !== 1 ? 's' : ''}
                      </p>
                      <div className="mt-1 space-y-0.5">
                        {sale.sale_items.slice(0, 3).map((item: any) => (
                          <p key={item.id} className="text-[10px] text-app-text-muted">
                            {item.products.name} × {Number(item.quantity)}
                          </p>
                        ))}
                        {sale.sale_items.length > 3 && (
                          <p className="text-[10px] text-app-text-muted italic">+{sale.sale_items.length - 3} más...</p>
                        )}
                      </div>
                    </div>
                    <span className="text-lg font-black text-app-text">${Number(sale.total).toLocaleString()}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleResumeSale(sale)}
                      className="flex-1 py-2.5 bg-app-accent hover:bg-app-accent-hover text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all"
                    >
                      Reanudar
                    </button>
                    <button
                      onClick={() => handleDiscardPending(sale.id)}
                      className="px-3 py-2.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Selector de Variante */}
      {variantPrompt && (
        <div className="fixed inset-0 z-[100] flex justify-center items-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setVariantPrompt(null)} />
          <div className="relative w-full max-w-md bg-app-bg rounded-3xl shadow-2xl border border-app-border flex flex-col max-h-[80vh] animate-in zoom-in duration-200">
            <div className="flex items-center justify-between p-5 border-b border-app-border">
              <div>
                <div className="flex items-center gap-2 text-violet-400 mb-1">
                  <Layers size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Selecciona variante</span>
                </div>
                <h3 className="font-black text-app-text text-lg">{variantPrompt.product.name}</h3>
              </div>
              <button onClick={() => setVariantPrompt(null)} className="text-app-text-muted hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
              {variantPrompt.variants.filter(v => v.is_active).map(v => {
                const stock = v.stock[0]?.quantity ?? 0;
                const agotada = stock === 0;
                return (
                  <button
                    key={v.id}
                    onClick={() => !agotada && addVariantToCart(variantPrompt.product, v)}
                    disabled={agotada}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left ${agotada ? 'opacity-40 cursor-not-allowed border-app-border bg-app-card' : 'border-app-border bg-app-card hover:border-violet-500/50 hover:bg-violet-500/5 active:scale-95'}`}
                  >
                    <div className="flex flex-col">
                      <span className="font-bold text-app-text text-sm">{variantLabel(v)}</span>
                      <span className="text-[10px] font-mono text-app-text-muted">{v.sku}</span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-emerald-400 font-black">${Number(v.sale_price).toLocaleString()}</span>
                      <span className={`text-[10px] font-black uppercase ${agotada ? 'text-rose-400' : 'text-app-text-muted'}`}>
                        {agotada ? 'Agotado' : `${stock} Un.`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Pesaje (Modo Responsivo) */}
      {consignmentPrompt && (
        <div className="fixed inset-0 z-[100] flex justify-center items-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setConsignmentPrompt(null)}></div>
          <div className="relative w-full max-w-sm bg-app-bg rounded-3xl shadow-2xl border border-app-border p-6 flex flex-col items-center animate-in zoom-in duration-300">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4 shadow-inner">
              <ShoppingCart size={32} />
            </div>
            <h2 className="text-xl font-black text-app-text text-center mb-1 tracking-tight">{consignmentPrompt.name}</h2>
            <p className="text-[10px] font-black uppercase text-center text-amber-400 mb-6 tracking-widest">Consignación — Ingresa el valor a cobrar</p>
            <div className="w-full relative mb-6">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-app-text-muted font-black text-xl">$</span>
              <input
                type="number"
                step="100"
                autoFocus
                value={consignmentPrice}
                onChange={(e) => setConsignmentPrice(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') commitConsignmentSale(); }}
                className="w-full bg-amber-500/5 border border-amber-500/30 rounded-2xl pl-10 pr-4 py-5 text-center text-4xl font-black text-amber-400 placeholder-amber-400/20 focus:outline-none focus:ring-4 focus:ring-amber-500/10 shadow-inner"
                placeholder="0"
              />
            </div>
            <div className="flex gap-3 w-full">
              <button onClick={() => setConsignmentPrompt(null)} className="flex-1 py-4 rounded-xl border border-app-border text-app-text-muted font-black uppercase text-[10px] tracking-widest hover:text-white transition-colors">Cerrar</button>
              <button onClick={commitConsignmentSale} className="flex-1 py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-black uppercase text-[10px] tracking-widest transition-all shadow-lg shadow-amber-500/20">Agregar</button>
            </div>
          </div>
        </div>
      )}

      {weightPrompt && (
        <div className="fixed inset-0 z-[100] flex justify-center items-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setWeightPrompt(null)}></div>
          <div className="relative w-full max-w-sm bg-app-bg rounded-3xl shadow-2xl border border-app-border p-6 flex flex-col items-center animate-in zoom-in duration-300">
            <div className="w-16 h-16 rounded-2xl bg-app-accent/10 text-app-accent flex items-center justify-center mb-4 shadow-inner">
              <ShoppingCart size={32} />
            </div>
            <h2 className="text-xl font-black text-app-text text-center mb-1 tracking-tight">{weightPrompt.name}</h2>
            <p className="text-[10px] font-black uppercase text-center text-app-text-muted mb-6 tracking-widest">Ingresa peso (Kg)</p>
            <div className="w-full relative mb-6">
              <input
                type="number"
                step="0.001"
                autoFocus
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') commitWeightSale(); }}
                className="w-full bg-app-accent/5 border border-app-border rounded-2xl px-4 py-5 text-center text-4xl font-black text-app-accent placeholder-app-accent/10 focus:outline-none focus:ring-4 focus:ring-app-accent/10 shadow-inner"
                placeholder="0.000"
              />
              <span className="absolute right-5 top-1/2 -translate-y-1/2 text-app-text-muted font-black uppercase text-xs">Kg</span>
            </div>
            <div className="flex gap-3 w-full">
              <button onClick={() => setWeightPrompt(null)} className="flex-1 py-4 rounded-xl border border-app-border text-app-text-muted font-black uppercase text-[10px] tracking-widest hover:text-white transition-colors">Cerrar</button>
              <button onClick={commitWeightSale} className="flex-1 py-4 rounded-xl bg-app-accent hover:bg-app-accent-hover text-white font-black uppercase text-[10px] tracking-widest transition-all shadow-lg shadow-app-accent/20">Agregar</button>
            </div>
          </div>
        </div>
      )}
      {consignmentPrompt && (
        <div className="fixed inset-0 z-[100] flex justify-center items-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setConsignmentPrompt(null)}></div>
          <div className="relative w-full max-w-sm bg-app-bg rounded-3xl shadow-2xl border border-app-border p-6 flex flex-col items-center animate-in zoom-in duration-300">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4 shadow-inner">
              <ShoppingCart size={32} />
            </div>
            <h2 className="text-xl font-black text-app-text text-center mb-1 tracking-tight">{consignmentPrompt.name}</h2>
            <p className="text-[10px] font-black uppercase text-center text-amber-400 mb-6 tracking-widest">Consignación — Ingresa el valor a cobrar</p>
            <div className="w-full relative mb-6">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-app-text-muted font-black text-xl">$</span>
              <input
                type="number"
                step="100"
                autoFocus
                value={consignmentPrice}
                onChange={(e) => setConsignmentPrice(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') commitConsignmentSale(); }}
                className="w-full bg-amber-500/5 border border-amber-500/30 rounded-2xl pl-10 pr-4 py-5 text-center text-4xl font-black text-amber-400 placeholder-amber-400/20 focus:outline-none focus:ring-4 focus:ring-amber-500/10 shadow-inner"
                placeholder="0"
              />
            </div>
            <div className="flex gap-3 w-full">
              <button onClick={() => setConsignmentPrompt(null)} className="flex-1 py-4 rounded-xl border border-app-border text-app-text-muted font-black uppercase text-[10px] tracking-widest hover:text-white transition-colors">Cerrar</button>
              <button onClick={commitConsignmentSale} className="flex-1 py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-black uppercase text-[10px] tracking-widest transition-all shadow-lg shadow-amber-500/20">Agregar</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
