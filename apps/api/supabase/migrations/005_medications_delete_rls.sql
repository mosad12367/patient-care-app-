-- Allow caregivers with an accepted relationship to delete medications for their patient
CREATE POLICY "caregivers_delete_medications" ON public.medications
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.relationships r
      WHERE r.elderly_user_id = medications.elderly_user_id
        AND r.connected_user_id = auth.uid()
        AND r.status = 'accepted'
    )
  );
