import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { login } from '../lib/api'
import { useAuth } from '../auth/AuthContext'
import { getApiErrorMessage } from '../lib/errors'

const schema = z.object({
  email: z.email(),
  password: z.string().min(6),
})

type FormData = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const { register, handleSubmit, formState } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      signIn(data.token, data.user)
      navigate('/dashboard')
    },
  })

  const onSubmit = (values: FormData) => mutation.mutate(values)
  const errorMessage = mutation.isError
    ? getApiErrorMessage(mutation.error, 'Unable to sign in. Check your credentials.')
    : null

  return (
    <main className="page-center">
      <section className="card">
        <h1>Job Application Tracker</h1>
        <p className="muted">Sign in to manage your pipeline and analytics.</p>
        <form onSubmit={handleSubmit(onSubmit)} className="form">
          <label>
            Email
            <input type="email" {...register('email')} />
          </label>
          {formState.errors.email ? <span className="error">{formState.errors.email.message}</span> : null}

          <label>
            Password
            <input type="password" {...register('password')} />
          </label>
          {formState.errors.password ? <span className="error">{formState.errors.password.message}</span> : null}

          {errorMessage ? <span className="error">{errorMessage}</span> : null}

          <button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="muted">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </section>
    </main>
  )
}
