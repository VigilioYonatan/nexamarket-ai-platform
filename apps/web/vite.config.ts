import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss(), preact()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:4000",
      "/auth": "http://127.0.0.1:4000",
      "/integrations": "http://127.0.0.1:4000",
      "/health": "http://127.0.0.1:4000",
      "/reference": "http://127.0.0.1:4000",
      "/openapi.json": "http://127.0.0.1:4000",
    },
  },
});

