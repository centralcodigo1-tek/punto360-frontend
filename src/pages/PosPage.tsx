import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import { ShoppingCart, Search, CreditCard, Banknote, Building2, Plus, Minus, Trash2, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { api } from "../api/axios";
import type { ProductRow } from "./InventoryPage";

interface CartItem {
  product: ProductRow;
  quantity: number;
  customPrice: number; // Precio al que se vende en este ticket específico
}

export default function PosPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "TRANSFER">("CASH");
  const [isProcessing, setIsProcessing] = useState(false);
  const [weightPrompt, setWeightPrompt] = useState<ProductRow | null>(null);
  const [weightInput, setWeightInput] = useState("");
  const [hasCashSession, setHasCashSession] = useState<boolean | null>(null);
  
  // Estados para Vueltos
  const [cashReceived, setCashReceived] = useState<string>("");
  const [isPriceEditing, setIsPriceEditing] = useState<string | null>(null); // ID del producto siendo editado

  useEffect(() => {
    fetchProducts();
    api.get("/cash-registers/current")
      .then(res => setHasCashSession(!!res.data))
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
        is_active: p.is_active
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

  const addToCart = (product: ProductRow) => {
    if (product.stockCount === 0) return;

    if (product.unit_type === "WEIGHT") {
      setWeightPrompt(product);
      setWeightInput("");
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stockCount) return prev;
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1, customPrice: product.sale_price }];
    });
  };

  const commitWeightSale = () => {
    if (!weightPrompt) return;
    const parsedWeight = parseFloat(weightInput);
    if (isNaN(parsedWeight) || parsedWeight <= 0) {
      alert("Ingresa un peso válido mayor a cero.");
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

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) => prev.map(item => {
      if (item.product.id === id) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return item;
        if (newQty > item.product.stockCount) return item;
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== id));
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
    setIsProcessing(true);
    try {
      const payload = {
        items: cart.map(c => ({
          productId: c.product.id,
          quantity: c.quantity,
          price: c.customPrice,
        })),
        total: cartTotal,
        paymentMethod,
      };
      await api.post("/sales", payload);
      setCart([]);
      alert("✅ ¡Venta registrada con éxito!");
      fetchProducts();
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
      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-100px)]">

        {/* LADO IZQUIERDO: CATÁLOGO */}
        <div className="flex-1 flex flex-col h-full space-y-4">
          <div className="flex items-center gap-4 bg-app-card backdrop-blur-md rounded-2xl p-4 border border-app-border shadow-lg">
            <div className="p-2 bg-app-accent/20 text-app-accent rounded-lg">
              <ShoppingCart size={24} />
            </div>
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-app-text-muted" size={18} />
              <input
                type="text"
                placeholder="Escanear Código de Barras o Buscar Producto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-app-bg border border-app-border rounded-xl pl-12 pr-4 py-3 text-app-text placeholder-app-text-muted focus:outline-none focus:border-app-accent/50 shadow-inner font-medium text-lg"
                autoFocus
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {visibleProducts.map(p => {
                const agotado = p.stockCount === 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    disabled={agotado}
                    className={`relative bg-app-card backdrop-blur-md border ${agotado ? 'border-rose-500/20' : 'border-app-border hover:border-app-accent/50'} rounded-2xl p-4 flex flex-col text-left transition-all ${agotado ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:-translate-y-1 hover:shadow-xl hover:shadow-app-accent/10 active:scale-95'}`}
                  >
                    {agotado && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 bg-rose-500/20 text-rose-400 text-[10px] font-bold rounded uppercase">Agotado</div>
                    )}
                    <div className="w-12 h-12 rounded-full bg-app-bg border border-app-border mb-3 flex items-center justify-center font-bold text-app-text/50 text-xl overflow-hidden shadow-inner flex-shrink-0">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-app-accent font-mono text-[10px] mb-1 font-bold">{p.sku}</span>
                    <h4 className="text-app-text font-medium text-sm leading-tight flex-1 mb-2">{p.name}</h4>
                    <div className="flex items-end justify-between w-full mt-auto">
                      <span className="text-emerald-500 font-bold">${p.sale_price.toLocaleString()}</span>
                      <span className="text-app-text-muted text-xs font-bold">{p.unit_type === 'WEIGHT' ? `${p.stockCount} Kg/Lts` : `${p.stockCount} Disp.`}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* LADO DERECHO: TICKET */}
        <div className="w-full lg:w-96 flex flex-col bg-app-sidebar backdrop-blur-md rounded-2xl border border-app-border shadow-2xl overflow-hidden h-full">
          <div className="bg-black/10 p-4 border-b border-app-border">
            <h3 className="text-lg font-bold text-app-text">Ticket Actual</h3>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-app-text/30 space-y-4">
                <ShoppingCart size={48} className="opacity-20" />
                <p className="font-bold">Carrito vacío</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.product.id} className="flex flex-col bg-app-card rounded-xl p-3 border border-app-border group/cart transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-app-text font-medium text-sm pr-2 leading-tight truncate">{item.product.name}</span>
                        <span className="text-app-text-muted text-[10px] uppercase font-bold tracking-tight">{item.product.sku}</span>
                    </div>
                    <button onClick={() => removeFromCart(item.product.id)} className="text-app-text-muted hover:text-rose-400 transition-colors shrink-0">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-auto gap-2">
                    <div className="flex-1 min-w-0">
                        {isPriceEditing === item.product.id ? (
                            <div className="flex items-center gap-1">
                                <span className="text-app-accent font-bold">$</span>
                                <input 
                                    type="number"
                                    autoFocus
                                    className="w-24 bg-black/10 border border-app-accent/50 rounded px-1.5 py-0.5 text-sm font-bold text-app-accent focus:outline-none"
                                    value={item.customPrice}
                                    onChange={(e) => {
                                        const newP = parseFloat(e.target.value) || 0;
                                        setCart(prev => prev.map(i => i.product.id === item.product.id ? { ...i, customPrice: newP } : i));
                                    }}
                                    onBlur={() => setIsPriceEditing(null)}
                                    onKeyDown={(e) => e.key === 'Enter' && setIsPriceEditing(null)}
                                />
                            </div>
                        ) : (
                            <button 
                                onClick={() => setIsPriceEditing(item.product.id)}
                                className="text-app-accent font-black text-base hover:bg-black/10 px-1 py-0.5 rounded transition-colors truncate w-full text-left"
                                title="Click para editar precio"
                            >
                                ${Number(item.customPrice).toLocaleString()}
                                <span className="text-[10px] text-app-text-muted ml-1 font-normal italic opacity-0 group-hover/cart:opacity-100 transition-opacity">(Edit)</span>
                            </button>
                        )}
                    </div>

                    {item.product.unit_type === "WEIGHT" ? (
                      <span className="text-xs font-bold text-amber-500 px-2 py-1 bg-amber-500/10 rounded-lg shrink-0">{item.quantity} Kg</span>
                    ) : (
                      <div className="flex items-center bg-black/10 rounded-lg p-1 border border-app-border shrink-0">
                        <button onClick={() => updateQuantity(item.product.id, -1)} className="p-1 hover:bg-black/10 rounded-md text-app-text-muted"><Minus size={14} /></button>
                        <span className="w-8 text-center text-sm font-bold text-app-text">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product.id, 1)} className="p-1 hover:bg-black/10 rounded-md text-app-text-muted"><Plus size={14} /></button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Checkout */}
          <div className="bg-black/5 p-5 mt-auto border-t border-app-border space-y-4">
            <div className="grid grid-cols-3 gap-2 bg-black/10 p-1.5 rounded-xl border border-app-border">
              {([
                { key: "CASH", label: "Efectivo", icon: <Banknote size={16} className="mb-1" /> },
                { key: "CARD", label: "Tarjeta", icon: <CreditCard size={16} className="mb-1" /> },
                { key: "TRANSFER", label: "Transf.", icon: <Building2 size={16} className="mb-1" /> },
              ] as const).map(m => (
                <button
                  key={m.key}
                  onClick={() => setPaymentMethod(m.key)}
                  className={`flex flex-col items-center py-2 rounded-lg transition-all ${paymentMethod === m.key ? 'bg-app-accent/20 text-app-accent border border-app-accent/30' : 'text-app-text-muted hover:bg-app-accent/5'}`}
                >
                  {m.icon}
                  <span className="text-[10px] font-bold">{m.label}</span>
                </button>
              ))}
            </div>

            <div className="flex flex-col border-b border-app-border pb-4 space-y-3">
                <div className="flex justify-between items-center">
                    <span className="text-app-text-muted font-medium text-sm">Total a Pagar</span>
                    <span className="text-2xl font-black text-app-text tracking-tight">${cartTotal.toLocaleString()}</span>
                </div>
                
                {paymentMethod === 'CASH' && (
                    <div className="space-y-3 pt-2 animate-in slide-in-from-bottom-2 duration-300">
                        <div className="flex justify-between items-center">
                            <span className="text-app-accent font-bold text-xs uppercase tracking-wider">Efectivo Recibido</span>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-app-accent/50 text-sm">$</span>
                                <input 
                                    type="number"
                                    value={cashReceived}
                                    onChange={(e) => setCashReceived(e.target.value)}
                                    placeholder="0"
                                    className="w-32 bg-black/10 border border-app-accent/30 rounded-lg pl-6 pr-3 py-2 text-right text-app-accent font-bold text-lg focus:outline-none focus:ring-1 focus:ring-app-accent/50"
                                />
                            </div>
                        </div>
                        <div className="flex justify-between items-center bg-app-accent/10 p-3 rounded-xl border border-app-accent/20">
                            <span className="text-app-accent font-bold text-xs uppercase tracking-wider">Cambio (Vueltos)</span>
                            <span className="text-2xl font-black text-app-accent">${change.toLocaleString()}</span>
                        </div>
                    </div>
                )}
            </div>

            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || isProcessing || (paymentMethod === 'CASH' && (parseFloat(cashReceived) < cartTotal || !cashReceived))}
              className={`w-full py-4 rounded-xl font-bold flex justify-center items-center gap-2 transition-all shadow-xl ${cart.length === 0 || (paymentMethod === 'CASH' && parseFloat(cashReceived) < cartTotal) ? 'bg-black/10 text-app-text-muted cursor-not-allowed' : 'bg-app-accent hover:bg-app-accent-hover text-white shadow-app-accent/20'}`}
            >
              {isProcessing ? <Loader2 size={24} className="animate-spin" /> : <CheckCircle2 size={24} />}
              {isProcessing ? "PROCESANDO..." : "FINALIZAR VENTA"}
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Pesaje */}
      {weightPrompt && (
        <div className="fixed inset-0 z-50 flex justify-center items-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setWeightPrompt(null)}></div>
          <div className="relative w-full max-w-sm bg-app-bg rounded-2xl shadow-2xl border border-app-border p-6 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-app-accent/20 text-app-accent flex items-center justify-center mb-4">
              <ShoppingCart size={32} />
            </div>
            <h2 className="text-xl font-bold text-app-text text-center mb-1">{weightPrompt.name}</h2>
            <p className="text-sm text-center text-app-text-muted mb-6">Ingresa el peso de la báscula (ej. 1.250)</p>
            <div className="w-full relative mb-6">
              <input
                type="number"
                step="0.001"
                autoFocus
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') commitWeightSale(); }}
                className="w-full bg-black/10 border border-app-border rounded-xl px-4 py-4 text-center text-3xl font-bold text-app-text placeholder-app-text/10 focus:outline-none focus:ring-2 focus:ring-app-accent/50"
                placeholder="0.000"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-app-text-muted font-bold">Kg</span>
            </div>
            <div className="flex gap-3 w-full">
              <button onClick={() => setWeightPrompt(null)} className="flex-1 py-3 rounded-lg border border-app-border text-app-text-muted hover:text-app-text transition-colors">Cancelar</button>
              <button onClick={commitWeightSale} className="flex-1 py-3 rounded-lg bg-app-accent hover:bg-app-accent-hover text-white font-bold transition-colors">Agregar</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
