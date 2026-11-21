import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base so the site works at any path, such as GitHub Pages' /<repo>/.
export default defineConfig({
  base: "./",
  plugins: [react()],
});
