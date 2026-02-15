export type Status = 'Applied' | 'Interview' | 'Offer' | 'Rejected'

export interface User {
  id: string
  name: string
  email: string
}

export interface AuthResponse {
  token: string
  user: User
}

export interface JobApplication {
  id: string
  company: string
  role: string
  status: Status
  appliedDate: string
  source: string
  notes: string
  createdAt: string
  updatedAt: string
}

export interface AnalyticsResponse {
  totals: {
    total: number
    interviews: number
    offers: number
    offerRate: number
    interviewRate: number
  }
  byStatus: Array<{ status: Status; count: number }>
  byMonth: Array<{ month: string; count: number }>
}
