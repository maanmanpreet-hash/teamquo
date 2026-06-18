import { build as buildVite } from "vite";
import { build as buildEsbuild } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

// Keep local builds sandbox-safe by calling the installed Node APIs directly
// instead of shelling through Windows .cmd shims.
process.env.BROWSERSLIST_IGNORE_OLD_DATA = process.env.BROWSERSLIST_IGNORE_OLD_DATA || "1";

async function main() {
  await buildVite({
    configFile: path.join(projectRoot, "vite.config.ts"),
  });

  await buildEsbuild({
    absWorkingDir: projectRoot,
    entryPoints: ["server/_core/index.ts"],
    outdir: "dist",
    bundle: true,
    format: "esm",
    platform: "node",
    packages: "external",
    logLevel: "info",
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
