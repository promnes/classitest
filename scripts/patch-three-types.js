#!/usr/bin/env node
/**
 * patch-three-types.js
 *
 * @types/three 0.183+ has an `exports` map in package.json that is missing
 * the "types" condition. With moduleResolution:"bundler", TypeScript follows
 * the "import" condition to build/three.module.js → build/three.module.d.ts
 * → re-exports from "../src/Three.js", but that .js file doesn't exist
 * (only .d.ts does), breaking the entire type resolution chain.
 *
 * This script adds "types": "./index.d.ts" as the FIRST condition in the
 * exports "." entry, which is the standard fix:
 * https://www.typescriptlang.org/docs/handbook/esm-node.html
 *
 * Run automatically via npm postinstall.
 */

const fs = require("fs");
const path = require("path");

const pkgPath = path.resolve(
  __dirname,
  "..",
  "node_modules",
  "@types",
  "three",
  "package.json"
);

if (!fs.existsSync(pkgPath)) {
  console.log("[patch-three-types] @types/three not found, skipping.");
  process.exit(0);
}

try {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

  if (!pkg.exports || !pkg.exports["."]) {
    console.log("[patch-three-types] No exports map found, skipping.");
    process.exit(0);
  }

  const dot = pkg.exports["."];

  // Already patched
  if (typeof dot === "object" && dot.types) {
    console.log("[patch-three-types] Already patched, skipping.");
    process.exit(0);
  }

  // Rebuild the "." entry with "types" first (order matters)
  if (typeof dot === "object") {
    const { import: imp, require: req, ...rest } = dot;
    pkg.exports["."] = { types: "./index.d.ts", ...rest };
    if (imp) pkg.exports["."]["import"] = imp;
    if (req) pkg.exports["."]["require"] = req;
  }

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 4) + "\n", "utf-8");
  console.log("[patch-three-types] ✓ Patched @types/three exports map.");
} catch (err) {
  console.error("[patch-three-types] Error:", err.message);
  process.exit(1);
}
