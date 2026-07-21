import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { register } from '~/services/api/auth'
import { useSessionStore } from '~/store/session-store'

const schema = z.object({
  name: z.string().min(2, 'Informe o nome'),
  cpf: z.string().min(11, 'Informe o CPF'),
  whatsapp: z.string().min(8, 'Informe o WhatsApp'),
  password: z.string().min(8, 'Minimo de 8 caracteres'),
})

type FormValues = z.infer<typeof schema>

export function RegisterPage() {
  const navigate = useNavigate()
  const setSession = useSessionStore((state) => state.setSession)
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', cpf: '', whatsapp: '', password: '' },
  })

  const registerMutation = useMutation({
    mutationFn: register,
    onSuccess: (data) => {
      setSession(data)
      toast.success('Conta criada')
      navigate('/app/dashboard')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <Card>
      <h1 className="text-3xl font-semibold text-white">Criar conta</h1>
      <p className="mt-2 text-sm text-mist">Onboarding rapido para ativar API key e painel merchant.</p>
      <form className="mt-8 space-y-4" onSubmit={form.handleSubmit((values) => registerMutation.mutate(values))}>
        <div>
          <label className="mb-2 block text-sm text-mist">Nome</label>
          <Input {...form.register('name')} />
          <p className="mt-1 text-xs text-alert-danger">{form.formState.errors.name?.message}</p>
        </div>
        <div>
          <label className="mb-2 block text-sm text-mist">CPF</label>
          <Input {...form.register('cpf')} />
          <p className="mt-1 text-xs text-alert-danger">{form.formState.errors.cpf?.message}</p>
        </div>
        <div>
          <label className="mb-2 block text-sm text-mist">WhatsApp</label>
          <Input {...form.register('whatsapp')} />
          <p className="mt-1 text-xs text-alert-danger">{form.formState.errors.whatsapp?.message}</p>
        </div>
        <div>
          <label className="mb-2 block text-sm text-mist">Senha</label>
          <Input type="password" {...form.register('password')} />
          <p className="mt-1 text-xs text-alert-danger">{form.formState.errors.password?.message}</p>
        </div>
        <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
          Ativar conta
        </Button>
      </form>
      <p className="mt-6 text-sm text-mist">
        Ja possui acesso?{' '}
        <Link to="/login" className="text-neon-300 hover:text-neon-200">
          Entrar
        </Link>
      </p>
    </Card>
  )
}

