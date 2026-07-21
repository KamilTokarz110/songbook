/**
 * Extracts text from public/spiewnik.pdf into data/songs.json
 * Landscape PDF = 2 columns per page; we split by X midpoint.
 * Run: npm run extract
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const pdfPath = path.join(root, "public", "spiewnik.pdf");
const outPath = path.join(root, "data", "songs.json");

function slugify(title) {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function fixSpacedCaps(t) {
  return t
    .replace(/\bZ\s+AGRAJ\b/i, "ZAGRAJ")
    .replace(/\bM\s+OIM\b/i, "MOIM")
    .replace(/\bK\s+ARETA\b/i, "KARETA")
    .replace(/\bL\s+IPKA\b/i, "LIPKA")
    .replace(/\s+/g, " ")
    .trim();
}

function upperRatio(text) {
  const letters = text.replace(/[^a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, "");
  if (!letters.length) return 0;
  const upper = letters.replace(/[^A-ZĄĆĘŁŃÓŚŹŻ]/g, "").length;
  return upper / letters.length;
}

/** "1. BIAŁY MIŚ" — song titles are numbered + mostly ALL CAPS */
function parseTitleLine(line) {
  const m = line.match(/^(\d{1,2})\.\s+(.+)$/);
  if (!m) return null;
  const num = parseInt(m[1], 10);
  if (num < 1 || num > 60) return null;
  let rest = fixSpacedCaps(m[2]);
  if (rest.length > 80) return null;
  if (upperRatio(rest) < 0.75) return null;
  return { num, titleRaw: rest };
}

function titleCaseFromCaps(raw) {
  return raw
    .toLowerCase()
    .split(" ")
    .map((w, i) => {
      if (!w) return w;
      if (i > 0 && /^(i|w|z|do|na|od|po|nad|pod|dla|już|nie|się|a|o|u)$/i.test(w)) {
        return w;
      }
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");
}

function isCapsContinuation(line) {
  const t = line.trim();
  if (!t || t.length > 70) return false;
  if (/^\d{1,2}\./.test(t)) return false;
  if (/^(Ref\.|x\d)/i.test(t)) return false;
  return upperRatio(t) >= 0.8;
}

function itemsToLines(items) {
  items.sort((a, b) => b.y - a.y || a.x - b.x);
  const lines = [];
  let currentY = null;
  let buf = [];
  const yTol = 3.5;

  for (const it of items) {
    if (currentY === null || Math.abs(it.y - currentY) <= yTol) {
      buf.push(it);
      if (currentY === null) currentY = it.y;
    } else {
      buf.sort((a, b) => a.x - b.x);
      lines.push(buf.map((b) => b.str).join(" ").replace(/\s+/g, " ").trim());
      buf = [it];
      currentY = it.y;
    }
  }
  if (buf.length) {
    buf.sort((a, b) => a.x - b.x);
    lines.push(buf.map((b) => b.str).join(" ").replace(/\s+/g, " ").trim());
  }
  return lines.filter(Boolean);
}

async function extractColumns(data) {
  const doc = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;
  const columns = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    const midX = viewport.width / 2;
    const content = await page.getTextContent();

    const items = content.items
      .filter((it) => it.str != null && String(it.str).trim() !== "")
      .map((it) => ({
        str: String(it.str),
        x: it.transform[4],
        y: it.transform[5],
      }));

    if (i === 1) {
      columns.push({ page: i, side: "toc", lines: itemsToLines(items) });
      continue;
    }

    columns.push({ page: i, side: "left", lines: itemsToLines(items.filter((it) => it.x < midX)) });
    columns.push({ page: i, side: "right", lines: itemsToLines(items.filter((it) => it.x >= midX)) });
  }
  return columns;
}

function parseToc(lines) {
  const byNum = new Map();
  for (const line of lines) {
    if (/spis treści/i.test(line)) continue;
    const m = line.match(/^(.+?)\s+(\d{1,2})$/);
    if (!m) continue;
    byNum.set(parseInt(m[2], 10), m[1].trim());
  }
  return byNum;
}

function columnsToSongs(columns) {
  const tocCol = columns.find((c) => c.side === "toc");
  const tocByNum = tocCol ? parseToc(tocCol.lines) : new Map();

  const body = columns.filter((c) => c.side !== "toc");
  /** @type {Map<number, {num:number,title:string,lyrics:string[]}>} */
  const byNum = new Map();
  let current = null;
  let expectingTitleCont = false;

  const ensure = (num, titleHint) => {
    if (!byNum.has(num)) {
      byNum.set(num, {
        num,
        title: tocByNum.get(num) || titleCaseFromCaps(titleHint || "") || `Piosenka ${num}`,
        lyrics: [],
      });
    }
    return byNum.get(num);
  };

  for (const col of body) {
    for (const raw of col.lines) {
      // Split glued titles without breaking "11." into "1." + "1."
      const parts = raw.split(/(?<=\S)(?<!\d)(?=\d{1,2}\.\s+[A-ZĄĆĘŁŃÓŚŹŻ])/);

      for (const part of parts) {
        const line = part.trim();
        if (!line) continue;

        const parsed = parseTitleLine(line);
        if (parsed) {
          current = ensure(parsed.num, parsed.titleRaw);
          expectingTitleCont = true;
          continue;
        }

        if (current && expectingTitleCont && isCapsContinuation(line)) {
          // Multi-line title leftover (e.g. ODSZEDŁ W SINĄ DAL) — skip as lyrics noise if already in TOC
          continue;
        }
        expectingTitleCont = false;

        if (current) current.lyrics.push(line);
      }
    }
  }

  const songs = [...byNum.values()]
    .sort((a, b) => a.num - b.num)
    .map((s) => ({
      id: slugify(s.title),
      title: s.title,
      num: s.num,
      lyrics: s.lyrics
        .join("\n")
        .replace(/(^|\n)l (prawą|lewą)/g, "$1I $2")
        .replace(/\bJ ak\b/g, "Jak")
        .replace(/\bP ukają\b/g, "Pukają")
        .replace(/\s+\n/g, "\n")
        .trim(),
    }));

  // Deduplicate ids
  const seen = new Map();
  for (const s of songs) {
    const base = s.id || "piosenka";
    const n = (seen.get(base) || 0) + 1;
    seen.set(base, n);
    if (n > 1) s.id = `${base}-${n}`;
  }
  return songs;
}

async function main() {
  if (!fs.existsSync(pdfPath)) {
    console.error("Missing PDF:", pdfPath);
    process.exit(1);
  }
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  console.log("Reading", pdfPath);
  const columns = await extractColumns(data);

  const dumpPath = path.join(root, "data", "_raw-pages.json");
  fs.writeFileSync(dumpPath, JSON.stringify(columns, null, 2), "utf8");

  const songs = columnsToSongs(columns);
  fs.writeFileSync(outPath, JSON.stringify(songs, null, 2), "utf8");
  console.log(`Extracted ${songs.length} songs →`, outPath);
  songs.forEach((s) =>
    console.log(`  ${String(s.num).padStart(2)}. ${s.title} (${s.lyrics.length} chars)`)
  );

  const missing = [];
  for (let i = 1; i <= 53; i++) {
    if (!songs.find((s) => s.num === i)) missing.push(i);
  }
  if (missing.length) console.log("Missing numbers:", missing.join(", "));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
