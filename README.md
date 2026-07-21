# Niezbędnik biesiady — śpiewnik weselny

Responsywny śpiewnik weselny Eweliny i Macieja: spis treści z linkami, wyszukiwanie piosenek, okładka i pobieranie PDF. Gotowy do hostowania na **GitHub Pages** i udostępniania kodem QR.

## Lokalny podgląd

```bash
npm install
npm run serve
```

Otwórz adres podany w terminalu (zwykle `http://localhost:3000`).

## Aktualizacja treści z PDF

1. Podmień plik [`public/spiewnik.pdf`](public/spiewnik.pdf).
2. Uruchom:

```bash
npm run extract
```

3. Sprawdź [`data/songs.json`](data/songs.json) — przy układzie dwuszpaltowym czasem warto ręcznie poprawić pojedyncze linie.

## Publikacja na GitHub Pages

1. Utwórz repozytorium na GitHubie i wypchnij ten projekt na branch `main`.
2. W ustawieniach repo: **Settings → Pages → Build and deployment**.
3. Source: **Deploy from a branch** → branch `main` → folder `/ (root)`.
4. Po kilku minutach strona będzie pod adresem:

   `https://TWOJ-NICK.github.io/NAZWA-REPO/`

   (dla tego folderu np. `https://TWOJ-NICK.github.io/songbook/`)

Repo musi być **publiczne** (albo konto z GitHub Pro dla prywatnych Pages).

## Kod QR

Po opublikowaniu strony wygeneruj QR wskazujący na jej URL:

```bash
npm run qr -- https://TWOJ-NICK.github.io/songbook/
```

Powstanie [`assets/qr.png`](assets/qr.png) (podmienia przykładowy plik). Podgląd i wydruk: otwórz [`qr.html`](qr.html) na żywej stronie.

Wklej QR na stoły / zaproszenia — goście skanują i od razu mają śpiewnik w telefonie.

## Struktura

| Plik | Opis |
|------|------|
| `index.html` | Strona śpiewnika |
| `app.js` / `styles.css` | Wyszukiwanie i wygląd |
| `data/songs.json` | Tytuły i teksty |
| `assets/cover.png` | Okładka |
| `public/spiewnik.pdf` | PDF do pobrania |
| `scripts/extract-pdf.mjs` | Konwersja PDF → JSON |
| `scripts/generate-qr.mjs` | Generowanie QR |
