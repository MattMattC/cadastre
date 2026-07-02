import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// En production (GitHub Pages), l'app est servie sous /cadastre/.
export default defineConfig(({ mode }) => ({
  base: mode === "production" ? "/cadastre/" : "/",
  plugins: [react()],
  server: {
    host: true,
  },
}));
