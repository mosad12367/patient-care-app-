import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { z } from 'zod'

const PushTokenSchema = z.object({ token: z.string().min(1) })

export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const body = await request.json()
  const parsed = PushTokenSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const supabase = createSupabaseServerClient()
  const { error: dbError } = await supabase.from('push_tokens').upsert(
    { user_id: user.id, token: parsed.data.token },
    { onConflict: 'user_id,token' }
  )
  if (dbError) {
    return NextResponse.json({ error: 'Failed to register token' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
