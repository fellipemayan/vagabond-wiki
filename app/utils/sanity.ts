import { createClient, type SanityClient } from '@sanity/client'

let cachedClient: SanityClient | null = null

export function getSanityClient(): SanityClient {
  if (cachedClient) return cachedClient

  const config = useRuntimeConfig()
  const projectId = String(config.public.sanityProjectId ?? '').trim()
  const dataset = String(config.public.sanityDataset ?? '').trim()
  const apiVersion = String(config.public.sanityApiVersion ?? '2025-02-01').trim()

  if (!projectId || !dataset) {
    throw new Error(
      'Configuração do Sanity ausente: defina NUXT_PUBLIC_SANITY_PROJECT_ID e NUXT_PUBLIC_SANITY_DATASET no .env.'
    )
  }

  cachedClient = createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn: true,
    perspective: 'published',
  })

  return cachedClient
}