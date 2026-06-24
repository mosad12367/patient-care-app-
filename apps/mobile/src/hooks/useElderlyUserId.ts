import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

export function useElderlyUserId() {
  const [elderlyUserId, setElderlyUserId] = useState<string | null>(null)

  useEffect(() => {
    api.get<{ relationships: Array<{ elderly_user_id: string; status: string; role: string }> }>('/api/invites')
      .then(({ relationships }) => {
        const accepted = relationships.find((r) => r.status === 'accepted' && r.role === 'caregiver')
        if (accepted) setElderlyUserId(accepted.elderly_user_id)
      })
      .catch(() => {})
  }, [])

  return elderlyUserId
}
