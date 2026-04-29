import { toast } from "../lib/toast";
import { useState, useRef } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import { api } from "../api/axios";
import { Upload, FileX, CheckCircle2, AlertTriangle, Loader2, PackagePlus, X, ChevronRight } from "lucide-react";

interface ParsedProduct {
  reference: string;
  nombre: string;
  precio_compra: number;
  precio_venta: number;
  stock: number;
  categoria: string;
  tipo_venta: number;
}

interface ImportResult {
  created: number;
  skipped: number;
  errors: { ref: string; reason: string }[];
  createdRefs: string[];
  skippedRefs: string[];
}

function parseXML(xmlStr: string): ParsedProduct[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlStr, "application/xml");
  const items = doc.querySelectorAll("producto");
  const products: ParsedProduct[] = [];

  items.forEach((el) => {
    const get = (tag: string) => el.querySelector(tag)?.textContent?.trim() ?? "";
    products.push({
      reference: get("reference"),
      nombre: get("nombre"),
      precio_compra: parseFloat(get("precio_compra")) || 0,
      precio_venta: parseFloat(get("precio_venta")) || 0,
      stock: parseFloat(get("stock")) || 0,
      categoria: get("categoria") || "General",
      tipo_venta: parseInt(get("tipo_venta")) || 1,
    });
  });

  return products.filter((p) => p.nombre);
}

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n);
}

export default function ImportProductsPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ParsedProduct[]>([]);
  const [fileName, setFileName] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [parseError, setParseError] = useState("");

  const handleFile = (file: File) => {
    setResult(null);
    setParseError("");
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const products = parseXML(text);
        if (products.length === 0) {
          setParseError("No se encontraron productos válidos en el archivo XML.");
          setPreview([]);
        } else {
          setPreview(products);
        }
      } catch {
        setParseError("Error al leer el archivo. Verifica que sea un XML válido.");
        setPreview([]);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleImport = async () => {
    if (preview.length === 0) return;
    setIsImporting(true);
    try {
      const res = await api.post("/products/import", { productos: preview });
      setResult(res.data);
      setPreview([]);
      setFileName("");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Error al importar productos.");
    } finally {
      setIsImporting(false);
    }
  };

  const clearFile = () => {
    setPreview([]);
    setFileName("");
    setParseError("");
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const categories = [...new Set(preview.map((p) => p.categoria))];

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-black text-app-text">Importar Productos</h1>
          <p className="text-app-text-muted text-sm mt-1">Carga un archivo XML exportado de tu sistema anterior.</p>
        </div>

        {/* Resultado */}
        {result && (
          <div className="bg-app-card border border-app-border rounded-2xl p-6 space-y-4">
            <h2 className="font-bold text-app-text text-lg">Resultado de la importación</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                <p className="text-3xl font-black text-emerald-400">{result.created}</p>
                <p className="text-xs font-bold text-app-text-muted mt-1 uppercase tracking-widest">Creados</p>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
                <p className="text-3xl font-black text-amber-400">{result.skipped}</p>
                <p className="text-xs font-bold text-app-text-muted mt-1 uppercase tracking-widest">Omitidos (ya existían)</p>
              </div>
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-center">
                <p className="text-3xl font-black text-rose-400">{result.errors.length}</p>
                <p className="text-xs font-bold text-app-text-muted mt-1 uppercase tracking-widest">Errores</p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-bold text-rose-400">Productos con error:</p>
                {result.errors.map((e) => (
                  <div key={e.ref} className="flex items-center gap-2 text-sm text-app-text-muted">
                    <AlertTriangle size={14} className="text-rose-400 shrink-0" />
                    <span className="font-mono text-rose-300">{e.ref}</span>
                    <span>— {e.reason}</span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={clearFile}
              className="w-full py-3 rounded-xl bg-app-accent/10 hover:bg-app-accent/20 text-app-accent font-bold transition-all border border-app-accent/20"
            >
              Importar otro archivo
            </button>
          </div>
        )}

        {/* Upload zone */}
        {!result && (
          <>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => !fileName && fileRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center gap-4 transition-all ${
                fileName
                  ? "border-app-accent/40 bg-app-accent/5 cursor-default"
                  : "border-app-border hover:border-app-accent/40 hover:bg-app-accent/5 cursor-pointer"
              }`}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".xml"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />

              {!fileName ? (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-app-accent/10 flex items-center justify-center">
                    <Upload size={32} className="text-app-accent" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-app-text">Arrastra tu archivo XML aquí</p>
                    <p className="text-sm text-app-text-muted mt-1">o haz clic para buscarlo</p>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-4 w-full">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <PackagePlus size={24} className="text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-app-text truncate">{fileName}</p>
                    <p className="text-sm text-emerald-400 font-medium">{preview.length} productos encontrados</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); clearFile(); }}
                    className="p-2 rounded-lg hover:bg-app-card text-app-text-muted hover:text-app-text transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}
            </div>

            {parseError && (
              <div className="flex items-center gap-3 px-4 py-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm">
                <FileX size={18} className="shrink-0" />
                {parseError}
              </div>
            )}

            {/* Preview */}
            {preview.length > 0 && (
              <div className="bg-app-card border border-app-border rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-app-border flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-app-text">Vista previa</h2>
                    <p className="text-xs text-app-text-muted mt-0.5">
                      {preview.length} productos · {categories.length} {categories.length === 1 ? "categoría" : "categorías"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((c) => (
                      <span key={c} className="px-2 py-0.5 bg-app-accent/10 text-app-accent text-[10px] font-black uppercase rounded-full border border-app-accent/20">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-app-border bg-app-bg/50">
                        <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-app-text-muted">Referencia</th>
                        <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-app-text-muted">Nombre</th>
                        <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-app-text-muted">Categoría</th>
                        <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-app-text-muted">Tipo venta</th>
                        <th className="text-right px-4 py-3 text-[10px] font-black uppercase tracking-widest text-app-text-muted">P. Costo</th>
                        <th className="text-right px-4 py-3 text-[10px] font-black uppercase tracking-widest text-app-text-muted">P. Venta</th>
                        <th className="text-right px-4 py-3 text-[10px] font-black uppercase tracking-widest text-app-text-muted">Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((p, i) => (
                        <tr key={i} className="border-b border-app-border/50 hover:bg-app-accent/5 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs">
                            {p.reference
                              ? <span className="text-app-accent">{p.reference}</span>
                              : <span className="text-app-text-muted italic">(auto)</span>}
                          </td>
                          <td className="px-4 py-3 font-medium text-app-text">{p.nombre}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 bg-app-accent/10 text-app-accent text-[10px] font-bold rounded-full">{p.categoria}</span>
                          </td>
                          <td className="px-4 py-3">
                            {p.tipo_venta === 2
                              ? <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-[10px] font-bold rounded-full">Granel</span>
                              : <span className="px-2 py-0.5 bg-sky-500/10 text-sky-400 text-[10px] font-bold rounded-full">Unidad</span>}
                          </td>
                          <td className="px-4 py-3 text-right text-app-text-muted">{formatCOP(p.precio_compra)}</td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-400">{formatCOP(p.precio_venta)}</td>
                          <td className="px-4 py-3 text-right text-app-text">{p.stock}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="px-6 py-4 border-t border-app-border flex justify-end">
                  <button
                    onClick={handleImport}
                    disabled={isImporting}
                    className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-60"
                  >
                    {isImporting ? (
                      <><Loader2 size={18} className="animate-spin" /> Importando...</>
                    ) : (
                      <><CheckCircle2 size={18} /> Confirmar importación <ChevronRight size={16} /></>
                    )}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
