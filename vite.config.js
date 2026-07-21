import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  root: path.resolve(__dirname, "webapp"),
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
    assetsDir: "assets",
    sourcemap: false
  },
  server: {
    port: 5173
  },
  plugins: [react()],
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "webapp", "src")
    }
  }
});
