import { execSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = dirname(__dirname);
const backendDir = join(root, "..", "distribuidora-backend");
const backendDist = join(backendDir, "dist");
const binariesDir = join(root, "src-tauri", "binaries");
const resourcesDir = join(root, "src-tauri", "resources");

mkdirSync(binariesDir, { recursive: true });

console.log("📦 Building backend...");
execSync("npm run package", { cwd: backendDir, stdio: "inherit" });

let targetTriple = "";
for (const flag of ["--print host-tuple", "--print target-triple"]) {
  try {
    targetTriple = execSync(`rustc ${flag}`, { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
    if (targetTriple) break;
  } catch {
    continue;
  }
}

if (!targetTriple) {
  const FALLBACK = {
    "darwin-arm64": "aarch64-apple-darwin",
    "darwin-x64": "x86_64-apple-darwin",
    "linux-x64": "x86_64-unknown-linux-gnu",
    "linux-arm64": "aarch64-unknown-linux-gnu",
    "win32-x64": "x86_64-pc-windows-msvc",
  };
  targetTriple = FALLBACK[`${process.platform}-${process.arch}`] ?? "";
  if (!targetTriple) {
    console.error("No se pudo detectar el target triple. Esta Rust instalado?");
    process.exit(1);
  }
  console.warn(`⚠️  rustc no encontrado; usando el triple derivado: ${targetTriple}`);
}

const ext = process.platform === "win32" ? ".exe" : "";
const srcBinary = join(backendDist, `distribuidora-backend${ext}`);
if (!existsSync(srcBinary)) {
  console.error(`No se encontro el binario en ${srcBinary}`);
  process.exit(1);
}

const dstBinary = join(binariesDir, `distribuidora-backend-${targetTriple}${ext}`);
copyFileSync(srcBinary, dstBinary);
console.log(`✅ Sidecar listo: ${dstBinary}`);

rmSync(resourcesDir, { recursive: true, force: true });
mkdirSync(resourcesDir, { recursive: true });

const wanted = readdirSync(backendDist).filter(
  (f) =>
    f.startsWith("libquery_engine-") ||
    f.startsWith("query_engine-") ||
    f === "schema.prisma" ||
    f === "distribuidora.db",
);

for (const file of wanted) {
  copyFileSync(join(backendDist, file), join(resourcesDir, file));
  console.log(`✅ Recurso: ${file}`);
}

if (!wanted.some((f) => f === "distribuidora.db")) {
  console.warn("⚠️  Falta la DB semilla. Corre `npx prisma db push` en el backend.");
}
if (!wanted.some((f) => f.includes("query_engine-"))) {
  console.warn("⚠️  Falta el engine de Prisma. Corre `npx prisma generate` en el backend.");
}
