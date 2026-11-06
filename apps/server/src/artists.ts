import { keypairSigner, type NoirSigner } from '@noirx402/agent-sdk'
import { ARTISTS, type ArtistId } from '@clippass/shared'

const IDS = Object.keys(ARTISTS) as ArtistId[]

export const artistEnvKey = (id: ArtistId): string => `ARTIST_${id.toUpperCase()}_SECRET`

/** Each artist's signer from env; artists claim their own earnings with these keys. */
export function loadArtists(src: Record<string, string | undefined> = process.env): Record<ArtistId, NoirSigner> {
  const missing = IDS.map(artistEnvKey).filter((k) => !src[k])
  if (missing.length) throw new Error(`missing ${missing.join(', ')}; run npm run setup`)
  return Object.fromEntries(IDS.map((id) => [id, keypairSigner(src[artistEnvKey(id)]!)])) as Record<ArtistId, NoirSigner>
}

export const payees = (artists: Record<ArtistId, NoirSigner>): Record<ArtistId, string> =>
  Object.fromEntries(IDS.map((id) => [id, artists[id].publicKey])) as Record<ArtistId, string>
