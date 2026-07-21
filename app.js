const tocList = document.getElementById("toc-list");
const songsEl = document.getElementById("songs");
const searchInput = document.getElementById("search");
const resultCount = document.getElementById("result-count");
const tocEmpty = document.getElementById("toc-empty");
const backTop = document.querySelector(".back-top");

function normalize(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l");
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Split lyrics into verse blocks (1. / 2. / Ref. …) for readable spacing */
function formatLyrics(lyrics) {
  const lines = lyrics.split("\n");
  const blocks = [];
  let buf = [];

  const isVerseStart = (line) =>
    /^(?:\d{1,2}\.|Ref\.|Refren)/i.test(line.trim());

  for (const line of lines) {
    if (buf.length && isVerseStart(line)) {
      blocks.push(buf.join("\n"));
      buf = [line];
    } else {
      buf.push(line);
    }
  }
  if (buf.length) blocks.push(buf.join("\n"));

  return blocks
    .map((block) => `<p class="song__verse">${escapeHtml(block)}</p>`)
    .join("");
}

function render(songs) {
  tocList.innerHTML = songs
    .map(
      (s) => `
      <li data-id="${escapeHtml(s.id)}" data-search="${escapeHtml(normalize(s.title + " " + s.num))}">
        <a href="#${escapeHtml(s.id)}">
          <span class="toc__num">${s.num}.</span>
          <span>${escapeHtml(s.title)}</span>
        </a>
      </li>`
    )
    .join("");

  songsEl.innerHTML = songs
    .map(
      (s) => `
      <article class="song" id="${escapeHtml(s.id)}" data-id="${escapeHtml(s.id)}" data-search="${escapeHtml(normalize(s.title + " " + s.lyrics + " " + s.num))}">
        <header class="song__header">
          <span class="song__num">${s.num}.</span>
          <h2 class="song__title">${escapeHtml(s.title)}</h2>
        </header>
        <div class="song__lyrics">${formatLyrics(s.lyrics)}</div>
        <a class="song__back" href="#spis">↑ Spis treści</a>
      </article>`
    )
    .join("");
}

function applyFilter(query) {
  const q = normalize(query.trim());
  const tocItems = [...tocList.querySelectorAll("li")];
  const songItems = [...songsEl.querySelectorAll(".song")];
  let visible = 0;

  for (const song of songItems) {
    const match = !q || song.dataset.search.includes(q);
    song.hidden = !match;
    const toc = tocList.querySelector(`li[data-id="${song.dataset.id}"]`);
    if (toc) toc.hidden = !match;
    if (match) visible += 1;
  }

  tocEmpty.hidden = visible > 0;
  resultCount.textContent = q
    ? `Znaleziono ${visible} z ${songItems.length}`
    : `${songItems.length} piosenek`;
}

let searchTimer;
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => applyFilter(searchInput.value), 80);
});

window.addEventListener(
  "scroll",
  () => {
    backTop.classList.toggle("is-visible", window.scrollY > 480);
  },
  { passive: true }
);

try {
  const res = await fetch("data/songs.json");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const songs = await res.json();
  render(songs);
  applyFilter("");
} catch (err) {
  tocList.innerHTML = "";
  songsEl.innerHTML = `<p class="empty">Nie udało się wczytać śpiewnika (${escapeHtml(String(err.message))}).</p>`;
  console.error(err);
}
