# 9M2PJU Amateur Radio EmComm Dashboard

A Vite-powered emergency communications dashboard for amateur radio operators.

## Features

- Live operations map with stations, repeaters, facilities, and incidents.
- Net control check-in list.
- Frequency and channel plan.
- Message handling table with priority and delivery state.
- Tasking board for field assignments.
- Station directory and readiness tracking.
- Operational log.
- Local browser storage, JSON import/export, and service worker caching.

## Development

```sh
npm install
npm run dev
```

## Build

```sh
npm run build
npm run preview
```

## GitHub Pages

Vite builds the site into `dist/`. To publish with GitHub Pages:

1. Push the repository to GitHub.
2. Open repository **Settings**.
3. Go to **Pages**.
4. Set source to **GitHub Actions**.
5. Add a Pages workflow that runs `npm ci`, `npm run build`, and uploads `dist/`.
6. Save.

The site will be available at:

`https://9m2pju.github.io/9M2PJU-Amateur-Radio-EmComm-Dashboard/`

## Notes

The dashboard uses Leaflet and OpenStreetMap tiles. The app shell and entered data work offline after first load, while new map tiles require network access unless already cached by the browser.
