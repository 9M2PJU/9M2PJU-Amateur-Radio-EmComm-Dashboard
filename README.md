# 9M2PJU Amateur Radio EmComm Dashboard

A Vite-powered emergency communications dashboard for amateur radio operators.

## Features

- Live operations map with stations, repeaters, facilities, and incidents.
- Net control check-in list.
- Editable station, callsign, net, incident, and message-number settings.
- Frequency and channel plan with active, standby, and canceled states.
- Message handling table with precedence, handling, delivery state, text, and operator tracking.
- Tasking board for field assignments.
- Station directory and readiness tracking.
- Operational log.
- Local browser storage, JSON import/export, and service worker caching.

## Emergency Communications Notes

The dashboard is designed around common IARU emergency telecommunications practices: clear net control identity, formal message numbering, precedence/handling state, traffic status tracking, resource readiness, and an auditable operational log.

This app supports operations; it does not replace your national society guidance, local served-agency SOPs, licensing requirements, or emergency manager instructions.

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
