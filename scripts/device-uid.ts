export function chooseDeviceUid({ configured, ownerIsNew, random }: {
  configured: string | undefined
  ownerIsNew: boolean
  random: () => string
}): string {
  if (configured) return configured
  if (ownerIsNew) return `CLIPPASS-${random().toUpperCase()}`
  // keep the Tollbooth-era UID: a new one registers a new device and escrow
  return 'TOLLBOOTH-DEMO-0001'
}
