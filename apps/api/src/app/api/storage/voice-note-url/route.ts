import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { randomUUID } from 'crypto'

export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  if (user.role !== 'elderly') {
    return NextResponse.json({ error: 'Only elderly users can upload voice notes' }, { status: 403 })
  }

  const fileName = `${user.id}/${randomUUID()}.m4a`
  const supabase = createSupabaseAdminClient()

  const { data, error: storageError } = await supabase.storage
    .from('voice-notes')
    .createSignedUploadUrl(fileName)

  if (storageError) return NextResponse.json({ error: storageError.message }, { status: 500 })

  // Also generate the public download URL (will be valid after upload completes)
  const { data: downloadData } = await supabase.storage
    .from('voice-notes')
    .createSignedUrl(fileName, 60 * 60 * 24 * 365) // 1-year signed download URL

  return NextResponse.json({
    upload_url: data.signedUrl,
    token: data.token,
    path: fileName,
    download_url: downloadData?.signedUrl ?? null,
  })
}
