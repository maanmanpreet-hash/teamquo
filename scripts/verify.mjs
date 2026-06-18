import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const binDir = path.join(projectRoot, "node_modules", ".bin");
const isWindows = process.platform === "win32";

function runNodeScript(scriptPath, args = []) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: projectRoot,
    stdio: "inherit",
    shell: false,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runBin(command, args = []) {
  const executable = isWindows ? `${command}.cmd` : command;
  const fullPath = path.join(binDir, executable);
  const result = isWindows
    ? spawnSync(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", fullPath, ...args], {
        cwd: projectRoot,
        stdio: "inherit",
        shell: false,
      })
    : spawnSync(fullPath, args, {
        cwd: projectRoot,
        stdio: "inherit",
        shell: false,
      });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runPatch() {
  runNodeScript(path.join(projectRoot, "scripts", "patch-quoteform-save-payload.mjs"));
}

function runCheck() {
  runPatch();
  runBin("tsc", ["--noEmit", "--incremental", "false"]);
}

function runTest() {
  runPatch();
  runBin("vitest", ["run", "--passWithNoTests"]);
}

function runBuild() {
  runPatch();
  runNodeScript(path.join(projectRoot, "scripts", "build.mjs"));
}

const mode = process.argv[2] || "all";

switch (mode) {
  case "check":
    runCheck();
    break;
  case "test":
    runTest();
    break;
  case "build":
    runBuild();
    break;
  case "all":
    runCheck();
    runTest();
    runBuild();
    break;
  default:
    console.error(`Unknown verify mode: ${mode}`);
    console.error("Use one of: check, test, build, all");
    process.exit(1);
}
