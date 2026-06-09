'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import styles from './page.module.css'
import Button from '@/components/ui/Button'
import { EmptyState } from '@/components/EmptyState'
import Breadcrumbs from '@/components/Breadcrumbs'

interface User {
  id: string
  email: string
  name: string | null
  image: string | null
  role: string
  verificationLevel: string
  reputationScore: number
  balance: number
  location: string | null
  verifiedEmail: boolean
  verifiedPhone: boolean
  verifiedIdentity: boolean
  verifiedAddress: boolean
  createdAt: string
  _count: {
    plans: number
    requests: number
    sentConnections: number
    receivedConnections: number
  }
}

interface UsersResponse {
  users: User[]
  total: number
  page: number
  totalPages: number
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [updating, setUpdating] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [resetting, setResetting] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null)

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }, [])

  const fetchUsers = async (p = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: p.toString(),
        limit: '50',
        ...(search ? { search } : {}),
        ...(roleFilter !== 'ALL' ? { role: roleFilter } : {})
      })
      const res = await fetch(`/api/admin/users?${params}`)
      if (res.ok) {
        const data: UsersResponse = await res.json()
        setUsers(data.users)
        setTotal(data.total)
        setTotalPages(data.totalPages)
        setPage(data.page)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers(1)
  }, [roleFilter])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchUsers(1)
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdating(userId)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole })
      })
      if (res.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
        showToast(`User role changed to ${newRole}`, 'success')
      } else {
        const data = await res.json()
        showToast(data.error || 'Failed to update role', 'error')
      }
    } catch (error) {
      console.error('Failed to update role:', error)
      showToast('Failed to update role', 'error')
    } finally {
      setUpdating(null)
    }
  }

  const handleDelete = async (userId: string) => {
    setDeleting(userId)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        setUsers(users.filter(u => u.id !== userId))
        showToast('User deleted', 'success')
      } else {
        const data = await res.json()
        showToast(data.error || 'Failed to delete user', 'error')
      }
    } catch (error) {
      console.error('Failed to delete user:', error)
      showToast('Failed to delete user', 'error')
    } finally {
      setDeleting(null)
      setConfirmDelete(null)
    }
  }

  const handleResetPassword = async (userId: string) => {
    setResetting(userId)
    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST'
      })
      if (res.ok) {
        showToast('Password reset email sent', 'success')
      } else {
        const data = await res.json()
        showToast(data.error || 'Failed to send reset email', 'error')
      }
    } catch (error) {
      console.error('Failed to reset password:', error)
      showToast('Failed to send reset email', 'error')
    } finally {
      setResetting(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className={styles.page}>
      {toast && (
        <div className={`${styles.toast} ${toast.type === 'success' ? styles.toastSuccess : styles.toastError}`}>
          {toast.message}
        </div>
      )}

      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Admin', href: '/admin' }, { label: 'Users' }]} />
      <div className={styles.header}>
        <div>
          <h1>User Management</h1>
          <p className={styles.subtitle}>{total} total users</p>
        </div>
      </div>

      <div className={styles.toolbar}>
        <form onSubmit={handleSearch} className={styles.searchForm}>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={styles.searchInput}
          />
          <Button type="submit" variant="primary">Search</Button>
        </form>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="ALL">All Roles</option>
          <option value="ADMIN">Admins</option>
          <option value="USER">Users</option>
        </select>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading users...</div>
      ) : users.length === 0 ? (
        <EmptyState icon="👥" title="No users found" description="Users will appear here once they register on the platform." />
      ) : (
        <>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Verification</th>
                  <th>Reputation</th>
                  <th>Balance</th>
                  <th>Activity</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>
                      <div className={styles.userInfo}>
                        <div className={styles.avatar}>
                          {user.image ? (
                            <Image src={user.image} alt={user.name || 'User'} fill sizes="32px" />
                          ) : (
                            <span>{(user.name?.[0] || user.email[0]).toUpperCase()}</span>
                          )}
                        </div>
                        <div className={styles.userDetail}>
                          <span className={styles.userName}>{user.name || '—'}</span>
                          <span className={styles.userEmail}>{user.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`${styles.roleBadge} ${user.role === 'ADMIN' ? styles.admin : styles.userRole}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <div className={styles.verification}>
                        <span className={styles.verifyBadge} data-verified={user.verifiedEmail}>📧</span>
                        <span className={styles.verifyBadge} data-verified={user.verifiedPhone}>📱</span>
                        <span className={styles.verifyBadge} data-verified={user.verifiedIdentity}>🪪</span>
                        <span className={styles.verifyBadge} data-verified={user.verifiedAddress}>📍</span>
                        <span className={styles.verifyLevel}>{user.verificationLevel}</span>
                      </div>
                    </td>
                    <td>
                      <span className={styles.reputation}>{user.reputationScore.toFixed(1)}</span>
                    </td>
                    <td>
                      <span className={styles.balance}>${user.balance.toFixed(2)}</span>
                    </td>
                    <td>
                      <div className={styles.activity}>
                        <span>{user._count.plans} plans</span>
                        <span>{user._count.requests} reqs</span>
                        <span>{user._count.sentConnections + user._count.receivedConnections} conn</span>
                      </div>
                    </td>
                    <td>
                      <span className={styles.date}>{formatDate(user.createdAt)}</span>
                    </td>
                    <td>
                      <div className={styles.actionGroup}>
                        {user.role === 'ADMIN' ? (
                          <button
                            onClick={() => handleRoleChange(user.id, 'USER')}
                            disabled={updating === user.id}
                            className={styles.demoteBtn}
                          >
                            {updating === user.id ? '...' : 'Demote'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRoleChange(user.id, 'ADMIN')}
                            disabled={updating === user.id}
                            className={styles.promoteBtn}
                          >
                            {updating === user.id ? '...' : 'Promote'}
                          </button>
                        )}
                        <button
                          onClick={() => handleResetPassword(user.id)}
                          disabled={resetting === user.id}
                          className={styles.resetPwdBtn}
                        >
                          {resetting === user.id ? '...' : 'Reset Pwd'}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(user)}
                          disabled={deleting === user.id}
                          className={styles.deleteBtn}
                        >
                          {deleting === user.id ? '...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                onClick={() => fetchUsers(page - 1)}
                disabled={page <= 1}
                className={styles.pageBtn}
              >
                Previous
              </button>
              <span className={styles.pageInfo}>
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => fetchUsers(page + 1)}
                disabled={page >= totalPages}
                className={styles.pageBtn}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {confirmDelete && (
        <div className={styles.overlay} onClick={() => setConfirmDelete(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Delete User</h2>
            <p className={styles.modalText}>
              Are you sure you want to permanently delete <strong>{confirmDelete.name || confirmDelete.email}</strong>?
            </p>
            <p className={styles.modalWarning}>
              This will permanently delete all of their plans, requests, products, posts, messages, and all other associated data. This action cannot be undone.
            </p>
            <div className={styles.modalActions}>
              <button
                onClick={() => setConfirmDelete(null)}
                className={styles.cancelBtn}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete.id)}
                disabled={deleting === confirmDelete.id}
                className={styles.confirmDeleteBtn}
              >
                {deleting === confirmDelete.id ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}