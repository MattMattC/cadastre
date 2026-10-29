# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Cadastre Bis: mobile-first web app to search a French address, pick cadastral parcels on a map and annotate them (sanitation / network schematics), then save locally and export as PNG. Client-only, no backend. Data comes from free public French APIs (IGN Géoplateforme, API Carto / DGFiP) under Licence Ouverte 2.0, which requires source attribution on the map.

Language: UI strings, code comments, commit messages, `README.md`, `ANALYSE.md` and `.status.md` are in French. Keep it that way.

`ANALYSE.md` is the reference study (data sources, API URLs and limits, roadmap phases). `.status.md` is the side-project tracker read by the `sp` CLI; the `side-project-status` skill in `.claude/skills/` explains when to update it.

## Commands

```bash
npm install
npm run dev        # Vite dev server, host: true → "Network" URL for testing on a phone
npm run build      # tsc -b && vite build  (type errors fail the build)
npm run preview    # serve dist/
npx tsc -b         # type-check only
```

- `npm run lint` is declared but broken: eslint is not installed and there is no config. Rely on `tsc -b`.
- There is no test suite.
- TypeScript is `strict` with `noUnusedLocals` / `noUnusedParameters`: an unused import or variable breaks the build.

## Deployment

Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`. In production the app is served under `/cadastre/` (`base` in `vite.config.ts`), and `BrowserRouter` uses `import.meta.env.BASE_URL` as basename. The workflow copies `index.html` to `404.html` as SPA fallback. Never hardcode absolute `/...` URLs for assets or routes.

## Architecture

Two routes, two different map stacks. Do not mix them.

| Route | Page | Map engine | Purpose |
|---|---|---|---|
| `/` | `pages/MapPage.tsx` | Leaflet (`react-leaflet`), raster tiles | Address search, cadastre overlay, parcel selection |
| `/editor` | `pages/EditorPage.tsx` (lazy) | MapLibre GL + Konva canvas overlay | Annotation editor, save, PNG export |

### Flow from map to editor

1. `SearchBar` calls `services/geocoding.ts` (Géoplateforme completion, debounced) and `MapView` flies to the result.
2. A click on the map calls `services/cadastre.ts` → API Carto `parcelle` at point. `MapPage` keeps a multi-selection: clicking an already selected parcel removes it, clicking a parcel adjacent to the selection (bbox heuristic `boundsAreAdjacent`) adds it, anything else restarts the selection.
3. "Annoter" writes the parcels to `sessionStorage` (`setPendingParcelles`) and navigates to `/editor`. The editor reads either `?project=<id>` from `localStorage` or the pending parcels, and redirects to `/` if it has neither.

### Persistence (`store/projects.ts`)

Projects are a JSON array in `localStorage` under `cadastre-bis:projects`; pending parcels live in `sessionStorage`. `AnnotationProject.parcelle` (singular) is a legacy field: always read parcels through `projectParcelles()` and write `parcelles`.

### Editor internals

- `MapLibreEditorMap` owns the `maplibregl.Map`. The base is either the IGN Plan vector style or a raster ortho style; `setStyle` wipes layers, so the cadastre raster overlay and the parcel GeoJSON source/layers are re-added on every `style.load`. `preserveDrawingBuffer: true` is required for PNG export.
- `AnnotationCanvas` is a `react-konva` `Stage` laid over the map. Shapes are stored in geographic coordinates (`Shape.latlngs` / `latlng`) and re-projected on every render through `project` / `unproject` passed from `EditorPage` (wrappers around `map.project` / `map.unproject`). `EditorPage` bumps a `viewVersion` counter on map `move` to force that re-render.
- Terrain-scale annotations: each shape records `baseZoom` and `baseBearing` at creation. On render, size is multiplied by `2^(zoom - baseZoom)` and rotation offset by `baseBearing - bearing`. Any new shape type must set these two fields and apply `scaleFor` / `rotFor`, otherwise it will not follow zoom and rotation. Symbols and drawn shapes (line, pen, rect, ellipse) use the fixed `REF_ZOOM` instead of the current zoom, so shapes created at different zooms share the same terrain size and stroke width. Only text keeps the creation zoom.
- Undo is a stack of full `shapes` snapshots (`past`); every mutation must go through `commit()` in `EditorPage`.
- Touch: a tap fires `touchstart` then a ghost `mousedown`; `handleDown` ignores mouse events within 700 ms of a touch. Keep that guard when touching pointer handling.
- `symbols.ts` is the pictogram palette (kinds `svg` / `text` / `emoji`, grouped by `SymbolCategory`). `LegendPanel` (opened from `Toolbar`) renders it read-only; `EditorControls` is the floating tool palette.
- PNG export composites `map.getCanvas()` and `stage.toCanvas()` at 2x into one canvas and triggers a download.

### Coordinate conventions

Three orderings coexist; convert explicitly at boundaries:

- `Parcelle.rings` and anything GeoJSON / API Carto: `[lon, lat]`.
- `LatLng` type, `Shape`, `SavedView`, Leaflet: `[lat, lng]`.
- MapLibre (`project`, `jumpTo`, `fitBounds`): `[lng, lat]`.

### External endpoints

All URLs live in `src/config.ts` (geocoding, WMTS tiles, vector style, cadastre overlay) except API Carto in `services/cadastre.ts`. Do not use the deprecated `api-adresse.data.gouv.fr`. Public rate limits are roughly 10 req/s (completion) and 50 req/s (geocoding) per IP, hence the debounce and `AbortController` usage in fetch callers.
