import { Navigate, createBrowserRouter } from 'react-router-dom'
import { ProtectedRoute } from '~/app/guards'
import { AppLayout } from '~/layouts/app-layout'
import { AuthLayout } from '~/layouts/auth-layout'
import { MarketingLayout } from '~/layouts/marketing-layout'
import { ApiKeysPage } from '~/pages/app/api-keys-page'
import { BillingPage } from '~/pages/app/billing-page'
import { CheckoutProPage } from '~/pages/app/checkout-pro-page'
import { CheckoutProPreviewPage } from '~/pages/app/checkout-pro-preview-page'
import { ClientsPage } from '~/pages/app/clients-page'
import { DashboardPage } from '~/pages/app/dashboard-page'
import { DocumentationPage } from '~/pages/app/documentation-page'
import { IntegrationsPage } from '~/pages/app/integrations-page'
import { ReportsPage } from '~/pages/app/reports-page'
import { SettingsPage } from '~/pages/app/settings-page'
import { SubscriptionsPage } from '~/pages/app/subscriptions-page'
import { TransactionsPage } from '~/pages/app/transactions-page'
import { WebhooksPage } from '~/pages/app/webhooks-page'
import { LoginPage } from '~/pages/auth/login-page'
import { RegisterPage } from '~/pages/auth/register-page'
import { ApiPage } from '~/pages/public/api-page'
import { CardPage } from '~/pages/public/card-page'
import { CheckoutLandingPage } from '~/pages/public/checkout-landing-page'
import { ContactPage } from '~/pages/public/contact-page'
import { DocsPage } from '~/pages/public/docs-page'
import { HomePage } from '~/pages/public/home-page'
import { PixPage } from '~/pages/public/pix-page'
import { PricingPage } from '~/pages/public/pricing-page'
import { PublicCheckoutPage } from '~/pages/public/public-checkout-page'
import { SdkPage } from '~/pages/public/sdk-page'
import { StatusPage } from '~/pages/public/status-page'
import { SubscriptionsLandingPage } from '~/pages/public/subscriptions-landing-page'
import { NotFoundPage } from '~/pages/system/not-found-page'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MarketingLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'checkout-pro', element: <CheckoutLandingPage /> },
      { path: 'pix', element: <PixPage /> },
      { path: 'cartao', element: <CardPage /> },
      { path: 'assinaturas', element: <SubscriptionsLandingPage /> },
      { path: 'api', element: <ApiPage /> },
      { path: 'sdk', element: <SdkPage /> },
      { path: 'precos', element: <PricingPage /> },
      { path: 'docs', element: <DocsPage /> },
      { path: 'contato', element: <ContactPage /> },
      { path: 'status', element: <StatusPage /> },
      { path: 'checkout/:slug', element: <PublicCheckoutPage /> },
      { path: 'premium/:slug', element: <PublicCheckoutPage /> },
    ],
  },
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  {
    path: '/app',
    element: (
      <ProtectedRoute roles={['merchant', 'admin']}>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/app/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'transacoes', element: <TransactionsPage /> },
      { path: 'cobrancas', element: <BillingPage /> },
      { path: 'clientes', element: <ClientsPage /> },
      { path: 'checkout-pro', element: <CheckoutProPage /> },
      { path: 'checkout-pro/configuracoes', element: <CheckoutProPage /> },
      { path: 'checkout-pro/preview', element: <CheckoutProPreviewPage /> },
      { path: 'webhooks', element: <WebhooksPage /> },
      { path: 'api-keys', element: <ApiKeysPage /> },
      { path: 'integracoes', element: <IntegrationsPage /> },
      { path: 'assinaturas', element: <SubscriptionsPage /> },
      { path: 'relatorios', element: <ReportsPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'documentacao', element: <DocumentationPage /> },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
