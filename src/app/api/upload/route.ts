import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { randomUUID } from 'crypto'

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm']
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES]

const IMAGE_MAX_SIZE = 10 * 1024 * 1024
const VIDEO_MAX_SIZE = 100 * 1024 * 1024

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

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const mimeType = file.type.toLowerCase()
    const ext = file.name.split('.').pop()?.toLowerCase() || ''

    if (!isValidMimeType(mimeType)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF, MP4, WebM' },
        { status: 400 }
      )
    }

    if (isDangerousExtension(ext)) {
      return NextResponse.json(
        { error: 'File extension not allowed' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const fileSize = buffer.length
    const maxSize = getMaxSize(mimeType)

    if (fileSize > maxSize) {
      return NextResponse.json(
        { error: `File too large. Max size: ${maxSize / (1024 * 1024)}MB` },
        { status: 400 }
      )
    }

    if (!validateMagicBytes(buffer, mimeType)) {
      return NextResponse.json(
        { error: 'Invalid file content. File type mismatch detected.' },
        { status: 400 }
      )
    }

    const uploadDir = join(process.cwd(), 'public', 'uploads', session.user.id)
    
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    const safeFilename = `${randomUUID()}.${TYPE_EXTENSIONS[mimeType as keyof typeof TYPE_EXTENSIONS]}`
    const filepath = join(uploadDir, safeFilename)

    await writeFile(filepath, buffer)

    const url = `/uploads/${session.user.id}/${safeFilename}`

    return NextResponse.json({ url })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}