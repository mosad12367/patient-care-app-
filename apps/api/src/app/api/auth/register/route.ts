import { NextRequest, NextResponse } from 'next/server'
import { RegisterSchema } from '@phc/shared'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = RegisterSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { email, password, name, phone, role } = parsed.data
  const supabase = createSupabaseServerClient()

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message ?? 'Registration failed' }, { status: 400 })
  }

  const { error: profileError } = await supabase.from('users').insert({
    id: authData.user.id,
    email,
    name,
    phone: phone ?? null,
    role,
  })

  if (profileError) {
    const admin = createSupabaseAdminClient()
    await admin.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 })
  }

  return NextResponse.json({ user: authData.user }, { status: 201 })
}
