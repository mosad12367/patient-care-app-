-- Tighten symptom_logs SELECT policy to caregiver-only (consistent with app layer)
DROP POLICY IF EXISTS "Elderly user and connected caregivers can select symptom logs" ON public.symptom_logs;

CREATE POLICY "Elderly user and connected caregivers can select symptom logs" ON public.symptom_logs
  FOR SELECT
  USING (
    elderly_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.relationships
      WHERE elderly_user_id = public.symptom_logs.elderly_user_id
        AND connected_user_id = auth.uid()
        AND status = 'accepted'
        AND role = 'caregiver'
    )
  );
