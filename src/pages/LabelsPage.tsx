import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import { api } from "../api/axios";
import JsBarcode from "jsbarcode";
import { Tag, Settings, Printer, Search, Plus, Trash2, Save, CheckCircle2, Wifi, WifiOff, ChevronDown, ExternalLink } from "lucide-react";
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
    printerName: string;
    printMode: "zpl" | "browser";
    dpi: 203 | 300;
}

const DEFAULT_CONFIG: LabelConfig = {
    labelWidthMm: 36.1,
    labelHeightMm: 19.1,
    columns: 3,
    marginMm: 1.3,
    pageWidthMm: 110.8,
    showName: true,
    showSku: true,
    showPrice: true,
    showBarcode: true,
    printerName: "",
    printMode: "browser",
    dpi: 203,
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
    sale_price: number; barcode?: string | null; stockCount: number;
}

const COP = (v: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(v);

const mmToIn = (mm: number) => mm / 25.4;

// ── HTML generator (usado por browser Y por QZ Tray) ──────────────────────────
function buildLabelHtml(products: LabelProduct[], config: LabelConfig): string {
    const wIn   = mmToIn(config.labelWidthMm);
    const hIn   = mmToIn(config.labelHeightMm);
    const padIn = mmToIn(config.marginMm);
    const pageWIn = mmToIn(config.pageWidthMm);

    const rows: LabelProduct[][] = [];
    for (let i = 0; i < products.length; i += config.columns) rows.push(products.slice(i, i + config.columns));

    const body = rows.map(row => `<div class="row">${
        row.map(p => {
            const bv = (p.barcode || p.sku).replace(/"/g, "&quot;");
            return `<div class="label">${
                config.showName    ? `<p class="name">${p.name}</p>` : ""
            }${config.showBarcode ? `<svg class="bc" data-v="${bv}"></svg>` : ""
            }${config.showSku     ? `<p class="sku">${p.sku}</p>`   : ""
            }${config.showPrice   ? `<p class="price">${COP(p.sale_price)}</p>` : ""
            }</div>`;
        }).join("")
    }</div>`).join("");

    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Etiquetas</title>
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
@page{size:${pageWIn}in ${hIn + padIn * 2}in;margin:0;}
html,body{margin:0;padding:0;background:white;font-family:Arial,sans-serif;}
.row{display:flex;width:${pageWIn}in;height:${hIn + padIn * 2}in;page-break-after:always;}
.row:last-child{page-break-after:avoid;}
.label{width:${wIn}in;height:${hIn}in;padding:${padIn}in;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;}
.bc{max-width:100%;height:auto;}
.name{font-size:6pt;font-weight:bold;text-align:center;line-height:1.1;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.sku{font-size:5pt;color:#555;text-align:center;}
.price{font-size:7pt;font-weight:bold;text-align:center;}
</style></head><body>${body}
<script>window.onload=function(){
  document.querySelectorAll('.bc').forEach(function(el){
    try{JsBarcode(el,el.getAttribute('data-v'),{format:'CODE128',width:1.2,height:20,displayValue:false,margin:0});}catch(e){}
  });
  setTimeout(function(){window.print();},500);
};</script></body></html>`;
}

// ── QZ Tray helpers (dynamic import para no crashear el módulo) ───────────────
async function getQZ() {
    const mod = await import("qz-tray");
    return (mod.default ?? mod) as any;
}

async function connectQZ(qz: any): Promise<void> {
    if (qz.websocket.isActive()) return;
    qz.security.setCertificatePromise((resolve: any) => resolve(""));
    qz.security.setSignaturePromise(() => (resolve: any) => resolve(""));
    await Promise.race([
        qz.websocket.connect({ retries: 0, delay: 0 }),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error("QZ Tray no responde. Verifica que esté instalado y corriendo.")), 7000)
        ),
    ]);
}

async function listPrinters(): Promise<string[]> {
    const qz = await getQZ();
    await connectQZ(qz);
    const result = await qz.printers.find();
    return Array.isArray(result) ? result : [result as string];
}

function buildZPL(products: LabelProduct[], config: LabelConfig): string {
    const DPI = config.dpi ?? 203;
    const dots = (mm: number) => Math.round(mm * DPI / 25.4);

    const labelW = dots(config.labelWidthMm);
    const labelH = dots(config.labelHeightMm);
    const margin = Math.max(4, dots(config.marginMm));
    const gap = 3;

    // Fuentes más grandes
    const nameFs  = Math.max(18, Math.min(dots(config.labelHeightMm * 0.13), 28));
    const priceFs = Math.max(20, Math.min(dots(config.labelHeightMm * 0.15), 32));
    // La línea de interpretación del barcode sustituye al campo SKU
    const interpH = config.showSku ? 24 : 0;

    // Ancho interior para ^FB (centrado de texto)
    const innerW = labelW - margin * 2;

    // Altura de barras = espacio total menos lo que ocupan nombre, precio e interpretación
    const usedH =
        (config.showName ? nameFs + gap : 0) +
        (config.showPrice ? priceFs + gap : 0) +
        (config.showBarcode ? interpH + gap : 0) +
        margin * 2 + 4;
    const bcH = Math.max(20, labelH - usedH);

    let zpl = "";

    for (const product of products) {
        const bv = (product.barcode || product.sku).replace(/[^A-Za-z0-9\-\. \$\/\+\%]/g, "").trim();
        let y = margin;

        // ^LH0,0: resetea Label Home al origen físico de cada columna.
        // La impresora avanza columnas automáticamente entre ^XA^XZ.
        zpl += `^XA^LH0,0^PW${labelW}^LL${labelH}^CI28`;

        // 1. Nombre arriba — centrado con ^FB
        if (config.showName) {
            zpl += `^FO${margin},${y}^A0N,${nameFs},${nameFs}^FB${innerW},1,0,C^FD${product.name.substring(0, 22).toUpperCase()}^FS`;
            y += nameFs + gap;
        }

        // 2. Código de barras (la línea de interpretación imprime el SKU debajo de las barras)
        if (config.showBarcode && bv) {
            const interp = config.showSku ? "Y" : "N";
            zpl += `^FO${margin},${y}^BY1,2,${bcH}^BCN,,${interp},N^FD${bv}^FS`;
            y += bcH + interpH + gap;
        } else if (config.showSku) {
            // Sin barcode: SKU como texto centrado
            zpl += `^FO${margin},${y}^A0N,20,20^FB${innerW},1,0,C^FD${product.sku}^FS`;
            y += 20 + gap;
        }

        // 3. Precio abajo — centrado con ^FB
        if (config.showPrice && y + priceFs <= labelH) {
            zpl += `^FO${margin},${y}^A0N,${priceFs},${priceFs}^FB${innerW},1,0,C^FD${COP(product.sale_price).replace(/\s/g, "")}^FS`;
        }

        zpl += "^XZ";
    }
    return zpl;
}

async function printViaQZ(printerName: string, zpl: string): Promise<void> {
    const qz = await getQZ();
    await connectQZ(qz);
    const cfg = qz.configs.create(printerName);
    await qz.print(cfg, [{ type: "raw", format: "plain", data: zpl }]);
}

// ── Components ────────────────────────────────────────────────────────────────
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
            className="bg-white border border-gray-300 flex flex-col items-center justify-start overflow-hidden shrink-0 gap-0.5">
            {config.showName && <p style={{ fontSize: Math.max(6, h * 0.08), margin: 0, fontWeight: "bold", textAlign: "center", lineHeight: 1.1, maxWidth: "100%", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{product.name}</p>}
            {config.showBarcode && <div style={{ maxWidth: "100%", lineHeight: 0, flex: 1 }}><BarcodePreview value={bv} height={Math.floor(h * 0.42)} /></div>}
            {config.showSku && <p style={{ fontSize: Math.max(5, h * 0.065), margin: 0, color: "#333", textAlign: "center", fontWeight: "bold" }}>{product.sku}</p>}
            {config.showPrice && <p style={{ fontSize: Math.max(7, h * 0.09), margin: 0, fontWeight: "bold", textAlign: "center" }}>{COP(product.sale_price)}</p>}
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LabelsPage() {
    const location = useLocation();
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

    // ── QZ Tray state ──────────────────────────────────────────────────────────
    const [qzStatus, setQzStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle");
    const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
    const [showPrinterDropdown, setShowPrinterDropdown] = useState(false);

    const detectPrinters = async () => {
        setQzStatus("connecting");
        try {
            const printers = await listPrinters();
            setAvailablePrinters(printers);
            setQzStatus("connected");
            if (printers.length > 0 && !config.printerName) {
                setCfg("printerName", printers[0]);
            }
            toast.success(`${printers.length} impresora${printers.length !== 1 ? "s" : ""} detectada${printers.length !== 1 ? "s" : ""}`);
        } catch {
            setQzStatus("error");
            toast.error("No se pudo conectar a QZ Tray");
        }
    };

    // ── Products ───────────────────────────────────────────────────────────────
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [search, setSearch] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);
    const [labelProducts, setLabelProducts] = useState<LabelProduct[]>([]);

    useEffect(() => {
        api.get("/products").then(res => setAllProducts(res.data.map((p: any) => {
            const stock = p.has_variants
                ? (p.product_variants ?? []).flatMap((v: any) => v.stock ?? []).reduce((s: number, x: any) => s + Number(x.quantity), 0)
                : p.stock?.[0] ? Number(p.stock[0].quantity) : 0;
            return { id: p.id, name: p.name, sku: p.sku, sale_price: Number(p.sale_price), barcode: p.barcode ?? null, stockCount: stock };
        })));
    }, []);

    useEffect(() => {
        const p = location.state?.product;
        if (p) {
            setLabelProducts([{ ...p, sale_price: Number(p.sale_price), quantity: Math.max(1, Number(p.quantity) || 1) }]);
            setTab("print");
        }
    }, []);

    const filteredProducts = search
        ? allProducts.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())).slice(0, 8)
        : [];

    const addProduct = (p: Product) => {
        setSearch(""); setShowDropdown(false);
        if (labelProducts.find(lp => lp.id === p.id)) return;
        setLabelProducts(prev => [...prev, { ...p, quantity: Math.max(1, p.stockCount) }]);
    };
    const updateQty = (id: string, raw: string) => {
        const qty = parseInt(raw, 10);
        setLabelProducts(prev => prev.map(p => p.id === id ? { ...p, quantity: isNaN(qty) || qty < 1 ? 1 : qty } : p));
    };
    const removeProduct = (id: string) =>
        setLabelProducts(prev => prev.filter(p => p.id !== id));
    const totalLabels = labelProducts.reduce((s, p) => s + p.quantity, 0);

    // ── Print ──────────────────────────────────────────────────────────────────
    const handlePrint = async () => {
        if (labelProducts.length === 0) { toast.error("Agrega al menos un producto"); return; }

        const all: LabelProduct[] = [];
        for (const p of labelProducts) for (let i = 0; i < p.quantity; i++) all.push(p);

        if (config.printMode === "zpl" && config.printerName) {
            try {
                const zpl = buildZPL(all, config);
                await printViaQZ(config.printerName, zpl);
                toast.success(`${totalLabels} etiqueta${totalLabels !== 1 ? "s" : ""} enviada${totalLabels !== 1 ? "s" : ""} a ${config.printerName}`);
            } catch (err: any) {
                toast.error("Error al imprimir: " + (err?.message ?? "QZ Tray no disponible"));
            }
            return;
        }

        // Fallback: browser print
        const html = buildLabelHtml(all, config);
        const win = window.open("", "_blank", "width=900,height=600");
        if (!win) { toast.error("Permite ventanas emergentes"); return; }
        win.document.write(html);
        win.document.close();
    };

    const btnCls = (active: boolean) =>
        `flex-1 py-2.5 px-3 rounded-xl border text-sm font-bold transition-all text-center cursor-pointer ${active ? "bg-violet-600 border-violet-500 text-white shadow-lg" : "border-app-border text-app-text-muted hover:text-app-text hover:border-violet-500/40"}`;

    const qzConnected = qzStatus === "connected";
    const qzError = qzStatus === "error";

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
                                                <input
                                                    type="number" min={1}
                                                    defaultValue={p.quantity}
                                                    key={p.id + "-" + p.quantity}
                                                    onChange={e => updateQty(p.id, e.target.value)}
                                                    className="w-16 shrink-0 bg-app-card border border-app-border rounded-lg px-2 py-1.5 text-app-text text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                                                />
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
                                        {config.printMode === "zpl" && (
                                            <button
                                                onClick={() => {
                                                    const all: LabelProduct[] = [];
                                                    for (const p of labelProducts) for (let i = 0; i < p.quantity; i++) all.push(p);
                                                    const zpl = buildZPL(all, config);
                                                    navigator.clipboard.writeText(zpl);
                                                    toast.success("ZPL copiado al portapapeles");
                                                }}
                                                className="w-full py-2 rounded-xl border border-app-border text-app-text-muted text-xs hover:text-app-text transition-colors">
                                                Copiar ZPL (debug)
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>

                            <div className="bg-app-card border border-app-border rounded-2xl p-4 text-xs flex flex-col gap-1.5">
                                <p className="font-bold text-app-text-muted uppercase tracking-widest">Plantilla activa</p>
                                <p className="text-app-text font-bold">{config.labelWidthMm} × {config.labelHeightMm} mm · {config.columns} col.</p>
                                {config.printMode === "zpl" && config.printerName
                                    ? <p className="text-emerald-400 font-bold flex items-center gap-1"><Wifi size={11} /> ZPL → {config.printerName}</p>
                                    : <p className="text-amber-400 font-bold">Modo: navegador</p>
                                }
                                <button onClick={() => setTab("config")} className="mt-1 text-violet-400 hover:text-violet-300 flex items-center gap-1"><Settings size={11} /> Cambiar configuración</button>
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

                            {/* Modo de impresión */}
                            <div>
                                <p className="text-xs font-bold text-app-text-muted uppercase tracking-widest mb-3">Modo de impresión</p>
                                <div className="flex gap-2 mb-4">
                                    <button onClick={() => setCfg("printMode", "zpl")}
                                        className={`flex-1 py-3 px-3 rounded-xl border text-sm font-bold transition-all flex flex-col items-center gap-1 ${config.printMode === "zpl" ? "bg-emerald-600/20 border-emerald-500/50 text-emerald-300" : "border-app-border text-app-text-muted hover:border-emerald-500/30"}`}>
                                        <Wifi size={16} />
                                        ZPL directo
                                        <span className="text-[10px] opacity-70 font-normal">Requiere QZ Tray</span>
                                    </button>
                                    <button onClick={() => setCfg("printMode", "browser")}
                                        className={`flex-1 py-3 px-3 rounded-xl border text-sm font-bold transition-all flex flex-col items-center gap-1 ${config.printMode === "browser" ? "bg-violet-600/20 border-violet-500/50 text-violet-300" : "border-app-border text-app-text-muted hover:border-violet-500/30"}`}>
                                        <Printer size={16} />
                                        Navegador
                                        <span className="text-[10px] opacity-70 font-normal">Sin instalación</span>
                                    </button>
                                </div>

                                {/* Panel QZ Tray */}
                                {config.printMode === "zpl" && (
                                    <div className="bg-app-bg border border-app-border rounded-xl p-4 flex flex-col gap-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                {qzConnected
                                                    ? <Wifi size={14} className="text-emerald-400" />
                                                    : qzError
                                                    ? <WifiOff size={14} className="text-rose-400" />
                                                    : <WifiOff size={14} className="text-app-text-muted" />}
                                                <span className="text-xs font-bold text-app-text">
                                                    {qzConnected ? "QZ Tray conectado" : qzError ? "QZ Tray no disponible" : "QZ Tray no conectado"}
                                                </span>
                                            </div>
                                            <button onClick={detectPrinters} disabled={qzStatus === "connecting"}
                                                className="px-3 py-1.5 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-lg hover:bg-emerald-600/30 transition-colors disabled:opacity-50">
                                                {qzStatus === "connecting" ? "Conectando..." : "Detectar impresoras"}
                                            </button>
                                        </div>

                                        {qzError && (
                                            <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 text-xs text-rose-300">
                                                <p className="font-bold mb-1">QZ Tray no está instalado o no está corriendo</p>
                                                <a href="https://qz.io/download" target="_blank" rel="noreferrer"
                                                    className="flex items-center gap-1 text-rose-400 hover:text-rose-300 underline">
                                                    <ExternalLink size={11} /> Descargar QZ Tray (gratuito)
                                                </a>
                                                <p className="mt-1 opacity-70">Instálalo y ejecútalo, luego haz clic en "Detectar impresoras"</p>
                                            </div>
                                        )}

                                        {/* Selector de impresora */}
                                        {availablePrinters.length > 0 && (
                                            <div className="relative">
                                                <p className="text-[10px] text-app-text-muted mb-1 font-bold uppercase tracking-wider">Impresora seleccionada</p>
                                                <button onClick={() => setShowPrinterDropdown(v => !v)}
                                                    className="w-full flex items-center justify-between bg-app-card border border-app-border rounded-xl px-4 py-2.5 text-app-text text-sm hover:border-violet-500/40 transition-colors">
                                                    <span className="truncate font-bold">{config.printerName || "Seleccionar impresora..."}</span>
                                                    <ChevronDown size={14} className="text-app-text-muted shrink-0 ml-2" />
                                                </button>
                                                {showPrinterDropdown && (
                                                    <div className="absolute top-full left-0 right-0 mt-1 bg-app-bg border border-app-border rounded-xl shadow-2xl z-20 overflow-hidden max-h-48 overflow-y-auto">
                                                        {availablePrinters.map(p => (
                                                            <button key={p} onClick={() => { setCfg("printerName", p); setShowPrinterDropdown(false); }}
                                                                className={`w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-app-card ${config.printerName === p ? "text-violet-400 font-bold" : "text-app-text"}`}>
                                                                {p}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {!qzConnected && !qzError && (
                                            <p className="text-xs text-app-text-muted">Haz clic en "Detectar impresoras" para conectar con QZ Tray</p>
                                        )}
                                    </div>
                                )}
                            </div>

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

                            {/* DPI */}
                            {config.printMode === "zpl" && (
                                <div>
                                    <p className="text-xs font-bold text-app-text-muted uppercase tracking-widest mb-3">DPI de la impresora</p>
                                    <div className="flex gap-2">
                                        {([203, 300] as const).map(d => (
                                            <button key={d} onClick={() => setCfg("dpi", d)} className={btnCls(config.dpi === d)}>
                                                {d} DPI
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-app-text-muted mt-1">SAT TT448-2 usa 203 DPI</p>
                                </div>
                            )}

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
