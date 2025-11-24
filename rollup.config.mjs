import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";

export default {
  input: "src/index.ts",
  output: {
    file: "dist/dm-js-lib.min.js",
    format: "iife",
    name: "DmJsLib"
  },
  plugins: [
    typescript({
      tsconfig: "./tsconfig.json"
    }),
    terser()
  ]
};

