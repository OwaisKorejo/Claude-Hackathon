import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  StatusBar, Dimensions, Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

const { width: W } = Dimensions.get('window');

// ─── Garmin data (same as index) ──────────────────────────────────────────────
const garminData = [
  { date: '2026-02-25', hrMin: 52, hrMax: 142, hrAvg: 74.2,  hrv: 48,   o2: 97,   resp: 14.5, rhr: 54, steps: 9240,  sleep: 7.5, sleepDeep: 1.2, sleepRem: 1.8, sleepLight: 4.5 },
  { date: '2026-02-26', hrMin: 54, hrMax: 138, hrAvg: 76.4,  hrv: 45,   o2: 96.5, resp: 15,   rhr: 55, steps: 8100,  sleep: 7.1, sleepDeep: 1.0, sleepRem: 1.6, sleepLight: 4.5 },
  { date: '2026-02-27', hrMin: 55, hrMax: 155, hrAvg: 82.1,  hrv: 40,   o2: 95.5, resp: 16,   rhr: 58, steps: 11200, sleep: 6.8, sleepDeep: 0.9, sleepRem: 1.4, sleepLight: 4.5 },
  { date: '2026-02-28', hrMin: 50, hrMax: 130, hrAvg: 71.3,  hrv: 52,   o2: 97.5, resp: 14,   rhr: 53, steps: 7800,  sleep: 8.0, sleepDeep: 1.4, sleepRem: 2.0, sleepLight: 4.6 },
  { date: '2026-03-01', hrMin: 53, hrMax: 145, hrAvg: 78.6,  hrv: 43,   o2: 96,   resp: 15.5, rhr: 56, steps: 9600,  sleep: 7.3, sleepDeep: 1.1, sleepRem: 1.7, sleepLight: 4.5 },
  { date: '2026-03-02', hrMin: 57, hrMax: 160, hrAvg: 88.3,  hrv: 34,   o2: 94.5, resp: 17,   rhr: 61, steps: 13400, sleep: 6.2, sleepDeep: 0.7, sleepRem: 1.2, sleepLight: 4.3 },
  { date: '2026-03-03', hrMin: 56, hrMax: 158, hrAvg: 86.7,  hrv: 36,   o2: 95,   resp: 16.5, rhr: 60, steps: 12800, sleep: 6.5, sleepDeep: 0.8, sleepRem: 1.3, sleepLight: 4.4 },
  { date: '2026-03-04', hrMin: 51, hrMax: 132, hrAvg: 72.4,  hrv: 50,   o2: 97,   resp: 14,   rhr: 54, steps: 8400,  sleep: 7.8, sleepDeep: 1.3, sleepRem: 1.9, sleepLight: 4.6 },
  { date: '2026-03-05', hrMin: 49, hrMax: 128, hrAvg: 70.1,  hrv: 54,   o2: 97.5, resp: 13.5, rhr: 52, steps: 7200,  sleep: 8.2, sleepDeep: 1.5, sleepRem: 2.1, sleepLight: 4.6 },
  { date: '2026-03-06', hrMin: 52, hrMax: 140, hrAvg: 75.8,  hrv: 46,   o2: 96.5, resp: 15,   rhr: 55, steps: 9000,  sleep: 7.4, sleepDeep: 1.1, sleepRem: 1.7, sleepLight: 4.6 },
  { date: '2026-03-07', hrMin: 60, hrMax: 168, hrAvg: 95.2,  hrv: 28,   o2: 93,   resp: 19,   rhr: 64, steps: 15200, sleep: 5.8, sleepDeep: 0.5, sleepRem: 1.0, sleepLight: 4.3 },
  { date: '2026-03-08', hrMin: 62, hrMax: 172, hrAvg: 98.4,  hrv: 25,   o2: 92,   resp: 20,   rhr: 66, steps: 16100, sleep: 5.5, sleepDeep: 0.4, sleepRem: 0.9, sleepLight: 4.2 },
  { date: '2026-03-09', hrMin: 58, hrMax: 152, hrAvg: 84.6,  hrv: 38,   o2: 95,   resp: 16,   rhr: 59, steps: 11800, sleep: 6.9, sleepDeep: 1.0, sleepRem: 1.5, sleepLight: 4.4 },
  { date: '2026-03-10', hrMin: 53, hrMax: 136, hrAvg: 73.9,  hrv: 49,   o2: 97,   resp: 14.5, rhr: 55, steps: 8600,  sleep: 7.6, sleepDeep: 1.2, sleepRem: 1.8, sleepLight: 4.6 },
  { date: '2026-03-11', hrMin: 51, hrMax: 130, hrAvg: 71.5,  hrv: 51,   o2: 97.5, resp: 14,   rhr: 53, steps: 7900,  sleep: 7.9, sleepDeep: 1.4, sleepRem: 2.0, sleepLight: 4.5 },
  { date: '2026-03-12', hrMin: 54, hrMax: 144, hrAvg: 77.2,  hrv: 44,   o2: 96,   resp: 15.5, rhr: 56, steps: 9300,  sleep: 7.2, sleepDeep: 1.1, sleepRem: 1.6, sleepLight: 4.5 },
  { date: '2026-03-13', hrMin: 55, hrMax: 148, hrAvg: 79.8,  hrv: 42,   o2: 95.5, resp: 15.5, rhr: 57, steps: 10200, sleep: 7.0, sleepDeep: 1.0, sleepRem: 1.5, sleepLight: 4.5 },
  { date: '2026-03-14', hrMin: 50, hrMax: 126, hrAvg: 69.3,  hrv: 56,   o2: 98,   resp: 13,   rhr: 52, steps: 7400,  sleep: 8.1, sleepDeep: 1.5, sleepRem: 2.0, sleepLight: 4.6 },
  { date: '2026-03-15', hrMin: 48, hrMax: 122, hrAvg: 67.1,  hrv: 59,   o2: 98.5, resp: 12.5, rhr: 51, steps: 6800,  sleep: 8.4, sleepDeep: 1.6, sleepRem: 2.2, sleepLight: 4.6 },
  { date: '2026-03-16', hrMin: 52, hrMax: 138, hrAvg: 74.6,  hrv: 47,   o2: 97,   resp: 14.5, rhr: 54, steps: 8800,  sleep: 7.5, sleepDeep: 1.2, sleepRem: 1.8, sleepLight: 4.5 },
  { date: '2026-03-17', hrMin: 59, hrMax: 162, hrAvg: 91.3,  hrv: 31,   o2: 93.5, resp: 18,   rhr: 63, steps: 14600, sleep: 6.0, sleepDeep: 0.6, sleepRem: 1.1, sleepLight: 4.3 },
  { date: '2026-03-18', hrMin: 61, hrMax: 166, hrAvg: 94.7,  hrv: 29,   o2: 93,   resp: 19,   rhr: 65, steps: 15800, sleep: 5.7, sleepDeep: 0.5, sleepRem: 1.0, sleepLight: 4.2 },
  { date: '2026-03-19', hrMin: 56, hrMax: 150, hrAvg: 82.4,  hrv: 40,   o2: 95,   resp: 16,   rhr: 58, steps: 11400, sleep: 7.0, sleepDeep: 1.0, sleepRem: 1.5, sleepLight: 4.5 },
  { date: '2026-03-20', hrMin: 53, hrMax: 140, hrAvg: 75.1,  hrv: 46,   o2: 96.5, resp: 15,   rhr: 55, steps: 9100,  sleep: 7.4, sleepDeep: 1.2, sleepRem: 1.7, sleepLight: 4.5 },
  { date: '2026-03-21', hrMin: 51, hrMax: 132, hrAvg: 72.8,  hrv: 50,   o2: 97,   resp: 14,   rhr: 54, steps: 8200,  sleep: 7.7, sleepDeep: 1.3, sleepRem: 1.9, sleepLight: 4.5 },
  { date: '2026-03-22', hrMin: 49, hrMax: 124, hrAvg: 68.5,  hrv: 57,   o2: 98,   resp: 13.5, rhr: 52, steps: 7100,  sleep: 8.3, sleepDeep: 1.5, sleepRem: 2.1, sleepLight: 4.7 },
  { date: '2026-03-23', hrMin: 54, hrMax: 146, hrAvg: 78.3,  hrv: 43,   o2: 96,   resp: 15,   rhr: 56, steps: 9400,  sleep: 7.3, sleepDeep: 1.1, sleepRem: 1.6, sleepLight: 4.6 },
  { date: '2026-03-24', hrMin: 57, hrMax: 156, hrAvg: 85.9,  hrv: 37,   o2: 95,   resp: 16.5, rhr: 59, steps: 12100, sleep: 6.6, sleepDeep: 0.8, sleepRem: 1.3, sleepLight: 4.5 },
  { date: '2026-03-25', hrMin: 52, hrMax: 136, hrAvg: 73.4,  hrv: 48,   o2: 97,   resp: 14.5, rhr: 55, steps: 8500,  sleep: 7.5, sleepDeep: 1.2, sleepRem: 1.8, sleepLight: 4.5 },
  { date: '2026-03-26', hrMin: 59, hrMax: 117, hrAvg: 80.65, hrv: null, o2: null, resp: null, rhr: null, steps: null, sleep: null, sleepDeep: null, sleepRem: null, sleepLight: null },
  { date: '2026-03-27', hrMin: 86, hrMax: 130, hrAvg: 103.95,hrv: null, o2: null, resp: null, rhr: null, steps: null, sleep: null, sleepDeep: null, sleepRem: null, sleepLight: null },
];

