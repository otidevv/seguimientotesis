import { toast } from 'sonner'

export type ApiResponse<T = Record<string, unknown>> = T & {
  success: boolean
  error?: string
  message?: string
}

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: Record<string, string[]>,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

type RequestOptions = {
  showErrorToast?: boolean
  params?: Record<string, string | number | boolean | undefined | null> | object
}

// Deduplica refreshes concurrentes: si varios requests reciben 401 al mismo tiempo,
// comparten un único POST a /api/auth/refresh.
let refreshPromise: Promise<boolean> | null = null

const REFRESH_TIMEOUT_MS = 8000

async function tryRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), REFRESH_TIMEOUT_MS)
      try {
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
          signal: controller.signal,
        })
        return response.ok
      } catch {
        return false
      } finally {
        clearTimeout(timeoutId)
      }
    })().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

async function request<T = Record<string, unknown>>(
  url: string,
  init?: RequestInit,
  options?: RequestOptions,
): Promise<ApiResponse<T>> {
  const { showErrorToast = false, params } = options ?? {}

  if (params) {
    const searchParams = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (value != null && value !== '') {
        searchParams.set(key, String(value))
      }
    }
    const qs = searchParams.toString()
    if (qs) url += (url.includes('?') ? '&' : '?') + qs
  }

  const doFetch = () => fetch(url, {
    credentials: 'include',
    ...init,
  })

  try {
    let response = await doFetch()

    // Auto-refresh en 401: intentar renovar el access token y reintentar la petición
    // una única vez. No reintentar sobre /api/auth/* para evitar bucles.
    if (response.status === 401 && !url.includes('/api/auth/')) {
      const preview = await response.clone().json().catch(() => null)
      const code = preview?.code
      if (code === 'TOKEN_INVALID' || code === 'UNAUTHORIZED') {
        const refreshed = await tryRefresh()
        if (refreshed) {
          response = await doFetch()
        }
      }
    }

    const data = await response.json()

    if (!response.ok || !data.success) {
      let message = data.message || data.error || `Error ${response.status}`
      if (data.details) {
        const fieldErrors = Object.values(data.details as Record<string, string[]>).flat()
        if (fieldErrors.length > 0) {
          message = fieldErrors.join('. ')
        }
      }
      if (showErrorToast) toast.error(message)
      throw new ApiError(message, response.status, data.error, data.details as Record<string, string[]>)
    }

    return data as ApiResponse<T>
  } catch (error) {
    if (error instanceof ApiError) throw error
    const message = 'Error de conexión'
    if (showErrorToast) toast.error(message)
    throw new ApiError(message, 0)
  }
}

export const api = {
  get<T = Record<string, unknown>>(url: string, options?: RequestOptions) {
    return request<T>(url, undefined, options)
  },

  post<T = Record<string, unknown>>(url: string, body?: unknown, options?: RequestOptions) {
    const isFormData = body instanceof FormData
    return request<T>(
      url,
      {
        method: 'POST',
        headers: isFormData ? undefined : { 'Content-Type': 'application/json' },
        body: isFormData ? body : JSON.stringify(body),
      },
      options,
    )
  },

  put<T = Record<string, unknown>>(url: string, body?: unknown, options?: RequestOptions) {
    return request<T>(
      url,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
      options,
    )
  },

  patch<T = Record<string, unknown>>(url: string, body?: unknown, options?: RequestOptions) {
    return request<T>(
      url,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
      options,
    )
  },

  delete<T = Record<string, unknown>>(url: string, body?: unknown, options?: RequestOptions) {
    return request<T>(
      url,
      {
        method: 'DELETE',
        ...(body != null && {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }),
      },
      options,
    )
  },
}

export { ApiError }
