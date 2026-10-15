import { fileURLToPath } from "node:url"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // fileURLToPath, not URL.pathname — the project path contains spaces.
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    // jsPDF and html2canvas are dynamically imported, so Vite splits them
    // into their own chunk automatically - no manual chunking needed.
    chunkSizeWarningLimit: 900,
  },
})
