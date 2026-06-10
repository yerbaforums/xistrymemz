import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { randomUUID } from 'crypto'
import { uploadToIPFS } from '@/lib/ipfs'
import { prisma } from '@/lib/prisma'
import sharp from 'sharp'

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm']
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES]

const IMAGE_MAX_SIZE = 20 * 1024 * 1024
const VIDEO_MAX_SIZE = 100 * 1024 * 1024
const COMPRESS_QUALITY = 80
const MAX_DIMENSION = 1920

const DANGEROUS_EXTENSIONS = [
  'php', 'phtml', 'php3', 'php4', 'php5', 'phar',
  'exe', 'msi', 'bat', 'cmd', 'sh', 'bash',
  'js', 'mjs', 'jsp', 'jspx',
  'html', 'htm', 'xhtml',
  'svg', 'xml',
  'sql', 'db', 'mdb',
  'cgi', 'pl', 'py', 'rb',
  ' htaccess', 'htpasswd'
]

const MAGIC_BYTES: Record<string, number[]> = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png': [0x89, 0x50, 0x4E, 0x47],
  'image/webp': [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50],
  'image/gif': [0x47, 0x49, 0x46, 0x38],
  'video/mp4': [0x00, 0x00, 0x00],
  'video/webm': [0x1A, 0x45, 0xDF, 0xA3]
}

const TYPE_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm'
} as const

function isValidMimeType(mimeType: string): mimeType is typeof ALLOWED_TYPES[number] {
  return ALLOWED_TYPES.includes(mimeType as typeof ALLOWED_TYPES[number])
}

function isDangerousExtension(ext: string): boolean {
  return DANGEROUS_EXTENSIONS.includes(ext.toLowerCase())
}

function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  const magic = MAGIC_BYTES[mimeType]
  if (!magic) return false
  return magic.every((byte, i) => buffer[i] === byte)
}

function getMaxSize(mimeType: string): number {
  if (ALLOWED_VIDEO_TYPES.includes(mimeType)) {
    return VIDEO_MAX_SIZE
  }
  return IMAGE_MAX_SIZE
}

async function compressImage(buffer: Buffer, mimeType: string): Promise<Buffer> {
  if (mimeType === 'image/gif') return buffer
  try {
    let img = sharp(buffer).rotate()
    const metadata = await img.metadata()
    if (metadata.width && metadata.width > MAX_DIMENSION) {
      img = img.resize(MAX_DIMENSION, undefined, { fit: 'inside', withoutEnlargement: true })
    }
    if (metadata.height && metadata.height > MAX_DIMENSION) {
      img = img.resize(undefined, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
    }
    if (mimeType === 'image/jpeg') return img.jpeg({ quality: COMPRESS_QUALITY, mozjpeg: true }).toBuffer()
    if (mimeType === 'image/png') return img.png({ quality: COMPRESS_QUALITY, compressionLevel: 9 }).toBuffer()
    if (mimeType === 'image/webp') return img.webp({ quality: COMPRESS_QUALITY }).toBuffer()
    return buffer
  } catch {
    return buffer
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const files = formData.getAll('file') as File[]
    const file = formData.get('file') as File | null

    if (!file && files.length === 0) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const toUpload = files.length > 0 ? files : (file ? [file] : [])

    const uploads = await Promise.all(toUpload.map(async (f) => {
      const mimeType = f.type.toLowerCase()
      const ext = f.name.split('.').pop()?.toLowerCase() || ''

      if (!isValidMimeType(mimeType)) {
        throw new Error(`Invalid file type: ${mimeType}`)
      }

      if (isDangerousExtension(ext)) {
        throw new Error('File extension not allowed')
      }

      const bytes = await f.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const fileSize = buffer.length
      const maxSize = getMaxSize(mimeType)

      if (fileSize > maxSize) {
        throw new Error(`File too large. Max: ${maxSize / (1024 * 1024)}MB`)
      }

      if (!validateMagicBytes(buffer, mimeType)) {
        throw new Error('Invalid file content')
      }

      const compressed = await compressImage(buffer, mimeType)
      const compressedSize = compressed.length
      const compressionRatio = ((1 - compressedSize / fileSize) * 100).toFixed(1)

      const safeFilename = `${randomUUID()}.${TYPE_EXTENSIONS[mimeType as keyof typeof TYPE_EXTENSIONS]}`

      // Upload to IPFS synchronously (critical for Vercel — no persistent FS)
      let url: string
      try {
        const ipfs = await uploadToIPFS(compressed, safeFilename)
        url = ipfs.gatewayUrl
        await prisma.file.create({
          data: {
            cid: ipfs.cid,
            fileName: safeFilename,
            mimeType,
            size: fileSize,
            gatewayUrl: ipfs.gatewayUrl,
            userId: session.user.id,
            modelName: 'Upload',
            modelId: safeFilename
          }
        }).catch(() => {})
      } catch (ipfsErr) {
        console.warn('IPFS upload failed, saving locally as fallback:', ipfsErr)
        // Fallback: save to local filesystem (dev only)
        const uploadDir = join(process.cwd(), 'public', 'uploads', session.user.id)
        if (!existsSync(uploadDir)) {
          await mkdir(uploadDir, { recursive: true })
        }
        const filepath = join(uploadDir, safeFilename)
        await writeFile(filepath, compressed)
        url = `/uploads/${session.user.id}/${safeFilename}`
      }

      return { url, mimeType, size: fileSize }
    }))

    return NextResponse.json({ uploads, url: uploads[0].url })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Upload failed' }, { status: 500 })
  }
}
