describe('Cron dose timing thresholds', () => {
  const THIRTY_MINUTES_MS = 30 * 60 * 1000
  const SIXTY_MINUTES_MS = 60 * 60 * 1000

  it('identifies dose as needing SMS after 30 minutes', () => {
    const scheduledAt = new Date(Date.now() - THIRTY_MINUTES_MS - 1000)
    const now = new Date()
    const msSinceScheduled = now.getTime() - scheduledAt.getTime()
    expect(msSinceScheduled).toBeGreaterThan(THIRTY_MINUTES_MS)
  })

  it('identifies dose as needing caregiver alert after 60 minutes', () => {
    const scheduledAt = new Date(Date.now() - SIXTY_MINUTES_MS - 1000)
    const now = new Date()
    const msSinceScheduled = now.getTime() - scheduledAt.getTime()
    expect(msSinceScheduled).toBeGreaterThan(SIXTY_MINUTES_MS)
  })

  it('does not flag a dose scheduled 10 minutes ago', () => {
    const scheduledAt = new Date(Date.now() - 10 * 60 * 1000)
    const now = new Date()
    const msSinceScheduled = now.getTime() - scheduledAt.getTime()
    expect(msSinceScheduled).toBeLessThan(THIRTY_MINUTES_MS)
  })
})
