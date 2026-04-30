import { useNavigate } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import NewProductFields from "../components/products/NewProductFields";
import { useAuth } from "../auth/AuthContext";
import { PackagePlus } from "lucide-react";

export default function NewProductPage() {
    const { user } = useAuth();
    const navigate = useNavigate();

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
                <NewProductFields onSaveSuccess={() => navigate("/inventario")} />
            </div>
        </DashboardLayout>
    );
}
