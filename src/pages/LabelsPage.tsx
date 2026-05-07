import { useState, useEffect, useRef, useCallback } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import { api } from "../api/axios";
import JsBarcode from "jsbarcode";
import { Tag, Settings, Printer, Search, Plus, Trash2, Save, CheckCircle2 } from "lucide-react";
import { toast } from "../lib/toast";

interface LabelConfig {
    labelWidthMm: number;
    labelHeightMm: number;
    columns: number;
    marginMm: number;
    pageWidthMm: number;
    showName: boolean;
    showSku: boolean;
    showPrice: boolean;
    showBarcode: boolean;
}

const DEFAULT_CONFIG: LabelConfig = {
    labelWidthMm: 36.1,   // 1.42"
    labelHeightMm: 19.1,  // 0.752"
    columns: 3,
    marginMm: 1.3,        // 0.051"
    pageWidthMm: 110.8,   // 4.362"
    showName: true,
    showSku: true,
    showPrice: true,
    showBarcode: true,
};

const PRESETS = [
    { label: "Bartender", sub: "36×19 mm", w: 36.1, h: 19.1 },
    { label: "Estándar",  sub: "50×30 mm", w: 50,   h: 30   },
    { label: "Rollo",     sub: "62×29 mm", w: 62,   h: 29   },
    { label: "Mini",      sub: "40×25 mm", w: 40,   h: 25   },
    { label: "Grande",    sub: "100×50 mm",w: 100,  h: 50   },
];

interface LabelProduct {
    id: string; name: string; sku: string;
    sale_price: number; barcode?: string | null; quantity: number;
}
interface Product {
    id: string; name: string; sku: string;
    sale_price: number; barcode?: string | null;
}

