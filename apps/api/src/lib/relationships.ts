import { createSupabaseServerClient } from './supabase-server'

export async function hasAccessToPatient(
  callerId: string,
  callerRole: string,
  elderlyUserId: string
): Promise<boolean> {
  if (callerRole === 'elderly') return callerId === elderlyUserId
  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('relationships')
    .select('id')
    .eq('elderly_user_id', elderlyUserId)
    .eq('connected_user_id', callerId)
    .eq('status', 'accepted')
    .single()
  return data !== null
}
