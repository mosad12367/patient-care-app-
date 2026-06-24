import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 11, color: '#222' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 12, color: '#666', marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', marginTop: 16, marginBottom: 6, borderBottomWidth: 1, borderBottomColor: '#ddd', paddingBottom: 4 },
  row: { flexDirection: 'row', marginBottom: 4 },
  label: { width: 140, color: '#555' },
  value: { flex: 1 },
  bullet: { marginBottom: 3 },
})

interface SummaryData {
  elderlyName: string
  generatedAt: string
  periodDays: number
  totalDoses: number
  missedDoses: number
  medications: Array<{ name: string; dosage: string; frequency: string }>
  symptomCounts: Array<{ symptom: string; count: number; avgSeverity: number }>
  patterns: Array<{ message: string }>
}

export function HealthSummaryPdf({ data }: { data: SummaryData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Health Summary — {data.elderlyName}</Text>
        <Text style={styles.subtitle}>
          Generated {data.generatedAt} · Last {data.periodDays} days
        </Text>

        <Text style={styles.sectionTitle}>Medications</Text>
        {data.medications.map((m, i) => (
          <View key={i} style={styles.row}>
            <Text style={styles.label}>{m.name} ({m.dosage})</Text>
            <Text style={styles.value}>{m.frequency}</Text>
          </View>
        ))}
        <View style={styles.row}>
          <Text style={styles.label}>Doses this period:</Text>
          <Text style={styles.value}>{data.totalDoses} scheduled, {data.missedDoses} missed</Text>
        </View>

        <Text style={styles.sectionTitle}>Symptoms Logged</Text>
        {data.symptomCounts.length === 0 ? (
          <Text>No symptoms logged in this period.</Text>
        ) : (
          data.symptomCounts.map((s, i) => (
            <Text key={i} style={styles.bullet}>
              • {s.symptom}: {s.count} time{s.count !== 1 ? 's' : ''} (avg severity {s.avgSeverity.toFixed(1)}/5)
            </Text>
          ))
        )}

        {data.patterns.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Notable Patterns</Text>
            {data.patterns.map((p, i) => (
              <Text key={i} style={styles.bullet}>• {p.message}</Text>
            ))}
          </>
        )}

        <Text style={{ marginTop: 30, fontSize: 9, color: '#999' }}>
          This summary is for informational purposes only and does not constitute medical advice.
        </Text>
      </Page>
    </Document>
  )
}
