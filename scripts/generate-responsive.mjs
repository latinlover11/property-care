import { readdir, stat, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = "src/images";
const OUT = "src/images/responsive";
const WIDTHS = [480, 800, 1200];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (full === OUT) continue;
      files.push(...(await walk(full)));
    } else {
      files.push(full);
    }
  }
  return files;
}

await mkdir(OUT, { recursive: true });

let count = 0;
let totalBytes = 0;

for (const file of await walk(ROOT)) {
  if (!file.endsWith(".webp")) continue;
  const meta = await sharp(file).metadata();
  const rel = path.relative(ROOT, file).replace(/\.webp$/, "").replaceAll("/", "_");
  for (const width of WIDTHS) {
    if (meta.width <= width) continue;
    const out = path.join(OUT, `${rel}-${width}.webp`);
    const buf = await sharp(file)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 70, effort: 6 })
      .toBuffer();
    await writeFile(out, buf);
    const saved = (await stat(file)).size - buf.length;
    totalBytes += Math.max(0, saved);
    count += 1;
    console.log(`${(buf.length / 1024).toFixed(0).padStart(4)} KB  ${path.relative(ROOT, out)}`);
  }
}

console.log(`\nGenerated ${count} responsive variants (${(totalBytes / 1024 / 1024).toFixed(2)} MB potential savings vs 1600px)`);
