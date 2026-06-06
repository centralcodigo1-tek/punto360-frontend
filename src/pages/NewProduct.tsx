import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import NewProductFields, { type SavedProduct } from "../components/products/NewProductFields";
import { useAuth } from "../auth/AuthContext";
import { PackagePlus, CheckCircle2, Tag, PackageOpen } from "lucide-react";

export default function NewProductPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [savedProduct, setSavedProduct] = useState<SavedProduct | null>(null);

    if (savedProduct) {
        return (
            <DashboardLayout>
                <div className="max-w-md mx-auto mt-12 flex flex-col items-center gap-6 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                        <CheckCircle2 size={36} className="text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-app-text mb-1">¡Producto creado!</h2>
                        <p className="text-app-text-muted text-sm font-mono">{savedProduct.name}</p>
                        <p className="text-app-text-muted text-xs mt-1">SKU: {savedProduct.sku}</p>
                    </div>
                    <p className="text-sm text-app-text-muted">¿Qué deseas hacer ahora?</p>
                    <div className="flex flex-col gap-3 w-full">
                        <button
                            onClick={() => navigate("/etiquetas", { state: { product: savedProduct } })}
                            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 hover:opacity-90 text-white font-bold text-sm shadow-lg shadow-violet-900/30 transition-opacity"
                        >
                            <Tag size={18} />
                            Imprimir Etiquetas
                        </button>
                        <button
                            onClick={() => navigate("/inventario")}
                            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-app-card border border-app-border hover:bg-app-bg text-app-text font-bold text-sm transition-colors"
                        >
                            <PackageOpen size={18} />
                            Ir al Inventario
                        </button>
                        <button
                            onClick={() => setSavedProduct(null)}
                            className="text-app-text-muted hover:text-app-text text-sm transition-colors"
                        >
                            Crear otro producto
                        </button>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                        <PackagePlus size={28} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-app-text drop-shadow-md">Alta de Producto</h1>
                        <p className="text-app-text-muted text-sm font-medium">Se vinculará a la empresa {user?.companyName || "tu negocio"}</p>
                    </div>
                </div>
                <NewProductFields
                    onSaveSuccess={(product) => {
                        if (product) setSavedProduct(product);
                        else navigate("/inventario");
                    }}
                />
            </div>
        </DashboardLayout>
    );
}
