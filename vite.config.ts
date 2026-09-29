import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: Number(process.env.PORTAL_WEB_PORT || 5173),
    strictPort: true,
    proxy: {
      "/graphql": process.env.PORTAL_API_ORIGIN || "http://localhost:4000",
      "/download": process.env.PORTAL_API_ORIGIN || "http://localhost:4000",
    },
  },
});
