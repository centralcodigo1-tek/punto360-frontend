import { toast } from "../lib/toast";
import { useEffect, useState, useMemo } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import { api } from "../api/axios";
import { useAuth } from "../auth/AuthContext";
import {
    PackagePlus, Search, Trash2, Plus, ChevronDown, ChevronUp,
    Loader2, CheckCircle2, Truck, Calendar, ShoppingBag
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Supplier { id: string; name: string; phone?: string; }
interface Product { id: string; name: string; sku: string; unit_type: string; }
interface PurchaseItem { productId: string; productName: string; sku: string; unit_type: string; quantity: number; cost: number; salePrice: number; }
interface PurchaseRecord {
    id: string;
    created_at: string;
    total: string;
    paid_amount: string;
    status: string;
    due_date?: string;
    suppliers: { name: string; phone?: string } | null;
    purchase_items: {
        quantity: string;
        cost: string;
        products: { name: string; sku: string; unit_type: string };
    }[];
    purchase_payments: {
        amount: string;
        payment_method: string;
        created_at: string;
    }[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const cop = (v: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(v);

export default function PurchasesPage() {
    const { hasPermission, user } = useAuth();
    const isCajero = user?.role === 'CAJERO' || (!hasPermission('purchases.manage') && !hasPermission('inventory.manage'));

    // ── Suppliers state ────────────────────────────────────────────────────────
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [selectedSupplier, setSelectedSupplier] = useState("");
    const [showNewSupplier, setShowNewSupplier] = useState(false);
    const [newSupplierName, setNewSupplierName] = useState("");
    const [newSupplierPhone, setNewSupplierPhone] = useState("");
    const [isSavingSupplier, setIsSavingSupplier] = useState(false);

    // ── Products search ────────────────────────────────────────────────────────
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [productSearch, setProductSearch] = useState("");
    const [showProductDropdown, setShowProductDropdown] = useState(false);

    // ── Purchase items ─────────────────────────────────────────────────────────
    const [items, setItems] = useState<PurchaseItem[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ── History state ──────────────────────────────────────────────────────────
    const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const today = new Date().toISOString().split("T")[0];
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);
    const [view, setView] = useState<"history" | "debts">("history");

    // Cajero: forzar siempre fecha de hoy
    const effectiveStart = isCajero ? today : startDate;
    const effectiveEnd = isCajero ? today : endDate;
    const [debts, setDebts] = useState<PurchaseRecord[]>([]);

    // ── Payment state ──────────────────────────────────────────────────────────
    const [paidAmount, setPaidAmount] = useState<string>("");
    const [paymentMethod, setPaymentMethod] = useState("CASH");
    const [paymentSource, setPaymentSource] = useState<"CASH" | "CARTERA">("CASH");
    const [dueDate, setDueDate] = useState("");

    // ── Load ───────────────────────────────────────────────────────────────────
    useEffect(() => {
        Promise.all([
            api.get("/suppliers"),
            api.get("/products"),
        ]).then(([sRes, pRes]) => {
            setSuppliers(sRes.data);
            setAllProducts(pRes.data.map((p: any) => ({
                id: p.id, name: p.name, sku: p.sku,
                unit_type: p.unit_type || "UNIT",
            })));
        });
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        setIsLoadingHistory(true);
        try {
            const endpoint = view === "history"
                ? `/purchases?startDate=${effectiveStart}&endDate=${effectiveEnd}`
                : `/purchases/debts`;
            
            const res = await api.get(endpoint);
            if (view === "history") setPurchases(res.data);
            else setDebts(res.data);
        } catch { 
            if (view === "history") setPurchases([]); 
            else setDebts([]);
        }
        finally { setIsLoadingHistory(false); }
    };

    useEffect(() => {
        fetchHistory();
    }, [view]);

    // ── Product search filter ──────────────────────────────────────────────────
    const filteredProducts = useMemo(() => {
        if (!productSearch) return [];
        const q = productSearch.toLowerCase();
        return allProducts.filter(p =>
            p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
        ).slice(0, 8);
    }, [productSearch, allProducts]);

    // ── Add product to items ───────────────────────────────────────────────────
    const addItem = (product: Product) => {
        if (items.find(i => i.productId === product.id)) {
            setProductSearch(""); setShowProductDropdown(false); return;
        }
        setItems(prev => [...prev, {
            productId: product.id, productName: product.name,
            sku: product.sku, unit_type: product.unit_type,
            quantity: 1, cost: 0, salePrice: 0,
        }]);
        setProductSearch(""); setShowProductDropdown(false);
    };

    const updateItem = (id: string, field: "quantity" | "cost" | "salePrice", value: number) => {
        setItems(prev => prev.map(i => i.productId === id ? { ...i, [field]: value } : i));
    };

    const removeItem = (id: string) => setItems(prev => prev.filter(i => i.productId !== id));

    const total = useMemo(() => items.reduce((sum, i) => sum + (i.quantity * i.cost), 0), [items]);

    // ── Save new supplier ──────────────────────────────────────────────────────
    const handleSaveSupplier = async () => {
        if (!newSupplierName.trim()) return;
        setIsSavingSupplier(true);
        try {
            const res = await api.post("/suppliers", { name: newSupplierName, phone: newSupplierPhone });
            setSuppliers(prev => [...prev, res.data]);
            setSelectedSupplier(res.data.id);
            setShowNewSupplier(false);
            setNewSupplierName(""); setNewSupplierPhone("");
        } catch { toast.error("Error al guardar el proveedor."); }
        finally { setIsSavingSupplier(false); }
    };

    // ── Submit purchase ────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (items.length === 0) return toast.error("Agrega al menos un producto.");
        if (items.some(i => i.quantity <= 0 || i.cost < 0)) return toast.error("Revisa las cantidades y costos.");

        setIsSubmitting(true);
        try {
            await api.post("/purchases", {
                supplierId: selectedSupplier || undefined,
                items: items.map(i => ({ productId: i.productId, quantity: i.quantity, cost: i.cost, salePrice: i.salePrice || undefined })),
                total,
                paidAmount: paidAmount ? parseFloat(paidAmount) : total,
                paymentMethod: paymentSource === 'CARTERA' ? 'CASH' : paymentMethod,
                paymentSource,
                dueDate: dueDate || undefined,
            });
            setItems([]);
            setSelectedSupplier("");
            setPaidAmount("");
            setPaymentSource("CASH");
            setDueDate("");
            toast.success("Compra registrada. El stock ha sido actualizado.");
            fetchHistory();
        } catch (e: any) {
            alert(e.response?.data?.message || "Error al registrar la compra.");
        } finally { setIsSubmitting(false); }
    };

    // ──────────────────────────────────────────────────────────────────────────
    return (
        <DashboardLayout>
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-app-text flex items-center gap-3">
                    <PackagePlus size={28} className="text-violet-400" />
                    Módulo de Compras
                </h1>
                <p className="text-app-text-muted mt-1 text-sm">Registra recepciones de mercancía — el stock se actualiza automáticamente.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                {/* ── PANEL IZQUIERDO: Formulario ── */}
                <div className="bg-app-card border border-app-border rounded-2xl backdrop-blur-md shadow-xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-app-border flex items-center gap-2">
                        <Truck size={16} className="text-violet-400" />
                        <h2 className="font-bold text-app-text">Nueva Recepción de Mercancía</h2>
                    </div>

                    <div className="p-6 flex flex-col gap-5">
                        {/* Proveedor */}
                        <div>
                            <label className="block text-xs font-medium text-app-text-muted mb-1.5">Proveedor (opcional)</label>
                            <div className="flex gap-2">
                                <select
                                    value={selectedSupplier}
                                    onChange={e => setSelectedSupplier(e.target.value)}
                                    className="flex-1 bg-app-bg border border-app-border rounded-xl px-4 py-2.5 text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                                >
                                    <option value="">— Sin proveedor —</option>
                                    {suppliers.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                                <button
                                    onClick={() => setShowNewSupplier(!showNewSupplier)}
                                    className="px-3 py-2 bg-violet-500/10 border border-violet-500/20 rounded-xl text-violet-400 hover:bg-violet-500/20 transition-colors"
                                    title="Nuevo proveedor"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>

                            {showNewSupplier && (
                                <div className="mt-3 p-4 bg-app-bg rounded-xl border border-app-border flex flex-col gap-3">
                                    <input
                                        type="text"
                                        placeholder="Nombre del proveedor *"
                                        value={newSupplierName}
                                        onChange={e => setNewSupplierName(e.target.value)}
                                        className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2 text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Teléfono (opcional)"
                                        value={newSupplierPhone}
                                        onChange={e => setNewSupplierPhone(e.target.value)}
                                        className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2 text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                                    />
                                    <div className="flex gap-2">
                                        <button onClick={() => setShowNewSupplier(false)} className="flex-1 py-2 rounded-lg border border-app-border text-app-text-muted text-sm hover:text-app-text transition-colors">Cancelar</button>
                                        <button onClick={handleSaveSupplier} disabled={isSavingSupplier} className="flex-1 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm transition-colors flex items-center justify-center gap-1">
                                            {isSavingSupplier ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                            Guardar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Buscador de productos */}
                        <div>
                            <label className="block text-xs font-medium text-app-text-muted mb-1.5">Agregar Productos</label>
                            <div className="relative">
                                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-text-muted" />
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre o SKU..."
                                    value={productSearch}
                                    onChange={e => { setProductSearch(e.target.value); setShowProductDropdown(true); }}
                                    onFocus={() => setShowProductDropdown(true)}
                                    className="w-full bg-app-bg border border-app-border rounded-xl pl-9 pr-4 py-2.5 text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                                />
                                {showProductDropdown && filteredProducts.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-app-bg border border-app-border rounded-xl shadow-2xl z-20 overflow-hidden">
                                        {filteredProducts.map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => addItem(p)}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-app-card text-left transition-colors"
                                            >
                                                <span className="text-violet-400 font-mono text-xs w-24 shrink-0">{p.sku}</span>
                                                <span className="text-white text-sm flex-1">{p.name}</span>
                                                <span className="text-app-text-muted text-xs">{p.unit_type === "WEIGHT" ? "Kg/Lts" : "Unid."}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tabla de ítems */}
                        {items.length > 0 && (
                            <div className="flex flex-col gap-2">
                                <div className="grid grid-cols-12 gap-2 px-1 text-[10px] font-bold text-app-text-muted uppercase">
                                    <span className="col-span-4">Producto</span>
                                    <span className="col-span-2 text-center">Cantidad</span>
                                    <span className="col-span-2 text-center">Costo</span>
                                    <span className="col-span-2 text-center">P. Venta</span>
                                    <span className="col-span-2 text-center">Subtotal</span>
                                </div>
                                {items.map(item => (
                                    <div key={item.productId} className="grid grid-cols-12 gap-2 items-center bg-app-bg rounded-xl px-3 py-2 border border-app-border">
                                        <div className="col-span-4">
                                            <p className="text-sm font-medium text-app-text truncate">{item.productName}</p>
                                            <p className="text-[10px] text-app-text-muted">{item.sku} · {item.unit_type === "WEIGHT" ? "Kg" : "Unid."}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <input
                                                type="number"
                                                min="0.001"
                                                step={item.unit_type === "WEIGHT" ? "0.001" : "1"}
                                                value={item.quantity}
                                                onChange={e => updateItem(item.productId, "quantity", parseFloat(e.target.value) || 0)}
                                                className="w-full bg-app-bg border border-app-border rounded-lg px-2 py-1.5 text-app-text text-sm text-center focus:outline-none focus:ring-1 focus:ring-violet-500/40"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <input
                                                type="number"
                                                min="0"
                                                step="100"
                                                value={item.cost}
                                                onChange={e => updateItem(item.productId, "cost", parseFloat(e.target.value) || 0)}
                                                className="w-full bg-app-bg border border-app-border rounded-lg px-2 py-1.5 text-app-text text-sm text-center focus:outline-none focus:ring-1 focus:ring-violet-500/40"
                                                placeholder="$0"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <input
                                                type="number"
                                                min="0"
                                                step="100"
                                                value={item.salePrice || ""}
                                                onChange={e => updateItem(item.productId, "salePrice", parseFloat(e.target.value) || 0)}
                                                className="w-full bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-2 py-1.5 text-emerald-400 text-sm text-center focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                                                placeholder="—"
                                            />
                                        </div>
                                        <div className="col-span-1 text-right">
                                            <p className="text-app-text-muted font-bold text-xs">{cop(item.quantity * item.cost)}</p>
                                        </div>
                                        <div className="col-span-1 flex justify-end">
                                            <button onClick={() => removeItem(item.productId)} className="text-app-text-muted hover:text-rose-400 transition-colors p-1">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {/* Total + Submit */}
                                <div className="flex flex-col gap-4 px-3 py-4 bg-app-bg rounded-2xl border border-app-border mt-4">
                                    <h4 className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">Información de Pago</h4>
                                    
                                    {/* Fuente del pago */}
                                    <div>
                                        <label className="block text-[10px] text-app-text-muted mb-1.5">Fuente del Pago</label>
                                        <div className="flex gap-2 bg-app-bg p-1 rounded-xl border border-app-border">
                                            <button
                                                onClick={() => setPaymentSource("CASH")}
                                                className={`flex-1 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${paymentSource === "CASH" ? "bg-violet-600 text-white" : "text-app-text-muted hover:text-app-text"}`}
                                            >
                                                Sale de Caja
                                            </button>
                                            <button
                                                onClick={() => setPaymentSource("CARTERA")}
                                                className={`flex-1 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${paymentSource === "CARTERA" ? "bg-app-accent text-white" : "text-app-text-muted hover:text-app-text"}`}
                                            >
                                                Sale de Cartera
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] text-app-text-muted mb-1">Monto Pagado Inicial</label>
                                            <input
                                                type="number"
                                                placeholder={total.toString()}
                                                value={paidAmount}
                                                onChange={e => setPaidAmount(e.target.value)}
                                                className="w-full bg-app-bg border border-app-border rounded-xl px-3 py-2 text-app-text text-sm focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] text-app-text-muted mb-1">Método de Pago</label>
                                            <select
                                                value={paymentMethod}
                                                onChange={e => setPaymentMethod(e.target.value)}
                                                disabled={paymentSource === "CARTERA"}
                                                className="w-full bg-app-bg border border-app-border rounded-xl px-3 py-2 text-app-text text-sm focus:outline-none focus:ring-1 focus:ring-violet-500/50 disabled:opacity-40"
                                            >
                                                <option value="CASH">Efectivo</option>
                                                <option value="CARD">Tarjeta</option>
                                                <option value="TRANSFER">Transferencia</option>
                                            </select>
                                        </div>
                                    </div>

                                    {(paidAmount && parseFloat(paidAmount) < total) && (
                                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                            <label className="block text-[10px] text-app-text-muted mb-1">Fecha Límite de Pago (Opcional)</label>
                                            <input 
                                                type="date" 
                                                value={dueDate}
                                                onChange={e => setDueDate(e.target.value)}
                                                className="w-full bg-violet-500/5 border border-violet-500/30 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                                            />
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between border-t border-app-border pt-4">
                                        <span className="text-app-text-muted font-medium text-sm">Restante / Deuda</span>
                                        <span className={`text-xl font-black ${parseFloat(paidAmount || "0") < total ? "text-rose-400" : "text-app-text-muted"}`}>
                                            {cop(Math.max(0, total - parseFloat(paidAmount || "0")))}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between px-3 py-3 mt-1">
                                    <span className="text-app-text-muted font-medium text-sm">Total de la Compra</span>
                                    <span className="text-2xl font-black text-app-text">{cop(total)}</span>
                                </div>
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-violet-900/30 disabled:opacity-40"
                                >
                                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                                    Registrar Compra
                                </button>
                            </div>
                        )}

                        {items.length === 0 && (
                            <div className="text-center py-10 text-app-text-muted">
                                <ShoppingBag size={40} className="mx-auto mb-3 opacity-30" />
                                <p className="text-sm">Busca y agrega productos a esta recepción</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── PANEL DERECHO: Historial ── */}
                <div className="bg-app-card border border-app-border rounded-2xl backdrop-blur-md shadow-xl overflow-hidden flex flex-col">
                    <div className="px-1 py-1 border-b border-app-border flex bg-app-bg">
                        <button
                            onClick={() => setView("history")}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-all rounded-xl ${view === "history" ? "bg-app-card text-cyan-400 shadow-lg" : "text-app-text-muted hover:text-app-text"}`}
                        >
                            <Calendar size={16} /> Historial
                        </button>
                        {!isCajero && (
                            <button
                                onClick={() => setView("debts")}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-all rounded-xl ${view === "debts" ? "bg-rose-500/10 text-rose-400 shadow-lg" : "text-app-text-muted hover:text-app-text"}`}
                            >
                                <Truck size={16} /> Cuentas por Pagar
                            </button>
                        )}
                    </div>

                    {view === "history" && !isCajero && (
                        <div className="px-6 py-4 border-b border-app-border animate-in fade-in duration-300">
                            <h2 className="font-bold text-app-text flex items-center gap-2 mb-3 text-xs uppercase tracking-widest opacity-50">
                                Filtros de Historial
                            </h2>
                            <div className="flex gap-2">
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                                    className="flex-1 bg-app-bg border border-app-border rounded-xl px-3 py-2 text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40" />
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                                    className="flex-1 bg-app-bg border border-app-border rounded-xl px-3 py-2 text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40" />
                                <button onClick={fetchHistory}
                                    className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-cyan-400 text-sm font-bold hover:bg-cyan-500/30 transition-colors">
                                    Buscar
                                </button>
                            </div>
                        </div>
                    )}
                    {view === "history" && isCajero && (
                        <div className="px-6 py-3 border-b border-app-border bg-app-bg/50">
                            <p className="text-[10px] font-black uppercase tracking-widest text-app-text-muted">
                                Compras de hoy — {new Date().toLocaleDateString('es-CO', { dateStyle: 'long' })}
                            </p>
                        </div>
                    )}

                    {view === "debts" && (
                        <div className="px-6 py-4 border-b border-app-border bg-rose-500/5 animate-in fade-in duration-300">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="font-bold text-rose-400 text-xs uppercase tracking-widest">Resumen de Deuda</h2>
                                    <p className="text-[10px] text-app-text-muted">Facturas pendientes con proveedores</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-black text-rose-400">
                                        {cop(debts.reduce((sum, d) => sum + (Number(d.total) - Number(d.paid_amount)), 0))}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto divide-y divide-white/5">
                        {isLoadingHistory ? (
                            <div className="flex justify-center items-center py-16 gap-2 text-app-text-muted">
                                <Loader2 size={20} className="animate-spin" /> Cargando...
                            </div>
                        ) : (view === "history" ? purchases : debts).length === 0 ? (
                            <div className="text-center py-16 text-app-text-muted text-sm">
                                <PackagePlus size={36} className="mx-auto mb-3 opacity-20" />
                                No hay registros para mostrar.
                            </div>
                        ) : (view === "history" ? purchases : debts).map(p => {
                            const isOpen = expandedId === p.id;
                            const balance = Number(p.total) - Number(p.paid_amount);
                            const isOverdue = p.due_date && new Date(p.due_date) < new Date();

                            return (
                                <div key={p.id} className={view === "debts" ? "border-l-4 border-rose-500/30" : ""}>
                                    <button
                                        onClick={() => setExpandedId(isOpen ? null : p.id)}
                                        className="w-full flex items-center gap-4 px-6 py-4 hover:bg-app-card transition-colors text-left"
                                    >
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${view === "history" ? "bg-violet-500/20" : "bg-rose-500/20"}`}>
                                            <Truck size={16} className={view === "history" ? "text-violet-400" : "text-rose-400"} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-medium text-app-text truncate">
                                                    {p.suppliers?.name || "Sin proveedor"}
                                                </p>
                                                {view === "debts" && isOverdue && (
                                                    <span className="text-[8px] font-bold bg-rose-500 text-white px-1.5 py-0.5 rounded uppercase pulse">Vencido</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-app-text-muted">
                                                {new Date(p.created_at).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
                                                <span className="mx-2">·</span>
                                                {p.purchase_items?.length || 0} producto{(p.purchase_items?.length || 0) !== 1 ? "s" : ""}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            {view === "history" ? (
                                                <span className="text-emerald-400 font-bold text-sm">{cop(Number(p.total))}</span>
                                            ) : (
                                                <div className="flex flex-col items-end">
                                                    <span className="text-rose-400 font-bold text-sm">{cop(balance)}</span>
                                                    <span className="text-[10px] text-app-text-muted line-through">{cop(Number(p.total))}</span>
                                                </div>
                                            )}
                                        </div>
                                        {isOpen ? <ChevronUp size={15} className="text-app-text-muted shrink-0" /> : <ChevronDown size={15} className="text-app-text-muted shrink-0" />}
                                    </button>

                                    {isOpen && (
                                        <div className="px-6 pb-4 animate-in zoom-in-95 duration-200">
                                            <div className="bg-app-bg rounded-xl overflow-hidden border border-app-border mb-3">
                                                <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[10px] font-bold text-app-text-muted uppercase border-b border-app-border">
                                                    <span className="col-span-12">Detalles de Deuda</span>
                                                </div>
                                                <div className="p-4 grid grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] text-app-text-muted uppercase font-bold">Estado de Pago</p>
                                                        <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                                                            p.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400' :
                                                            p.status === 'PARTIAL' ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'
                                                        }`}>
                                                            {p.status === 'PAID' ? 'Pagado' : p.status === 'PARTIAL' ? 'Parcial' : 'Pendiente'}
                                                        </span>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] text-app-text-muted uppercase font-bold">Fecha de Vencimiento</p>
                                                        <p className={`text-xs font-bold ${isOverdue ? "text-rose-400" : "text-app-text-muted"}`}>
                                                            {p.due_date ? new Date(p.due_date).toLocaleDateString() : "No definida"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-app-bg rounded-xl overflow-hidden border border-app-border">
                                                <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[10px] font-bold text-app-text-muted uppercase border-b border-app-border">
                                                    <span className="col-span-5">Producto</span>
                                                    <span className="col-span-3 text-right">Cantidad</span>
                                                    <span className="col-span-4 text-right">Costo Unit.</span>
                                                </div>
                                                {p.purchase_items?.map((item, idx) => (
                                                    <div key={idx} className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-app-border last:border-0">
                                                        <div className="col-span-5">
                                                            <p className="text-sm text-app-text">{item.products?.name || 'N/A'}</p>
                                                            <p className="text-[10px] text-app-text-muted">{item.products?.sku || '---'}</p>
                                                        </div>
                                                        <span className="col-span-3 text-right text-sm text-app-text-muted">
                                                            {Number(item.quantity)}{item.products?.unit_type === "WEIGHT" ? " Kg" : " Uds"}
                                                        </span>
                                                        <span className="col-span-4 text-right text-sm font-medium text-emerald-400">
                                                            {cop(Number(item.cost))}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>

                                            {view === "debts" && balance > 0 && (
                                                <div className="mt-4 flex justify-end">
                                                    <button 
                                                        onClick={() => {
                                                            const payAmount = prompt(`¿Cuánto deseas abonar a esta deuda? (Saldo actual: ${cop(balance)})`);
                                                            if (payAmount) {
                                                                const amt = parseFloat(payAmount);
                                                                if (isNaN(amt) || amt <= 0 || amt > balance) return toast.warning("Monto inválido");
                                                                api.post(`/purchases/${p.id}/payments`, { amount: amt, method: 'CASH' })
                                                                   .then(() => { toast.success("Abono registrado con éxito"); fetchHistory(); })
                                                                   .catch(err => alert(err.response?.data?.message || "Error al pagar"));
                                                            }
                                                        }}
                                                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-emerald-900/20 flex items-center gap-2"
                                                    >
                                                        <CheckCircle2 size={14} /> Registrar Abono (Efectivo)
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
