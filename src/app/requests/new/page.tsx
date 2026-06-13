'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/context/ToastContext'
import RequestForm from '@/components/RequestForm'
import type { RequestFormData } from '@/types/request'

export default function NewRequestPage() {
  const router = useRouter()
  const { success, error: toastError } = useToast()

  const handleSubmit = async (data: RequestFormData) => {
    const res = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: data.title,
        description: data.description || null,
        imageUrl: data.images[0] || null,
        category: data.category,
        priority: data.priority,
        budget: data.budget ? parseFloat(data.budget) : null,
        goalAmount: data.goalAmount ? parseFloat(data.goalAmount) : null,
        location: data.location || null,
        isPublic: data.isPublic,
        allowFulfillments: data.allowFulfillments,
        showDonationAddress: data.showDonationAddress,
        hashtags: data.hashtags,
      })
    })
    if (res.ok) {
      const created = await res.json()
      success('Request created!')
      router.push(`/requests/${created.id}`)
    } else {
      const err = await res.json()
      toastError(err.error || 'Failed to create request')
    }
  }

  return (
    <div className="page-container">
      <Link href="/requests" className="back-link">← Back to Requests</Link>
      <h1>New Request</h1>
      <div className="form-card">
        <RequestForm onSubmit={handleSubmit} />
      </div>
    </div>
  )
}
