export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  metadata?: {
    total?: number
    page?: number
    limit?: number
    [key: string]: unknown
  }
}

export type PaginatedResponse<T> = ApiResponse<T[]> & {
  metadata: { total: number; page: number; limit: number }
}
