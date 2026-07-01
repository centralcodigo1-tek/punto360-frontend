import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react()
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('qz-tray')) return 'qz-tray';
          // Recharts y D3 en su propio chunk — se cachean por separado
          if (id.includes('recharts') || id.includes('d3-') || id.includes('victory')) return 'charts';
          // React ecosystem
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) return 'react';
          // React Router
          if (id.includes('react-router')) return 'router';
          // Otras dependencias grandes
          if (id.includes('node_modules/axios') || id.includes('node_modules/lucide')) return 'vendor';
        },
      },
    },
  },
})
