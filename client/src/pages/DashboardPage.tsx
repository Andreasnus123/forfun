import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { createApplication, deleteApplication, getAnalytics, getApplications } from '../lib/api'
import { useAuth } from '../auth/AuthContext'

const statusOptions = ['Applied', 'Interview', 'Offer', 'Rejected'] as const

const schema = z.object({
  company: z.string().min(1),
  role: z.string().min(1),
  status: z.enum(statusOptions),
  appliedDate: z.iso.date(),
  source: z.string().min(1),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export function DashboardPage() {
  const queryClient = useQueryClient()
  const { user, signOut } = useAuth()
  const { register, handleSubmit, reset, formState } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      status: 'Applied',
      appliedDate: new Date().toISOString().slice(0, 10),
      source: 'LinkedIn',
      notes: '',
    },
  })

  const applicationsQuery = useQuery({
    queryKey: ['applications'],
    queryFn: getApplications,
  })

  const analyticsQuery = useQuery({
    queryKey: ['analytics'],
    queryFn: getAnalytics,
  })

  const createMutation = useMutation({
    mutationFn: createApplication,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      reset({
        company: '',
        role: '',
        status: 'Applied',
        appliedDate: new Date().toISOString().slice(0, 10),
        source: 'LinkedIn',
        notes: '',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteApplication,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
    },
  })

  const onSubmit = (values: FormData) => createMutation.mutate(values)

  const totals = analyticsQuery.data?.totals

  return (
    <main className="dashboard">
      <header className="topbar">
        <div>
          <h1>Job Application Tracker</h1>
          <p className="muted">Welcome back, {user?.name}</p>
        </div>
        <button onClick={signOut}>Sign out</button>
      </header>

      <section className="stats-grid">
        <article className="stat-card">
          <h3>Total Applications</h3>
          <p>{totals?.total ?? 0}</p>
        </article>
        <article className="stat-card">
          <h3>Interviews</h3>
          <p>{totals?.interviews ?? 0}</p>
        </article>
        <article className="stat-card">
          <h3>Offers</h3>
          <p>{totals?.offers ?? 0}</p>
        </article>
        <article className="stat-card">
          <h3>Offer Rate</h3>
          <p>{totals?.offerRate ?? 0}%</p>
        </article>
      </section>

      <section className="content-grid">
        <article className="card">
          <h2>Add Application</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="form compact">
            <label>
              Company
              <input {...register('company')} />
            </label>
            <label>
              Role
              <input {...register('role')} />
            </label>
            <label>
              Status
              <select {...register('status')}>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Applied date
              <input type="date" {...register('appliedDate')} />
            </label>
            <label>
              Source
              <input {...register('source')} />
            </label>
            <label>
              Notes
              <textarea {...register('notes')} rows={3} />
            </label>
            {formState.isValid === false ? <span className="error">Please fill required fields.</span> : null}
            <button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </form>
        </article>

        <article className="card charts">
          <h2>Analytics</h2>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={analyticsQuery.data?.byMonth || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#4f46e5" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie
                  data={analyticsQuery.data?.byStatus || []}
                  dataKey="count"
                  nameKey="status"
                  outerRadius={80}
                  fill="#10b981"
                  label
                />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="card">
        <h2>Applications</h2>
        {applicationsQuery.isLoading ? <p>Loading applications...</p> : null}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Company</th>
                <th>Role</th>
                <th>Status</th>
                <th>Date</th>
                <th>Source</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {(applicationsQuery.data || []).map((item) => (
                <tr key={item.id}>
                  <td>{item.company}</td>
                  <td>{item.role}</td>
                  <td>{item.status}</td>
                  <td>{item.appliedDate}</td>
                  <td>{item.source}</td>
                  <td>
                    <button
                      className="danger"
                      onClick={() => deleteMutation.mutate(item.id)}
                      disabled={deleteMutation.isPending}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
