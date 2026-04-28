import { useState, useRef, useEffect } from "react";
import { X, Printer, ZoomIn, ZoomOut } from "lucide-react";
import JsBarcode from "jsbarcode";

interface LabelPrintModalProps {
  product: { name: string; price: number; sku: string };
  defaultCount?: number;
  onClose: () => void;
}

const LABEL_SIZES = [
  { id: "50x30",  label: "50 × 30 mm",  w: 50,  h: 30,  desc: "Estándar pequeña" },
  { id: "62x29",  label: "62 × 29 mm",  w: 62,  h: 29,  desc: "Rollo estándar" },
  { id: "40x25",  label: "40 × 25 mm",  w: 40,  h: 25,  desc: "Mini" },
  { id: "100x50", label: "100 × 50 mm", w: 100, h: 50,  desc: "Grande" },
  { id: "57x32",  label: "57 × 32 mm",  w: 57,  h: 32,  desc: "Intermedia" },
];

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
    // SKU inválido para CODE128, fallback a texto
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
  hMm: number
): string {
  const barcodeSVG = generateBarcodeSVG(sku);
  const priceFormatted = cop(price);

  const oneLabel = `
    <div class="label">
      <div class="product-name">${name}</div>
      <div class="product-price">${priceFormatted}</div>
      <div class="barcode-wrap">${barcodeSVG}</div>
    </div>`;

  const labels = Array(count).fill(oneLabel).join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    @page {
      size: ${wMm}mm ${hMm}mm;
      margin: 0;
    }

    body {
      width: ${wMm}mm;
      background: white;
    }

    .label {
      width: ${wMm}mm;
      height: ${hMm}mm;
      padding: 2mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      page-break-after: always;
      overflow: hidden;
      background: white;
      font-family: Arial, sans-serif;
    }

    .product-name {
      font-size: ${hMm < 30 ? 7 : 9}pt;
      font-weight: bold;
      text-transform: uppercase;
      text-align: center;
      width: 100%;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.2;
      margin-bottom: 1mm;
    }

    .product-price {
      font-size: ${hMm < 30 ? 11 : 14}pt;
      font-weight: 900;
      text-align: center;
      margin-bottom: 1mm;
      line-height: 1;
    }

    .barcode-wrap svg {
      max-width: ${wMm - 6}mm;
      height: auto;
      display: block;
    }
  </style>
</head>
<body>${labels}</body>
</html>`;
}

export default function LabelPrintModal({ product, defaultCount = 1, onClose }: LabelPrintModalProps) {
  const [sizeId, setSizeId] = useState("50x30");
  const [count, setCount] = useState(defaultCount);
  const previewRef = useRef<HTMLDivElement>(null);

  const size = LABEL_SIZES.find(s => s.id === sizeId)!;

  // Actualizar barcode en preview cuando cambia el SKU o tamaño
  useEffect(() => {
    if (!previewRef.current) return;
    const svgEl = previewRef.current.querySelector("svg.barcode-target");
    if (!svgEl) return;
    try {
      JsBarcode(svgEl, product.sku, {
        format: "CODE128",
        displayValue: true,
        fontSize: 9,
        height: 35,
        margin: 1,
        background: "#ffffff",
        lineColor: "#000000",
        textMargin: 1,
        font: "monospace",
      });
    } catch { /* SKU inválido */ }
  }, [product.sku, sizeId]);

  const handlePrint = () => {
    const html = buildPrintHTML(product.name, product.price, product.sku, count, size.w, size.h);
    const win = window.open("", "_blank", `width=${size.w * 4},height=${size.h * 4 * count}`);
    if (!win) { alert("Permite las ventanas emergentes para imprimir."); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  // Escala de preview: convertir mm a px aprox (1mm ≈ 3.78px) y limitar a 280px ancho
  const scale = Math.min(280 / (size.w * 3.78), 1.8);
  const previewW = Math.round(size.w * 3.78);
  const previewH = Math.round(size.h * 3.78);

  return (
    <div className="fixed inset-0 z-[60] flex justify-center items-center p-4 print:hidden">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-app-bg rounded-2xl shadow-2xl border border-app-border p-6 flex flex-col gap-5">

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

        {/* Tamaños */}
        <div>
          <p className="text-[10px] font-black text-app-text-muted uppercase tracking-widest mb-2">Tamaño de etiqueta</p>
          <div className="grid grid-cols-5 gap-2">
            {LABEL_SIZES.map(s => (
              <button
                key={s.id}
                onClick={() => setSizeId(s.id)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-all ${sizeId === s.id ? "border-app-accent bg-app-accent/10 text-app-accent" : "border-app-border text-app-text-muted hover:border-app-accent/40"}`}
              >
                {/* Representación visual proporcional */}
                <div className="flex items-center justify-center w-10 h-7">
                  <div
                    className={`border-2 rounded-sm ${sizeId === s.id ? "border-app-accent bg-app-accent/20" : "border-app-text-muted/40"}`}
                    style={{
                      width: `${Math.round((s.w / 100) * 36)}px`,
                      height: `${Math.round((s.h / 100) * 36)}px`,
                    }}
                  />
                </div>
                <span className="text-[9px] font-black leading-tight">{s.label}</span>
                <span className="text-[8px] opacity-60">{s.desc}</span>
              </button>
            ))}
          </div>
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
              type="number"
              min={1}
              value={count}
              onChange={e => setCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="flex-1 bg-app-bg border border-app-border rounded-xl px-4 py-2 text-app-text font-bold text-center text-lg focus:outline-none focus:ring-2 focus:ring-app-accent/30"
            />
            <button
              onClick={() => setCount(c => c + 1)}
              className="w-10 h-10 rounded-xl border border-app-border text-app-text-muted hover:text-app-text hover:bg-app-card transition-all flex items-center justify-center font-black text-lg"
            >+</button>
          </div>
        </div>

        {/* Preview */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black text-app-text-muted uppercase tracking-widest">Vista previa</p>
            <span className="text-[9px] text-app-text-muted">{size.w} × {size.h} mm</span>
          </div>
          <div className="flex justify-center items-center bg-app-bg/50 border border-app-border rounded-xl p-4 min-h-[100px]">
            <div
              style={{ transform: `scale(${scale})`, transformOrigin: "center center", width: previewW, height: previewH }}
            >
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

        {/* Nota sobre configuración */}
        <div className="flex items-start gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300">
          <ZoomIn size={14} className="shrink-0 mt-0.5" />
          <span>En el diálogo de impresión selecciona <strong>Sin márgenes</strong> y el tamaño de papel <strong>{size.w} × {size.h} mm</strong> (o el rollo de tu impresora).</span>
        </div>

        {/* Botón */}
        <button
          onClick={handlePrint}
          className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-3"
        >
          <Printer size={20} />
          IMPRIMIR {count} {count === 1 ? "ETIQUETA" : "ETIQUETAS"}
        </button>
      </div>
    </div>
  );
}
