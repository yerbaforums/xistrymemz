import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export interface FeedbackEntry {
  id: string
  category: string
  message: string
  email?: string
  screenshot?: string
  userId?: string
  status: 'NEW' | 'REVIEWED'
  createdAt: string
}

const DATA_DIR = path.join(process.cwd(), 'data')
const FILE_PATH = path.join(DATA_DIR, 'feedback.json')

async function ensureFile() {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true })
  }
  if (!existsSync(FILE_PATH)) {
    await writeFile(FILE_PATH, '[]', 'utf-8')
  }
}

export async function readFeedback(): Promise<FeedbackEntry[]> {
  await ensureFile()
  const raw = await readFile(FILE_PATH, 'utf-8')
  try {
    return JSON.parse(raw) as FeedbackEntry[]
  } catch {
    return []
  }
}

export async function writeFeedback(entries: FeedbackEntry[]): Promise<void> {
  await ensureFile()
  await writeFile(FILE_PATH, JSON.stringify(entries, null, 2), 'utf-8')
}

export async function addFeedback(entry: Omit<FeedbackEntry, 'id' | 'status' | 'createdAt'>): Promise<FeedbackEntry> {
  const entries = await readFeedback()
  const newEntry: FeedbackEntry = {
    ...entry,
    id: crypto.randomUUID(),
    status: 'NEW',
    createdAt: new Date().toISOString()
  }
  entries.push(newEntry)
  await writeFeedback(entries)
  return newEntry
}

export async function listFeedback(filter?: { status?: string; userId?: string }): Promise<FeedbackEntry[]> {
  const entries = await readFeedback()
  if (filter?.status) {
    return entries.filter(e => e.status === filter.status)
  }
  return entries
}

export async function listUserFeedback(userId: string): Promise<FeedbackEntry[]> {
  const entries = await readFeedback()
  return entries.filter(e => e.userId === userId)
}

export async function markReviewed(id: string): Promise<boolean> {
  const entries = await readFeedback()
  const entry = entries.find(e => e.id === id)
  if (!entry) return false
  entry.status = 'REVIEWED'
  await writeFeedback(entries)
  return true
}
