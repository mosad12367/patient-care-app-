import { createSupabaseAdminClient } from './supabase-server'

export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', userId)

  if (!tokens || tokens.length === 0) return

  const messages = tokens.map((t) => ({
    to: t.token,
    title,
    body,
    data: data ?? {},
    sound: 'default',
  }))

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  })

  if (!response.ok) {
    console.error('Push notification failed:', await response.text())
  }
}
