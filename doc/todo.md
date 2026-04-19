Oui. Voici un **second document**, pensé comme une **todo globale séquencée pour une IA dev**, avec des **jalons de validation utilisateur** clairement identifiés.

---

# Todo globale — **PulsEdit**

## Plan d’implémentation étape par étape pour une IA dev

## Règles générales

* Avancer **étape par étape**
* Ne pas sauter d’étape
* Ne pas commencer une étape si la précédente n’est pas stable
* À chaque étape : produire du code propre, typé, modulaire
* Toujours privilégier :

  * stabilité
  * simplicité
  * architecture propre
  * cohérence preview/export

## Règle de validation

Certaines étapes sont marquées **[TEST UTILISATEUR]**.
À ces moments-là :

* arrêter d’ajouter des features
* livrer un état testable
* attendre validation avant de continuer

---

# Phase 0 — Initialisation projet

## Étape 0.1 — Bootstrap

Créer le projet avec :

* Electron
* Vite
* React
* TypeScript strict
* Tailwind CSS
* Zustand

## Étape 0.2 — Structure des dossiers

Créer la structure imposée :

```txt
/src
  /renderer
    /components
    /views
    /store
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

## Étape 0.3 — Configuration qualité

Mettre en place :

* ESLint
* Prettier
* tsconfig strict
* alias d’import clairs

## Étape 0.4 — Sécurité Electron

Configurer obligatoirement :

* `contextIsolation: true`
* `nodeIntegration: false`
* preload script minimal
* API bridge sécurisée

### Résultat attendu

Le projet démarre, la fenêtre Electron s’ouvre, React fonctionne, Tailwind fonctionne, aucune faille Electron évidente.

---

# Phase 1 — Fondations applicatives

## Étape 1.1 — Types partagés

Créer les types de base dans `/shared/types.ts` :

* `AudioAsset`
* `SelectionRange`
* `EffectType`
* `EffectInstance`
* `EffectChain`
* `SerializedState`
* `HistoryEntry`

## Étape 1.2 — Store global

Créer le store Zustand pour :

* fichier courant
* sélection courante
* chaîne d’effets
* état lecture
* historique undo/redo
* état UI

## Étape 1.3 — Layout principal

Créer le layout de base :

* colonne gauche : explorer
* centre : waveform
* droite : panneau effets
* bas : transport

## Étape 1.4 — Composants shell

Créer les composants vides mais branchés :

* `FileExplorer`
* `WaveformPanel`
* `EffectsPanel`
* `TransportBar`

### Résultat attendu

L’app a déjà sa structure visuelle complète, même si rien ne fonctionne encore.

---

# Phase 2 — Explorer fichiers local

## Étape 2.1 — API preload

Exposer uniquement les fonctions nécessaires :

* lister un dossier
* lire métadonnées d’un fichier audio
* ouvrir un fichier audio

## Étape 2.2 — Main process filesystem

Implémenter dans `/main/filesystem.ts` :

* lecture dossier
* filtrage extensions audio supportées
* navigation simple dans arborescence

## Étape 2.3 — UI explorer

Implémenter une treeview style Windows Explorer :

* navigation dossiers
* affichage fichiers audio
* sélection d’un fichier

## Étape 2.4 — Sélection fichier

Quand l’utilisateur clique un fichier audio :

* remonter son chemin
* stocker le fichier courant dans le store

---

## **[TEST UTILISATEUR 1]**

### À tester

* l’application démarre
* l’explorer fonctionne
* l’arborescence est lisible
* on peut sélectionner un fichier audio

### Ne pas continuer avant validation

L’utilisateur doit confirmer que :

* la navigation fichiers est correcte
* le layout général convient
* la base visuelle est acceptable

---

# Phase 3 — Import audio + waveform

## Étape 3.1 — Chargement audio

Créer le pipeline de chargement d’un fichier audio :

* ouverture fichier
* décodage audio
* récupération :

  * sample rate
  * durée
  * nombre de canaux

## Étape 3.2 — Conversion format interne

Normaliser en interne :

* mono ou stéréo uniquement
* 44.1kHz cible interne
* buffer exploitable par le moteur audio

## Étape 3.3 — Intégration WaveSurfer

Utiliser WaveSurfer.js uniquement pour :

* affichage waveform
* zoom
* pan
* sélection visuelle

## Étape 3.4 — Synchronisation store/UI

Quand un fichier est chargé :

* afficher waveform
* afficher durée
* mettre à jour état global

### Résultat attendu

Un fichier audio s’ouvre et sa waveform s’affiche correctement.

---

# Phase 4 — Transport audio

## Étape 4.1 — Audio engine minimal

Créer le moteur audio minimal :

* `AudioContext`
* lecture du buffer courant
* stop
* reprise simple

## Étape 4.2 — Contrôles transport

Implémenter :

* play
* stop
* lecture depuis début
* lecture de la sélection

## Étape 4.3 — Synchronisation curseur

Faire évoluer le curseur de lecture dans la waveform.

## Étape 4.4 — Gestion état lecture

L’état de lecture doit rester centralisé dans le store.

---

## **[TEST UTILISATEUR 2]**

### À tester

* importer un fichier
* voir la waveform
* lancer lecture
* arrêter lecture
* lire une sélection

### Ne pas continuer avant validation

L’utilisateur valide :

* la fluidité de lecture
* la logique du transport
* le comportement global du waveform

---

# Phase 5 — Sélection et édition de base

## Étape 5.1 — Sélection temporelle

Implémenter une sélection claire :

* début
* fin
* durée

## Étape 5.2 — Trim logique

Créer l’opération de trim dans le modèle interne.

## Étape 5.3 — Fade In / Fade Out

Implémenter :

* effet fade in
* effet fade out
* paramètres simples

## Étape 5.4 — Gain

Ajouter effet gain global.

## Étape 5.5 — Normalize

Implémenter normalisation peak.

## Étape 5.6 — Stereo → Mono

Implémenter conversion mono par moyenne `(L + R) / 2`.

### Résultat attendu

Les opérations de base sont disponibles et previewables.

---

# Phase 6 — Undo / Redo

## Étape 6.1 — Historique

Implémenter historique basé sur snapshots légers :

* max 10 états
* pas de duplication complète de gros buffers si évitable

## Étape 6.2 — Undo

Retour à l’état précédent.

## Étape 6.3 — Redo

Restauration état annulé.

## Étape 6.4 — Intégration UI

Boutons + raccourcis clavier.

---

## **[TEST UTILISATEUR 3]**

### À tester

* trim
* fades
* gain
* normalize
* stereo/mono
* undo/redo

### Ne pas continuer avant validation

L’utilisateur valide :

* logique d’édition
* cohérence UX
* niveau de stabilité

---

# Phase 7 — Système d’effets

## Étape 7.1 — Modèle de chaîne d’effets

Créer une chaîne ordonnée d’effets :

* ajout
* suppression
* activation/désactivation
* modification paramètres

## Étape 7.2 — Graph audio dynamique

Construire un graph Web Audio modulaire capable de reconstruire la chaîne.

## Étape 7.3 — Effets de première vague

Implémenter :

* reverb
* delay
* chorus
* tremolo
* pan

## Étape 7.4 — Effets de seconde vague

Implémenter :

* phaser
* flanger
* distortion
* bitcrusher
* compressor
* EQ 3 bandes

## Étape 7.5 — UI effets

Chaque effet doit avoir :

* bouton enable/disable
* sliders
* input numérique
* reset paramètres

### Résultat attendu

La chaîne d’effets temps réel fonctionne et peut être modifiée dynamiquement.

---

# Phase 8 — Pitch shift et time stretch

## Étape 8.1 — Choix technique

Implémenter la solution retenue pour preview temps réel compatible avec la stack définie.

## Étape 8.2 — Pitch shift

Ajouter pitch shift précis :

* semitones
* éventuellement cents

## Étape 8.3 — Time stretch

Ajouter time stretch précis :

* ratio
* lecture stable

## Étape 8.4 — Intégration dans la chaîne

Pitch et time stretch doivent être intégrés proprement au pipeline global.

### Résultat attendu

Pitch shift et time stretch sont testables en preview.

---

## **[TEST UTILISATEUR 4]**

### À tester

* chaîne d’effets
* pitch shift
* time stretch
* cohérence de la pré-écoute

### Ne pas continuer avant validation

L’utilisateur valide :

* qualité perçue
* utilité des contrôles
* ordre des effets
* ergonomie

---

# Phase 9 — Export offline fidèle

## Étape 9.1 — OfflineAudioContext

Créer le pipeline de rendu offline.

## Étape 9.2 — Reconstruction stricte du graph

À l’export :

* reconstruire exactement le même graph que pour le preview
* appliquer les mêmes paramètres
* rendre le buffer final

## Étape 9.3 — Export WAV

Exporter le buffer final en WAV via `wavefile`.

## Étape 9.4 — Export AIFF / MP3

Utiliser FFmpeg pour conversions :

* WAV → AIFF
* WAV → MP3 qualité max

## Étape 9.5 — UI export

Créer une fenêtre / modal d’export simple :

* format
* nom fichier
* emplacement

---

## **[TEST UTILISATEUR 5]**

### À tester

* export WAV
* export AIFF
* export MP3
* comparaison preview vs export

### Validation critique

L’utilisateur doit confirmer que :

* l’export correspond bien à ce qu’il entend
* les formats sont bons
* le workflow d’export est correct

---

# Phase 10 — Finition UX

## Étape 10.1 — Raccourcis clavier

Ajouter :

* espace = play/stop
* Ctrl+Z = undo
* Ctrl+Y = redo
* suppression effet
* zoom in/out

## Étape 10.2 — États vides

Soigner :

* aucun fichier chargé
* erreur import
* erreur export

## Étape 10.3 — Feedback utilisateur

Ajouter :

* loaders
* messages d’erreur clairs
* confirmations utiles

## Étape 10.4 — Robustesse

Corriger :

* glitches lecture
* fuites mémoire
* états UI incohérents

---

# Phase 11 — Polish visuel

## Étape 11.1 — CSS global

Respecter le style imposé :

* dark UI
* sobre
* type DAW
* priorité à lisibilité et densité utile

## Étape 11.2 — Règles CSS

* Tailwind uniquement autant que possible
* pas de styles inline complexes
* spacing régulier
* contrastes lisibles
* sliders discrets
* panneaux visuellement hiérarchisés
* éviter les couleurs vives inutiles

## Étape 11.3 — Finition composants

Harmoniser :

* boutons
* sliders
* inputs
* panneaux
* titres
* états actifs / désactivés

---

## **[TEST UTILISATEUR 6 — VALIDATION FINALE]**

### À tester

* workflow complet
* chargement fichier
* édition
* effets
* export
* confort global
* aspect visuel

### Critère de fin

L’utilisateur valide que l’application est :

* stable
* claire
* agréable
* exploitable pour préparer des samples

---

# Ordre de priorité absolue

## Priorité 1

* structure projet
* sécurité Electron
* explorer
* import
* waveform
* lecture

## Priorité 2

* sélection
* trim
* fades
* gain
* normalize
* mono

## Priorité 3

* undo/redo
* chaîne d’effets
* effets principaux

## Priorité 4

* pitch shift
* time stretch
* export fidèle

## Priorité 5

* polish UX/UI

---

# Ce qu’il ne faut pas faire

* ne pas ajouter de multi-track
* ne pas ajouter de système de projet complexe
* ne pas ajouter de VST
* ne pas ajouter de MIDI
* ne pas réinventer une DAW complète
* ne pas complexifier le state management inutilement
* ne pas mélanger logique audio, logique UI et accès filesystem

---

# Définition de “terminé”

Une étape est considérée terminée seulement si :

* le code compile
* le comportement est testable
* les types sont propres
* aucun hack temporaire critique n’est laissé
* l’étape suivante peut s’appuyer dessus proprement

---

Je peux maintenant te faire le **troisième document** : un **prompt maître prêt à coller dans Composer2**, avec le ton, les contraintes, l’ordre d’exécution et les interdictions.
