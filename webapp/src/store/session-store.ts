import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ApiKeyRecord, MerchantUser } from '~/types/domain'

interface SessionState {
  user: MerchantUser | null
  apiKeys: ApiKeyRecord[]
  activeApiKeyId: string | null
  setSession: (payload: { user: MerchantUser; apiKeys?: ApiKeyRecord[] }) => void
  setApiKeys: (apiKeys: ApiKeyRecord[]) => void
  setActiveApiKeyId: (id: string | null) => void
  clearSession: () => void
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      apiKeys: [],
      activeApiKeyId: null,
      setSession: ({ user, apiKeys = [] }) =>
        set({
          user,
          apiKeys,
          activeApiKeyId: apiKeys[0]?.id ?? null,
        }),
      setApiKeys: (apiKeys) =>
        set((state) => ({
          apiKeys,
          activeApiKeyId:
            apiKeys.find((item) => item.id === state.activeApiKeyId)?.id ?? apiKeys[0]?.id ?? null,
        })),
      setActiveApiKeyId: (activeApiKeyId) => set({ activeApiKeyId }),
      clearSession: () => set({ user: null, apiKeys: [], activeApiKeyId: null }),
    }),
    { name: 'axion-pay-session' },
  ),
)

export function getActiveApiKeyValue() {
  const { activeApiKeyId, apiKeys } = useSessionStore.getState()
  return apiKeys.find((item) => item.id === activeApiKeyId)?.key ?? ''
}

