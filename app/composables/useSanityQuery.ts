import type { QueryParams } from '@sanity/client'
import { getSanityClient } from '~/utils/sanity'

export function useSanityQuery<T>(
  key: string,
  groqQuery: string,
  params: QueryParams = {}
) {
  return useAsyncData<T>(key, async () => {
    const client = getSanityClient()
    return await client.fetch<T>(groqQuery, params)
  })
}