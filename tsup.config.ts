import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/*"],
  shims: false,
  splitting: true,
  target: "esnext",
  skipNodeModulesBundle: true,
  dts: true,
  bundle: true,
  sourcemap: true,
  keepNames: true,
  format: ["cjs", "esm"],
});
