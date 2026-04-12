import { useState, type ReactNode } from "react";
import Topbar from "../components/Topbar";
import Sidebar from "../components/Sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="min-h-screen bg-app-bg text-app-text flex overflow-hidden transition-colors duration-500 relative">
            {/* Ambient Background Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-app-glow/10 rounded-full blur-[120px] pointer-events-none z-0"></div>
            <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] bg-app-accent/10 rounded-full blur-[120px] pointer-events-none z-0"></div>
            <div className="absolute bottom-[-20%] left-[20%] w-[500px] h-[500px] bg-app-glow/10 rounded-full blur-[120px] pointer-events-none z-0"></div>

            <Sidebar 
                isMobileOpen={isMobileMenuOpen} 
                onClose={() => setIsMobileMenuOpen(false)} 
            />

            <div className="flex-1 flex flex-col relative z-10 overflow-hidden min-w-0">
                <Topbar onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />

                <main className="flex-1 overflow-y-auto pt-24 px-4 md:px-8 pb-10 transition-all duration-500 ease-in-out" 
                      style={{ 
                        marginLeft: 'var(--sidebar-render-width, 0px)'
                      }}>
                    <div className="max-w-7xl mx-auto w-full">
                        {children}
                    </div>
                </main>
            </div>
            
            {/* Overlay for mobile sidebar */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] lg:hidden transition-opacity"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}
        </div>
    );
}
