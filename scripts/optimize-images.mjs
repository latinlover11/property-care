import { readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = "src/images";
const MAX_WIDTH = 1600;
const QUALITY = 70;

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else files.push(full);
  }
  return files;
}

let totalSaved = 0;
let count = 0;

for (const file of await walk(ROOT)) {
  if (!file.endsWith(".webp")) continue;

  const before = (await stat(file)).size;
  const meta = await sharp(file).metadata();
  let pipeline = sharp(file);
  if (meta.width > MAX_WIDTH) {
    pipeline = pipeline.resize({ width: MAX_WIDTH });
  }
  await pipeline.webp({ quality: QUALITY, effort: 6 }).toBuffer().then((buf) => writeFile(file, buf));
  const after = (await stat(file)).size;
  const saved = before - after;
  totalSaved += saved;
  count += 1;
  console.log(`${(saved / 1024).toFixed(0).padStart(5)} KB  ${file} (${(before / 1024) | 0} -> ${(after / 1024) | 0} KB)`);
}

console.log(`\nOptimized ${count} images, saved ${(totalSaved / 1024 / 1024).toFixed(2)} MB`);