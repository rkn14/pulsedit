# PulsEdit

Éditeur de samples audio (Electron + React + TypeScript). Chaîne d’effets, aperçu, export WAV / AIFF / MP3.

## Prérequis

- Node.js 20+
- npm

## Développement

```bash
npm install
npm run dev
```

## Build production

```bash
npm run build
npm run preview
```

## Formats audio

| Import | Remarque |
|--------|----------|
| WAV, AIFF, MP3 | Décodage côté renderer (Web Audio) |
| FLAC, M4A | Transcodage via **FFmpeg** (binaire `ffmpeg-static` npm) |

Export : WAV 16 bit 44,1 kHz ; AIFF et MP3 via FFmpeg dans le processus principal.

## Qualité

```bash
npm run lint
npm run format
```

## Licence

Voir les dépendances (notamment **soundtouch-ts** en LGPL-2.1 pour le time stretch).
