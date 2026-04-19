import { useEffect, useState, useMemo } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import { api } from "../api/axios";
import { useAuth } from "../auth/AuthContext";
import {
    Users, Search, Plus, ChevronDown, ChevronUp, Phone, Mail,
    CreditCard, Wallet, Receipt, Loader2, CheckCircle2, Edit2, X
} from "lucide-react";

const cop = (v: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(v);

interface Customer {
    id: string; name: string; phone?: string; email?: string;
    credit_limit?: number; notes?: string; created_at: string;
    totalCredit: number; totalPaid: number; balance: number;
    invoiceCount: number; lastActivity?: string;
}
interface Sale {
    id: string; created_at: string; total: string; payment_method: string;
    status: string; is_credit: boolean;
    branches?: { name: string };
    users?: { name: string };
    sale_items: { quantity: string; price: string; subtotal: string; products: { name: string; sku: string } }[];
}
interface Payment {
    id: string; amount: string; payment_method: string; notes?: string;
    created_at: string; users?: { name: string };
}

export default function CustomersPage() {
    const { hasPermission, user } = useAuth();
    const isAdmin = user?.role === "ADMIN";
    const canManage = hasPermission("customers.manage") || isAdmin;
    const canAddPayment = canManage || hasPermission("pos.access");
    // Ver deuda/balance: cualquiera que pueda cobrar lo necesita ver
    const canViewBalance = canAddPayment;

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [expandedSection, setExpandedSection] = useState<"invoices" | "payments">("invoices");

    const [sales, setSales] = useState<Sale[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);

    // Modal nuevo/editar cliente
    const [showForm, setShowForm] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [formData, setFormData] = useState({ name: "", phone: "", email: "", credit_limit: "", notes: "" });
    const [isSaving, setIsSaving] = useState(false);

    // Modal abono
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("CASH");
    const [paymentNotes, setPaymentNotes] = useState("");
    const [isAddingPayment, setIsAddingPayment] = useState(false);

    useEffect(() => { fetchCustomers(); }, []);

    const fetchCustomers = async () => {
        setIsLoading(true);
        try {
            const res = await api.get("/customers");
            setCustomers(res.data);
        } catch { setCustomers([]); }
        finally { setIsLoading(false); }
    };

    const fetchDetail = async (id: string) => {
        setIsLoadingDetail(true);
        try {
            const [salesRes, paymentsRes] = await Promise.all([
                api.get(`/customers/${id}/sales`),
                api.get(`/customers/${id}/payments`),
            ]);
            setSales(salesRes.data);
            setPayments(paymentsRes.data);
        } catch { setSales([]); setPayments([]); }
        finally { setIsLoadingDetail(false); }
    };

    const selectCustomer = (id: string) => {
        if (selectedId === id) { setSelectedId(null); return; }
        setSelectedId(id);
        fetchDetail(id);
    };

    const openNew = () => {
        setEditingCustomer(null);
        setFormData({ name: "", phone: "", email: "", credit_limit: "", notes: "" });
        setShowForm(true);
    };

    const openEdit = (c: Customer) => {
        setEditingCustomer(c);
        setFormData({ name: c.name, phone: c.phone || "", email: c.email || "", credit_limit: c.credit_limit?.toString() || "", notes: c.notes || "" });
        setShowForm(true);
    };

    const handleSave = async () => {
        if (!formData.name.trim()) return alert("El nombre es obligatorio.");
        setIsSaving(true);
        try {
            const payload = {
                name: formData.name,
                phone: formData.phone || undefined,
                email: formData.email || undefined,
                credit_limit: formData.credit_limit ? parseFloat(formData.credit_limit) : undefined,
                notes: formData.notes || undefined,
            };
            if (editingCustomer) {
                await api.put(`/customers/${editingCustomer.id}`, payload);
            } else {
                await api.post("/customers", payload);
            }
            setShowForm(false);
            fetchCustomers();
        } catch (e: any) {
            alert(e.response?.data?.message || "Error al guardar el cliente.");
        } finally { setIsSaving(false); }
    };

    const handlePayment = async () => {
        if (!selectedId || !paymentAmount || parseFloat(paymentAmount) <= 0) return;
        setIsAddingPayment(true);
        try {
            await api.post(`/customers/${selectedId}/payments`, {
                amount: parseFloat(paymentAmount),
                method: paymentMethod,
                notes: paymentNotes || undefined,
            });
            setShowPaymentModal(false);
            setPaymentAmount(""); setPaymentNotes("");
            fetchCustomers();
            fetchDetail(selectedId);
        } catch (e: any) {
            alert(e.response?.data?.message || "Error al registrar el abono.");
        } finally { setIsAddingPayment(false); }
    };

    const filtered = useMemo(() => {
        if (!search) return customers;
        const q = search.toLowerCase();
        return customers.filter(c => c.name.toLowerCase().includes(q) || c.phone?.includes(q) || c.email?.toLowerCase().includes(q));
    }, [customers, search]);

    const selected = customers.find(c => c.id === selectedId);

    return (
        <DashboardLayout>
            <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-3xl font-bold text-app-text flex items-center gap-3">
                        <Users size={28} className="text-cyan-400" /> Clientes
                    </h1>
                    <p className="text-app-text-muted mt-1 text-sm">Gestión de clientes y cuentas por cobrar.</p>
                </div>
                {canManage && (
                    <button onClick={openNew} className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-white font-bold rounded-xl shadow-lg shadow-cyan-900/20 transition-all text-sm">
                        <Plus size={16} /> Nuevo Cliente
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

                {/* ── LISTA ── */}
                <div className="xl:col-span-2 bg-app-card border border-app-border rounded-2xl overflow-hidden shadow-xl flex flex-col">
                    <div className="p-4 border-b border-app-border">
                        <div className="relative">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-text-muted" />
                            <input type="text" placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)}
                                className="w-full bg-app-bg border border-app-border rounded-xl pl-9 pr-4 py-2.5 text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40" />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto divide-y divide-app-border custom-scrollbar">
                        {isLoading ? (
                            <div className="flex justify-center items-center py-16 gap-2 text-app-text-muted">
                                <Loader2 size={20} className="animate-spin" /> Cargando...
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="text-center py-16 text-app-text-muted text-sm opacity-40">
                                <Users size={36} className="mx-auto mb-3 opacity-30" />
                                No hay clientes registrados.
                            </div>
                        ) : filtered.map(c => {
                            const isSelected = selectedId === c.id;
                            const hasBalance = c.balance > 0;
                            return (
                                <button key={c.id} onClick={() => selectCustomer(c.id)}
                                    className={`w-full flex items-center gap-4 px-4 py-3.5 text-left transition-colors ${isSelected ? "bg-cyan-500/10 border-l-2 border-cyan-500" : "hover:bg-app-card/80 border-l-2 border-transparent"}`}>
                                    <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center font-black text-cyan-400 text-base shrink-0">
                                        {c.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-app-text truncate">{c.name}</p>
                                        <p className="text-[10px] text-app-text-muted">{c.phone || c.email || "Sin contacto"}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        {canViewBalance && hasBalance ? (
                                            <>
                                                <p className="text-xs font-black text-rose-400">{cop(c.balance)}</p>
                                                <p className="text-[9px] text-app-text-muted">pendiente</p>
                                            </>
                                        ) : (
                                            <p className="text-[9px] text-app-text-muted">{c.invoiceCount} facturas</p>
                                        )}
                                    </div>
                                    {isSelected ? <ChevronUp size={14} className="text-cyan-400 shrink-0" /> : <ChevronDown size={14} className="text-app-text-muted shrink-0" />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ── DETALLE ── */}
                <div className="xl:col-span-3 flex flex-col gap-4">
                    {!selected ? (
                        <div className="bg-app-card border border-app-border rounded-2xl flex flex-col items-center justify-center py-24 text-app-text-muted">
                            <Users size={48} className="opacity-10 mb-4" />
                            <p className="text-sm font-bold opacity-40 uppercase tracking-widest">Selecciona un cliente</p>
                        </div>
                    ) : (
                        <>
                            {/* Info del cliente */}
                            <div className="bg-app-card border border-app-border rounded-2xl p-5 shadow-lg">
                                <div className="flex items-start justify-between gap-4 mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center font-black text-cyan-400 text-xl">
                                            {selected.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-black text-app-text">{selected.name}</h2>
                                            <div className="flex items-center gap-3 mt-0.5">
                                                {selected.phone && <span className="flex items-center gap-1 text-[11px] text-app-text-muted"><Phone size={10} />{selected.phone}</span>}
                                                {selected.email && <span className="flex items-center gap-1 text-[11px] text-app-text-muted"><Mail size={10} />{selected.email}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {canManage && (
                                            <button onClick={() => openEdit(selected)} className="p-2 text-app-text-muted hover:text-cyan-400 border border-app-border rounded-lg transition-colors">
                                                <Edit2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {canViewBalance && (
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="bg-app-bg rounded-xl p-3 border border-app-border">
                                            <p className="text-[9px] font-black uppercase text-app-text-muted tracking-widest mb-1">Total Fiado</p>
                                            <p className="text-base font-black text-app-text">{cop(selected.totalCredit)}</p>
                                        </div>
                                        <div className="bg-app-bg rounded-xl p-3 border border-app-border">
                                            <p className="text-[9px] font-black uppercase text-app-text-muted tracking-widest mb-1">Total Abonado</p>
                                            <p className="text-base font-black text-emerald-400">{cop(selected.totalPaid)}</p>
                                        </div>
                                        <div className="bg-app-bg rounded-xl p-3 border border-rose-500/20">
                                            <p className="text-[9px] font-black uppercase text-app-text-muted tracking-widest mb-1">Saldo</p>
                                            <p className={`text-base font-black ${selected.balance > 0 ? "text-rose-400" : "text-emerald-400"}`}>{cop(selected.balance)}</p>
                                        </div>
                                    </div>
                                )}

                                {selected.credit_limit && canViewBalance && (
                                    <div className="mt-3 flex items-center gap-2 text-[11px] text-app-text-muted">
                                        <CreditCard size={12} />
                                        <span>Límite de crédito: <span className="font-bold text-app-text">{cop(selected.credit_limit)}</span></span>
                                        {selected.balance > selected.credit_limit && (
                                            <span className="ml-2 text-[9px] font-black bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded uppercase">Límite excedido</span>
                                        )}
                                    </div>
                                )}

                                {selected.notes && (
                                    <p className="mt-3 text-xs text-app-text-muted italic border-t border-app-border pt-3">{selected.notes}</p>
                                )}

                                {canAddPayment && selected.balance > 0 && (
                                    <button onClick={() => setShowPaymentModal(true)}
                                        className="mt-4 w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2">
                                        <Wallet size={15} /> Registrar Abono
                                    </button>
                                )}
                            </div>

                            {/* Tabs: Facturas / Abonos */}
                            <div className="bg-app-card border border-app-border rounded-2xl overflow-hidden shadow-lg flex flex-col">
                                <div className="flex border-b border-app-border bg-app-bg p-1">
                                    <button onClick={() => setExpandedSection("invoices")}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl transition-all ${expandedSection === "invoices" ? "bg-app-card text-cyan-400 shadow" : "text-app-text-muted hover:text-app-text"}`}>
                                        <Receipt size={14} /> Facturas al Crédito ({sales.length})
                                    </button>
                                    <button onClick={() => setExpandedSection("payments")}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl transition-all ${expandedSection === "payments" ? "bg-app-card text-emerald-400 shadow" : "text-app-text-muted hover:text-app-text"}`}>
                                        <Wallet size={14} /> Abonos ({payments.length})
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto max-h-96 custom-scrollbar">
                                    {isLoadingDetail ? (
                                        <div className="flex justify-center items-center py-10 gap-2 text-app-text-muted">
                                            <Loader2 size={18} className="animate-spin" /> Cargando...
                                        </div>
                                    ) : expandedSection === "invoices" ? (
                                        sales.length === 0 ? (
                                            <div className="text-center py-10 text-app-text-muted text-xs opacity-40">Sin facturas al crédito.</div>
                                        ) : sales.map(s => (
                                            <div key={s.id} className="px-5 py-4 border-b border-app-border last:border-0">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div>
                                                        <p className="text-xs font-bold text-app-text">
                                                            {new Date(s.created_at).toLocaleDateString("es-CO", { dateStyle: "medium" })}
                                                            <span className="text-app-text-muted ml-2 font-normal">
                                                                {new Date(s.created_at).toLocaleTimeString("es-CO", { timeStyle: "short" })}
                                                            </span>
                                                        </p>
                                                        <p className="text-[10px] text-app-text-muted mt-0.5">{s.branches?.name || "—"} · {s.users?.name || "—"}</p>
                                                    </div>
                                                    {canViewBalance && (
                                                        <span className="text-sm font-black text-rose-400">{cop(Number(s.total))}</span>
                                                    )}
                                                </div>
                                                <div className="space-y-1">
                                                    {s.sale_items.map((item, i) => (
                                                        <div key={i} className="flex justify-between text-[11px] text-app-text-muted">
                                                            <span>{item.products.name}</span>
                                                            <span>x{Number(item.quantity)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        payments.length === 0 ? (
                                            <div className="text-center py-10 text-app-text-muted text-xs opacity-40">Sin abonos registrados.</div>
                                        ) : payments.map(p => (
                                            <div key={p.id} className="px-5 py-4 border-b border-app-border last:border-0 flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs font-bold text-app-text">
                                                        {new Date(p.created_at).toLocaleDateString("es-CO", { dateStyle: "medium" })}
                                                        <span className={`ml-2 text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${p.payment_method === "CASH" ? "bg-emerald-500/10 text-emerald-400" : "bg-blue-500/10 text-blue-400"}`}>
                                                            {p.payment_method === "CASH" ? "Efectivo" : p.payment_method === "CARD" ? "Tarjeta" : "Transf."}
                                                        </span>
                                                    </p>
                                                    <p className="text-[10px] text-app-text-muted mt-0.5">{p.users?.name || "—"}{p.notes ? ` · ${p.notes}` : ""}</p>
                                                </div>
                                                <span className="text-sm font-black text-emerald-400">{cop(Number(p.amount))}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* ── Modal Crear/Editar Cliente ── */}
            {showForm && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowForm(false)} />
                    <div className="relative w-full max-w-md bg-app-bg rounded-2xl border border-app-border shadow-2xl p-6 animate-in zoom-in duration-200">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="font-black text-app-text text-lg">{editingCustomer ? "Editar Cliente" : "Nuevo Cliente"}</h3>
                            <button onClick={() => setShowForm(false)} className="text-app-text-muted hover:text-app-text"><X size={18} /></button>
                        </div>
                        <div className="flex flex-col gap-3">
                            <div>
                                <label className="block text-[10px] font-black text-app-text-muted uppercase tracking-widest mb-1">Nombre *</label>
                                <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-2.5 text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40" placeholder="Nombre completo" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black text-app-text-muted uppercase tracking-widest mb-1">Teléfono</label>
                                    <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-2.5 text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40" placeholder="Ej: 3001234567" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-app-text-muted uppercase tracking-widest mb-1">Email</label>
                                    <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-2.5 text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40" placeholder="correo@ejemplo.com" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-app-text-muted uppercase tracking-widest mb-1">Límite de Crédito (opcional)</label>
                                <input type="number" min="0" value={formData.credit_limit} onChange={e => setFormData({ ...formData, credit_limit: e.target.value })}
                                    className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-2.5 text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40" placeholder="Sin límite" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-app-text-muted uppercase tracking-widest mb-1">Notas</label>
                                <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    rows={2} className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-2.5 text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 resize-none" placeholder="Observaciones..." />
                            </div>
                            <div className="flex gap-3 mt-2">
                                <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-app-border rounded-xl text-app-text-muted text-sm font-bold hover:text-app-text transition-colors">Cancelar</button>
                                <button onClick={handleSave} disabled={isSaving} className="flex-1 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2">
                                    {isSaving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                                    {editingCustomer ? "Guardar" : "Crear"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal Abono ── */}
            {showPaymentModal && selected && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowPaymentModal(false)} />
                    <div className="relative w-full max-w-sm bg-app-bg rounded-2xl border border-app-border shadow-2xl p-6 animate-in zoom-in duration-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-black text-app-text">Registrar Abono</h3>
                            <button onClick={() => setShowPaymentModal(false)} className="text-app-text-muted hover:text-app-text"><X size={18} /></button>
                        </div>
                        <p className="text-sm text-app-text-muted mb-4">
                            Cliente: <span className="font-bold text-app-text">{selected.name}</span>
                            {canViewBalance && <span className="ml-2 text-rose-400 font-bold">· Saldo: {cop(selected.balance)}</span>}
                        </p>
                        <div className="flex flex-col gap-3">
                            <div>
                                <label className="block text-[10px] font-black text-app-text-muted uppercase tracking-widest mb-1">Monto *</label>
                                <input type="number" min="0" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)}
                                    className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-2.5 text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40" placeholder="$0" autoFocus />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-app-text-muted uppercase tracking-widest mb-1">Método</label>
                                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                                    className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-2.5 text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40">
                                    <option value="CASH">Efectivo</option>
                                    <option value="CARD">Tarjeta</option>
                                    <option value="TRANSFER">Transferencia</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-app-text-muted uppercase tracking-widest mb-1">Nota (opcional)</label>
                                <input type="text" value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)}
                                    className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-2.5 text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40" placeholder="Observación..." />
                            </div>
                            <div className="flex gap-3 mt-2">
                                <button onClick={() => setShowPaymentModal(false)} className="flex-1 py-2.5 border border-app-border rounded-xl text-app-text-muted text-sm font-bold">Cancelar</button>
                                <button onClick={handlePayment} disabled={isAddingPayment || !paymentAmount}
                                    className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-40">
                                    {isAddingPayment ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                                    Registrar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