const C = {
  bg: '#080D1A', card: '#111827', border: 'rgba(255,255,255,0.07)',
  white: '#FFFFFF', muted: 'rgba(255,255,255,0.5)', faint: 'rgba(255,255,255,0.2)',
  heart: '#FF4B6E', hrv: '#A78BFA', o2: '#22D3EE', resp: '#34D399', rhr: '#FBBF24',
  sleep: '#818CF8', steps: '#F472B6',
};

type Tab = 'hr' | 'hrv' | 'o2' | 'sleep' | 'steps';
type Range = '7d' | '14d' | '30d';

const TABS: { key: Tab; label: string; color: string; emoji: string }[] = [
  { key: 'hr',    label: 'Heart Rate', color: C.heart,  emoji: '❤️' },
  { key: 'hrv',   label: 'HRV',        color: C.hrv,    emoji: '💜' },
  { key: 'o2',    label: 'O₂ Sat',     color: C.o2,     emoji: '🫁' },
  { key: 'sleep', label: 'Sleep',      color: C.sleep,  emoji: '🌙' },
  { key: 'steps', label: 'Steps',      color: C.steps,  emoji: '👟' },
];

function getVal(d: typeof garminData[0], tab: Tab): number | null {
  switch (tab) {
    case 'hr':    return d.hrAvg;
    case 'hrv':   return d.hrv;
    case 'o2':    return d.o2;
    case 'sleep': return d.sleep;
    case 'steps': return d.steps;
  }
}

