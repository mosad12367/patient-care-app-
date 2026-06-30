import { NextRequest, NextResponse } from 'next/server'
import { CreateInviteSchema } from '@phc/shared'
import { requireAuth } from '@/lib/auth'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { randomUUID } from 'crypto'

export async function GET(request: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const admin = createSupabaseAdminClient()

  if (user.role === 'elderly') {
    const { data, error: dbError } = await admin
      .from('relationships')
      .select('*, connected_user:users!relationships_connected_user_id_fkey(id, name, email, role)')
      .eq('elderly_user_id', user.id)
    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
    return NextResponse.json({ relationships: data })
  }

  // Caregiver: fetch by connected_user_id OR by invitee_email (covers invites sent before they registered)
  const [byId, byEmail] = await Promise.all([
    admin
      .from('relationships')
      .select('*, elderly_user:users!relationships_elderly_user_id_fkey(id, name, email, role)')
      .eq('connected_user_id', user.id),
    admin
      .from('relationships')
      .select('*, elderly_user:users!relationships_elderly_user_id_fkey(id, name, email, role)')
      .eq('invitee_email', user.email)
      .is('connected_user_id', null),
  ])

  const seen = new Set<string>()
  const combined = [...(byId.data ?? []), ...(byEmail.data ?? [])].filter((r) => {
    if (seen.has(r.id)) return false
    seen.add(r.id)
    return true
  })

  const query = { data: combined, error: byId.error ?? byEmail.error }

  if (query.error) return NextResponse.json({ error: query.error.message }, { status: 500 })
  return NextResponse.json({ relationships: query.data })
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

  const admin = createSupabaseAdminClient()

  // Check if the invitee already has an account so we can link them immediately
  const { data: existingUser } = await admin
    .from('users')
    .select('id')
    .eq('email', invitee_email)
    .single()

  const { error: dbError } = await admin.from('relationships').insert({
    elderly_user_id: user.id,
    invitee_email,
    role: invitee_role,
    invite_token,
    invite_expires_at,
    connected_user_id: existingUser?.id ?? null,
  })

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ success: true, linked: !!existingUser }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const body = await request.json() as Record<string, unknown>
  const relationship_id = body.relationship_id as string
  const action = body.action as 'accept' | 'reject'

  if (!relationship_id || !action) {
    return NextResponse.json({ error: 'relationship_id and action are required' }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()

  const { data: rel } = await admin
    .from('relationships')
    .select('*')
    .eq('id', relationship_id)
    .eq('invitee_email', user.email)
    .eq('status', 'pending')
    .single()

  if (!rel) return NextResponse.json({ error: 'Invite not found' }, { status: 404 })

  if (action === 'accept') {
    await admin
      .from('relationships')
      .update({ status: 'accepted', connected_user_id: user.id })
      .eq('id', relationship_id)
  } else {
    await admin
      .from('relationships')
      .update({ status: 'rejected' })
      .eq('id', relationship_id)
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const body = await request.json() as Record<string, unknown>
  if (!body?.relationship_id || typeof body.relationship_id !== 'string') {
    return NextResponse.json({ error: 'relationship_id is required' }, { status: 400 })
  }
  const relationship_id = body.relationship_id as string
  const admin = createSupabaseAdminClient()

  const { data, error: dbError } = await admin
    .from('relationships')
    .delete()
    .eq('id', relationship_id)
    .eq('elderly_user_id', user.id)
    .select()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  if (!data || data.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}
