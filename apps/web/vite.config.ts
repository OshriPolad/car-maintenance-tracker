import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Calls to /api go to the NestJS API during development (no CORS issues).
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});
