import type { Locale } from '~/utils/i18n'

export const STAT_OPTIONS = [
  { title: 'Força', en: 'Might', sigla: 'FOR', siglaEn: 'MIT', value: 'might' },
  { title: 'Destreza', en: 'Dexterity', sigla: 'DES', siglaEn: 'DEX', value: 'dexterity' },
  { title: 'Percepção', en: 'Awareness', sigla: 'PER', siglaEn: 'AWR', value: 'awareness' },
  { title: 'Razão', en: 'Reason', sigla: 'RAZ', siglaEn: 'RSN', value: 'reason' },
  { title: 'Carisma', en: 'Presence', sigla: 'CAR', siglaEn: 'PRS', value: 'presence' },
  { title: 'Sorte', en: 'Luck', sigla: 'SRT', siglaEn: 'LCK', value: 'luck' },
] as const

export type StatKey = (typeof STAT_OPTIONS)[number]['value']

export const STAT_PT: Record<string, string> = Object.fromEntries(
  STAT_OPTIONS.map((item) => [item.value, item.title])
)

export const STAT_EN: Record<string, string> = Object.fromEntries(
  STAT_OPTIONS.map((item) => [item.value, item.en])
)

export const STAT_SIGLA_PT: Record<string, string> = Object.fromEntries(
  STAT_OPTIONS.map((item) => [item.value, item.sigla])
)

export const STAT_SIGLA_EN: Record<string, string> = Object.fromEntries(
  STAT_OPTIONS.map((item) => [item.value, item.siglaEn])
)

export const TRAINING_OPTIONS = [
  { title: 'Arcanismo', en: 'Arcana', value: 'arcana' },
  { title: 'Briga', en: 'Brawl', value: 'brawl' },
  { title: 'Ofício', en: 'Craft', value: 'craft' },
  { title: 'Detectar', en: 'Detect', value: 'detect' },
  { title: 'Finesse', en: 'Finesse', value: 'finesse' },
  { title: 'Influência', en: 'Influence', value: 'influence' },
  { title: 'Liderança', en: 'Leadership', value: 'leadership' },
  { title: 'Medicina', en: 'Medicine', value: 'medicine' },
  { title: 'Misticismo', en: 'Mysticism', value: 'mysticism' },
  { title: 'Atuação', en: 'Performance', value: 'performance' },
  { title: 'Furtividade', en: 'Sneak', value: 'sneak' },
  { title: 'Sobrevivência', en: 'Survival', value: 'survival' },
  { title: 'Corpo a Corpo', en: 'Melee', value: 'melee' },
  { title: 'À Distância', en: 'Ranged', value: 'ranged' },
] as const

export type TrainingKey = (typeof TRAINING_OPTIONS)[number]['value']

export const TRAINING_PT: Record<string, string> = Object.fromEntries(
  TRAINING_OPTIONS.map((item) => [item.value, item.title])
)

export const TRAINING_EN: Record<string, string> = Object.fromEntries(
  TRAINING_OPTIONS.map((item) => [item.value, item.en])
)

export function formatStatLabel(stat: string, locale: Locale): string {
  const key = stat.trim().toLowerCase()
  if (locale === 'pt') return STAT_PT[key] ?? stat
  return STAT_EN[key] ?? stat
}

export function formatStatSigla(stat: string, locale: Locale): string {
  const key = stat.trim().toLowerCase()
  if (locale === 'pt') return STAT_SIGLA_PT[key] ?? stat.toUpperCase()
  return STAT_SIGLA_EN[key] ?? stat.toUpperCase()
}

export function formatTrainingLabel(training: string, locale: Locale): string {
  const key = training.trim().toLowerCase()
  if (locale === 'pt') return TRAINING_PT[key] ?? training
  return TRAINING_EN[key] ?? training
}
