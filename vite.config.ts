import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { VitePWA } from "vite-plugin-pwa";

// GitHub Pages serves the app from /<repo-name>/. Override with BASE_PATH if hosting elsewhere.
const base = process.env.BASE_PATH ?? "/meal-tracker/";

export default defineConfig({
  base,
  plugins: [
    preact(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["apple-touch-icon.png"],
      manifest: {
        name: "Meal Tracker",
        short_name: "Meals",
        description: "Track calories and macros, adjusted for the calories you burn.",
        theme_color: "#16a34a",
        background_color: "#ffffff",
        display: "standalone",
        start_url: base,
        scope: base,
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
});
