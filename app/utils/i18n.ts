import type { PortableTextBlock } from '@portabletext/types'

export type Locale = 'pt' | 'en'

export interface IntlValue<T> {
  _key?: string
  _type?: string
  language?: string
  value?: T
}

export type IntlStringArray = IntlValue<string>[] | null | undefined
export type IntlBlockArray = IntlValue<PortableTextBlock[]>[] | null | undefined

function matchLocale<T>(
  items: IntlValue<T>[] | null | undefined,
  locale: Locale
): T | undefined {
  if (!Array.isArray(items) || items.length === 0) return undefined

  const exact = items.find(
    (item) => item?.language === locale || item?._key === locale
  )
  if (exact?.value !== undefined) return exact.value

  const fallbackLocale: Locale = locale === 'pt' ? 'en' : 'pt'
  const secondary = items.find(
    (item) => item?.language === fallbackLocale || item?._key === fallbackLocale
  )
  if (secondary?.value !== undefined) return secondary.value

  return items.find((item) => item?.value !== undefined)?.value
}

export function getIntlText(
  items: IntlStringArray,
  locale: Locale = 'pt',
  fallback = ''
): string {
  const value = matchLocale(items, locale)
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed || fallback
  }
  return fallback
}

export function getIntlBlocks(
  items: IntlBlockArray,
  locale: Locale = 'pt'
): PortableTextBlock[] {
  const value = matchLocale(items, locale)
  return Array.isArray(value) ? value : []
}

export function blocksToPlainText(blocks: PortableTextBlock[] | null | undefined): string {
  if (!Array.isArray(blocks) || blocks.length === 0) return ''

  return blocks
    .filter((block) => block?._type === 'block' && Array.isArray(block.children))
    .map((block) =>
      (block.children as Array<{ text?: string }>)
        .map((child) => child?.text ?? '')
        .join('')
    )
    .join('\n')
    .trim()
}

export function getIntlPlainText(
  items: IntlBlockArray,
  locale: Locale = 'pt',
  fallback = ''
): string {
  const blocks = getIntlBlocks(items, locale)
  const plain = blocksToPlainText(blocks)
  return plain || fallback
}