import { Link } from 'react-router-dom'
import { Button } from '~/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-xl text-center">
        <div className="text-sm uppercase tracking-[0.24em] text-neon-300">404</div>
        <h1 className="mt-4 text-5xl font-semibold tracking-[-0.05em] text-white">Rota nao encontrada</h1>
        <p className="mt-4 text-lg leading-8 text-mist">
          A nova arquitetura do AXION-PAY organiza melhor as rotas, mas esta URL nao existe no frontend atual.
        </p>
        <div className="mt-8">
          <Button asChild>
            <Link to="/">Voltar para a home</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
