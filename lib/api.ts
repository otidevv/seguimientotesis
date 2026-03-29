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
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

type RequestOptions = {
  showErrorToast?: boolean
  params?: Record<string, string | number | boolean | undefined | null> | object
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

  try {
    const response = await fetch(url, {
      credentials: 'include',
      ...init,
    })

    const data = await response.json()

    if (!response.ok || !data.success) {
      const message = data.error || `Error ${response.status}`
      if (showErrorToast) toast.error(message)
      throw new ApiError(message, response.status, data.error)
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
