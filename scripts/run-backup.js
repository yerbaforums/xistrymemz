const { createDatabaseDump, uploadToIPFS, generateMagnetLink, saveBackupRecord } = require('./src/services/backupService')

async function main() {
  try {
    console.log('Creating database dump...')
    const dump = await createDatabaseDump()
    console.log(`Dump created: ${dump.fileName} (${(dump.fileSize / 1024).toFixed(1)}KB)`)

    console.log('Uploading to IPFS...')
    const cid = await uploadToIPFS(dump.filePath)
    console.log(`CID: ${cid}`)

    const magnetLink = generateMagnetLink(cid, dump.fileName)

    console.log('Saving backup record...')
    const backup = await saveBackupRecord({
      cid,
      magnetLink,
      fileName: dump.fileName,
      fileSize: dump.fileSize,
      dbSize: dump.dbSize,
      userId: 'system',
    })
    console.log(`Backup saved: ${backup.id}`)
    console.log('Backup complete!')
  } catch (error) {
    console.error('Backup failed:', error)
    process.exit(1)
  }
}

main()