function fmtVal(val: number, tab: Tab) {
  if (tab === 'steps') return val.toLocaleString();
  if (tab === 'sleep') return val.toFixed(1) + 'h';
  return val.toFixed(1);
}

function unit(tab: Tab) {
  switch (tab) {
    case 'hr':    return 'bpm';
    case 'hrv':   return 'ms';
    case 'o2':    return '%';
    case 'sleep': return 'hrs';
    case 'steps': return 'steps';
  }
}

function shortDate(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function fullDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-IE', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

export default function HealthLogsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('hr');
  const [range, setRange] = useState<Range>('14d');
  const [selected, setSelected] = useState<typeof garminData[0] | null>(null);

  const tabInfo = TABS.find(t => t.key === activeTab)!;

  const filteredData = useMemo(() => {
    const days = range === '7d' ? 7 : range === '14d' ? 14 : 30;
    return garminData.slice(-days);
  }, [range]);

  const chartData = useMemo(() => {
    return filteredData.map(d => ({ ...d, val: getVal(d, activeTab) }));
  }, [filteredData, activeTab]);

  const validVals = chartData.map(d => d.val).filter((v): v is number => v !== null);
  const maxVal = validVals.length ? Math.max(...validVals) : 1;
  const minVal = validVals.length ? Math.min(...validVals) : 0;
  const avgVal = validVals.length ? validVals.reduce((a, b) => a + b, 0) / validVals.length : 0;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Health Logs</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tab strip */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabStrip} contentContainerStyle={s.tabStripContent}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[s.tabBtn, activeTab === t.key && { backgroundColor: t.color + '22', borderColor: t.color + '55' }]}
            onPress={() => setActiveTab(t.key)}
            activeOpacity={0.7}
          >
            <Text style={s.tabEmoji}>{t.emoji}</Text>
            <Text style={[s.tabLabel, activeTab === t.key && { color: t.color }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Stats row */}
        <View style={s.statsRow}>
          {[
            { label: 'MIN', val: validVals.length ? Math.min(...validVals) : '—' },
            { label: 'AVG', val: validVals.length ? avgVal : '—' },
            { label: 'MAX', val: validVals.length ? Math.max(...validVals) : '—' },
          ].map(item => (
            <View key={item.label} style={[s.statCard, { borderColor: tabInfo.color + '30' }]}>
              <Text style={[s.statVal, { color: tabInfo.color }]}>
                {typeof item.val === 'number' ? fmtVal(item.val, activeTab) : '—'}
              </Text>
              <Text style={s.statLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Range selector */}
        <View style={s.rangeRow}>
          {(['7d', '14d', '30d'] as Range[]).map(r => (
            <TouchableOpacity
              key={r}
              style={[s.rangeBtn, range === r && { backgroundColor: tabInfo.color + '22', borderColor: tabInfo.color + '55' }]}
              onPress={() => setRange(r)}
            >
              <Text style={[s.rangeBtnText, range === r && { color: tabInfo.color }]}>
                {r === '7d' ? '7 days' : r === '14d' ? '14 days' : '30 days'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bar chart */}
        <View style={[s.chartCard, { borderColor: tabInfo.color + '25' }]}>
          <Text style={[s.chartTitle, { color: tabInfo.color }]}>
            {tabInfo.emoji} {tabInfo.label}  ·  {unit(activeTab)}
          </Text>
          <View style={s.chartBars}>
            {chartData.map((d, i) => {
              const ratio = d.val !== null ? (d.val - minVal * 0.9) / ((maxVal - minVal * 0.9) || 1) : 0;
              const isSelected = selected?.date === d.date;
              return (
                <TouchableOpacity
                  key={d.date}
                  style={s.barWrapper}
                  onPress={() => setSelected(isSelected ? null : d)}
                  activeOpacity={0.7}
                >
                  <View style={s.barTrack}>
                    <View style={[
                      s.barFill,
                      {
                        height: d.val !== null ? `${Math.max(ratio * 100, 4)}%` : '4%',
                        backgroundColor: d.val !== null
                          ? (isSelected ? tabInfo.color : tabInfo.color + 'AA')
                          : 'rgba(255,255,255,0.1)',
                      },
                    ]} />
                  </View>
                  {(chartData.length <= 14 || i % 2 === 0) && (
                    <Text style={[s.barLabel, isSelected && { color: tabInfo.color }]}>
                      {shortDate(d.date)}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Selected tooltip */}
          {selected && (
            <View style={[s.tooltip, { borderColor: tabInfo.color + '40' }]}>
              <Text style={s.tooltipDate}>{fullDate(selected.date)}</Text>
              {getVal(selected, activeTab) !== null ? (
                <Text style={[s.tooltipVal, { color: tabInfo.color }]}>
                  {fmtVal(getVal(selected, activeTab)!, activeTab)} {unit(activeTab)}
                </Text>
              ) : (
                <Text style={s.tooltipVal}>No data</Text>
              )}
              {activeTab === 'hr' && (
                <Text style={s.tooltipExtra}>Range: {selected.hrMin} – {selected.hrMax} bpm</Text>
              )}
              {activeTab === 'sleep' && selected.sleepDeep !== null && (
                <Text style={s.tooltipExtra}>
                  Deep {selected.sleepDeep}h  ·  REM {selected.sleepRem}h  ·  Light {selected.sleepLight}h
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Sleep breakdown card */}
        {activeTab === 'sleep' && (
          <View style={s.sleepBreakdownCard}>
            <Text style={s.sectionLabel}>SLEEP PHASE AVERAGE</Text>
            {[
              { label: 'Deep', color: '#6366F1', key: 'sleepDeep' as const },
              { label: 'REM',  color: '#A78BFA', key: 'sleepRem'  as const },
              { label: 'Light',color: '#C4B5FD', key: 'sleepLight' as const },
            ].map(phase => {
              const vals = filteredData.map(d => d[phase.key]).filter((v): v is number => v !== null);
              const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
              const ratio = avg / 9;
              return (
                <View key={phase.label} style={s.sleepPhaseRow}>
                  <Text style={[s.sleepPhaseLabel, { color: phase.color }]}>{phase.label}</Text>
                  <View style={s.sleepPhaseTrack}>
                    <View style={[s.sleepPhaseFill, { width: `${ratio * 100}%`, backgroundColor: phase.color }]} />
                  </View>
                  <Text style={[s.sleepPhaseVal, { color: phase.color }]}>{avg.toFixed(1)}h</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Data table */}
        <Text style={s.sectionLabel}>ALL READINGS</Text>
        <View style={s.table}>
          <View style={s.tableHeader}>
            <Text style={[s.tableCell, s.tableCellHeader, { flex: 1.5 }]}>DATE</Text>
            <Text style={[s.tableCell, s.tableCellHeader]}>VALUE</Text>
            {activeTab === 'hr' && <Text style={[s.tableCell, s.tableCellHeader]}>RANGE</Text>}
            {activeTab === 'sleep' && <Text style={[s.tableCell, s.tableCellHeader]}>DEEP/REM</Text>}
          </View>
          {[...filteredData].reverse().map(d => {
            const val = getVal(d, activeTab);
            return (
              <TouchableOpacity
                key={d.date}
                style={[s.tableRow, selected?.date === d.date && { backgroundColor: tabInfo.color + '12' }]}
                onPress={() => setSelected(selected?.date === d.date ? null : d)}
                activeOpacity={0.6}
              >
                <Text style={[s.tableCell, { flex: 1.5, color: C.white }]}>{fullDate(d.date)}</Text>
                <Text style={[s.tableCell, { color: val !== null ? tabInfo.color : C.faint }]}>
                  {val !== null ? fmtVal(val, activeTab) : '—'}
                </Text>
                {activeTab === 'hr' && (
                  <Text style={[s.tableCell, { color: C.muted }]}>{d.hrMin}–{d.hrMax}</Text>
                )}
                {activeTab === 'sleep' && (
                  <Text style={[s.tableCell, { color: C.muted }]}>
                    {d.sleepDeep !== null ? `${d.sleepDeep}/${d.sleepRem}h` : '—'}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const BAR_H = 110;
const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: C.bg },
  scroll:  { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 40 },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  backBtn:     { width: 40, height: 40, justifyContent: 'center' },
  backArrow:   { fontSize: 32, color: C.white, lineHeight: 40 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: C.white, letterSpacing: -0.3 },

  tabStrip:        { flexGrow: 0, marginBottom: 12 },
  tabStripContent: { paddingHorizontal: 16, gap: 8 },
  tabBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: C.card },
  tabEmoji: { fontSize: 14 },
  tabLabel: { fontSize: 13, fontWeight: '600', color: C.muted },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, padding: 14, alignItems: 'center', gap: 4 },
  statVal:  { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  statLabel:{ fontSize: 11, color: C.muted, fontWeight: '700', letterSpacing: 0.5 },

  rangeRow:    { flexDirection: 'row', gap: 8, marginBottom: 14 },
  rangeBtn:    { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: C.card },
  rangeBtnText:{ fontSize: 13, fontWeight: '600', color: C.muted },

  chartCard:  { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 16 },
  chartTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5, marginBottom: 14 },
  chartBars:  { flexDirection: 'row', alignItems: 'flex-end', height: BAR_H, gap: 3 },
  barWrapper: { flex: 1, alignItems: 'center', height: '100%', paddingBottom: 18 },
  barTrack:   { flex: 1, width: '70%', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill:    { borderRadius: 3, minHeight: 3 },
  barLabel:   { fontSize: 9, color: C.faint, position: 'absolute', bottom: 0, fontWeight: '500' },

  tooltip: { marginTop: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, borderWidth: 1, padding: 12, gap: 4 },
  tooltipDate:  { fontSize: 12, color: C.muted, fontWeight: '600' },
  tooltipVal:   { fontSize: 22, fontWeight: '800' },
  tooltipExtra: { fontSize: 12, color: C.muted },

  sleepBreakdownCard: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 16 },
  sleepPhaseRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 5 },
  sleepPhaseLabel: { width: 36, fontSize: 12, fontWeight: '700' },
  sleepPhaseTrack: { flex: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 4, overflow: 'hidden' },
  sleepPhaseFill:  { height: '100%', borderRadius: 4 },
  sleepPhaseVal:   { width: 30, fontSize: 12, fontWeight: '700', textAlign: 'right' },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: C.muted, letterSpacing: 1, marginBottom: 10, marginTop: 4 },

  table:       { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 30 },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: 'rgba(255,255,255,0.03)' },
  tableCellHeader: { color: C.muted, fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  tableRow:    { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  tableCell:   { flex: 1, fontSize: 13, color: C.muted },
});
