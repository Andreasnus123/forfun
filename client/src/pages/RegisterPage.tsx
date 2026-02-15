import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { register as registerApi } from '../lib/api'
import { useAuth } from '../auth/AuthContext'

const schema = z
  .object({
    name: z.string().min(2),
    email: z.email(),
    password: z.string().min(6),
    confirmPassword: z.string().min(6),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type FormData = z.infer<typeof schema>

export function RegisterPage() {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const { register, handleSubmit, formState } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const mutation = useMutation({
    mutationFn: (values: FormData) =>
      registerApi({ name: values.name, email: values.email, password: values.password }),
    onSuccess: (data) => {
      signIn(data.token, data.user)
      navigate('/dashboard')
    },
  })

  const onSubmit = (values: FormData) => mutation.mutate(values)

  return (
    <main className="page-center">
      <section className="card">
        <h1>Create account</h1>
        <p className="muted">Set up your tracker workspace in under a minute.</p>
        <form onSubmit={handleSubmit(onSubmit)} className="form">
          <label>
            Full name
            <input {...register('name')} />
          </label>
          {formState.errors.name ? <span className="error">{formState.errors.name.message}</span> : null}

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

          <label>
            Confirm password
            <input type="password" {...register('confirmPassword')} />
          </label>
          {formState.errors.confirmPassword ? (
            <span className="error">{formState.errors.confirmPassword.message}</span>
          ) : null}

          {mutation.isError ? <span className="error">Unable to create account.</span> : null}

          <button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Creating...' : 'Create account'}
          </button>
        </form>
        <p className="muted">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </section>
    </main>
  )
}
