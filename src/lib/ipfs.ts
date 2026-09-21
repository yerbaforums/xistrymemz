const PINATA_API_KEY = process.env.PINATA_API_KEY || ''
const PINATA_SECRET_API_KEY = process.env.PINATA_SECRET_API_KEY || ''
const IPFS_API_URL = process.env.IPFS_API_URL || 'http://127.0.0.1:5001'
const IPFS_GATEWAY = process.env.IPFS_GATEWAY || 'https://gateway.pinata.cloud'

function pinataHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}
  if (PINATA_API_KEY.startsWith('eyJ')) {
    headers.Authorization = `Bearer ${PINATA_API_KEY}`
  } else if (PINATA_API_KEY && PINATA_SECRET_API_KEY) {
    headers.pinata_api_key = PINATA_API_KEY
    headers.pinata_secret_api_key = PINATA_SECRET_API_KEY
  } else if (PINATA_API_KEY) {
    headers.Authorization = `Bearer ${PINATA_API_KEY}`
  }
  return headers
}

async function uploadToPinata(buffer: Buffer, fileName: string): Promise<{ cid: string; gatewayUrl: string }> {
  const formData = new FormData()
  const uint8 = new Uint8Array(buffer)
  formData.append('file', new Blob([uint8]), fileName)

  const headers = pinataHeaders()

  const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers,
    body: formData,
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Pinata upload failed (${res.status}): ${errText}`)
  }

  const data = await res.json()
  const cid = data.IpfsHash
  const gatewayUrl = `${IPFS_GATEWAY}/ipfs/${cid}`
  return { cid, gatewayUrl }
}

async function uploadToLocalNode(buffer: Buffer, fileName: string): Promise<{ cid: string; gatewayUrl: string }> {
  const { create } = await import('kubo-rpc-client')
  const client = create({ url: IPFS_API_URL })
  const result = await client.add({ path: fileName, content: buffer })
  const cid = result.cid.toString()
  const gatewayUrl = `${IPFS_GATEWAY}/ipfs/${cid}`
  return { cid, gatewayUrl }
}

export async function uploadToIPFS(buffer: Buffer, fileName: string): Promise<{ cid: string; gatewayUrl: string }> {
  if (PINATA_API_KEY) {
    try {
      return await uploadToPinata(buffer, fileName)
    } catch (err) {
      console.warn('Pinata upload failed, falling back to local IPFS:', err)
    }
  }
  return uploadToLocalNode(buffer, fileName)
}

export async function uploadToIPFSBackground(buffer: Buffer, fileName: string): Promise<{ cid: string; gatewayUrl: string }> {
  return uploadToIPFS(buffer, fileName)
}

/** Extract an IPFS CID from one of our gateway URLs (/ipfs/{cid}). */
export function cidFromGatewayUrl(url: string): string | null {
  const m = url.match(/\/ipfs\/([A-Za-z0-9]{10,})/)
  return m ? m[1] : null
}

/**
 * Best-effort unpin: frees the file from the Pinata file-count quota when
 * the owning record is deleted. Never throws.
 */
export async function unpinFromIPFS(cid: string): Promise<void> {
  try {
    if (!PINATA_API_KEY || !cid) return
    await fetch(`https://api.pinata.cloud/pinning/unpin/${cid}`, {
      method: 'DELETE',
      headers: pinataHeaders(),
    })
  } catch {
    // quota reclaim is best-effort
  }
}

/** Unpin a stored gateway URL if it carries a CID. Never throws. */
export async function unpinGatewayUrl(url: string): Promise<void> {
  const cid = cidFromGatewayUrl(url)
  if (cid) await unpinFromIPFS(cid)
}
