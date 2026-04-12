import React from 'react';
import { useMemo } from 'react';

interface ProductLabelProps {
  name: string;
  price: number;
  sku: string;
  quantity?: number;
}

const cop = (v: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(v);

/**
 * Componente optimizado para impresión de etiquetas (Stickers)
 * Diseñado para ser escalable en el diálogo de impresión del navegador.
 */
export const ProductLabel: React.FC<ProductLabelProps> = ({ name, price, sku }) => {
    
    // Generador simple de barras visuales para simular Code128/39 (Estético para POS si no hay librería)
    // Para un entorno real, usaríamos una librería de códigos de barras. 
    // Aquí generaremos un patrón visual basado en el SKU para que "parezca" real 
    // y sea reemplazable por una librería si el cliente lo requiere.
    const barcodeBars = useMemo(() => {
        const pattern = sku.split('').map(char => char.charCodeAt(0).toString(2)).join('');
        return pattern.split('').slice(0, 60);
    }, [sku]);

    return (
        <div className="product-label-container p-2 bg-white text-black border border-black/10 flex flex-col items-center justify-center text-center overflow-hidden" 
             style={{ width: '50mm', height: '30mm', fontFamily: 'sans-serif' }}>
            
            {/* Cabecera: Nombre */}
            <h1 className="text-[10px] font-bold uppercase truncate w-full leading-tight mb-1">
                {name}
            </h1>

            {/* Precio destacado */}
            <div className="text-lg font-black my-0.5">
                {cop(price)}
            </div>

            {/* Código de Barras (SVG Simplificado) */}
            <div className="flex flex-col items-center w-full">
                <svg width="120" height="30" viewBox="0 0 120 30">
                    {barcodeBars.map((bit, i) => (
                        bit === '1' && <rect key={i} x={i * 2} y="0" width="1.5" height="30" fill="black" />
                    ))}
                </svg>
                <span className="text-[8px] font-mono tracking-widest mt-0.5">{sku}</span>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    body * { visibility: hidden; }
                    .product-label-container, .product-label-container * { visibility: visible; }
                    .product-label-container { 
                        position: absolute; 
                        left: 0; 
                        top: 0; 
                        margin: 0;
                        padding: 0;
                        border: none !important;
                        page-break-after: always;
                    }
                    @page { size: auto; margin: 0; }
                }
            `}} />
        </div>
    );
};
