/** Modèle de données aligné sur les spécifications PulsEdit */

export type AudioAsset = {
  id: string
  filePath: string
  sampleRate: number
  channels: 1 | 2
  duration: number
}

export type SelectionRange = {
  /** secondes */
  start: number
  end: number
}

export type EffectType =
  | 'gain'
  | 'fadeIn'
  | 'fadeOut'
  | 'normalize'
  | 'stereoToMono'
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

export type EffectInstance = {
  id: string
  type: EffectType
  enabled: boolean
  params: Record<string, number>
}

export type EffectChain = EffectInstance[]

export type SerializedState = {
  selection: SelectionRange | null
  effects: EffectChain
}

export type HistoryEntry = {
  stateSnapshot: SerializedState
}

/** Entrée d’explorateur (fichier ou dossier) */
export type ExplorerEntry = {
  name: string
  fullPath: string
  isDirectory: boolean
}

/** Volume / lecteur (racine affichable dans l’explorateur) */
export type VolumeInfo = {
  /** Chemin racine normalisé, ex. `C:\` */
  rootPath: string
  /** Libellé court affiché, ex. `C:` */
  label: string
}
