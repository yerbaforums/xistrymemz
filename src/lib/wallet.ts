import { randomBytes, createCipheriv, createDecipheriv, createHash, pbkdf2Sync } from 'crypto'

function getEncryptionKey(): Buffer {
  const key = process.env.WALLET_ENCRYPTION_KEY
  if (!key || key.length < 32) {
    throw new Error('WALLET_ENCRYPTION_KEY must be at least 32 characters')
  }
  return Buffer.from(key.slice(0, 32), 'utf-8')
}

export interface WalletResult {
  address: string
  privateKey?: string
  publicKey?: string
  cryptoType: string
}

function deriveKey(salt: string): Buffer {
  const encryptionKey = getEncryptionKey()
  return pbkdf2Sync(encryptionKey, salt, 100000, 32, 'sha512')
}

export function encryptPrivateKey(privateKey: string): string {
  const salt = randomBytes(16).toString('hex')
  const key = deriveKey(salt)
  const iv = randomBytes(16)
   
  const cipher = createCipheriv('aes-256-cbc', key, iv)
  let encrypted = cipher.update(privateKey, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  return salt + ':' + iv.toString('hex') + ':' + encrypted
}

export function decryptPrivateKey(encryptedData: string): string {
  try {
    const parts = encryptedData.split(':')
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format')
    }
    
    const salt = parts[0]
    const iv = Buffer.from(parts[1], 'hex')
    const encrypted = parts[2]
    
    const key = deriveKey(salt)
    const decipher = createDecipheriv('aes-256-cbc', key, iv)
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error) {
    console.error('Failed to decrypt private key:', error)
    throw new Error('Failed to decrypt private key')
  }
}

function bytesToBase58(bytes: Buffer): string {
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
  let result = ''
  const digits: number[] = []
  
  for (let i = 0; i < bytes.length; i++) {
    let carry = bytes[i]
    for (let j = digits.length - 1; j >= 0; j--) {
      carry += digits[j] * 256
      digits[j] = carry % 58
      carry = Math.floor(carry / 58)
    }
    while (carry > 0) {
      digits.push(carry % 58)
      carry = Math.floor(carry / 58)
    }
  }
  
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) {
    result += '1'
  }
  
  for (let i = digits.length - 1; i >= 0; i--) {
    result += ALPHABET[digits[i]]
  }
  
  return result
}

export function generateEthWallet(cryptoType: string): WalletResult {
  const privateKeyBytes = randomBytes(32)
  const publicKeyBytes = randomBytes(64)
  
  const addressHash = createHash('sha256').update(publicKeyBytes).digest('hex')
  const address = '0x' + addressHash.slice(-40)
  
  return {
    address: address,
    privateKey: privateKeyBytes.toString('hex'),
    publicKey: publicKeyBytes.toString('hex'),
    cryptoType
  }
}

export function generateBtcWallet(): WalletResult {
  const privateKeyBytes = randomBytes(32)
  const publicKeyBytes = randomBytes(64)
  
  const addressHash = createHash('sha256').update(publicKeyBytes).digest()
  const address = '1' + bytesToBase58(addressHash).slice(0, 33)
  
  return {
    address: address.slice(0, 34),
    privateKey: privateKeyBytes.toString('hex'),
    publicKey: publicKeyBytes.toString('hex'),
    cryptoType: 'BTC'
  }
}

export function generateMoneroWallet(): WalletResult {
  const privateKey = randomBytes(32).toString('hex')
  const publicKey = randomBytes(32).toString('hex')
  
  const address = '4' + publicKey.slice(0, 64) + privateKey.slice(0, 8)
  
  return {
    address: address.slice(0, 95),
    privateKey: privateKey,
    publicKey: publicKey,
    cryptoType: 'XMR'
  }
}

export function generatePrivacyWallet(cryptoType: string): WalletResult {
  const privateKey = randomBytes(32).toString('hex')
  const publicKey = randomBytes(32).toString('hex')
  
  let prefix = ''
  switch (cryptoType.toUpperCase()) {
    case 'XTM': prefix = 'ft0'; break
    case 'ARRR': prefix = 'pir1'; break
    case 'DERO': prefix = 'der0'; break
    case 'ZANO': prefix = 'zn0'; break
    default: prefix = 'prv'
  }
  
  const address = prefix + publicKey.slice(0, 50)
  
  return {
    address: address.slice(0, 80),
    privateKey: privateKey,
    publicKey: publicKey,
    cryptoType: cryptoType.toUpperCase()
  }
}

export function generateWallet(cryptoType: string): WalletResult {
  const type = cryptoType.toUpperCase()
  
  switch (type) {
    case 'ETH':
    case 'USDT':
    case 'USDC':
      return generateEthWallet(type)
    case 'BTC':
      return generateBtcWallet()
    case 'XMR':
      return generateMoneroWallet()
    case 'XTM':
    case 'ARRR':
    case 'DERO':
    case 'ZANO':
      return generatePrivacyWallet(type)
    default:
      return generateEthWallet(type)
  }
}

export function isValidAddress(address: string, cryptoType: string): boolean {
  const type = cryptoType.toUpperCase()
  
  switch (type) {
    case 'ETH':
    case 'USDT':
    case 'USDC':
      return address.startsWith('0x') && address.length === 42
    case 'BTC':
      return (address.startsWith('1') || address.startsWith('3')) && address.length >= 26 && address.length <= 35
    case 'XMR':
    case 'XTM':
    case 'ARRR':
    case 'DERO':
    case 'ZANO':
      return address.length >= 40 && address.length <= 100
    default:
      return false
  }
}