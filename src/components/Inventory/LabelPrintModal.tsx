import { useState, useRef, useEffect } from "react";
import { X, Printer, ZoomIn, Wifi, WifiOff, Settings } from "lucide-react";
import JsBarcode from "jsbarcode";

interface LabelPrintModalProps {
  product: { name: string; price: number; sku: string };
  defaultCount?: number;
  onClose: () => void;
}

const LABEL_SIZES = [
  { id: "50x30",  label: "50 × 30 mm",  w: 50,  h: 30,  desc: "Estándar" },
  { id: "62x29",  label: "62 × 29 mm",  w: 62,  h: 29,  desc: "Rollo" },
  { id: "40x25",  label: "40 × 25 mm",  w: 40,  h: 25,  desc: "Mini" },
  { id: "100x50", label: "100 × 50 mm", w: 100, h: 50,  desc: "Grande" },
  { id: "57x32",  label: "57 × 32 mm",  w: 57,  h: 32,  desc: "Intermedia" },
  { id: "custom", label: "Personalizado", w: 0, h: 0, desc: "Ingresar mm" },
];

const AGENT_URL = "https://localhost:9101";

const cop = (v: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(v);

function generateBarcodeSVG(sku: string): string {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  try {
    JsBarcode(svg, sku, {
      format: "CODE128",
      displayValue: true,
      fontSize: 10,
      height: 40,
      margin: 2,
      background: "#ffffff",
      lineColor: "#000000",
      textMargin: 2,
      font: "monospace",
    });
  } catch {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="50"><text x="60" y="30" text-anchor="middle" font-size="10">${sku}</text></svg>`;
  }
  return svg.outerHTML;
}

function buildPrintHTML(
  name: string,
  price: number,
  sku: string,
  count: number,
  wMm: number,
  hMm: number,
  cols: number
): string {
  const barcodeSVG = generateBarcodeSVG(sku);
  const priceFormatted = cop(price);
  const pageW = wMm * cols;
  const rows = Math.ceil(count / cols);

  const filledLabel = `
    <div class="label">
      <div class="product-name">${name}</div>
      <div class="product-price">${priceFormatted}</div>
      <div class="barcode-wrap">${barcodeSVG}</div>
    </div>`;
  const emptyLabel = `<div class="label label-empty"></div>`;

  const labelArr = [
    ...Array(count).fill(filledLabel),
    ...Array((rows * cols) - count).fill(emptyLabel),
  ];

  const rowsHTML = Array.from({ length: rows }, (_, r) =>
    `<div class="row">${labelArr.slice(r * cols, (r + 1) * cols).join("")}</div>`
  ).join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: ${pageW}mm ${hMm}mm; margin: 0; }
    body { width: ${pageW}mm; background: white; }
    .row {
      display: grid;
      grid-template-columns: repeat(${cols}, ${wMm}mm);
      width: ${pageW}mm;
      height: ${hMm}mm;
      page-break-after: always;
    }
    .label {
      width: ${wMm}mm; height: ${hMm}mm; padding: 2mm;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      overflow: hidden; background: white; font-family: Arial, sans-serif;
    }
    .label-empty { background: white; }
    .product-name {
      font-size: ${hMm < 30 ? 7 : 9}pt; font-weight: bold; text-transform: uppercase;
      text-align: center; width: 100%; white-space: nowrap; overflow: hidden;
      text-overflow: ellipsis; line-height: 1.2; margin-bottom: 1mm;
    }
    .product-price {
      font-size: ${hMm < 30 ? 11 : 14}pt; font-weight: 900;
      text-align: center; margin-bottom: 1mm; line-height: 1;
    }
    .barcode-wrap svg { max-width: ${wMm - 6}mm; height: auto; display: block; }
  </style>
</head>
<body>${rowsHTML}</body>
</html>`;
}

interface AgentStatus {
  connected: boolean;
  printers: string[];
  selectedPrinter: string | null;
  printerLanguage: string;
  rotate180: boolean;
}

export default function LabelPrintModal({ product, defaultCount = 1, onClose }: LabelPrintModalProps) {
  const [sizeId, setSizeId] = useState("50x30");
  const [customW, setCustomW] = useState(50);
  const [customH, setCustomH] = useState(30);
  const [count, setCount] = useState(defaultCount);
  const [cols, setCols] = useState(3);
  const [marginMm, setMarginMm] = useState(5);
  const [gapMm, setGapMm] = useState(5);
  const [agent, setAgent] = useState<AgentStatus | null>(null);
  const [agentLoading, setAgentLoading] = useState(true);
  const [showConfig, setShowConfig] = useState(false);
  const [selectedPrinter, setSelectedPrinter] = useState("");
  const [selectedLang, setSelectedLang] = useState("TSPL");
  const [rotate180, setRotate180] = useState(false);
  const [printing, setPrinting] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const baseSize = LABEL_SIZES.find(s => s.id === sizeId)!;
  const size = sizeId === "custom"
    ? { ...baseSize, w: customW || 50, h: customH || 30 }
    : baseSize;

  // Detectar agente al abrir el modal
  useEffect(() => {
    const check = async () => {
      setAgentLoading(true);
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(`${AGENT_URL}/status`, { signal: controller.signal });
        clearTimeout(timer);
        const data = await res.json();
        setAgent({
          connected: true,
          printers: data.printers ?? [],
          selectedPrinter: data.selectedPrinter ?? null,
          printerLanguage: data.printerLanguage ?? "TSPL",
          rotate180: data.rotate180 ?? false,
        });
        setSelectedPrinter(data.selectedPrinter ?? "");
        setSelectedLang(data.printerLanguage ?? "TSPL");
        setRotate180(data.rotate180 ?? false);
      } catch {
        setAgent({ connected: false, printers: [], selectedPrinter: null, printerLanguage: "TSPL", rotate180: false });
      } finally {
        setAgentLoading(false);
      }
    };
    check();
  }, []);

  // Actualizar barcode en preview
  useEffect(() => {
    if (!previewRef.current) return;
    const svgEl = previewRef.current.querySelector("svg.barcode-target");
    if (!svgEl) return;
    try {
      JsBarcode(svgEl, product.sku, {
        format: "CODE128", displayValue: true, fontSize: 9, height: 35,
        margin: 1, background: "#ffffff", lineColor: "#000000", textMargin: 1, font: "monospace",
      });
    } catch { /* SKU inválido */ }
  }, [product.sku, sizeId]);

  const saveAgentConfig = async () => {
    try {
      await fetch(`${AGENT_URL}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ printerName: selectedPrinter, printerLanguage: selectedLang, rotate180 }),
      });
      setAgent(prev => prev ? { ...prev, selectedPrinter, printerLanguage: selectedLang, rotate180 } : prev);
      setShowConfig(false);
    } catch {
      alert("No se pudo guardar la configuración en el agente.");
    }
  };

  const handlePrintDirect = async () => {
    if (!agent?.connected || !agent.selectedPrinter) return;
    setPrinting(true);
    try {
      const res = await fetch(`${AGENT_URL}/print`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: product.name,
          price: product.price,
          sku: product.sku,
          count,
          wMm: size.w,
          hMm: size.h,
          cols,
          marginMm,
          gapMm,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      onClose();
    } catch (err: any) {
      alert(`Error al imprimir: ${err.message}`);
    } finally {
      setPrinting(false);
    }
  };

  const handlePrintPopup = () => {
    const html = buildPrintHTML(product.name, product.price, product.sku, count, size.w, size.h, cols);
    const win = window.open("", "_blank", `width=${size.w * 4},height=${size.h * 4 * count}`);
    if (!win) { alert("Permite las ventanas emergentes para imprimir."); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  const scale = Math.min(280 / (size.w * 3.78), 1.8);
  const previewW = Math.round(size.w * 3.78);
  const previewH = Math.round(size.h * 3.78);

  const agentReady = agent?.connected && !!agent.selectedPrinter;

  return (
    <div className="fixed inset-0 z-[60] flex justify-center items-center p-4 print:hidden">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-app-bg rounded-2xl shadow-2xl border border-app-border p-6 flex flex-col gap-5 max-h-[95vh] overflow-y-auto">

        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-app-text font-bold text-lg">Imprimir Etiqueta</h3>
            <p className="text-app-text-muted text-xs mt-0.5 truncate max-w-xs">{product.name}</p>
          </div>
          <button onClick={onClose} className="text-app-text-muted hover:text-app-text transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Estado del Agente */}
        <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl border ${agentLoading ? 'border-app-border bg-app-card' : agentReady ? 'border-emerald-500/30 bg-emerald-500/10' : agent?.connected ? 'border-amber-500/30 bg-amber-500/10' : 'border-app-border bg-app-card'}`}>
          <div className="flex items-center gap-2">
            {agentLoading ? (
              <div className="w-3 h-3 rounded-full bg-app-text-muted/40 animate-pulse" />
            ) : agentReady ? (
              <Wifi size={14} className="text-emerald-400" />
            ) : (
              <WifiOff size={14} className="text-app-text-muted" />
            )}
            <div>
              {agentLoading ? (
                <p className="text-xs text-app-text-muted">Buscando agente de impresión...</p>
              ) : agentReady ? (
                <>
                  <p className="text-xs font-bold text-emerald-400">Agente conectado</p>
                  <p className="text-[10px] text-app-text-muted">{agent.selectedPrinter} · {agent.printerLanguage}</p>
                </>
              ) : agent?.connected ? (
                <>
                  <p className="text-xs font-bold text-amber-400">Agente activo — sin impresora</p>
                  <p className="text-[10px] text-app-text-muted">Configura la impresora a usar</p>
                </>
              ) : (
                <>
                  <p className="text-xs font-bold text-app-text-muted">Agente no detectado</p>
                  <p className="text-[10px] text-app-text-muted">Imprimirá con diálogo del sistema</p>
                </>
              )}
            </div>
          </div>
          {agent?.connected && (
            <button
              onClick={() => setShowConfig(v => !v)}
              className="p-1.5 rounded-lg text-app-text-muted hover:text-app-text hover:bg-app-card/50 transition-all"
              title="Configurar impresora"
            >
              <Settings size={14} />
            </button>
          )}
        </div>

        {/* Panel de configuración del agente */}
        {showConfig && agent?.connected && (
          <div className="flex flex-col gap-3 px-3 py-3 bg-app-card rounded-xl border border-app-border">
            <p className="text-[10px] font-black text-app-text-muted uppercase tracking-widest">Configurar agente</p>
            <div>
              <label className="text-[10px] text-app-text-muted mb-1 block">Impresora</label>
              <select
                value={selectedPrinter}
                onChange={e => setSelectedPrinter(e.target.value)}
                className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2 text-app-text text-xs focus:outline-none focus:ring-2 focus:ring-app-accent/30"
              >
                <option value="">Seleccionar impresora...</option>
                {agent.printers.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-app-text-muted mb-1 block">Lenguaje</label>
              <div className="flex gap-2">
                {["TSPL", "ZPL"].map(lang => (
                  <button
                    key={lang}
                    onClick={() => setSelectedLang(lang)}
                    className={`flex-1 py-2 rounded-lg border text-xs font-black transition-all ${selectedLang === lang ? 'border-app-accent bg-app-accent/10 text-app-accent' : 'border-app-border text-app-text-muted'}`}
                  >
                    {lang} {lang === "TSPL" ? "(TSC/SAT)" : "(Zebra)"}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => setRotate180(v => !v)}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all ${rotate180 ? 'border-amber-500/40 bg-amber-500/10 text-amber-400' : 'border-app-border text-app-text-muted'}`}
            >
              <div className="text-left">
                <p className="text-xs font-bold">Rotar etiqueta 180°</p>
                <p className="text-[10px] opacity-70">Activar si el texto sale invertido</p>
              </div>
              <div className={`w-9 h-5 rounded-full transition-all flex items-center px-0.5 ${rotate180 ? 'bg-amber-500 justify-end' : 'bg-app-border justify-start'}`}>
                <div className="w-4 h-4 rounded-full bg-white shadow" />
              </div>
            </button>
            <button
              onClick={saveAgentConfig}
              className="w-full py-2 bg-app-accent/10 hover:bg-app-accent/20 text-app-accent font-bold rounded-lg text-xs transition-all"
            >
              Guardar configuración
            </button>
          </div>
        )}

        {/* Tamaños */}
        <div>
          <p className="text-[10px] font-black text-app-text-muted uppercase tracking-widest mb-2">Tamaño de etiqueta</p>
          <div className="grid grid-cols-3 gap-2">
            {LABEL_SIZES.map(s => (
              <button
                key={s.id}
                onClick={() => setSizeId(s.id)}
                className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all ${sizeId === s.id ? "border-app-accent bg-app-accent/10 text-app-accent" : "border-app-border text-app-text-muted hover:border-app-accent/40"}`}
              >
                {s.id === "custom" ? (
                  <div className="flex items-center justify-center w-8 h-6 shrink-0">
                    <span className="text-base leading-none">✏️</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center w-8 h-6 shrink-0">
                    <div
                      className={`border-2 rounded-sm ${sizeId === s.id ? "border-app-accent bg-app-accent/20" : "border-app-text-muted/40"}`}
                      style={{
                        width: `${Math.round((s.w / 100) * 28)}px`,
                        height: `${Math.round((s.h / 100) * 28)}px`,
                      }}
                    />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[9px] font-black leading-tight truncate">{s.label}</p>
                  <p className="text-[8px] opacity-60">{s.desc}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Inputs personalizados */}
          {sizeId === "custom" && (
            <div className="flex items-center gap-3 mt-3">
              <div className="flex-1">
                <label className="text-[10px] text-app-text-muted block mb-1">Ancho (mm)</label>
                <input
                  type="number" min={10} max={300} value={customW}
                  onChange={e => setCustomW(Math.max(10, parseInt(e.target.value) || 50))}
                  className="w-full bg-app-bg border border-app-accent/40 rounded-xl px-3 py-2 text-app-text font-bold text-center focus:outline-none focus:ring-2 focus:ring-app-accent/30"
                />
              </div>
              <span className="text-app-text-muted font-bold mt-4">×</span>
              <div className="flex-1">
                <label className="text-[10px] text-app-text-muted block mb-1">Alto (mm)</label>
                <input
                  type="number" min={10} max={300} value={customH}
                  onChange={e => setCustomH(Math.max(10, parseInt(e.target.value) || 30))}
                  className="w-full bg-app-bg border border-app-accent/40 rounded-xl px-3 py-2 text-app-text font-bold text-center focus:outline-none focus:ring-2 focus:ring-app-accent/30"
                />
              </div>
              <div className="mt-4 text-[10px] text-app-text-muted">mm</div>
            </div>
          )}
        </div>

        {/* Cantidad */}
        <div>
          <p className="text-[10px] font-black text-app-text-muted uppercase tracking-widest mb-2">Cantidad de etiquetas</p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCount(c => Math.max(1, c - 1))}
              className="w-10 h-10 rounded-xl border border-app-border text-app-text-muted hover:text-app-text hover:bg-app-card transition-all flex items-center justify-center font-black text-lg"
            >−</button>
            <input
              type="number" min={1} value={count}
              onChange={e => setCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="flex-1 bg-app-bg border border-app-border rounded-xl px-4 py-2 text-app-text font-bold text-center text-lg focus:outline-none focus:ring-2 focus:ring-app-accent/30"
            />
            <button
              onClick={() => setCount(c => c + 1)}
              className="w-10 h-10 rounded-xl border border-app-border text-app-text-muted hover:text-app-text hover:bg-app-card transition-all flex items-center justify-center font-black text-lg"
            >+</button>
          </div>
        </div>

        {/* Columnas */}
        <div>
            <p className="text-[10px] font-black text-app-text-muted uppercase tracking-widest mb-2">Etiquetas por fila</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map(n => (
                <button
                  key={n}
                  onClick={() => setCols(n)}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-black transition-all ${cols === n ? "border-app-accent bg-app-accent/10 text-app-accent" : "border-app-border text-app-text-muted hover:border-app-accent/40"}`}
                >
                  {n} {n === 1 ? "col." : "cols."}
                </button>
              ))}
            </div>
            {/* Resumen de ancho */}
            <p className="text-[10px] text-app-text-muted mt-1.5">
              Ancho total: <span className="font-bold text-app-accent">
                {(marginMm * 2 + size.w * cols + gapMm * (cols - 1)).toFixed(0)} mm
              </span>
              {" · "}{Math.ceil(count / cols)} {Math.ceil(count / cols) === 1 ? "fila" : "filas"}
            </p>
          </div>

          {/* Márgenes y separación */}
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-app-text-muted block mb-1">Margen lateral (mm)</label>
              <input
                type="number" min={0} max={50} step={0.5} value={marginMm}
                onChange={e => setMarginMm(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2 text-app-text font-bold text-center text-sm focus:outline-none focus:ring-2 focus:ring-app-accent/30"
              />
              <p className="text-[9px] text-app-text-muted mt-0.5 text-center">Izquierda y derecha</p>
            </div>
            <div>
              <label className="text-[10px] text-app-text-muted block mb-1">Separación entre etiquetas (mm)</label>
              <input
                type="number" min={0} max={50} step={0.5} value={gapMm}
                onChange={e => setGapMm(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2 text-app-text font-bold text-center text-sm focus:outline-none focus:ring-2 focus:ring-app-accent/30"
              />
              <p className="text-[9px] text-app-text-muted mt-0.5 text-center">Entre columnas</p>
            </div>
          </div>

        {/* Preview */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black text-app-text-muted uppercase tracking-widest">Vista previa</p>
            <span className="text-[9px] text-app-text-muted">{size.w} × {size.h} mm</span>
          </div>
          <div className="flex justify-center items-center bg-app-bg/50 border border-app-border rounded-xl p-4 min-h-[100px]">
            <div style={{ transform: `scale(${scale})`, transformOrigin: "center center", width: previewW, height: previewH }}>
              <div
                ref={previewRef}
                className="bg-white border border-black/20 flex flex-col items-center justify-center text-center overflow-hidden"
                style={{ width: previewW, height: previewH, padding: "4px", fontFamily: "Arial, sans-serif" }}
              >
                <p style={{ fontSize: 9, fontWeight: "bold", textTransform: "uppercase", width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.2, marginBottom: 2 }}>
                  {product.name}
                </p>
                <p style={{ fontSize: 13, fontWeight: 900, lineHeight: 1, marginBottom: 3 }}>
                  {cop(product.price)}
                </p>
                <svg className="barcode-target" style={{ maxWidth: "100%" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Nota (solo en modo popup) */}
        {!agentReady && (
          <div className="flex items-start gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300">
            <ZoomIn size={14} className="shrink-0 mt-0.5" />
            <span>En el diálogo de impresión selecciona <strong>Sin márgenes</strong> y tamaño de papel <strong>{size.w * cols} × {size.h} mm</strong>{cols > 1 ? ` (${cols} etiquetas × ${size.w}mm)` : ""}.</span>
          </div>
        )}

        {/* Botones */}
        {agentReady ? (
          <button
            onClick={handlePrintDirect}
            disabled={printing}
            className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-60 text-white font-black rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-3"
          >
            <Printer size={20} />
            {printing ? "ENVIANDO..." : `IMPRIMIR ${count} ${count === 1 ? "ETIQUETA" : "ETIQUETAS"} DIRECTO`}
          </button>
        ) : (
          <button
            onClick={handlePrintPopup}
            className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-3"
          >
            <Printer size={20} />
            IMPRIMIR {count} {count === 1 ? "ETIQUETA" : "ETIQUETAS"}
          </button>
        )}
      </div>
    </div>
  );
}
