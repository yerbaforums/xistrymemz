#!/usr/bin/env node
/**
 * Restore an encrypted XistrYmemZ backup offline.
 *
 * Usage:
 *   BACKUP_ENCRYPTION_KEY="…" node scripts/decrypt-backup.mjs backup-2026-01-01.sql.gz.enc -o restored.sql.gz
 *
 * The key must be the same BACKUP_ENCRYPTION_KEY that created
 * the backup. This is the disaster-recovery path when the
 * original instance is gone: download the ciphertext from the
 * IPFS gateway (any CID works) and decrypt it here.
 *
 * File layout (matches src/services/backupService.ts):
 *   [16-byte scrypt salt][12-byte IV][16-byte GCM auth tag][ciphertext]
 */
import fs from 'node:fs'
import crypto from 'node:crypto'

const args = process.argv.slice(2)
let input = null
let output = null
for (let i = 0; i < args.length; i++) {
  if (args[i] === '-o' || args[i] === '--output') {
    output = args[++i]
  } else {
    input = args[i]
  }
}

if (!input) {
  console.error('Usage: BACKUP_ENCRYPTION_KEY=… node scripts/decrypt-backup.mjs <backup.enc> [-o restored.sql.gz]')
  process.exit(1)
}

const passphrase = process.env.BACKUP_ENCRYPTION_KEY
if (!passphrase) {
  console.error('BACKUP_ENCRYPTION_KEY is not set.')
  process.exit(1)
}

const data = fs.readFileSync(input)
if (data.length < 44) {
  console.error('File too small to be an encrypted backup — is this the right file?')
  process.exit(1)
}

const salt = data.subarray(0, 16)
const iv = data.subarray(16, 28)
const tag = data.subarray(28, 44)
const ciphertext = data.subarray(44)

const key = crypto.scryptSync(passphrase, salt, 32)
const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
decipher.setAuthTag(tag)

try {
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  const out = output || input.replace(/\.enc$/, '')
  fs.writeFileSync(out, plain)
  console.log(`✔ Decrypted ${input} → ${out} (${plain.length} bytes)`)
} catch {
  console.error('✖ Decryption failed — wrong key, or the file is corrupted/tampered.')
  process.exit(1)
}
