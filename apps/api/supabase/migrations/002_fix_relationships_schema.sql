-- Fix: enforce NOT NULL on relationships invite columns
ALTER TABLE public.relationships
  ALTER COLUMN invitee_email SET NOT NULL,
  ALTER COLUMN invite_token SET NOT NULL,
  ALTER COLUMN invite_expires_at SET NOT NULL;

-- Fix: add UPDATE policy so invitees can accept their own pending invite
CREATE POLICY "Invitee can accept relationship" ON public.relationships
  FOR UPDATE
  USING (
    status = 'pending'
    AND invitee_email = (SELECT email FROM public.users WHERE id = auth.uid())
  )
  WITH CHECK (
    connected_user_id = auth.uid()
    AND status = 'accepted'
  );
