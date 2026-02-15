import axios from 'axios'

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const serverMessage = (error.response?.data as { message?: string } | undefined)?.message
    if (serverMessage) {
      return serverMessage
    }

    if (error.code === 'ERR_NETWORK') {
      return 'Cannot connect to API. Start backend server on http://localhost:4000.'
    }
  }

  return fallback
}
