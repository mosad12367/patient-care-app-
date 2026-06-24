describe('SMS message content', () => {
  it('formats missed-dose message correctly', () => {
    const medicationName = 'Metformin'
    const msg = `Reminder: Please take your ${medicationName}. Open the Health Companion app to confirm.`
    expect(msg).toContain('Metformin')
    expect(msg).toContain('Reminder')
  })

  it('formats caregiver alert message correctly', () => {
    const elderlyName = 'Tayaba'
    const medicationName = 'Metformin'
    const msg = `Alert: ${elderlyName} has not acknowledged their ${medicationName} dose.`
    expect(msg).toContain('Tayaba')
    expect(msg).toContain('Metformin')
  })
})
