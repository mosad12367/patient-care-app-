import twilio from 'twilio'

const supabaseUrl = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN

if (!supabaseUrl || !authToken) {
  console.warn('Twilio credentials not configured — SMS will not be sent')
}

const client = supabaseUrl && authToken ? twilio(supabaseUrl, authToken) : null

export async function sendSms(to: string, message: string): Promise<void> {
  if (!to || !client) return
  const from = process.env.TWILIO_FROM_NUMBER
  if (!from) return
  await client.messages.create({ body: message, from, to })
}
