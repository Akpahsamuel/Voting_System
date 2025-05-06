import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
// https://vitejs.dev/config/
export default defineConfig(function (_a) {
    var mode = _a.mode;
    return ({
        server: {
            host: "::",
            port: 5173,
        },
        plugins: [
            react(),
            mode === "development" && componentTagger(),
        ].filter(Boolean),
        resolve: {
            alias: {
                "@": path.resolve(__dirname, "./src"),
                "@/components": path.resolve(__dirname, "./src/components"),
                "@/lib": path.resolve(__dirname, "./src/lib"),
                "@/hooks": path.resolve(__dirname, "./src/hooks"),
            },
        },
        build: {
            outDir: "dist",
            sourcemap: true,
            commonjsOptions: {
                transformMixedEsModules: true,
            },
        },
        optimizeDeps: {
            esbuildOptions: {
                target: "es2020",
            },
        },
        esbuild: {
            logOverride: { "this-is-undefined-in-esm": "silent" },
        },
    });
});
