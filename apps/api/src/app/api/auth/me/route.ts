import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error
  return NextResponse.json({ user })
}
