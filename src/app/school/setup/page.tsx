'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './page.module.css'
import { useToast } from '@/context/ToastContext'

export default function SchoolSetupPage() {
  const { success, error } = useToast()
  const [schoolName, setSchoolName] = useState('')
  const [schoolAbout, setSchoolAbout] = useState('')
  const [schoolImage, setSchoolImage] = useState('')
  const [schoolSlug, setSchoolSlug] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasSchool, setHasSchool] = useState(false)

  useEffect(() => {
    fetch('/api/school')
      .then(res => res.json())
      .then(data => {
        if (data.schoolName) {
          setSchoolName(data.schoolName || '')
          setSchoolAbout(data.schoolAbout || '')
          setSchoolImage(data.schoolImage || '')
          setSchoolSlug(data.schoolSlug || '')
          setHasSchool(true)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch('/api/school', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolName, schoolAbout, schoolImage })
      })

      if (res.ok) {
        const data = await res.json()
        setSchoolSlug(data.schoolSlug)
        setHasSchool(true)
        success('School saved successfully!')
      } else {
        error('Failed to save school')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className={styles.loading}>Loading...</div>
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/dashboard" className={styles.backLink}>
          ← Back to Dashboard
        </Link>
        <h1>{hasSchool ? 'Edit School' : 'Start a School'}</h1>
        <p className={styles.subtitle}>
          Create a school to share knowledge and content
        </p>
      </div>

      <form onSubmit={handleSave} className={styles.form}>
        <div className="form-group">
          <label>School Name *</label>
          <input
            type="text"
            value={schoolName}
            onChange={e => setSchoolName(e.target.value)}
            placeholder="e.g., Web Development Academy"
            required
          />
        </div>

        <div className="form-group">
          <label>About Your School</label>
          <textarea
            value={schoolAbout}
            onChange={e => setSchoolAbout(e.target.value)}
            placeholder="Describe what your school is about..."
            rows={4}
          />
        </div>

        <div className="form-group">
          <label>Cover Image URL</label>
          <input
            type="url"
            value={schoolImage}
            onChange={e => setSchoolImage(e.target.value)}
            placeholder="https://example.com/image.jpg"
          />
          {schoolImage && (
            <div className={styles.imagePreview}>
              <img src={schoolImage} alt="Preview" />
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : hasSchool ? 'Update School' : 'Create School'}
          </button>
          {schoolSlug && (
            <a 
              href={`/school/${schoolSlug}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.previewBtn}
            >
              Preview School
            </a>
          )}
        </div>
      </form>
    </div>
  )
}
