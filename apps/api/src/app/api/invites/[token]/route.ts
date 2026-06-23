import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const { user, error } = await requireAuth(request)
  if (error) return error

  const supabase = createSupabaseServerClient()

  // Find the pending invite
  const { data: relationship, error: findError } = await supabase
    .from('relationships')
    .select('*')
    .eq('invite_token', params.token)
    .eq('status', 'pending')
    .single()

  if (findError || !relationship) {
    return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 404 })
  }

  if (new Date(relationship.invite_expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invite has expired' }, { status: 410 })
  }

  if (relationship.invitee_email !== user.email) {
    return NextResponse.json({ error: 'This invite was sent to a different email' }, { status: 403 })
  }

  const { error: updateError } = await supabase
    .from('relationships')
    .update({ status: 'accepted', connected_user_id: user.id })
    .eq('id', relationship.id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
