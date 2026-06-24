import { NextRequest, NextResponse } from 'next/server'
import { AcknowledgeDoseSchema } from '@phc/shared'
import { requireAuth } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const body = await request.json()
  const parsed = AcknowledgeDoseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const supabase = createSupabaseServerClient()
  const { data, error: dbError } = await supabase
    .from('dose_logs')
    .update({
      status: parsed.data.status,
      taken_at: parsed.data.status === 'taken' ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .select()
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ dose: data })
}
