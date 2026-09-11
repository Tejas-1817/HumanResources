import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "/resumeiq/",
  server: {
    host: "::",
    port: 5174,
    proxy: {
      "/api/v1": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      base: "/resumeiq/",
      manifestFilename: "manifest.webmanifest",
      manifest: {
        name: "ResumeIQ — Altzor",
        short_name: "ResumeIQ",
        description: "Enterprise recruitment management platform with intelligent resume parsing",
        start_url: "/resumeiq/",
        scope: "/resumeiq/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#0f172a",
        icons: [
          {
            src: "/resumeiq/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/resumeiq/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
