import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import { readFileSync, readdirSync } from "fs";
import { join, basename } from "path";

const packageJson = JSON.parse(readFileSync("./package.json", "utf-8"));
const version = packageJson.version;

// Get all standalone module files
const standaloneDir = "./src/standalone";
const standaloneModules = readdirSync(standaloneDir)
  .filter((file) => file.endsWith(".ts"))
  .map((file) => {
    const moduleName = basename(file, ".ts");
    // Convert kebab-case or camelCase to PascalCase for global name
    const globalName = moduleName
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join("");
    return {
      input: join(standaloneDir, file),
      output: {
        file: `dist/standalone/${moduleName}.min.js`,
        format: "iife",
        name: globalName,
        banner: `/*! dm-js-lib/${moduleName} v${version} */`
      }
    };
  });

// Main bundle configuration
const mainBundle = {
  input: "src/index.ts",
  output: {
    file: "dist/dm-js-lib.min.js",
    format: "iife",
    name: "DmJsLib",
    banner: `/*! dm-js-lib v${version} */`
  }
};

// Shared plugins
const plugins = [
  typescript({
    tsconfig: "./tsconfig.json"
  }),
  terser()
];

// Export array of configurations for multiple outputs
export default [
  {
    ...mainBundle,
    plugins
  },
  ...standaloneModules.map((config) => ({
    ...config,
    plugins
  }))
];

