import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const vault = path.resolve(__dirname, "../..");
const outDir = path.resolve(__dirname, "../src/generated");
const TOP = [
  "Company","Divisions","Products","Surfaces","Infra","Clients",
  "Real World","Strategy","Projects","Templates","Ops","Dashboard",
];
const SKIP = new Set([".git",".obsidian",".incoming","node_modules","viewer","__pycache__","dist"]);

function parseFM(raw) {
  if (!raw.startsWith("---")) return { fm: {}, body: raw };
  const end = raw.indexOf("\n---", 3);
  if (end < 0) return { fm: {}, body: raw };
  const yaml = raw.slice(4, end);
  const body = raw.slice(end + 4).replace(/^\n/, "");
  const fm = {};
  for (const line of yaml.split("\n")) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (m) fm[m[1]] = m[2].trim();
  }
  return { fm, body };
}

function h1(body, fallback) {
  const m = body.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : fallback;
}

const files = [];
function addFile(abs, rel) {
  const raw = fs.readFileSync(abs, "utf8");
  const st = fs.statSync(abs);
  const { fm, body } = parseFM(raw);
  files.push({
    path: rel.replaceAll("\\", "/"),
    title: h1(body, path.basename(rel, ".md")),
    doc: fm.doc || "",
    status: fm.status || "",
    updated: fm.updated || st.mtime.toISOString().slice(0, 10),
    body,
  });
}
function walk(dir, rel) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    if (SKIP.has(name) || name.startsWith(".")) continue;
    const abs = path.join(dir, name);
    const child = rel ? `${rel}/${name}` : name;
    const st = fs.statSync(abs);
    if (st.isDirectory()) walk(abs, child);
    else if (name.endsWith(".md")) addFile(abs, child);
  }
}
for (const name of fs.readdirSync(vault)) {
  if (name.endsWith(".md")) addFile(path.join(vault, name), name);
}
for (const top of TOP) walk(path.join(vault, top), top);
files.sort((a, b) => a.path.localeCompare(b.path));
const folders = TOP.map((name) => ({
  name,
  count: files.filter((f) => f.path === name || f.path.startsWith(name + "/")).length,
})).filter((f) => f.count > 0);
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "vault.json"), JSON.stringify({ generatedAt: new Date().toISOString(), folders, files }, null, 2));
console.log(`indexed ${files.length} docs`);
