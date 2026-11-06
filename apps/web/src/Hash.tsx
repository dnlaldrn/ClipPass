import { txLink } from './format'
import { Proof } from './Proof'
export function Hash({ hash }: { hash: string }) {
  return <Proof value={hash} href={txLink(hash)} kind="transaction" />
}
