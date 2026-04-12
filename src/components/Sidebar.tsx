import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { Package, LayoutDashboard, ShoppingCart, History, Factory, Layers, PackagePlus, Users, BarChart3, ChevronLeft, ChevronRight, Palette } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { useTheme } from "../theme/ThemeContext";

export default function Sidebar() {
    const { hasPermission } = useAuth();
    const { theme, setTheme } = useTheme();
    const [isCollapsed, setIsCollapsed] = useState(false);

    useEffect(() => {
        document.documentElement.style.setProperty('--sidebar-width', isCollapsed ? '80px' : '256px');
    }, [isCollapsed]);

    const navItems = [
        { name: "Inicio", path: "/", icon: LayoutDashboard, show: true },
        { name: "Ventas", path: "/ventas", icon: ShoppingCart, show: true },
        { name: "Caja", path: "/caja", icon: Layers, show: true },
        { name: "Compras", path: "/compras", icon: PackagePlus, show: true },
        { name: "Inventario", path: "/inventario", icon: Package, show: true },
        { name: "Historial", path: "/historial", icon: History, show: true },
        { name: "Reportes", path: "/reportes", icon: BarChart3, show: hasPermission("reports.view") },
        { name: "Usuarios", path: "/usuarios", icon: Users, show: hasPermission("users.manage") },
    ].filter(item => item.show);

    return (
        <aside 
            className={`fixed left-0 top-0 h-screen bg-app-sidebar backdrop-blur-xl border-r border-app-border z-[60] transition-all duration-500 ease-in-out flex flex-col shadow-2xl ${
                isCollapsed ? "w-20" : "w-64"
            }`}
        >
            {/* Branding / Logo */}
            <div className="h-20 flex items-center px-6 border-b border-app-border overflow-hidden whitespace-nowrap">
                <div className="p-2 bg-app-accent rounded-xl shadow-lg shrink-0">
                    <Factory className="text-white" size={24} />
                </div>
                {!isCollapsed && (
                    <div className="ml-4 flex flex-col">
                        <span className="font-bold text-lg tracking-wider text-app-text">PUNTO 360</span>
                        <span className="text-[10px] uppercase tracking-[0.2em] text-app-accent font-bold">Manager POS</span>
                    </div>
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
                                : "text-app-text-muted hover:text-app-text hover:bg-white/5 hover:translate-x-1"
                            }`
                        }
                    >
                        <item.icon size={20} className="shrink-0 transition-transform duration-300 group-hover:scale-110" />
                        {!isCollapsed && (
                            <span className="font-medium text-sm tracking-wide">{item.name}</span>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Theme & Collapse Footer */}
            <div className="p-4 border-t border-app-border space-y-4">
                <div className={`flex items-center justify-between px-2 ${isCollapsed ? 'flex-col gap-4' : ''}`}>
                    {isCollapsed ? (
                        <Palette size={18} className="text-app-text-muted" />
                    ) : (
                        <span className="text-[10px] font-bold text-app-text-muted uppercase tracking-widest">Temas</span>
                    )}
                    <div className={`flex gap-2 ${isCollapsed ? 'flex-col' : ''}`}>
                        {[
                            { id: 'dark', color: 'bg-[#22d3ee]', name: 'Glass Dark' },
                            { id: 'light', color: 'bg-[#2563eb]', name: 'Light Retail' },
                            { id: 'neon', color: 'bg-[#ff007f]', name: 'Neon Night' },
                            { id: 'neon-light', color: 'bg-[#ff007f] border-2 border-white', name: 'Neon Light' },
                            { id: 'ocean', color: 'bg-[#00ffcc]', name: 'Ocean Deep' }
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

                <button 
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="w-full flex items-center justify-center p-2 rounded-lg bg-white/5 text-app-text-muted hover:text-app-text hover:bg-white/10 transition-all border border-app-border"
                >
                    {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                </button>
            </div>
        </aside>
    );
}
