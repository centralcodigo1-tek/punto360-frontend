import { Bell, LogOut, Search, Menu } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

interface TopbarProps {
    onOpenMobileMenu?: () => void;
}

export default function Topbar({ onOpenMobileMenu }: TopbarProps) {
    const { user, logout } = useAuth();
    
    return (
        <header className="fixed top-0 right-0 h-20 bg-transparent z-40 flex items-center justify-between px-4 md:px-8 pointer-events-none transition-all duration-300" 
                style={{ left: 'var(--sidebar-render-width, 256px)' }}>
            
            {/* Context Title / Search Area - Pointer events auto to make it clickable */}
            <div className="flex-1 flex items-center gap-4 pointer-events-auto">
                <button 
                    onClick={onOpenMobileMenu}
                    className="p-2.5 lg:hidden text-app-text-muted hover:text-app-text bg-app-card border border-app-border rounded-xl shadow-lg transition-all"
                >
                    <Menu size={20} />
                </button>

                <div className="relative group w-full max-w-md hidden md:block">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-app-text-muted group-focus-within:text-app-accent transition-colors" size={18} />
                    <input 
                        type="text" 
                        placeholder="Buscar en el sistema..." 
                        className="w-full bg-app-card backdrop-blur-md border border-app-border focus:border-app-accent/50 rounded-2xl py-2.5 pl-12 pr-4 text-sm text-app-text focus:outline-none transition-all shadow-lg"
                    />
                </div>
            </div>

            {/* Right Tools Area - Pointer events auto */}
            <div className="flex items-center gap-3 md:gap-6 pointer-events-auto">
                <button className="hidden sm:flex p-2.5 text-app-text-muted hover:text-app-text hover:bg-white/10 rounded-xl bg-app-card border border-app-border transition-all relative group">
                    <Bell size={18} className="group-hover:rotate-12 transition-transform" />
                    <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-gradient-to-tr from-rose-500 to-pink-600 rounded-full border-2 border-app-bg"></span>
                </button>
                
                <div className="flex items-center gap-3 md:gap-4 bg-app-card backdrop-blur-md border border-app-border p-1 md:p-1.5 md:pr-4 rounded-2xl shadow-xl">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-app-accent flex items-center justify-center text-xs md:text-sm font-bold text-white shadow-lg overflow-hidden border border-white/20 shrink-0">
                        {user?.userName?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <div className="hidden lg:flex flex-col">
                        <span className="text-xs font-bold text-app-text tracking-wide">
                            {user?.userName || "Usuario"}
                        </span>
                        <span className="text-[10px] text-app-accent font-bold uppercase tracking-tighter">
                            {user?.companyName || "Empresa"}
                        </span>
                    </div>
                </div>

                <button 
                    onClick={logout}
                    className="p-2.5 text-rose-500 hover:text-rose-100 hover:bg-rose-500/20 rounded-xl bg-app-card border border-app-border transition-all shadow-lg group"
                    title="Cerrar sesión"
                >
                    <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
                </button>
            </div>
        </header>
    );
}
