import { NextRequest, NextResponse } from 'next/server'
import { CreateInviteSchema } from '@phc/shared'
import { requireAuth } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { randomUUID } from 'crypto'

export async function GET(request: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const supabase = createSupabaseServerClient()

  const query = user.role === 'elderly'
    ? supabase
        .from('relationships')
        .select('*, connected_user:users!relationships_connected_user_id_fkey(id, name, email, role)')
        .eq('elderly_user_id', user.id)
    : supabase
        .from('relationships')
        .select('*, elderly_user:users!relationships_elderly_user_id_fkey(id, name, email, role)')
        .eq('connected_user_id', user.id)

  const { data, error: dbError } = await query
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ relationships: data })
}

export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  if (user.role !== 'elderly') {
    return NextResponse.json({ error: 'Only elderly users can send invites' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = CreateInviteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { invitee_email, invitee_role } = parsed.data
  const invite_token = randomUUID()
  const invite_expires_at = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()

  const supabase = createSupabaseServerClient()
  const { error: dbError } = await supabase.from('relationships').insert({
    elderly_user_id: user.id,
    invitee_email,
    role: invitee_role,
    invite_token,
    invite_expires_at,
  })

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  // In production: send invite_token via email using Supabase's email service or Resend
  // For MVP: return the token in the response so it can be sent manually / tested
  return NextResponse.json({ invite_token, expires_at: invite_expires_at }, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const body = await request.json() as Record<string, unknown>
  if (!body?.relationship_id || typeof body.relationship_id !== 'string') {
    return NextResponse.json({ error: 'relationship_id is required' }, { status: 400 })
  }
  const relationship_id = body.relationship_id as string
  const supabase = createSupabaseServerClient()

  const { data, error: dbError } = await supabase
    .from('relationships')
    .delete()
    .eq('id', relationship_id)
    .eq('elderly_user_id', user.id)
    .select()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  if (!data || data.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}
