import { readFileSync, writeFileSync } from "node:fs";

const indexPath = new URL("../dist/index.html", import.meta.url);
const html = readFileSync(indexPath, "utf8");

const scriptModulePattern =
  /<script type="module" crossorigin src="(\.\/assets\/[^"]+\.js)"><\/script>/;
const stylesheetPattern =
  /<link rel="stylesheet" crossorigin href="(\.\/assets\/[^"]+\.css)">/;

if (!scriptModulePattern.test(html)) {
  throw new Error("Expected Vite module script tag was not found in dist/index.html.");
}

const staticHtml = html
  .replace(scriptModulePattern, '<script defer src="$1"></script>')
  .replace(stylesheetPattern, '<link rel="stylesheet" href="$1">');

writeFileSync(indexPath, staticHtml);
