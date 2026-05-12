import { create } from 'kubo-rpc-client'

const IPFS_API_URL = process.env.IPFS_API_URL || 'http://127.0.0.1:5001'
const IPFS_GATEWAY = process.env.IPFS_GATEWAY || 'https://gateway.pinata.cloud'

let ipfsClient: ReturnType<typeof create> | null = null

function getClient() {
  if (!ipfsClient) {
    ipfsClient = create({ url: IPFS_API_URL })
  }
  return ipfsClient
}

export async function uploadToIPFS(buffer: Buffer, fileName: string): Promise<{ cid: string; gatewayUrl: string }> {
  const client = getClient()
  const result = await client.add({ path: fileName, content: buffer })
  const cid = result.cid.toString()
  const gatewayUrl = `${IPFS_GATEWAY}/ipfs/${cid}`
  return { cid, gatewayUrl }
}

export async function uploadToIPFSBackground(buffer: Buffer, fileName: string): Promise<{ cid: string; gatewayUrl: string }> {
  const result = await uploadToIPFS(buffer, fileName)
  return result
}
