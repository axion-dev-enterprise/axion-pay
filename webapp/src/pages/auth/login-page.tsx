import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { getMe, login } from '~/services/api/auth'
import { useSessionStore } from '~/store/session-store'

const schema = z.object({
  identifier: z.string().min(5, 'Informe WhatsApp ou e-mail'),
  password: z.string().min(1, 'Informe a senha'),
})

type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const setSession = useSessionStore((state) => state.setSession)
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: '', password: '' },
  })

  const loginMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      await login(values)
      return getMe()
    },
    onSuccess: (data) => {
      setSession(data)
      toast.success('Sessao iniciada')
      navigate(location.state?.from || '/app/dashboard')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <Card>
      <h1 className="text-3xl font-semibold text-white">Entrar</h1>
      <p className="mt-2 text-sm text-mist">Acesse o painel do merchant e sua camada de integracao.</p>
      <form className="mt-8 space-y-4" onSubmit={form.handleSubmit((values) => loginMutation.mutate(values))}>
        <div>
          <label className="mb-2 block text-sm text-mist">WhatsApp ou e-mail</label>
          <Input {...form.register('identifier')} />
          <p className="mt-1 text-xs text-alert-danger">{form.formState.errors.identifier?.message}</p>
        </div>
        <div>
          <label className="mb-2 block text-sm text-mist">Senha</label>
          <Input type="password" {...form.register('password')} />
          <p className="mt-1 text-xs text-alert-danger">{form.formState.errors.password?.message}</p>
        </div>
        <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
          Entrar no dashboard
        </Button>
      </form>
      <p className="mt-6 text-sm text-mist">
        Ainda sem conta?{' '}
        <Link to="/register" className="text-neon-300 hover:text-neon-200">
          Criar agora
        </Link>
      </p>
    </Card>
  )
}

