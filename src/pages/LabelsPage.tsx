import { useState, useEffect, useRef, useCallback } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import { api } from "../api/axios";
import JsBarcode from "jsbarcode";
import { Tag, Settings, Printer, Search, Plus, Trash2, Save } from "lucide-react";
import { toast } from "../lib/toast";

// ── Types ─────────────────────────────────────────────────────────────────────
interface LabelConfig {
    labelWidthIn: number;
    labelHeightIn: number;
    columns: number;
    marginIn: number;
    pageWidthIn: number;
    showName: boolean;
    showSku: boolean;
    showPrice: boolean;
    showBarcode: boolean;
}

const DEFAULT_CONFIG: LabelConfig = {
    labelWidthIn: 1.42,
    labelHeightIn: 0.752,
    columns: 3,
    marginIn: 0.051,
    pageWidthIn: 4.362,
    showName: true,
    showSku: true,
    showPrice: true,
    showBarcode: true,
};

interface LabelProduct {
    id: string;
    name: string;
    sku: string;
    sale_price: number;
    barcode?: string | null;
    quantity: number;
}

interface Product {
    id: string;
    name: string;
    sku: string;
    sale_price: number;
    barcode?: string | null;
}

const COP = (v: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(v);

// ── Barcode preview component ─────────────────────────────────────────────────
function BarcodePreview({ value, height = 18 }: { value: string; height?: number }) {
    const ref = useRef<SVGSVGElement>(null);
    useEffect(() => {
        if (!ref.current || !value) return;
        try {
            JsBarcode(ref.current, value, {
                format: "CODE128",
                width: 1,
                height,
                displayValue: false,
                margin: 0,
            });
        } catch { /* invalid barcode value */ }
    }, [value, height]);
    return <svg ref={ref} style={{ maxWidth: "100%", height: "auto" }} />;
}

// ── Label card preview ────────────────────────────────────────────────────────
function LabelCard({ product, config, scale = 100 }: { product: LabelProduct; config: LabelConfig; scale?: number }) {
    const w = config.labelWidthIn * scale;
    const h = config.labelHeightIn * scale;
    const pad = config.marginIn * scale;
    const barcodeValue = product.barcode || product.sku;

    return (
        <div
            style={{ width: w, height: h, padding: pad, boxSizing: "border-box" }}
            className="bg-white border border-gray-300 flex flex-col items-center justify-center overflow-hidden shrink-0"
        >
            {config.showBarcode && (
                <div style={{ maxWidth: "100%", lineHeight: 0 }}>
                    <BarcodePreview value={barcodeValue} height={Math.floor(h * 0.38)} />
                </div>
            )}
            {config.showName && (
                <p style={{ fontSize: Math.max(6, h * 0.1), margin: 0, fontWeight: "bold", textAlign: "center", lineHeight: 1.1, maxWidth: "100%", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                    {product.name}
                </p>
            )}
            {config.showSku && (
                <p style={{ fontSize: Math.max(5, h * 0.08), margin: 0, color: "#666", textAlign: "center" }}>
                    {product.sku}
                </p>
            )}
            {config.showPrice && (
                <p style={{ fontSize: Math.max(7, h * 0.12), margin: 0, fontWeight: "bold", textAlign: "center" }}>
                    {COP(product.sale_price)}
                </p>
            )}
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LabelsPage() {
    const [tab, setTab] = useState<"print" | "config">("print");

    // Config state (persisted in localStorage)
    const [config, setConfig] = useState<LabelConfig>(() => {
        try {
            const saved = localStorage.getItem("labelConfig");
            return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
        } catch { return DEFAULT_CONFIG; }
    });

    // Products
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [search, setSearch] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);
    const [labelProducts, setLabelProducts] = useState<LabelProduct[]>([]);

    useEffect(() => {
        api.get("/products").then(res => {
            setAllProducts(res.data.map((p: any) => ({
                id: p.id,
                name: p.name,
                sku: p.sku,
                sale_price: Number(p.sale_price),
                barcode: p.barcode ?? null,
            })));
        });
    }, []);

    const filteredProducts = search
        ? allProducts.filter(p =>
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.sku.toLowerCase().includes(search.toLowerCase())
        ).slice(0, 8)
        : [];

    const addProduct = (p: Product) => {
        setSearch("");
        setShowDropdown(false);
        if (labelProducts.find(lp => lp.id === p.id)) return;
        setLabelProducts(prev => [...prev, { ...p, quantity: 1 }]);
    };

    const updateQty = (id: string, qty: number) => {
        setLabelProducts(prev => prev.map(p => p.id === id ? { ...p, quantity: Math.max(1, qty) } : p));
    };

    const removeProduct = (id: string) => {
        setLabelProducts(prev => prev.filter(p => p.id !== id));
    };

    const totalLabels = labelProducts.reduce((s, p) => s + p.quantity, 0);

    const saveConfig = () => {
        localStorage.setItem("labelConfig", JSON.stringify(config));
        toast.success("Configuración guardada");
    };

    const setCfg = useCallback(<K extends keyof LabelConfig>(key: K, value: LabelConfig[K]) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    }, []);

    // ── Print ─────────────────────────────────────────────────────────────────
    const handlePrint = () => {
        if (labelProducts.length === 0) {
            toast.error("Agrega al menos un producto");
            return;
        }

        // Expand products by quantity
        const allLabels: LabelProduct[] = [];
        for (const p of labelProducts) {
            for (let i = 0; i < p.quantity; i++) allLabels.push(p);
        }

        // Group into rows
        const rows: LabelProduct[][] = [];
        for (let i = 0; i < allLabels.length; i += config.columns) {
            rows.push(allLabels.slice(i, i + config.columns));
        }

        const pageH = config.labelHeightIn + config.marginIn * 2;

        const labelHtml = rows.map(row => `
            <div class="row">
                ${row.map(p => {
                    const barcodeValue = p.barcode || p.sku;
                    return `
                        <div class="label">
                            ${config.showBarcode ? `<svg class="barcode" data-value="${barcodeValue.replace(/"/g, '&quot;')}"></svg>` : ""}
                            ${config.showName ? `<p class="name">${p.name}</p>` : ""}
                            ${config.showSku ? `<p class="sku">${p.sku}</p>` : ""}
                            ${config.showPrice ? `<p class="price">${COP(p.sale_price)}</p>` : ""}
                        </div>`;
                }).join("")}
            </div>`).join("");

        const win = window.open("", "_blank", "width=900,height=600");
        if (!win) { toast.error("Permite ventanas emergentes para imprimir"); return; }

        win.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Etiquetas — PUNTO360</title>
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  @page { size:${config.pageWidthIn}in ${pageH}in; margin:0; }
  body { margin:0; font-family:Arial,sans-serif; background:#fff; }
  .row {
    display:flex;
    width:${config.pageWidthIn}in;
    height:${pageH}in;
    page-break-after:always;
  }
  .row:last-child { page-break-after:avoid; }
  .label {
    width:${config.labelWidthIn}in;
    height:${config.labelHeightIn}in;
    padding:${config.marginIn}in;
    display:flex;
    flex-direction:column;
    align-items:center;
    justify-content:center;
    overflow:hidden;
  }
  .barcode { max-width:100%; height:auto; }
  .name  { font-size:6pt; font-weight:bold; text-align:center; line-height:1.1; max-width:100%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .sku   { font-size:5pt; color:#555; text-align:center; }
  .price { font-size:7pt; font-weight:bold; text-align:center; margin-top:1pt; }
</style>
</head>
<body>
${labelHtml}
<script>
window.onload = function() {
  document.querySelectorAll('.barcode').forEach(function(el) {
    var val = el.getAttribute('data-value');
    try {
      JsBarcode(el, val, { format:'CODE128', width:1.2, height:20, displayValue:false, margin:0 });
    } catch(e) {}
  });
  setTimeout(function() { window.print(); }, 400);
};
</script>
</body>
</html>`);
        win.document.close();
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <DashboardLayout>
            <div className="space-y-6">

                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-500/20 text-violet-400 rounded-lg">
                        <Tag size={28} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-app-text drop-shadow-md">Etiquetas</h1>
                        <p className="text-app-text-muted text-sm font-medium">Imprime etiquetas de productos con código de barras</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-app-card border border-app-border rounded-xl p-1 w-fit">
                    <button
                        onClick={() => setTab("print")}
                        className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${tab === "print" ? "bg-violet-600 text-white shadow-lg" : "text-app-text-muted hover:text-app-text"}`}
                    >
                        <Printer size={15} /> Imprimir
                    </button>
                    <button
                        onClick={() => setTab("config")}
                        className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${tab === "config" ? "bg-violet-600 text-white shadow-lg" : "text-app-text-muted hover:text-app-text"}`}
                    >
                        <Settings size={15} /> Configuración
                    </button>
                </div>

                {/* ── TAB IMPRIMIR ── */}
                {tab === "print" && (
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                        {/* Left — Selector de productos */}
                        <div className="xl:col-span-1 flex flex-col gap-4">
                            <div className="bg-app-card border border-app-border rounded-2xl p-5 flex flex-col gap-4">
                                <h2 className="text-sm font-bold text-app-text-muted uppercase tracking-widest">Agregar Productos</h2>

                                {/* Search */}
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-text-muted" />
                                    <input
                                        type="text"
                                        placeholder="Buscar por nombre o SKU..."
                                        value={search}
                                        onChange={e => { setSearch(e.target.value); setShowDropdown(true); }}
                                        onFocus={() => setShowDropdown(true)}
                                        onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                                        className="w-full bg-app-bg border border-app-border rounded-xl pl-9 pr-4 py-2.5 text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                                    />
                                    {showDropdown && filteredProducts.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-app-bg border border-app-border rounded-xl shadow-2xl z-20 overflow-hidden">
                                            {filteredProducts.map(p => (
                                                <button
                                                    key={p.id}
                                                    onMouseDown={() => addProduct(p)}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-app-card text-left transition-colors"
                                                >
                                                    <span className="text-violet-400 font-mono text-xs w-20 shrink-0 truncate">{p.sku}</span>
                                                    <span className="text-white text-sm flex-1 truncate">{p.name}</span>
                                                    <Plus size={14} className="text-app-text-muted shrink-0" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Products list */}
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
                                                    <button
                                                        onClick={() => updateQty(p.id, p.quantity - 1)}
                                                        className="w-6 h-6 rounded-md bg-app-card border border-app-border text-app-text-muted hover:text-app-text flex items-center justify-center text-sm font-bold transition-colors"
                                                    >−</button>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={p.quantity}
                                                        onChange={e => updateQty(p.id, parseInt(e.target.value) || 1)}
                                                        className="w-10 bg-app-bg border border-app-border rounded-md text-center text-sm text-app-text py-0.5 focus:outline-none focus:ring-1 focus:ring-violet-500/40"
                                                    />
                                                    <button
                                                        onClick={() => updateQty(p.id, p.quantity + 1)}
                                                        className="w-6 h-6 rounded-md bg-app-card border border-app-border text-app-text-muted hover:text-app-text flex items-center justify-center text-sm font-bold transition-colors"
                                                    >+</button>
                                                </div>
                                                <button
                                                    onClick={() => removeProduct(p.id)}
                                                    className="text-app-text-muted hover:text-rose-400 transition-colors p-1"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Total + Print button */}
                                {labelProducts.length > 0 && (
                                    <>
                                        <div className="flex items-center justify-between border-t border-app-border pt-3">
                                            <span className="text-xs text-app-text-muted">Total de etiquetas</span>
                                            <span className="text-lg font-black text-violet-400">{totalLabels}</span>
                                        </div>
                                        <button
                                            onClick={handlePrint}
                                            className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-violet-900/30"
                                        >
                                            <Printer size={16} />
                                            Imprimir {totalLabels} etiqueta{totalLabels !== 1 ? "s" : ""}
                                        </button>
                                    </>
                                )}
                            </div>

                            {/* Config summary */}
                            <div className="bg-app-card border border-app-border rounded-2xl p-4">
                                <p className="text-[10px] font-bold text-app-text-muted uppercase tracking-widest mb-3">Plantilla activa</p>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="bg-app-bg rounded-lg px-3 py-2">
                                        <p className="text-app-text-muted">Tamaño</p>
                                        <p className="font-bold text-app-text">{config.labelWidthIn}" × {config.labelHeightIn}"</p>
                                    </div>
                                    <div className="bg-app-bg rounded-lg px-3 py-2">
                                        <p className="text-app-text-muted">Columnas</p>
                                        <p className="font-bold text-app-text">{config.columns} por fila</p>
                                    </div>
                                    <div className="bg-app-bg rounded-lg px-3 py-2">
                                        <p className="text-app-text-muted">Ancho rollo</p>
                                        <p className="font-bold text-app-text">{config.pageWidthIn}"</p>
                                    </div>
                                    <div className="bg-app-bg rounded-lg px-3 py-2">
                                        <p className="text-app-text-muted">Margen</p>
                                        <p className="font-bold text-app-text">{config.marginIn}"</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setTab("config")}
                                    className="mt-3 w-full text-xs text-violet-400 hover:text-violet-300 flex items-center justify-center gap-1 transition-colors"
                                >
                                    <Settings size={12} /> Cambiar configuración
                                </button>
                            </div>
                        </div>

                        {/* Right — Preview */}
                        <div className="xl:col-span-2">
                            <div className="bg-app-card border border-app-border rounded-2xl p-5">
                                <h2 className="text-sm font-bold text-app-text-muted uppercase tracking-widest mb-4">Vista previa</h2>

                                {labelProducts.length === 0 ? (
                                    <div className="flex items-center justify-center h-64 text-app-text-muted text-sm">
                                        <div className="text-center">
                                            <Tag size={48} className="mx-auto mb-3 opacity-10" />
                                            <p>Las etiquetas aparecerán aquí</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <div className="inline-flex flex-col gap-0 border border-gray-600 bg-gray-100">
                                            {(() => {
                                                // Expand by quantity for preview (max 12 to avoid overload)
                                                const expanded: LabelProduct[] = [];
                                                for (const p of labelProducts) {
                                                    for (let i = 0; i < Math.min(p.quantity, 6); i++) expanded.push(p);
                                                }
                                                const rows: LabelProduct[][] = [];
                                                for (let i = 0; i < expanded.slice(0, 12).length; i += config.columns) {
                                                    rows.push(expanded.slice(i, i + config.columns));
                                                }
                                                // Scale: 1in = 96px in browser, we'll use ~80px per inch for preview
                                                const scale = 80;
                                                return rows.map((row, ri) => (
                                                    <div key={ri} className="flex">
                                                        {Array.from({ length: config.columns }).map((_, ci) => (
                                                            row[ci]
                                                                ? <LabelCard key={ci} product={row[ci]} config={config} scale={scale} />
                                                                : <div key={ci} style={{ width: config.labelWidthIn * scale, height: config.labelHeightIn * scale }} className="bg-gray-50 border border-dashed border-gray-300" />
                                                        ))}
                                                    </div>
                                                ));
                                            })()}
                                        </div>
                                        {totalLabels > 12 && (
                                            <p className="text-xs text-app-text-muted mt-3">
                                                Mostrando previa parcial — se imprimirán las {totalLabels} etiquetas completas.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── TAB CONFIGURACIÓN ── */}
                {tab === "config" && (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                        {/* Settings */}
                        <div className="bg-app-card border border-app-border rounded-2xl p-6 flex flex-col gap-6">
                            <h2 className="text-sm font-bold text-app-text-muted uppercase tracking-widest">Tamaño de la Etiqueta</h2>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-app-text-muted mb-1.5">Ancho etiqueta (pulg.)</label>
                                    <input
                                        type="number" step="0.001" min="0.1"
                                        value={config.labelWidthIn}
                                        onChange={e => setCfg("labelWidthIn", parseFloat(e.target.value) || DEFAULT_CONFIG.labelWidthIn)}
                                        className="w-full bg-app-bg border border-app-border rounded-xl px-3 py-2.5 text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-app-text-muted mb-1.5">Alto etiqueta (pulg.)</label>
                                    <input
                                        type="number" step="0.001" min="0.1"
                                        value={config.labelHeightIn}
                                        onChange={e => setCfg("labelHeightIn", parseFloat(e.target.value) || DEFAULT_CONFIG.labelHeightIn)}
                                        className="w-full bg-app-bg border border-app-border rounded-xl px-3 py-2.5 text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-app-text-muted mb-1.5">Ancho del rollo / página (pulg.)</label>
                                    <input
                                        type="number" step="0.001" min="0.5"
                                        value={config.pageWidthIn}
                                        onChange={e => setCfg("pageWidthIn", parseFloat(e.target.value) || DEFAULT_CONFIG.pageWidthIn)}
                                        className="w-full bg-app-bg border border-app-border rounded-xl px-3 py-2.5 text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-app-text-muted mb-1.5">Columnas por fila</label>
                                    <input
                                        type="number" step="1" min="1" max="10"
                                        value={config.columns}
                                        onChange={e => setCfg("columns", parseInt(e.target.value) || DEFAULT_CONFIG.columns)}
                                        className="w-full bg-app-bg border border-app-border rounded-xl px-3 py-2.5 text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs text-app-text-muted mb-1.5">Margen interior (pulg.) — aplica a todos los lados</label>
                                    <input
                                        type="number" step="0.001" min="0"
                                        value={config.marginIn}
                                        onChange={e => setCfg("marginIn", parseFloat(e.target.value) || 0)}
                                        className="w-full bg-app-bg border border-app-border rounded-xl px-3 py-2.5 text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                                    />
                                </div>
                            </div>

                            <div className="border-t border-app-border pt-5">
                                <h2 className="text-sm font-bold text-app-text-muted uppercase tracking-widest mb-4">Contenido de la Etiqueta</h2>
                                <div className="grid grid-cols-2 gap-3">
                                    {([
                                        { key: "showBarcode", label: "Código de barras" },
                                        { key: "showName",    label: "Nombre del producto" },
                                        { key: "showSku",     label: "SKU" },
                                        { key: "showPrice",   label: "Precio de venta" },
                                    ] as { key: keyof LabelConfig; label: string }[]).map(({ key, label }) => (
                                        <label key={key} className="flex items-center gap-3 bg-app-bg border border-app-border rounded-xl px-4 py-3 cursor-pointer hover:border-violet-500/40 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={config[key] as boolean}
                                                onChange={e => setCfg(key, e.target.checked)}
                                                className="w-4 h-4 accent-violet-500"
                                            />
                                            <span className="text-sm text-app-text">{label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={saveConfig}
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-violet-900/30"
                            >
                                <Save size={16} /> Guardar configuración
                            </button>

                            <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-4 text-xs text-app-text-muted">
                                <p className="font-bold text-violet-400 mb-1">Valores de la configuración de Bartender</p>
                                <p>Etiqueta: 1.42" × 0.75" · Columnas: 3 · Rollo: 4.36" · Margen: 0.051"</p>
                                <button
                                    onClick={() => setConfig(DEFAULT_CONFIG)}
                                    className="mt-2 text-violet-400 hover:text-violet-300 transition-colors underline"
                                >
                                    Restaurar valores predeterminados
                                </button>
                            </div>
                        </div>

                        {/* Live preview of one label */}
                        <div className="bg-app-card border border-app-border rounded-2xl p-6 flex flex-col gap-4">
                            <h2 className="text-sm font-bold text-app-text-muted uppercase tracking-widest">Previa de una etiqueta</h2>
                            <div className="flex items-center justify-center flex-1 min-h-48 bg-app-bg rounded-xl border border-app-border">
                                <LabelCard
                                    product={{
                                        id: "preview",
                                        name: "Nombre del Producto",
                                        sku: "SKU-001",
                                        sale_price: 15000,
                                        barcode: "7702116001022",
                                        quantity: 1,
                                    }}
                                    config={config}
                                    scale={96}
                                />
                            </div>
                            <div className="text-xs text-app-text-muted space-y-1">
                                <div className="flex justify-between">
                                    <span>Tamaño de la etiqueta</span>
                                    <span className="font-bold text-app-text">{config.labelWidthIn}" × {config.labelHeightIn}"</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Alto total por fila (con márgenes)</span>
                                    <span className="font-bold text-app-text">{(config.labelHeightIn + config.marginIn * 2).toFixed(3)}"</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Ancho del rollo</span>
                                    <span className="font-bold text-app-text">{config.pageWidthIn}"</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Etiquetas por fila</span>
                                    <span className="font-bold text-app-text">{config.columns}</span>
                                </div>
                            </div>

                            <div className="mt-4 border-t border-app-border pt-4">
                                <p className="text-[10px] font-bold text-app-text-muted uppercase tracking-widest mb-2">Equivalencia en mm</p>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    {[
                                        ["Ancho etiqueta", (config.labelWidthIn * 25.4).toFixed(1) + " mm"],
                                        ["Alto etiqueta", (config.labelHeightIn * 25.4).toFixed(1) + " mm"],
                                        ["Ancho rollo", (config.pageWidthIn * 25.4).toFixed(1) + " mm"],
                                        ["Margen", (config.marginIn * 25.4).toFixed(2) + " mm"],
                                    ].map(([label, value]) => (
                                        <div key={label} className="bg-app-bg rounded-lg px-3 py-2">
                                            <p className="text-app-text-muted">{label}</p>
                                            <p className="font-bold text-app-text">{value}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
