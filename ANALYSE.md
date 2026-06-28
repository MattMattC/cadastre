# Analyse — Application web cadastre France

Document de référence pour le projet **cadastre-bis**. Analyse des possibilités, sources de données, limites et stack recommandée.

**Date** : juin 2026

---

## Objectif du projet

Application **web responsive** (pas une app native) permettant :

1. Rechercher une adresse en France avec **autocomplétion** (ex. « marteau » → « Marteau dans le 27 »)
2. Afficher l’emplacement sur une carte (OSM ou alternative gratuite)
3. Voir le **cadastre** avec les **formes des bâtiments** (données récentes)
4. **Sélectionner** un logement / bâtiment / parcelle
5. **Capturer** une zone de la carte et y ajouter des **annotations** (schémas, icônes, flèches)
6. *(Plus tard)* Enregistrer, supprimer, éditer, exporter en PDF

---

## Verdict global

| Besoin | Faisable ? | Difficulté | Coût |
|--------|-----------|------------|------|
| Recherche d’adresse avec autocomplétion | ✅ Oui | Faible | Gratuit |
| Carte (OSM ou alternative) | ✅ Oui | Faible | Gratuit |
| Affichage cadastre (parcelles, bâtiments) | ✅ Oui | Moyenne | Gratuit |
| Sélection d’un bâtiment / parcelle | ✅ Oui | Moyenne | Gratuit |
| Capture + annotations (schémas, icônes) | ✅ Oui | Moyenne–élevée | Gratuit |
| Mobile web responsive | ✅ Oui | Faible–moyenne | Gratuit |
| Sauvegarde / édition / export PDF (plus tard) | ✅ Oui | Moyenne | Gratuit (client) ou infra si cloud |

**Conclusion** : le projet est **entièrement faisable** avec des données et APIs publiques françaises, en grande partie **gratuites** et **légales** (Licence Ouverte 2.0).

---

## 1. Recherche d’adresse & autocomplétion

### Besoin

Taper « marteau » et obtenir des suggestions comme « Marteau dans le 27 » (Eure).

### Solution recommandée : Géoplateforme IGN

Services publics gratuits. **Ne pas utiliser** l’ancienne API `api-adresse.data.gouv.fr` (dépréciée, fin janvier 2026).

| Service | URL | Usage |
|---------|-----|-------|
| **Autocomplétion** | `https://data.geopf.fr/geocodage/completion/` | Suggestions pendant la saisie |
| **Géocodage** | `https://data.geopf.fr/geocodage/search` | Coordonnées lat/lon d’une adresse |
| **Géocodage inverse** | `https://data.geopf.fr/geocodage/reverse` | Adresse depuis lat/lon |

### Exemple — autocomplétion « marteau » dans l’Eure (27)

```
https://data.geopf.fr/geocodage/completion/?text=marteau&depcode=27&type=StreetAddress&maximumResponses=10
```

### Paramètres utiles

| Paramètre | Description |
|-----------|-------------|
| `text` | Texte à compléter (obligatoire) |
| `depcode` | Filtre par code département (ex. `27`) |
| `zipcode` | Filtre par code postal |
| `citycode` | Filtre par code INSEE |
| `lonlat` | Coordonnées pour favoriser les résultats proches |
| `type` | `StreetAddress`, `PositionOfInterest` |
| `maximumResponses` | Nombre max de suggestions (1–15) |

### Limites d’usage

- Autocomplétion : ~**10 requêtes/seconde** par IP
- Géocodage : ~**50 requêtes/seconde** par IP

### Alternatives (non recommandées pour ce projet)

| Service | Avantages | Inconvénients |
|---------|-----------|---------------|
| Google Places | Très bon | Payant, propriétaire |
| Mapbox Geocoding | Bon | Payant au-delà du quota gratuit |

### Fraîcheur des adresses

- BAN mise à jour **2× par semaine** via le service de géocodage Géoplateforme.

---

## 2. Carte de base (OSM & alternatives gratuites)

**Leaflet** est le choix standard pour une web app mobile-friendly.

| Fond de carte | Gratuit | Qualité | Note |
|---------------|---------|---------|------|
| **OpenStreetMap** | ✅ | Bon | Classique, libre |
| **IGN Plan V2** (Géoplateforme WMTS) | ✅ | Très bon | Officiel France |
| **OpenTopoMap** | ✅ | Bon | Relief |
| **CartoDB Positron** | ✅ (quota) | Bon | Style clair |

