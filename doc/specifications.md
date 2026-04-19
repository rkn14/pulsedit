Parfait. Voici une version **IA-ready, stricte, sans ambiguïté**, optimisée pour un agent type Composer2.

---

# 🧠 PulsEdit — Spécifications techniques (IA-Ready)

## 0. Objectif

Construire une application desktop **Windows uniquement** pour l’édition de samples audio courts (≤ quelques minutes), avec preview temps réel et rendu offline identique.

---

# 1. Stack imposée (NON NÉGOCIABLE)

## Core

* Electron
* TypeScript (strict mode ON)
* Vite
* React (obligatoire)
* Zustand (state management)

## UI

* Tailwind CSS
* WaveSurfer.js → **UNIQUEMENT pour affichage waveform**

## Audio

* Web Audio API (AudioContext)
* OfflineAudioContext (export)
* Tuna.js (effets)

## Fichiers

* wavefile (WAV uniquement)
* FFmpeg (binaire externe, via child_process)

---

# 2. Règles d’architecture (CRITIQUES)

## Séparation stricte

### Renderer (React)

INTERDIT :

* accès filesystem
* traitement audio lourd
* mutation de buffers audio

AUTORISÉ :

* UI
* interactions utilisateur
* affichage waveform
* envoi de commandes à l’audio engine

---

### Audio Engine (Web Worker dédié)

RESPONSABILITÉS :

* gestion AudioContext
* gestion AudioBuffer
* chaîne d’effets
* preview temps réel
* rendu OfflineAudioContext

---

### Main process

RESPONSABILITÉS :

* accès filesystem
* appels FFmpeg
* gestion fichiers temporaires
* IPC sécurisé

---

## Communication

* Renderer ↔ Worker → postMessage
* Renderer ↔ Main → IPC (preload bridge uniquement)
* AUCUN accès direct Node depuis renderer

---

# 3. Sécurité Electron (OBLIGATOIRE)

* `contextIsolation: true`
* `nodeIntegration: false`
* preload script obligatoire
* API exposée minimale
* validation stricte des inputs IPC

---

# 4. Modèle de données (IMPOSÉ)

```ts id="5iuxk6"
type AudioAsset = {
  id: string
  filePath: string
  sampleRate: number
  channels: 1 | 2
  duration: number
}

type SelectionRange = {
  start: number // seconds
  end: number
}

type EffectType =
  | 'gain'
  | 'fadeIn'
  | 'fadeOut'
  | 'pitch'
  | 'timeStretch'
  | 'reverb'
  | 'delay'
  | 'phaser'
  | 'flanger'
  | 'chorus'
  | 'tremolo'
  | 'distortion'
  | 'bitcrusher'
  | 'eq'
  | 'compressor'
  | 'pan'

type EffectInstance = {
  id: string
  type: EffectType
  enabled: boolean
  params: Record<string, number>
}

type EffectChain = EffectInstance[]

type HistoryEntry = {
  stateSnapshot: SerializedState
}

type SerializedState = {
  selection: SelectionRange | null
  effects: EffectChain
}
```

---

# 5. Pipeline audio (CRITIQUE)

## Règle absolue

> Le rendu export DOIT utiliser EXACTEMENT le même graph que le preview

---

## Preview

* AudioContext temps réel
* effets appliqués dynamiquement
* latence minimale

---

## Export

* OfflineAudioContext
* reconstruction du même graph
* rendu complet
* export buffer → WAV (wavefile)
* conversion via FFmpeg si nécessaire

---

# 6. Gestion audio

## Format interne

* Float32Array uniquement

## Contraintes

* mono ou stéréo uniquement
* pas de multichannel
* durée max cible : ~5 minutes

## Sample rate

* converti à 44.1kHz en interne

---

# 7. Effets (IMPOSÉS)

## Tous doivent :

* fonctionner en temps réel
* fonctionner en offline
* avoir paramètres précis
* supporter enable/disable

---

## Liste

### Core

* Gain
* Fade In
* Fade Out
* Normalize (peak)
* Stereo → Mono (L+R / 2)

### Pitch / Time

* Pitch shift (semitones)
* Time stretch (ratio)

### Créatifs

* Reverb (decay, mix)
* Delay (time, feedback, mix)
* Phaser (rate, depth)
* Flanger (rate, depth)
* Chorus
* Tremolo
* Distortion
* Bitcrusher
* EQ (3 bandes minimum)
* Compressor
* Pan

---

# 8. UI

## Layout

* gauche : file explorer (tree)
* centre : waveform
* droite : panneau effets
* bas : transport (play/stop)

## Interactions

* sélection souris
* zoom + pan
* sliders + input numérique

---

# 9. Formats

## Import

* WAV
* AIFF
* MP3
* FLAC (via FFmpeg)

## Export

* WAV / AIFF → 44.1kHz / 16bit
* MP3 → qualité max

---

# 10. Undo / Redo

* max 10 états
* basé sur snapshot léger (pas buffers)

---

# 11. Performance

* audio dans worker obligatoire
* UI jamais bloquée
* éviter allocations inutiles
* pas de copie buffer inutile

---

# 12. Structure projet (IMPOSÉE)

```id="doxpfo"
/src
  /renderer
    /components
    /views
    /store (zustand)
  /audio
    engine.ts
    graph.ts
    effects/
  /workers
    audioWorker.ts
  /main
    ipc.ts
    ffmpeg.ts
    filesystem.ts
  /shared
    types.ts
```

---

# 13. Bonnes pratiques

## Code

* TypeScript strict
* zéro `any`
* fonctions DSP pures
* composants UI sans logique métier

## Audio

* ne jamais muter source
* toujours passer par pipeline

## IPC

* validé, typé
* jamais exposer Node direct

---

# 14. Roadmap (OBLIGATOIRE)

## Phase 1 (MVP)

* setup Electron + React
* explorer fichiers
* import audio
* waveform
* sélection
* play/stop
* gain + fade
* export WAV

## Phase 2

* effets complets
* undo/redo
* mono/stéréo

## Phase 3

* pitch + time stretch
* export MP3/AIFF
* polish UI

---

# 15. Contraintes fortes

* stabilité > features
* preview fluide obligatoire
* export fidèle obligatoire
* pas de multi-track

---

# 16. Nom

**PulsEdit**

---

