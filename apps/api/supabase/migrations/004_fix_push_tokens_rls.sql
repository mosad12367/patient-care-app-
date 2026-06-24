-- Replace push_tokens_own policy with explicit read/write separation
DROP POLICY IF EXISTS "push_tokens_own" ON public.push_tokens;

CREATE POLICY "push_tokens_select" ON public.push_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "push_tokens_insert" ON public.push_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "push_tokens_delete" ON public.push_tokens
  FOR DELETE USING (auth.uid() = user_id);
