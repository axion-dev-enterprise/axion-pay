import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const workspaceRoot = path.resolve(process.cwd(), "..");
const buildDir = path.join(workspaceRoot, "build");
const zipPath = path.join(workspaceRoot, "build.zip");

async function copySources() {
  await fs.rm(buildDir, { recursive: true, force: true });
  await fs.cp(process.cwd(), buildDir, {
    recursive: true,
    filter: (src) => {
      if (!src) return true;
      const relative = path.relative(process.cwd(), src);
      return relative === "" || !relative.startsWith("build");
    }
  });
}

function createZip() {
  if (fs.stat) {
  }
  spawnSync("tar", ["-a", "-c", "-f", zipPath, "-C", buildDir, "."], {
    stdio: "inherit",
    shell: true
  });
}

async function main() {
  await copySources();
  createZip();
}

main().catch((err) => {
  console.error("Build script failed:", err);
  process.exit(1);
});
