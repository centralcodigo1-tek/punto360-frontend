import type { ReactNode } from "react";
import Topbar from "../components/Topbar";
import Sidebar from "../components/Sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen bg-app-bg text-app-text flex overflow-hidden transition-colors duration-500">
            {/* Ambient Background Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-app-glow/10 rounded-full blur-[120px] pointer-events-none z-0"></div>
            <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] bg-app-accent/10 rounded-full blur-[120px] pointer-events-none z-0"></div>
            <div className="absolute bottom-[-20%] left-[20%] w-[500px] h-[500px] bg-app-glow/10 rounded-full blur-[120px] pointer-events-none z-0"></div>

            <Sidebar />

            <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
                <Topbar />

                <main className="flex-1 overflow-y-auto pt-24 px-8 pb-10" 
                      style={{ marginLeft: 'var(--sidebar-width, 256px)', transition: 'margin-left 0.5s ease-in-out' }}>
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