const COP = (v: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(v);

const mmToIn = (mm: number) => mm / 25.4;

function BarcodePreview({ value, height = 18 }: { value: string; height?: number }) {
    const ref = useRef<SVGSVGElement>(null);
    useEffect(() => {
        if (!ref.current || !value) return;
        try { JsBarcode(ref.current, value, { format: "CODE128", width: 1, height, displayValue: false, margin: 0 }); }
        catch { /* skip */ }
    }, [value, height]);
    return <svg ref={ref} style={{ maxWidth: "100%", height: "auto" }} />;
}

function LabelCard({ product, config, scale = 3 }: { product: LabelProduct; config: LabelConfig; scale?: number }) {
    const w = config.labelWidthMm * scale;
    const h = config.labelHeightMm * scale;
    const pad = config.marginMm * scale;
    const bv = product.barcode || product.sku;
    return (
        <div style={{ width: w, height: h, padding: pad, boxSizing: "border-box" }}
            className="bg-white border border-gray-300 flex flex-col items-center justify-center overflow-hidden shrink-0">
            {config.showBarcode && <div style={{ maxWidth: "100%", lineHeight: 0 }}><BarcodePreview value={bv} height={Math.floor(h * 0.38)} /></div>}
            {config.showName && <p style={{ fontSize: Math.max(6, h * 0.08), margin: 0, fontWeight: "bold", textAlign: "center", lineHeight: 1.1, maxWidth: "100%", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{product.name}</p>}
            {config.showSku && <p style={{ fontSize: Math.max(5, h * 0.065), margin: 0, color: "#666", textAlign: "center" }}>{product.sku}</p>}
            {config.showPrice && <p style={{ fontSize: Math.max(7, h * 0.09), margin: 0, fontWeight: "bold", textAlign: "center" }}>{COP(product.sale_price)}</p>}
        </div>
    );
}

export default function LabelsPage() {
    const [tab, setTab] = useState<"print" | "config">("print");

    const [config, setConfig] = useState<LabelConfig>(() => {
        try {
            const s = localStorage.getItem("labelConfig2");
            return s ? { ...DEFAULT_CONFIG, ...JSON.parse(s) } : DEFAULT_CONFIG;
        } catch { return DEFAULT_CONFIG; }
    });

    const [saved, setSaved] = useState(false);

    const setCfg = useCallback(<K extends keyof LabelConfig>(key: K, value: LabelConfig[K]) =>
        setConfig(prev => ({ ...prev, [key]: value })), []);

    const saveConfig = () => {
        localStorage.setItem("labelConfig2", JSON.stringify(config));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        toast.success("Configuración guardada");
    };

    const restoreDefaults = () => {
        setConfig(DEFAULT_CONFIG);
        localStorage.setItem("labelConfig2", JSON.stringify(DEFAULT_CONFIG));
        toast.success("Valores restaurados");
    };

    // Custom size inputs (mm) — local strings, sin interferencia con React
    const [customW, setCustomW] = useState(String(config.labelWidthMm));
    const [customH, setCustomH] = useState(String(config.labelHeightMm));
    const [customPage, setCustomPage] = useState(String(config.pageWidthMm));
    const [customMargin, setCustomMargin] = useState(String(config.marginMm));
    const [isCustomSize, setIsCustomSize] = useState(false);

    const applyPreset = (w: number, h: number) => {
        setConfig(prev => ({ ...prev, labelWidthMm: w, labelHeightMm: h }));
        setCustomW(String(w));
        setCustomH(String(h));
        setIsCustomSize(false);
    };

    const applyCustomSize = () => {
        const w = parseFloat(customW);
        const h = parseFloat(customH);
        if (!isNaN(w) && w > 0) setCfg("labelWidthMm", w);
        if (!isNaN(h) && h > 0) setCfg("labelHeightMm", h);
    };

    // Products
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [search, setSearch] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);
    const [labelProducts, setLabelProducts] = useState<LabelProduct[]>([]);

    useEffect(() => {
        api.get("/products").then(res => setAllProducts(res.data.map((p: any) => ({
            id: p.id, name: p.name, sku: p.sku,
            sale_price: Number(p.sale_price), barcode: p.barcode ?? null,
        }))));
    }, []);

    const filteredProducts = search
        ? allProducts.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())).slice(0, 8)
        : [];

    const addProduct = (p: Product) => {
        setSearch(""); setShowDropdown(false);
        if (labelProducts.find(lp => lp.id === p.id)) return;
        setLabelProducts(prev => [...prev, { ...p, quantity: 1 }]);
    };
    const updateQty = (id: string, qty: number) =>
        setLabelProducts(prev => prev.map(p => p.id === id ? { ...p, quantity: Math.max(1, qty) } : p));
    const removeProduct = (id: string) =>
        setLabelProducts(prev => prev.filter(p => p.id !== id));
    const totalLabels = labelProducts.reduce((s, p) => s + p.quantity, 0);

    const handlePrint = () => {
        if (labelProducts.length === 0) { toast.error("Agrega al menos un producto"); return; }
        const all: LabelProduct[] = [];
        for (const p of labelProducts) for (let i = 0; i < p.quantity; i++) all.push(p);
        const rows: LabelProduct[][] = [];
        for (let i = 0; i < all.length; i += config.columns) rows.push(all.slice(i, i + config.columns));
        const wIn = mmToIn(config.labelWidthMm);
        const hIn = mmToIn(config.labelHeightMm);
        const padIn = mmToIn(config.marginMm);
        const pageWIn = mmToIn(config.pageWidthMm);
        const pageHIn = hIn + padIn * 2;
        const html = rows.map(row => `<div class="row">${row.map(p => {
            const bv = (p.barcode || p.sku).replace(/"/g, "&quot;");
            return `<div class="label">${config.showBarcode ? `<svg class="bc" data-v="${bv}"></svg>` : ""}${config.showName ? `<p class="name">${p.name}</p>` : ""}${config.showSku ? `<p class="sku">${p.sku}</p>` : ""}${config.showPrice ? `<p class="price">${COP(p.sale_price)}</p>` : ""}</div>`;
        }).join("")}</div>`).join("");
        const win = window.open("", "_blank", "width=900,height=600");
        if (!win) { toast.error("Permite ventanas emergentes"); return; }
        win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Etiquetas</title>
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
<style>*{margin:0;padding:0;box-sizing:border-box;}@page{size:${pageWIn}in ${pageHIn}in;margin:0;}body{margin:0;font-family:Arial,sans-serif;}.row{display:flex;width:${pageWIn}in;height:${pageHIn}in;page-break-after:always;}.row:last-child{page-break-after:avoid;}.label{width:${wIn}in;height:${hIn}in;padding:${padIn}in;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;}.bc{max-width:100%;height:auto;}.name{font-size:6pt;font-weight:bold;text-align:center;line-height:1.1;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}.sku{font-size:5pt;color:#555;text-align:center;}.price{font-size:7pt;font-weight:bold;text-align:center;}</style></head><body>${html}
<script>window.onload=function(){document.querySelectorAll('.bc').forEach(function(el){try{JsBarcode(el,el.getAttribute('data-v'),{format:'CODE128',width:1.2,height:20,displayValue:false,margin:0});}catch(e){}});setTimeout(function(){window.print();},400);};</script></body></html>`);
        win.document.close();
    };

    const btnCls = (active: boolean) =>
        `flex-1 py-2.5 px-3 rounded-xl border text-sm font-bold transition-all text-center cursor-pointer ${active ? "bg-violet-600 border-violet-500 text-white shadow-lg" : "border-app-border text-app-text-muted hover:text-app-text hover:border-violet-500/40"}`;

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-500/20 text-violet-400 rounded-lg"><Tag size={28} /></div>
                    <div>
                        <h1 className="text-3xl font-bold text-app-text">Etiquetas</h1>
                        <p className="text-app-text-muted text-sm">Imprime etiquetas con código de barras</p>
                    </div>
                </div>

                <div className="flex gap-1 bg-app-card border border-app-border rounded-xl p-1 w-fit">
                    <button onClick={() => setTab("print")} className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${tab === "print" ? "bg-violet-600 text-white" : "text-app-text-muted hover:text-app-text"}`}>
                        <Printer size={15} /> Imprimir
                    </button>
                    <button onClick={() => setTab("config")} className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${tab === "config" ? "bg-violet-600 text-white" : "text-app-text-muted hover:text-app-text"}`}>
                        <Settings size={15} /> Configuración
                    </button>
                </div>

                {/* ── TAB IMPRIMIR ── */}
                {tab === "print" && (
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        <div className="xl:col-span-1 flex flex-col gap-4">
                            <div className="bg-app-card border border-app-border rounded-2xl p-5 flex flex-col gap-4">
                                <h2 className="text-xs font-bold text-app-text-muted uppercase tracking-widest">Agregar Productos</h2>
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-text-muted" />
                                    <input type="text" placeholder="Buscar por nombre o SKU..."
                                        value={search}
                                        onChange={e => { setSearch(e.target.value); setShowDropdown(true); }}
                                        onFocus={() => setShowDropdown(true)}
                                        onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                                        className="w-full bg-app-bg border border-app-border rounded-xl pl-9 pr-4 py-2.5 text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40" />
                                    {showDropdown && filteredProducts.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-app-bg border border-app-border rounded-xl shadow-2xl z-20 overflow-hidden">
                                            {filteredProducts.map(p => (
                                                <button key={p.id} onMouseDown={() => addProduct(p)} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-app-card text-left transition-colors">
                                                    <span className="text-violet-400 font-mono text-xs w-20 shrink-0 truncate">{p.sku}</span>
                                                    <span className="text-white text-sm flex-1 truncate">{p.name}</span>
                                                    <Plus size={14} className="text-app-text-muted shrink-0" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {labelProducts.length === 0 ? (
                                    <div className="text-center py-8 text-app-text-muted text-sm">
                                        <Tag size={32} className="mx-auto mb-2 opacity-20" />
                                        <p>Busca y agrega productos</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        {labelProducts.map(p => (
                                            <div key={p.id} className="flex items-center gap-3 bg-app-bg border border-app-border rounded-xl px-3 py-2">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-app-text truncate">{p.name}</p>
                                                    <p className="text-[10px] text-app-text-muted font-mono">{p.sku}</p>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <button onClick={() => updateQty(p.id, p.quantity - 1)} className="w-7 h-7 rounded-lg bg-app-card border border-app-border text-app-text-muted hover:text-app-text flex items-center justify-center font-bold">−</button>
                                                    <span className="w-8 text-center text-sm font-bold text-app-text">{p.quantity}</span>
                                                    <button onClick={() => updateQty(p.id, p.quantity + 1)} className="w-7 h-7 rounded-lg bg-app-card border border-app-border text-app-text-muted hover:text-app-text flex items-center justify-center font-bold">+</button>
                                                </div>
                                                <button onClick={() => removeProduct(p.id)} className="text-app-text-muted hover:text-rose-400 p-1"><Trash2 size={14} /></button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {labelProducts.length > 0 && (
                                    <>
                                        <div className="flex items-center justify-between border-t border-app-border pt-3">
                                            <span className="text-xs text-app-text-muted">Total de etiquetas</span>
                                            <span className="text-lg font-black text-violet-400">{totalLabels}</span>
                                        </div>
                                        <button onClick={handlePrint} className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold text-sm hover:opacity-90 flex items-center justify-center gap-2">
                                            <Printer size={16} /> Imprimir {totalLabels} etiqueta{totalLabels !== 1 ? "s" : ""}
                                        </button>
                                    </>
                                )}
                            </div>

                            <div className="bg-app-card border border-app-border rounded-2xl p-4 text-xs">
                                <p className="font-bold text-app-text-muted uppercase tracking-widest mb-2">Plantilla activa</p>
                                <p className="text-app-text font-bold">{config.labelWidthMm} × {config.labelHeightMm} mm · {config.columns} col.</p>
                                <button onClick={() => setTab("config")} className="mt-2 text-violet-400 hover:text-violet-300 flex items-center gap-1"><Settings size={11} /> Cambiar configuración</button>
                            </div>
                        </div>

                        <div className="xl:col-span-2 bg-app-card border border-app-border rounded-2xl p-5">
                            <h2 className="text-xs font-bold text-app-text-muted uppercase tracking-widest mb-4">Vista previa</h2>
                            {labelProducts.length === 0 ? (
                                <div className="flex items-center justify-center h-64 text-app-text-muted">
                                    <div className="text-center"><Tag size={48} className="mx-auto mb-3 opacity-10" /><p className="text-sm">Las etiquetas aparecerán aquí</p></div>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <div className="inline-flex flex-col border border-gray-600 bg-gray-100">
                                        {(() => {
                                            const exp: LabelProduct[] = [];
                                            for (const p of labelProducts) for (let i = 0; i < Math.min(p.quantity, 6); i++) exp.push(p);
                                            const rows: LabelProduct[][] = [];
                                            for (let i = 0; i < exp.slice(0, 12).length; i += config.columns) rows.push(exp.slice(i, i + config.columns));
                                            return rows.map((row, ri) => (
                                                <div key={ri} className="flex">
                                                    {Array.from({ length: config.columns }).map((_, ci) => (
                                                        row[ci]
                                                            ? <LabelCard key={ci} product={row[ci]} config={config} scale={2.5} />
                                                            : <div key={ci} style={{ width: config.labelWidthMm * 2.5, height: config.labelHeightMm * 2.5 }} className="bg-gray-50 border border-dashed border-gray-300" />
                                                    ))}
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── TAB CONFIGURACIÓN ── */}
                {tab === "config" && (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        <div className="bg-app-card border border-app-border rounded-2xl p-6 flex flex-col gap-6">

                            {/* Tamaño de etiqueta */}
                            <div>
                                <p className="text-xs font-bold text-app-text-muted uppercase tracking-widest mb-3">Tamaño de etiqueta</p>
                                <div className="grid grid-cols-3 gap-2 mb-3">
                                    {PRESETS.map(p => (
                                        <button key={p.label}
                                            onClick={() => applyPreset(p.w, p.h)}
                                            className={`py-2.5 px-2 rounded-xl border text-left transition-all ${config.labelWidthMm === p.w && config.labelHeightMm === p.h && !isCustomSize ? "bg-violet-600 border-violet-500 text-white" : "border-app-border text-app-text-muted hover:border-violet-500/40 hover:text-app-text"}`}>
                                            <p className="text-xs font-bold">{p.label}</p>
                                            <p className="text-[10px] opacity-70">{p.sub}</p>
                                        </button>
                                    ))}
                                    <button onClick={() => setIsCustomSize(true)}
                                        className={`py-2.5 px-2 rounded-xl border text-left transition-all ${isCustomSize ? "bg-violet-600 border-violet-500 text-white" : "border-app-border text-app-text-muted hover:border-violet-500/40 hover:text-app-text"}`}>
                                        <p className="text-xs font-bold">Personalizado</p>
                                        <p className="text-[10px] opacity-70">Ingresar mm</p>
                                    </button>
                                </div>

                                {isCustomSize && (
                                    <div className="flex items-center gap-2 bg-app-bg border border-violet-500/30 rounded-xl p-3">
                                        <div className="flex-1">
                                            <p className="text-[10px] text-app-text-muted mb-1">Ancho (mm)</p>
                                            <input type="text" value={customW}
                                                onChange={e => setCustomW(e.target.value)}
                                                onBlur={applyCustomSize}
                                                className="w-full bg-app-card border border-app-border rounded-lg px-3 py-2 text-app-text text-sm text-center focus:outline-none focus:ring-2 focus:ring-violet-500/40" />
                                        </div>
                                        <span className="text-app-text-muted mt-4">×</span>
                                        <div className="flex-1">
                                            <p className="text-[10px] text-app-text-muted mb-1">Alto (mm)</p>
                                            <input type="text" value={customH}
                                                onChange={e => setCustomH(e.target.value)}
                                                onBlur={applyCustomSize}
                                                className="w-full bg-app-card border border-app-border rounded-lg px-3 py-2 text-app-text text-sm text-center focus:outline-none focus:ring-2 focus:ring-violet-500/40" />
                                        </div>
                                        <span className="text-[10px] text-app-text-muted mt-4">mm</span>
                                    </div>
                                )}
                            </div>

                            {/* Columnas */}
                            <div>
                                <p className="text-xs font-bold text-app-text-muted uppercase tracking-widest mb-3">Etiquetas por fila</p>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4].map(n => (
                                        <button key={n} onClick={() => setCfg("columns", n)} className={btnCls(config.columns === n)}>
                                            {n} col{n > 1 ? "s" : ""}.
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Ancho del rollo */}
                            <div>
                                <p className="text-xs font-bold text-app-text-muted uppercase tracking-widest mb-3">Ancho del papel (mm)</p>
                                <div className="flex gap-2 mb-2">
                                    {[56, 80, 107, 110.8].map(n => (
                                        <button key={n} onClick={() => { setCfg("pageWidthMm", n); setCustomPage(String(n)); }}
                                            className={btnCls(config.pageWidthMm === n)}>
                                            {n}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex items-center gap-2">
                                    <input type="text" placeholder="Otro valor..."
                                        value={customPage}
                                        onChange={e => setCustomPage(e.target.value)}
                                        onBlur={() => { const v = parseFloat(customPage); if (!isNaN(v) && v > 0) setCfg("pageWidthMm", v); }}
                                        className="flex-1 bg-app-bg border border-app-border rounded-xl px-3 py-2 text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40" />
                                    <span className="text-xs text-app-text-muted">mm</span>
                                </div>
                                {config.labelWidthMm * config.columns > config.pageWidthMm && (
                                    <p className="mt-2 text-xs text-rose-400 font-bold">
                                        ⚠ Etiquetas ({config.labelWidthMm * config.columns} mm) superan el ancho del papel ({config.pageWidthMm} mm)
                                    </p>
                                )}
                            </div>

                            {/* Margen */}
                            <div>
                                <p className="text-xs font-bold text-app-text-muted uppercase tracking-widest mb-3">Margen interior (mm)</p>
                                <div className="flex gap-2 mb-2">
                                    {[0, 1, 1.3, 2].map(n => (
                                        <button key={n} onClick={() => { setCfg("marginMm", n); setCustomMargin(String(n)); }}
                                            className={btnCls(config.marginMm === n)}>
                                            {n}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex items-center gap-2">
                                    <input type="text" placeholder="Otro valor..."
                                        value={customMargin}
                                        onChange={e => setCustomMargin(e.target.value)}
                                        onBlur={() => { const v = parseFloat(customMargin); if (!isNaN(v) && v >= 0) setCfg("marginMm", v); }}
                                        className="flex-1 bg-app-bg border border-app-border rounded-xl px-3 py-2 text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40" />
                                    <span className="text-xs text-app-text-muted">mm</span>
                                </div>
                            </div>

                            {/* Contenido */}
                            <div>
                                <p className="text-xs font-bold text-app-text-muted uppercase tracking-widest mb-3">Contenido de la etiqueta</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {([
                                        { key: "showBarcode" as const, label: "Código de barras" },
                                        { key: "showName" as const,    label: "Nombre" },
                                        { key: "showSku" as const,     label: "SKU" },
                                        { key: "showPrice" as const,   label: "Precio" },
                                    ]).map(({ key, label }) => (
                                        <button key={key} onClick={() => setCfg(key, !config[key])}
                                            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${config[key] ? "bg-violet-600/20 border-violet-500/40 text-violet-300" : "border-app-border text-app-text-muted"}`}>
                                            <div className={`w-4 h-4 rounded flex items-center justify-center border ${config[key] ? "bg-violet-500 border-violet-400" : "border-app-border"}`}>
                                                {config[key] && <CheckCircle2 size={10} className="text-white" />}
                                            </div>
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Guardar */}
                            <div className="flex gap-3 border-t border-app-border pt-4">
                                <button onClick={restoreDefaults}
                                    className="flex-1 py-2.5 rounded-xl border border-app-border text-app-text-muted text-sm hover:text-app-text transition-colors">
                                    Restaurar Bartender
                                </button>
                                <button onClick={saveConfig}
                                    className={`flex-1 py-2.5 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 transition-all ${saved ? "bg-emerald-600" : "bg-violet-600 hover:bg-violet-500"}`}>
                                    {saved ? <><CheckCircle2 size={15} /> Guardado</> : <><Save size={15} /> Guardar configuración</>}
                                </button>
                            </div>
                        </div>

                        {/* Preview */}
                        <div className="bg-app-card border border-app-border rounded-2xl p-6 flex flex-col gap-4">
                            <p className="text-xs font-bold text-app-text-muted uppercase tracking-widest">Previa de etiqueta</p>
                            <div className="flex items-center justify-center flex-1 min-h-48 bg-app-bg rounded-xl border border-app-border">
                                <LabelCard product={{ id: "p", name: "Nombre del Producto", sku: "SKU-001", sale_price: 15000, barcode: "7702116001022", quantity: 1 }} config={config} scale={3} />
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                {[
                                    ["Etiqueta", `${config.labelWidthMm} × ${config.labelHeightMm} mm`],
                                    ["Columnas", `${config.columns} por fila`],
                                    ["Papel", `${config.pageWidthMm} mm`],
                                    ["Margen", `${config.marginMm} mm`],
                                ].map(([l, v]) => (
                                    <div key={l} className="bg-app-bg rounded-lg px-3 py-2">
                                        <p className="text-app-text-muted">{l}</p>
                                        <p className="font-bold text-app-text">{v}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
