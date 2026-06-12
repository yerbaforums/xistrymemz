export async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error || `Request failed: ${res.status}`)
  }
  const data = await res.json()
  return (data?.data ?? data) as T
}
