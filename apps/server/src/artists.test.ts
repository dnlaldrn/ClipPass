import { Keypair } from '@stellar/stellar-sdk'
import { ARTISTS, type ArtistId } from '@clippass/shared'
import { artistEnvKey, loadArtists, payees } from './artists'

test('loadArtists names every missing key', () => {
  expect(() => loadArtists({ ARTIST_LOWTIDE_SECRET: Keypair.random().secret() }))
    .toThrow(/ARTIST_LANTERN_SECRET.*ARTIST_KESTREL_SECRET.*ARTIST_FERN_SECRET.*npm run setup/)
})

test('payees are the four artist public keys', () => {
  const env = Object.fromEntries((Object.keys(ARTISTS) as ArtistId[]).map((id) => [artistEnvKey(id), Keypair.random().secret()]))
  const p = payees(loadArtists(env))
  expect(Object.keys(p).sort()).toEqual(['fern', 'kestrel', 'lantern', 'lowtide'])
  expect(new Set(Object.values(p)).size).toBe(4)
})
