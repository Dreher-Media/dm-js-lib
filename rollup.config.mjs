import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import { readFileSync } from "fs";

const packageJson = JSON.parse(readFileSync("./package.json", "utf-8"));
const version = packageJson.version;

export default {
  input: "src/index.ts",
  output: {
    file: "dist/dm-js-lib.min.js",
    format: "iife",
    name: "DmJsLib",
    banner: `/*! dm-js-lib v${version} */`
  },
  plugins: [
    typescript({
      tsconfig: "./tsconfig.json"
    }),
    terser()
  ]
};