Combo recommandé : **OSM + couche cadastre IGN** en overlay.

### Extension IGN officielle

- [geoportal-extensions pour Leaflet](https://github.com/IGNF/geoportal-extensions) — widgets géocodage, couches WMTS/WMS, libre accès.

---

## 3. Cadastre & formes des bâtiments

Trois niveaux de données, avec des objectifs différents.

### A. Tuiles raster cadastre (affichage rapide)

**WMTS IGN** — couche `CADASTRALPARCELS.PARCELLAIRE_EXPRESS`

```
https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0
&LAYER=CADASTRALPARCELS.PARCELLAIRE_EXPRESS&STYLE=normal&FORMAT=image/png
&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}
```

| ✅ Avantages | ❌ Limites |
|------------|-----------|
| Affichage fluide, zoom/pan | Pas de sélection vectorielle native |
| Gratuit, sans clé API | Bâtiments = image, pas de géométrie cliquable |
| Mise à jour ~tous les 3 mois | Pas d’annotations sur les polygones |

→ Idéal pour **visualisation**, pas pour **sélection précise** d’un bâtiment.

### B. Données vectorielles GeoJSON (sélection & annotations)

**Source** : [cadastre.data.gouv.fr](https://cadastre.data.gouv.fr) — dataset **Cadastre Etalab**

| Couche | Contenu | Format |
|--------|---------|--------|
| `parcelles` | Polygones parcelles | GeoJSON |
| `batiments` | **Polygones bâtiments** | GeoJSON |
| `sections` | Sections cadastrales | GeoJSON |
| `communes` | Limites communes | GeoJSON |
| `feuilles` | Feuilles PCI | GeoJSON |
| `lieux_dits` | Lieux-dits | GeoJSON |

**URL par commune** (pattern) :

```
https://cadastre.data.gouv.fr/data/etalab-cadastre/latest/geojson/communes/{dept}/{insee}/cadastre-{insee}-{couche}.json.gz
```

Exemple bâtiments, commune 27001 (Eure) :

```
https://cadastre.data.gouv.fr/data/etalab-cadastre/latest/geojson/communes/27/27001/cadastre-27001-batiments.json.gz
```

Remplacer la date du millésime par `latest` pour la version la plus récente.

| ✅ Avantages | ❌ Limites |
|------------|-----------|
| Géométries exactes des bâtiments | Chargement par commune (lazy load recommandé) |
| Clic → sélection → highlight | Fichiers compressés (quelques KB à MB) |
| Licence Ouverte 2.0 | Pas temps réel : millésime trimestriel |

### C. API Carto IGN (requêtes dynamiques)

**Base** : `https://apicarto.ign.fr/api/cadastre/`

| Endpoint | Usage |
|----------|-------|
| `/parcelle` | Parcelles par commune ou intersection géométrique |
| `/commune` | Limites commune |
| `/section` | Sections cadastrales |
| `/feuille` | Feuilles PCI Express |
| `/localisant` | Centroïde parcelle / commune |

- Retour **GeoJSON**, projection **WGS84**
- **Sans clé API**
- Produit recommandé : **Parcellaire Express (PCI)** — pas la BD Parcellaire historique (non mise à jour)

→ Bon pour charger à la demande les parcelles autour d’un point cliqué.

### Fraîcheur des données

| Source | Fréquence | Dernier millésime connu |
|--------|-----------|-------------------------|
| PCI (source DGFiP) | **Tous les 3 mois** | 1er mars 2026 (publié avril 2026) |
| Cadastre Etalab (GeoJSON) | Suit le PCI | `latest` = mars 2026 |
| Parcellaire Express (WMTS) | Tous les 3 mois | Aligné PCI |
| BAN (adresses) | 2× par semaine | Très récent |
| RNB (Référentiel National des Bâtiments) | Continu | Complémentaire |

**Couverture** : depuis septembre 2025, le **PCI Vecteur couvre toute la France** métropolitaine. **Strasbourg** = dataset séparé (Eurométropole de Strasbourg).

### Nuance importante — « formes des bâtiments »

Le cadastre PCI représente les **empreintes cadastrales** des bâtiments (plan fiscal), pas toujours l’empreinte architecturale exacte.

| Source | Ce que c’est | Utilité |
|--------|--------------|---------|
| **Cadastre Etalab `batiments`** | Empreinte cadastrale | ✅ Cas d’usage principal |
| **RNB** | Référentiel national des bâtiments | Complément / validation |
| **BD TOPO IGN** | Empreinte topographique | Plus précise en zone urbaine |

API RNB (OGC Features) : `https://rnb-api.beta.gouv.fr/api/alpha/ogc/`

Pour « voir la forme du bâtiment sur le plan cadastral », le dataset Etalab `batiments` est le bon choix.

---

## 4. Sélection d’un logement / bâtiment

### Workflow recommandé

```
Saisie adresse
    → Géocodage (lat/lon + code INSEE)
    → Zoom carte sur le point
    → Charger GeoJSON commune (batiments + parcelles)
    → Afficher couches vectorielles
    → Clic sur bâtiment
    → Highlight + infos parcelle
    → Mode annotation (phase 2)
```

### Implémentation technique

1. Géocoder l’adresse → lat/lon + code INSEE
2. Charger `cadastre-{insee}-batiments.json.gz` + `parcelles.json.gz`
3. Afficher en couches Leaflet (`L.geoJSON`)
4. `onClick` → highlight du polygone + affichage section / parcelle / n°
5. Option : API Carto `/parcelle` au point cliqué si pas de GeoJSON préchargé

---

## 5. Capture d’écran & annotations

### Capture

Plugins Leaflet utiles :

| Plugin | Note |
|--------|------|
| `leaflet-simple-map-screenshoter` | dom-to-image, bouton capture, promesse |
| `leaflet-image` | Canvas — **ne rasterise pas le HTML** (pas les contrôles Leaflet) |
| `html2canvas` | Capture de la zone visible incluant overlays |

### Annotations (schémas, icônes, flèches)

| Outil | Usage |
|-------|-------|
| **Leaflet.draw** | Dessin simple sur la carte |
| **Fabric.js** ou **Konva.js** | Canvas overlay pour annotations riches |
| Workflow | Sélectionner zone → mode annotation → export image |

### Limites mobile

| ✅ Faisable | ⚠️ Attention |
|------------|--------------|
| Flèches, cercles, texte, icônes | Mémoire limitée pour captures haute résolution |
| Export PNG/JPEG côté client | Safari plus capricieux |
| Superposition sur la carte | Préférer Chrome/Firefox sur desktop pour gros exports |

### Export PDF (futur)

- `jsPDF` + image capturée → **100 % faisable côté client**
- Alternative avancée : `Leaflet.ImagePdf` (multipage, formats A0–A10)

---

## 6. Mobile web (pas app native)

Leaflet gère bien le tactile (pinch zoom, drag).

| Aspect | Solution |
|--------|----------|
| Responsive | CSS `100vh`, `touch-action` |
| Autocomplétion | Input avec debounce (~300 ms) |
| Gestes carte | Leaflet natif |
| Performance | Lazy load GeoJSON par commune |
| PWA (optionnel) | `vite-plugin-pwa` pour installable + cache |

Pas besoin de React Native ou Flutter — une **PWA** suffit pour une expérience quasi-native.

---

## 7. Fonctionnalités futures

| Fonction | Sans backend | Avec backend |
|----------|--------------|--------------|
| Sauvegarder localement | ✅ localStorage / IndexedDB | ✅ DB + API |
| Éditer annotations | ✅ État canvas en JSON | ✅ Sync cloud |
| Supprimer | ✅ | ✅ |
| Export PDF | ✅ jsPDF client | ✅ |
| Partage / multi-utilisateur | ❌ | ✅ Auth + API |

Pour un MVP solo, tout peut rester **côté client**. Un backend devient utile pour partage, comptes, historique.

---

## 8. Limitations & ce qui est difficile

| Limitation | Détail |
|------------|--------|
| **Strasbourg** | Dataset séparé (Eurométropole), pas le PCI national |
| **Précision architecturale** | Cadastre ≠ plan de masse exact |
| **Temps réel** | Données trimestrielles, pas live |
| **Rate limits** | APIs publiques limitées (10–50 req/s) |
| **Offline complet** | Nécessite pré-téléchargement par commune |
| **Licence** | Licence Ouverte 2.0 : **mention de la source obligatoire** (IGN, DGFiP, date millésime) |
| **Habillage cadastral** | Numéros de parcelle sur tuiles raster = OK ; redistribution massive de tuiles = attention |

---

## 9. Licence & obligations légales

Les données cadastre (Etalab, PCI, Géoplateforme) sont sous **Licence Ouverte 2.0** :

- Réutilisation libre, gratuite, commerciale ou non
- **Obligation** : mentionner la source (IGN, DGFiP, cadastre.data.gouv.fr) et la date du millésime
- Ne pas induire en erreur sur l’origine ou le contenu des données

---

## 10. Stack recommandée (MVP)

```
Frontend     : Vite + React (ou Vue/Svelte) + TypeScript
Carte        : Leaflet + react-leaflet
Adresses     : API Géoplateforme (completion + search)
Cadastre     : WMTS IGN (overlay) + GeoJSON Etalab (sélection)
Annotations  : Leaflet.draw + Fabric.js (phase 2)
Export       : leaflet-simple-map-screenshoter + jsPDF (phase 3)
Mobile       : CSS responsive + PWA optionnelle
Backend      : Aucun pour MVP (localStorage)
Hébergement  : Vercel / Netlify (tier gratuit)
```

### Flux utilisateur MVP

1. Barre de recherche avec autocomplétion
2. Sélection d’une adresse → zoom sur le point
3. Overlay cadastre (tuiles WMTS) + vecteurs bâtiments/parcelles
4. Clic sur un bâtiment → surbrillance + infos parcelle
5. Bouton « Annoter » → mode dessin sur la zone
6. Bouton « Capturer » → export PNG

---

## 11. Coût estimé

| Composant | Coût |
|-----------|------|
| Données cadastre | **0 €** (open data) |
| APIs adresse / cadastre | **0 €** (services publics) |
| Tuiles OSM | **0 €** |
| Tuiles IGN | **0 €** |
| Hébergement (Vercel/Netlify) | **0 €** (tier gratuit) |
| Domaine | ~10 €/an (optionnel) |

**Total MVP : quasi 0 €**, sauf si montée en charge forte (cache proxy ou backend).

---

## 12. Liens utiles

| Ressource | URL |
|-----------|-----|
| Cadastre Etalab | https://cadastre.data.gouv.fr/datasets/cadastre-etalab |
| PCI | https://cadastre.data.gouv.fr/datasets/plan-cadastral-informatise |
| API Carto cadastre | https://apicarto.ign.fr/api/doc/cadastre |
| Géocodage Géoplateforme | https://cartes.gouv.fr/aide/fr/guides-utilisateur/utiliser-les-services-de-la-geoplateforme/geocodage/ |
| Autocomplétion | https://cartes.gouv.fr/aide/fr/guides-utilisateur/utiliser-les-services-de-la-geoplateforme/autocompletion/ |
| WMTS Géoplateforme | https://cartes.gouv.fr/aide/fr/guides-utilisateur/utiliser-les-services-de-la-geoplateforme/diffusion/wmts/ |
| BAN / adresses | https://adresse.data.gouv.fr |
| RNB | https://rnb-fr.gitbook.io/documentation/ |
| geoportal-extensions Leaflet | https://github.com/IGNF/geoportal-extensions |
| Licence Ouverte 2.0 | https://www.data.gouv.fr/pages/legal/licences/etalab-2.0 |

---

## 13. Phases de développement suggérées

### Phase 1 — MVP carte + recherche

- [ ] Squelette Vite + React + TypeScript
- [ ] Carte Leaflet responsive
- [ ] Autocomplétion + géocodage Géoplateforme
- [ ] Overlay cadastre WMTS IGN
- [ ] Zoom sur adresse sélectionnée

### Phase 2 — Sélection cadastrale

- [ ] Chargement GeoJSON commune (batiments + parcelles)
- [ ] Clic → highlight bâtiment / parcelle
- [ ] Affichage infos (section, n° parcelle, etc.)

### Phase 3 — Annotations & capture

- [ ] Mode annotation (dessin, icônes)
- [ ] Capture PNG de la zone
- [ ] Export PDF

### Phase 4 — Persistance

- [ ] Sauvegarde locale (IndexedDB)
- [ ] Édition / suppression des annotations
- [ ] *(Optionnel)* Backend + comptes utilisateur
