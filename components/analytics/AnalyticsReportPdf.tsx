"use client";

import * as React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

type AnalyticsData = {
  controls: { from: string; to: string; projectId: string | null };
  stats: {
    totalMinutesAllTime: number;
    activeProjectsCount: number;
    pendingApprovalsCount: number;
    outstandingInvoicesTotal: number;
  };
  charts: {
    milestoneCompletion: { percentComplete: number };
    invoiceStatus: { total: number; paid: number; pending: number; overdue: number; outstandingTotal: number };
  };
};

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 11, color: "#09090b" },
  title: { fontSize: 16, fontWeight: 700 },
  subtitle: { marginTop: 4, fontSize: 11, color: "#52525b" },
  section: { marginTop: 18 },
  h2: { fontSize: 12, fontWeight: 700, marginBottom: 8 },
  grid: { flexDirection: "row", gap: 10 },
  card: { flex: 1, borderWidth: 1, borderColor: "#e4e4e7", borderRadius: 8, padding: 10 },
  cardLabel: { fontSize: 10, color: "#52525b" },
  cardValue: { marginTop: 2, fontSize: 14, fontWeight: 700 },
  row: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
});

function ngn(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function hours(mins: number) {
  return `${(mins / 60).toFixed(1)}h`;
}

export function AnalyticsReportPdf({ data }: { data: AnalyticsData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Admin analytics report</Text>
        <Text style={styles.subtitle}>
          Range: {data.controls.from} → {data.controls.to}
          {data.controls.projectId ? ` • Project: ${data.controls.projectId}` : " • All projects"}
        </Text>

        <View style={styles.section}>
          <Text style={styles.h2}>Summary</Text>
          <View style={styles.grid}>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Total hours logged (all time)</Text>
              <Text style={styles.cardValue}>{hours(data.stats.totalMinutesAllTime)}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Active projects</Text>
              <Text style={styles.cardValue}>{data.stats.activeProjectsCount}</Text>
            </View>
          </View>
          <View style={[styles.grid, { marginTop: 10 }]}>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Pending approvals</Text>
              <Text style={styles.cardValue}>{data.stats.pendingApprovalsCount}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Outstanding invoices total</Text>
              <Text style={styles.cardValue}>{ngn(data.stats.outstandingInvoicesTotal)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Highlights</Text>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Milestone completion</Text>
            <Text style={styles.cardValue}>{data.charts.milestoneCompletion.percentComplete}%</Text>
            <View style={styles.row}>
              <Text>Invoices (total)</Text>
              <Text>{data.charts.invoiceStatus.total}</Text>
            </View>
            <View style={styles.row}>
              <Text>Paid</Text>
              <Text>{data.charts.invoiceStatus.paid}</Text>
            </View>
            <View style={styles.row}>
              <Text>Pending</Text>
              <Text>{data.charts.invoiceStatus.pending}</Text>
            </View>
            <View style={styles.row}>
              <Text>Overdue</Text>
              <Text>{data.charts.invoiceStatus.overdue}</Text>
            </View>
            <View style={styles.row}>
              <Text>Outstanding total</Text>
              <Text>{ngn(data.charts.invoiceStatus.outstandingTotal)}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

