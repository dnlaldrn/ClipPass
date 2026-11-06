import { accountLink } from './format'
import { Proof } from './Proof'
export function Address({ address, name }: { address: string; name?: string }) {
  return <Proof value={address} href={accountLink(address)} kind="artist address" name={name} />
}
