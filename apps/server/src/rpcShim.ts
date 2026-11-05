import type { NoirAgentClient } from '@noirx402/agent-sdk'

/**
 * shortcut: @noirx402/agent-sdk 0.3.0's decodeEvent drops every event whose `inSuccessfulContractCall`
 * is falsy, but Stellar RPC v23+ (Testnet runs v30) no longer sends that field — it only returns events
 * from successful calls. Without this, watch/getEvents/startWebhookRelay see nothing. We restore the flag
 * on the RPC response and let the SDK decode as usual. Remove once the SDK handles the missing field.
 */
export function restoreSuccessFlag(noir: NoirAgentClient): NoirAgentClient {
  const getEvents = noir.server.getEvents.bind(noir.server)
  noir.server.getEvents = async (req) => {
    const res = await getEvents(req)
    for (const e of res.events) (e as { inSuccessfulContractCall?: boolean }).inSuccessfulContractCall ??= true
    return res
  }
  return noir
}
