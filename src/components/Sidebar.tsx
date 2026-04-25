import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Package, LayoutDashboard, ShoppingCart, History, Factory, Layers, PackagePlus, Truck, Users, BarChart3, Archive, ChevronLeft, ChevronRight, Palette, X, Briefcase, FileUp } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { useTheme } from "../theme/ThemeContext";

interface SidebarProps {
    isMobileOpen?: boolean;
    onClose?: () => void;
}

export default function Sidebar({ isMobileOpen = false, onClose }: SidebarProps) {
    const { hasPermission, user } = useAuth();
    const isAdmin = user?.role === 'ADMIN';
    const canManageUsers     = hasPermission('users.manage')     || isAdmin;
    const canViewReports     = hasPermission('reports.view')     || isAdmin;
    const canManageCustomers = hasPermission('customers.manage') || isAdmin;
    const canManageProviders = hasPermission('inventory.manage') || isAdmin;
    const { theme, setTheme } = useTheme();
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 1024;
            setIsMobile(mobile);
            if (mobile && isCollapsed) setIsCollapsed(false);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isCollapsed]);

    useEffect(() => {
        // En móvil el ancho que empuja el contenido es 0
        // En desktop es 80px o 256px
        const width = isMobile ? 0 : (isCollapsed ? 80 : 256);
        document.documentElement.style.setProperty('--sidebar-render-width', `${width}px`);
    }, [isCollapsed, isMobile]);

    // Cerrar el menú móvil al navegar
    useEffect(() => {
        if (isMobile && onClose) onClose();
    }, [location.pathname]);

    const navItems = [
        { name: "Inicio", path: "/", icon: LayoutDashboard, show: true },
        { name: "Ventas", path: "/ventas", icon: ShoppingCart, show: true },
        { name: "Caja", path: "/caja", icon: Layers, show: true },
        { name: "Compras", path: "/compras", icon: PackagePlus, show: true },
        { name: "Proveedores", path: "/proveedores", icon: Truck, show: canManageProviders },
        { name: "Inventario", path: "/inventario", icon: Package, show: true },
        { name: "Importar", path: "/importar-productos", icon: FileUp, show: canManageProviders },
        { name: "Historial", path: "/historial", icon: History, show: true },
        { name: "Clientes", path: "/clientes", icon: Users, show: canManageCustomers || hasPermission('pos.access') },
        { name: "Cartera", path: "/cartera", icon: Briefcase, show: canManageCustomers },
        { name: "Arqueos", path: "/arqueos", icon: Archive, show: canViewReports },
        { name: "Reportes", path: "/reportes", icon: BarChart3, show: canViewReports },
        { name: "Usuarios", path: "/usuarios", icon: Users, show: canManageUsers },
    ].filter(item => item.show);

    return (
        <aside 
            className={`fixed left-0 top-0 h-screen bg-app-sidebar backdrop-blur-3xl border-r border-app-border z-[60] transition-all duration-500 ease-in-out flex flex-col shadow-2xl ${
                isMobile 
                    ? (isMobileOpen ? "translate-x-0 w-72" : "-translate-x-full w-72")
                    : (isCollapsed ? "w-20" : "w-64")
            }`}
        >
            {/* Branding / Logo */}
            <div className="h-20 flex items-center px-6 border-b border-app-border overflow-hidden whitespace-nowrap shrink-0">
                <div className="p-2 bg-app-accent rounded-xl shadow-lg shrink-0">
                    <Factory className="text-white" size={24} />
                </div>
                {(!isCollapsed || isMobile) && (
                    <div className="ml-4 flex flex-col flex-1">
                        <span className="font-bold text-lg tracking-wider text-app-text">PUNTO 360</span>
                        <span className="text-[10px] uppercase tracking-[0.2em] text-app-accent font-bold">Manager POS</span>
                    </div>
                )}
                {isMobile && (
                    <button onClick={onClose} className="p-2 text-app-text-muted hover:text-app-text transition-colors">
                        <X size={20} />
                    </button>
                )}
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto custom-scrollbar">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 group ${
                                isActive 
                                ? "bg-app-accent/20 text-app-accent border border-app-accent/20 shadow-[0_0_20px_rgba(var(--theme-accent),0.1)]" 
                                : "text-app-text-muted hover:text-app-text hover:bg-app-card hover:translate-x-1"
                            }`
                        }
                    >
                        <item.icon size={20} className="shrink-0 transition-transform duration-300 group-hover:scale-110" />
                        {(!isCollapsed || isMobile) && (
                            <span className="font-medium text-sm tracking-wide">{item.name}</span>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Theme & Collapse Footer */}
            <div className="p-4 border-t border-app-border space-y-4 shrink-0">
                <div className={`flex items-center justify-between px-2 ${isCollapsed && !isMobile ? 'flex-col gap-4' : ''}`}>
                    {isCollapsed && !isMobile ? (
                        <Palette size={18} className="text-app-text-muted" />
                    ) : (
                        <span className="text-[10px] font-bold text-app-text-muted uppercase tracking-widest">Temas</span>
                    )}
                    <div className={`flex gap-2 ${isCollapsed && !isMobile ? 'flex-col' : ''}`}>
                        {[
                            { id: 'dark', color: 'bg-[#22d3ee]', name: 'Glass Dark' },
                            { id: 'light', color: 'bg-[#2563eb]', name: 'Light Retail' },
                            { id: 'neon', color: 'bg-[#ff007f]', name: 'Neon Night' },
                            { id: 'neon-light', color: 'bg-[#db2777] border border-white', name: 'Clean Pink' },
                            { id: 'ocean', color: 'bg-[#10b981]', name: 'Deep Sea' }
                        ].map(t => (
                            <button
                                key={t.id}
                                onClick={() => setTheme(t.id as any)}
                                title={t.name}
                                className={`w-4 h-4 rounded-full transition-all ring-offset-2 ring-offset-app-sidebar ${t.color} ${theme === t.id ? 'ring-2 ring-app-accent scale-125' : 'opacity-40 hover:opacity-100 hover:scale-110'}`}
                            />
                        ))}
                    </div>
                </div>

                {!isMobile && (
                    <button 
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="w-full flex items-center justify-center p-2 rounded-lg bg-app-card text-app-text-muted hover:text-app-text hover:bg-app-card transition-all border border-app-border"
                    >
                        {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                    </button>
                )}
            </div>
        </aside>
    );
}
