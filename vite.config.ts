import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        reader: resolve(__dirname, "src/webview/reader.html"),
        upload: resolve(__dirname, "src/webview/upload.html"),
      },
      output: {
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: (assetInfo) => {
          // HTML 文件输出到 dist 根目录
          if (assetInfo.name && assetInfo.name.endsWith(".html")) {
            return "[name][extname]";
          }
          return "assets/[name].[ext]";
        },
      },
    },
    cssCodeSplit: false,
    sourcemap: false,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  css: {
    modules: {
      localsConvention: "camelCase",
    },
  },
});
