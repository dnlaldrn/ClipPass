import { ReelView } from './ReelView'
import { SAMPLE_JOB } from './sample'

export function SamplePage() {
  return <>
    <p className="sample-note">Recorded Testnet reel. Nothing here spends.</p>
    <ReelView job={SAMPLE_JOB} receiptHref="/sample/receipt" mode="replay" />
  </>
}
