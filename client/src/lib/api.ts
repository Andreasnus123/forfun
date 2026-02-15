import axios from 'axios'
import type { AnalyticsResponse, AuthResponse, JobApplication } from './types'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

const api = axios.create({ baseURL })

export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`
  } else {
    delete api.defaults.headers.common.Authorization
  }
}

export async function register(payload: { name: string; email: string; password: string }) {
  const response = await api.post<AuthResponse>('/auth/register', payload)
  return response.data
}

export async function login(payload: { email: string; password: string }) {
  const response = await api.post<AuthResponse>('/auth/login', payload)
  return response.data
}

export async function getApplications() {
  const response = await api.get<JobApplication[]>('/applications')
  return response.data
}

export async function createApplication(payload: {
  company: string
  role: string
  status: 'Applied' | 'Interview' | 'Offer' | 'Rejected'
  appliedDate: string
  source: string
  notes?: string
}) {
  const response = await api.post<JobApplication>('/applications', payload)
  return response.data
}

export async function deleteApplication(id: string) {
  await api.delete(`/applications/${id}`)
}

export async function getAnalytics() {
  const response = await api.get<AnalyticsResponse>('/analytics')
  return response.data
}
