# Cadastre Bis

Application web (mobile-first) de visualisation du cadastre français : recherche d'adresse avec autocomplétion, carte interactive et superposition des parcelles cadastrales.

Voir [`ANALYSE.md`](./ANALYSE.md) pour l'étude complète des sources de données et la feuille de route.

## Stack

- **Vite** + **React** + **TypeScript**
- **Leaflet** / **react-leaflet** pour la carte
- **API Géoplateforme (IGN)** pour l'autocomplétion d'adresses
- **WMTS IGN / DGFiP** pour les fonds de carte et l'overlay cadastre

## Démarrer

```bash
npm install
npm run dev      # serveur de dev (http://localhost:5173)
npm run build    # build de production (tsc + vite)
npm run preview  # prévisualiser le build
```

> Pour tester sur mobile, ouvrez l'URL « Network » affichée par `npm run dev` depuis un appareil du même réseau Wi-Fi.

## Fonctionnalités (phase 1 — MVP)

- [x] Recherche d'adresse avec autocomplétion (Géoplateforme)
- [x] Carte responsive avec gestes tactiles
- [x] Fonds de carte : OpenStreetMap, IGN Plan, IGN Photo aérienne
- [x] Overlay cadastre (Parcellaire Express)
- [x] Zoom automatique + marqueur sur l'adresse sélectionnée

## À venir

- Sélection vectorielle d'un bâtiment / parcelle (GeoJSON Etalab)
- Annotations (schémas, icônes, flèches)
- Capture d'écran et export PDF
- Sauvegarde locale (enregistrer / éditer / supprimer)

## Données & licence

Données cadastrales et adresses : **IGN / DGFiP**, sous **Licence Ouverte 2.0**.
La mention de la source est affichée sur la carte (attributions Leaflet).
