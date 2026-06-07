export function stripAccents(s: string): string {
    return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Genera el SKU corto de una variante a partir del SKU base del producto
 * y los valores de los atributos (color, talla, etc.).
 *
 * Ejemplos:
 *   baseSku = "F87452D7-MAIN-0002", combo = ["NEGRO", "35"]  → "F872NEGR35"
 *   baseSku = "F87452D7-MAIN-0002", combo = ["BEIGE", "38"]  → "F872BEIG38"
 */
export function buildShortVariantSku(baseSku: string, comboValues: string[]): string {
    const baseparts = baseSku.split("-");
    const prefix    = stripAccents(baseparts[0]).replace(/[^A-Z0-9]/gi, "").slice(0, 3).toUpperCase();
    const seq       = parseInt(baseparts[baseparts.length - 1], 10) || 1;

    const parts = comboValues.map(v => stripAccents(v).replace(/[^A-Z0-9]/gi, "").toUpperCase());

    if (parts.length === 1) {
        return `${prefix}${seq}${parts[0].slice(0, 6)}`;
    }
    // Siempre incluir el último atributo (talla) completo, y dar el resto al color
    const lastPart  = parts[parts.length - 1].slice(0, 3);       // ej. "35", "40"
    const colorPart = parts.slice(0, -1).join("").slice(0, 8 - lastPart.length); // ej. "VAININ"
    return `${prefix}${seq}${colorPart}${lastPart}`;
}

/**
 * Convierte un SKU largo de variante al SKU corto imprimible.
 * Útil para migrar o mostrar variantes existentes.
 */
export function shortVariantCode(baseSku: string, variantSku: string): string {
    if (!variantSku.startsWith(baseSku + "-")) {
        // SKU ya está en formato corto — limpiar y devolver sin truncar
        return stripAccents(variantSku).replace(/[^A-Z0-9]/gi, "").toUpperCase();
    }
    const suffix      = stripAccents(variantSku.slice(baseSku.length + 1));
    const baseparts   = baseSku.split("-");
    const prefix      = baseparts[0].slice(0, 3).toUpperCase();
    const seq         = parseInt(baseparts[baseparts.length - 1], 10) || 1;
    const suffixParts = suffix.split("-").filter(Boolean);
    const colorAbbr   = (suffixParts[0] || "").slice(0, 4).toUpperCase();
    const size        = (suffixParts[suffixParts.length - 1] || "").slice(0, 3).toUpperCase();
    return `${prefix}${seq}${colorAbbr}${size}`;
}
