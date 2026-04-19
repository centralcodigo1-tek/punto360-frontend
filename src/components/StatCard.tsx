import type { ReactNode } from "react";

interface StatCardProps {
    title: string;
    value: string;
    subtitle?: string;
    icon?: ReactNode;
    colorFrom: string;
    colorTo: string;
}

export default function StatCard({ title, value, subtitle, icon, colorFrom, colorTo }: StatCardProps) {
    return (
        <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${colorFrom} ${colorTo} p-6 shadow-xl border border-app-border group transition-transform hover:-translate-y-1 duration-300`}>
            {/* Glass decoration */}
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-app-card rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
            
            <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-app-text font-medium text-sm drop-shadow-sm">{title}</h3>
                    {icon && (
                        <div className="p-2 bg-app-card backdrop-blur-sm rounded-lg text-white">
                            {icon}
                        </div>
                    )}
                </div>
                
                <div className="mt-auto">
                    <p className="text-3xl font-bold text-white drop-shadow-md">{value}</p>
                    {subtitle && (
                        <p className="text-xs text-app-text mt-2 font-medium">{subtitle}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
