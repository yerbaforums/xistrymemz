import { generateKeyPairSync, createHash, createSign } from 'crypto'

export function generateActorKeys() {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  })
  return { publicKey, privateKey }
}

export function getBaseUrl() {
  return process.env.NEXTAUTH_URL || 'https://xistrymemz.xyz'
}

export function actorUrl(username: string) {
  return `${getBaseUrl()}/api/fediverse/actor/${username}`
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function deliverToInbox(
  inboxUrl: string,
  activity: Record<string, unknown>,
  privateKeyPem: string,
  keyId: string
): Promise<boolean> {
  const body = JSON.stringify(activity)
  const digest = createHash('sha256').update(body).digest('base64')
  const date = new Date().toUTCString()
  const url = new URL(inboxUrl)
  const signTarget = `(request-target): post ${url.pathname}`
  const signString = `${signTarget}\nhost: ${url.host}\ndate: ${date}\ndigest: SHA-256=${digest}`
  const signer = createSign('rsa-sha256')
  signer.update(signString)
  const signature = signer.sign(privateKeyPem, 'base64')

  const sigHeader = `keyId="${keyId}",algorithm="rsa-sha256",headers="(request-target) host date digest",signature="${signature}"`

  try {
    const res = await fetch(inboxUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/activity+json',
        'Date': date,
        'Digest': `SHA-256=${digest}`,
        'Signature': sigHeader,
        'User-Agent': 'XistrYmemZ/0.7.0 (Fediverse)'
      },
      body
    })
    return res.ok
  } catch {
    return false
  }
}
