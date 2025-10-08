import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: false,
  sourcemap: true,
  clean: true,
  minify: false,
  splitting: false,
  shims: true,
  banner: {
    js: "#!/usr/bin/env node",
  },
});
