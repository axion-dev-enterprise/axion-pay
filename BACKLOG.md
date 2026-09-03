# AXION Pay Core Backlog

## KYC onboarding — prioridade MVP

O gateway deve criar a conta operacional a partir da identidade já autenticada
no AXION Auth, registrar o perfil comercial de forma persistente e manter o
usuário bloqueado para emissão de chaves até a aprovação de KYC.

### Entrega inicial

- Perfil de onboarding por usuário, isolado por `auth_user_id`.
- Estados auditáveis: `DRAFT`, `SUBMITTED`, `IN_REVIEW`, `ACTION_REQUIRED`,
  `APPROVED` e `REJECTED`.
- Hash SHA-256 e últimos quatro dígitos do documento: o número completo não é
  persistido pelo gateway.
- Aceite explícito dos termos e política de privacidade antes do envio.
- Bloqueio server-side de chaves de API enquanto o KYC não estiver `APPROVED`.

### Dependência para automatização

A prova documental, biometria e decisão automática serão ativadas somente após
a contratação/configuração de um provedor KYC aprovado e credenciais no Vault.
Até então, o estado `SUBMITTED` representa uma solicitação real para revisão,
não uma identidade validada.
