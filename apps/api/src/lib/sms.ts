import twilio from 'twilio'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN

if (!accountSid || !authToken) {
  console.warn('Twilio credentials not configured — SMS will not be sent')
}

const client = accountSid && authToken ? twilio(accountSid, authToken) : null

export async function sendSms(to: string, message: string): Promise<void> {
  if (!to || !client) return
  const from = process.env.TWILIO_FROM_NUMBER
  if (!from) return
  await client.messages.create({ body: message, from, to })
}
