/**
 * Generates assets/qr.png for the published GitHub Pages URL.
 * Usage: npm run qr -- https://USERNAME.github.io/songbook/
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outPath = path.join(root, "assets", "qr.png");

const url = process.argv[2];
if (!url || !/^https?:\/\//i.test(url)) {
  console.error("Podaj URL strony, np.:");
  console.error("  npm run qr -- https://twoj-nick.github.io/songbook/");
  process.exit(1);
}

await QRCode.toFile(outPath, url, {
  width: 512,
  margin: 2,
  color: { dark: "#1a1a1a", light: "#ffffff" },
});

console.log(`QR → ${outPath}`);
console.log(`URL: ${url}`);
