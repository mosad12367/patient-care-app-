import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const { user, error } = await requireAuth(request)
  if (error) return error
  return NextResponse.json({ user })
}
