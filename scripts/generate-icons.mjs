/**
 * Generates PWA icons from scripts/icon-source.svg.
 * Run: node scripts/generate-icons.mjs  (devDependency: @resvg/resvg-js)
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";

const root = path.join(import.meta.dirname, "..");
const svg = readFileSync(path.join(root, "scripts", "icon-source.svg"), "utf8");

const maskable = svg
  .replace('width="512" height="512"', 'width="512" height="512"')
  .replace(
    /(<svg[^>]*>)([\s\S]*)(<\/svg>)/,
    (_m, open, inner, close) =>
      `${open}<rect width="512" height="512" fill="#05070f"/><g transform="translate(51.2 51.2) scale(0.8)">${inner}</g>${close}`,
  );

function render(source, size) {
  const resvg = new Resvg(source, { fitTo: { mode: "width", value: size } });
  return resvg.render().asPng();
}

mkdirSync(path.join(root, "public", "icons"), { recursive: true });

writeFileSync(path.join(root, "public", "icons", "icon-192.png"), render(svg, 192));
writeFileSync(path.join(root, "public", "icons", "icon-512.png"), render(svg, 512));
writeFileSync(path.join(root, "public", "icons", "maskable-512.png"), render(maskable, 512));
writeFileSync(path.join(root, "public", "icons", "apple-touch-icon.png"), render(svg, 180));

console.log("icons written to public/icons/");
