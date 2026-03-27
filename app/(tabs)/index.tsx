import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Dimensions,
  Animated, StatusBar, TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  fetchAllData, generateAIDashboard, AIDashboardResult,
} from '@/lib/ai-dashboard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Garmin data (for display — also fed into AI) ────────────────────────────
type HealthEntry = {
  date: string; hrMin: number; hrMax: number; hrAvg: number;
  hrvAvg: number | null; o2Avg: number | null; respAvg: number | null; rhrAvg: number | null;
};

const healthData: HealthEntry[] = [
  { date: '2026-02-25', hrMin: 52, hrMax: 142, hrAvg: 74.2,  hrvAvg: 48,  o2Avg: 97,   respAvg: 14.5, rhrAvg: 54 },
  { date: '2026-02-26', hrMin: 54, hrMax: 138, hrAvg: 76.4,  hrvAvg: 45,  o2Avg: 96.5, respAvg: 15,   rhrAvg: 55 },
  { date: '2026-02-27', hrMin: 55, hrMax: 155, hrAvg: 82.1,  hrvAvg: 40,  o2Avg: 95.5, respAvg: 16,   rhrAvg: 58 },
  { date: '2026-02-28', hrMin: 50, hrMax: 130, hrAvg: 71.3,  hrvAvg: 52,  o2Avg: 97.5, respAvg: 14,   rhrAvg: 53 },
  { date: '2026-03-01', hrMin: 53, hrMax: 145, hrAvg: 78.6,  hrvAvg: 43,  o2Avg: 96,   respAvg: 15.5, rhrAvg: 56 },
  { date: '2026-03-02', hrMin: 57, hrMax: 160, hrAvg: 88.3,  hrvAvg: 34,  o2Avg: 94.5, respAvg: 17,   rhrAvg: 61 },
  { date: '2026-03-03', hrMin: 56, hrMax: 158, hrAvg: 86.7,  hrvAvg: 36,  o2Avg: 95,   respAvg: 16.5, rhrAvg: 60 },
  { date: '2026-03-04', hrMin: 51, hrMax: 132, hrAvg: 72.4,  hrvAvg: 50,  o2Avg: 97,   respAvg: 14,   rhrAvg: 54 },
  { date: '2026-03-05', hrMin: 49, hrMax: 128, hrAvg: 70.1,  hrvAvg: 54,  o2Avg: 97.5, respAvg: 13.5, rhrAvg: 52 },
  { date: '2026-03-06', hrMin: 52, hrMax: 140, hrAvg: 75.8,  hrvAvg: 46,  o2Avg: 96.5, respAvg: 15,   rhrAvg: 55 },
  { date: '2026-03-07', hrMin: 60, hrMax: 168, hrAvg: 95.2,  hrvAvg: 28,  o2Avg: 93,   respAvg: 19,   rhrAvg: 64 },
  { date: '2026-03-08', hrMin: 62, hrMax: 172, hrAvg: 98.4,  hrvAvg: 25,  o2Avg: 92,   respAvg: 20,   rhrAvg: 66 },
  { date: '2026-03-09', hrMin: 58, hrMax: 152, hrAvg: 84.6,  hrvAvg: 38,  o2Avg: 95,   respAvg: 16,   rhrAvg: 59 },
  { date: '2026-03-10', hrMin: 53, hrMax: 136, hrAvg: 73.9,  hrvAvg: 49,  o2Avg: 97,   respAvg: 14.5, rhrAvg: 55 },
  { date: '2026-03-11', hrMin: 51, hrMax: 130, hrAvg: 71.5,  hrvAvg: 51,  o2Avg: 97.5, respAvg: 14,   rhrAvg: 53 },
  { date: '2026-03-12', hrMin: 54, hrMax: 144, hrAvg: 77.2,  hrvAvg: 44,  o2Avg: 96,   respAvg: 15.5, rhrAvg: 56 },
  { date: '2026-03-13', hrMin: 55, hrMax: 148, hrAvg: 79.8,  hrvAvg: 42,  o2Avg: 95.5, respAvg: 15.5, rhrAvg: 57 },
  { date: '2026-03-14', hrMin: 50, hrMax: 126, hrAvg: 69.3,  hrvAvg: 56,  o2Avg: 98,   respAvg: 13,   rhrAvg: 52 },
  { date: '2026-03-15', hrMin: 48, hrMax: 122, hrAvg: 67.1,  hrvAvg: 59,  o2Avg: 98.5, respAvg: 12.5, rhrAvg: 51 },
  { date: '2026-03-16', hrMin: 52, hrMax: 138, hrAvg: 74.6,  hrvAvg: 47,  o2Avg: 97,   respAvg: 14.5, rhrAvg: 54 },
  { date: '2026-03-17', hrMin: 59, hrMax: 162, hrAvg: 91.3,  hrvAvg: 31,  o2Avg: 93.5, respAvg: 18,   rhrAvg: 63 },
  { date: '2026-03-18', hrMin: 61, hrMax: 166, hrAvg: 94.7,  hrvAvg: 29,  o2Avg: 93,   respAvg: 19,   rhrAvg: 65 },
  { date: '2026-03-19', hrMin: 56, hrMax: 150, hrAvg: 82.4,  hrvAvg: 40,  o2Avg: 95,   respAvg: 16,   rhrAvg: 58 },
  { date: '2026-03-20', hrMin: 53, hrMax: 140, hrAvg: 75.1,  hrvAvg: 46,  o2Avg: 96.5, respAvg: 15,   rhrAvg: 55 },
  { date: '2026-03-21', hrMin: 51, hrMax: 132, hrAvg: 72.8,  hrvAvg: 50,  o2Avg: 97,   respAvg: 14,   rhrAvg: 54 },
  { date: '2026-03-22', hrMin: 49, hrMax: 124, hrAvg: 68.5,  hrvAvg: 57,  o2Avg: 98,   respAvg: 13.5, rhrAvg: 52 },
  { date: '2026-03-23', hrMin: 54, hrMax: 146, hrAvg: 78.3,  hrvAvg: 43,  o2Avg: 96,   respAvg: 15,   rhrAvg: 56 },
  { date: '2026-03-24', hrMin: 57, hrMax: 156, hrAvg: 85.9,  hrvAvg: 37,  o2Avg: 95,   respAvg: 16.5, rhrAvg: 59 },
  { date: '2026-03-25', hrMin: 52, hrMax: 136, hrAvg: 73.4,  hrvAvg: 48,  o2Avg: 97,   respAvg: 14.5, rhrAvg: 55 },
  { date: '2026-03-26', hrMin: 59, hrMax: 117, hrAvg: 80.65, hrvAvg: null, o2Avg: null, respAvg: null, rhrAvg: null },
  { date: '2026-03-27', hrMin: 86, hrMax: 130, hrAvg: 103.95,hrvAvg: null, o2Avg: null, respAvg: null, rhrAvg: null },
];

const today    = healthData[healthData.length - 1];
const lastFull = healthData.slice().reverse().find(d => d.hrvAvg !== null)!;
const last7    = healthData.slice(-7);
const maxHR    = Math.max(...last7.map(d => d.hrAvg));

function hrStatus(bpm: number) {
  if (bpm < 60) return { label: 'Low', color: C.o2 };
  if (bpm < 80) return { label: 'Normal', color: C.resp };
  if (bpm < 100) return { label: 'Elevated', color: C.rhr };
  return { label: 'High', color: C.heart };
}
function fmtDate(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-IE', { weekday: 'short', month: 'short', day: 'numeric' });
}
function shortDate(iso: string) { return new Date(iso + 'T00:00:00').toLocaleDateString('en-IE', { month: 'short', day: 'numeric' }); }

// ─── Theme ────────────────────────────────────────────────────────────────────
const C = {
  bg: '#080D1A', card: '#111827', border: 'rgba(255,255,255,0.07)',
  heart: '#FF4B6E', heartDim: 'rgba(255,75,110,0.15)',
  hrv: '#A78BFA', hrvDim: 'rgba(167,139,250,0.15)',
  o2: '#22D3EE', o2Dim: 'rgba(34,211,238,0.15)',
  resp: '#34D399', respDim: 'rgba(52,211,153,0.15)',
  rhr: '#FBBF24', rhrDim: 'rgba(251,191,36,0.15)',
  white: '#FFFFFF', muted: 'rgba(255,255,255,0.5)', faint: 'rgba(255,255,255,0.2)',
  garmin: '#1D6DB5', claude: '#CC9B4A', claudeDim: 'rgba(204,155,74,0.15)',
  indigo: '#6366F1',
};

// ─── Pulsing dot ──────────────────────────────────────────────────────────────
function PulsingDot({ color }: { color: string }) {
  const sc = useRef(new Animated.Value(1)).current;
  const op = useRef(new Animated.Value(0.8)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.parallel([
        Animated.timing(sc, { toValue: 1.5, duration: 700, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0,   duration: 700, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(sc, { toValue: 1, duration: 0, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0.8, duration: 0, useNativeDriver: true }),
      ]),
      Animated.delay(600),
    ])).start();
  }, []);
  return (
    <View style={{ width: 14, height: 14, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: color, opacity: op, transform: [{ scale: sc }] }} />
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
    </View>
  );
}

// ─── Score ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score, label, color }: { score: number; label: string; color: string }) {
  return (
    <View style={ring.wrap}>
      <View style={[ring.outer, { borderColor: color + '30' }]}>
        <View style={[ring.fill, { borderColor: color, borderTopColor: score > 25 ? color : 'transparent', borderRightColor: score > 50 ? color : 'transparent', borderBottomColor: score > 75 ? color : 'transparent', transform: [{ rotate: `${(score / 100) * 360}deg` }] }]} />
        <Text style={[ring.num, { color }]}>{score}</Text>
      </View>
      <Text style={ring.label}>{label}</Text>
    </View>
  );
}
const ring = StyleSheet.create({
  wrap:  { alignItems: 'center', gap: 6 },
  outer: { width: 56, height: 56, borderRadius: 28, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  fill:  { position: 'absolute', width: 56, height: 56, borderRadius: 28, borderWidth: 3, borderLeftColor: 'transparent' },
  num:   { fontSize: 18, fontWeight: '900' },
  label: { fontSize: 10, color: C.muted, fontWeight: '600', textAlign: 'center' },
});

// ─── Main dashboard ───────────────────────────────────────────────────────────
export default function HealthDashboard() {
  const todayStatus = hrStatus(today.hrAvg);
  const [aiData, setAiData]       = useState<AIDashboardResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError]     = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadAI = useCallback(async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const data = await fetchAllData();
      const result = await generateAIDashboard(data);
      setAiData(result);
    } catch (e: any) {
      setAiError(e?.message ?? 'Failed to load AI insights');
    }
    setAiLoading(false);
  }, []);

  useEffect(() => { loadAI(); }, [loadAI]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAI();
    setRefreshing(false);
  }, [loadAI]);

  const sevColor = (s: string) => s === 'critical' ? C.heart : s === 'warning' ? C.rhr : C.o2;
  const prioColor = (p: string) => p === 'high' ? C.heart : p === 'medium' ? C.rhr : C.resp;
  const dirArrow = (d: string) => d === 'up' ? '↑' : d === 'down' ? '↓' : '→';
  const dirColor = (d: string) => d === 'improving' ? C.resp : d === 'declining' ? C.heart : C.rhr;
  const healthColor = (s: number) => s >= 80 ? C.resp : s >= 60 ? C.rhr : C.heart;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.muted} />}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Health Dashboard</Text>
            <Text style={styles.headerSub}>{fmtDate(today.date)}</Text>
          </View>
          <View style={styles.garminBadge}><Text style={styles.garminBadgeText}>GARMIN</Text></View>
        </View>

        {/* ═══ AI INTELLIGENCE SECTION ═══ */}
        {aiLoading && !aiData && (
          <View style={ai.loadingCard}>
            <ActivityIndicator size="small" color={C.claude} />
            <Text style={ai.loadingText}>Claude is analysing your health data…</Text>
          </View>
        )}

        {aiError && !aiData && (
          <TouchableOpacity style={ai.errorCard} onPress={loadAI}>
            <Text style={ai.errorTitle}>AI analysis unavailable</Text>
            <Text style={ai.errorBody}>{aiError}</Text>
            <Text style={ai.errorRetry}>Tap to retry</Text>
          </TouchableOpacity>
        )}

        {aiData && (
          <>
            {/* Daily brief */}
            <View style={ai.briefCard}>
              <View style={ai.briefTop}>
                <Text style={ai.briefIcon}>✦</Text>
                <Text style={ai.briefLabel}>AI DAILY BRIEF</Text>
                <TouchableOpacity onPress={loadAI} style={ai.refreshBtn}>
                  <Text style={ai.refreshText}>{aiLoading ? '...' : '↻'}</Text>
                </TouchableOpacity>
              </View>
              <Text style={ai.briefText}>{aiData.dailyBrief}</Text>
            </View>

            {/* Score row */}
            <View style={ai.scoreRow}>
              <ScoreRing score={aiData.healthScore} label={aiData.healthScoreLabel} color={healthColor(aiData.healthScore)} />
              <ScoreRing score={aiData.recoveryStatus.score} label={aiData.recoveryStatus.label} color={healthColor(aiData.recoveryStatus.score)} />
              <ScoreRing score={aiData.nutritionScore.score} label="Nutrition" color={healthColor(aiData.nutritionScore.score)} />
            </View>

            {/* Warnings */}
            {aiData.warnings.length > 0 && (
              <View style={{ gap: 6, marginBottom: 16 }}>
                {aiData.warnings.map((w, i) => (
                  <View key={i} style={[ai.warnCard, { borderColor: sevColor(w.severity) + '55', backgroundColor: sevColor(w.severity) + '0C' }]}>
                    <Text style={[ai.warnTitle, { color: sevColor(w.severity) }]}>
                      {w.severity === 'critical' ? '⚠' : w.severity === 'warning' ? '!' : 'ℹ'} {w.title}
                    </Text>
                    <Text style={ai.warnBody}>{w.body}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Predictions */}
            <Text style={styles.sectionTitle}>PREDICTIONS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8, paddingRight: 16 }}>
              {aiData.predictions.map((p, i) => (
                <View key={i} style={ai.predCard}>
                  <Text style={ai.predMetric}>{p.metric}</Text>
                  <View style={ai.predRow}>
                    <Text style={ai.predCurr}>{p.current}</Text>
                    <Text style={[ai.predArrow, { color: p.direction === 'down' ? C.resp : p.direction === 'up' ? C.heart : C.rhr }]}>
                      {dirArrow(p.direction)}
                    </Text>
                    <Text style={ai.predTarget}>{p.predicted}</Text>
                  </View>
                  <Text style={ai.predTime}>{p.timeframe} · {p.confidence}</Text>
                </View>
              ))}
            </ScrollView>

            {/* Weekly trends */}
            <Text style={styles.sectionTitle}>WEEKLY TRENDS</Text>
            <View style={ai.trendsCard}>
              {aiData.weeklyTrends.map((t, i) => (
                <View key={i} style={ai.trendRow}>
                  <View style={[ai.trendDot, { backgroundColor: dirColor(t.direction) }]} />
                  <Text style={ai.trendMetric}>{t.metric}</Text>
                  <View style={{ flex: 1 }} />
                  <Text style={[ai.trendChange, { color: dirColor(t.direction) }]}>{t.change}</Text>
                  <Text style={[ai.trendDir, { color: dirColor(t.direction) }]}>{t.direction}</Text>
                </View>
              ))}
            </View>

            {/* Training + Nutrition */}
            <View style={ai.dualRow}>
              <View style={[ai.dualCard, { borderColor: '#F97316' + '30' }]}>
                <Text style={[ai.dualLabel, { color: '#F97316' }]}>TRAINING</Text>
                <Text style={[ai.dualBig, { color: '#F97316' }]}>{aiData.trainingLoad.weeklyExercises}</Text>
                <Text style={ai.dualSub}>exercises this week</Text>
                <Text style={ai.dualDetail}>{aiData.trainingLoad.dominantCategory}</Text>
                {aiData.trainingLoad.rpeAvg && <Text style={ai.dualDetail}>RPE avg: {aiData.trainingLoad.rpeAvg}/10</Text>}
              </View>
              <View style={[ai.dualCard, { borderColor: C.rhr + '30' }]}>
                <Text style={[ai.dualLabel, { color: C.rhr }]}>NUTRITION</Text>
                <Text style={[ai.dualBig, { color: C.rhr }]}>{aiData.nutritionScore.avgCalories}</Text>
                <Text style={ai.dualSub}>avg kcal/day</Text>
                <Text style={ai.dualDetail}>P:{aiData.nutritionScore.avgProtein}g C:{aiData.nutritionScore.avgCarbs}g F:{aiData.nutritionScore.avgFat}g</Text>
              </View>
            </View>

            {/* Insights */}
            <Text style={styles.sectionTitle}>AI INSIGHTS</Text>
            {aiData.insights.map((ins, i) => (
              <View key={i} style={[ai.insightCard, { borderColor: prioColor(ins.priority) + '30' }]}>
                <View style={ai.insightTop}>
                  <View style={[ai.insightCat, { backgroundColor: prioColor(ins.priority) + '18' }]}>
                    <Text style={[ai.insightCatText, { color: prioColor(ins.priority) }]}>{ins.category}</Text>
                  </View>
                  <View style={[ai.insightPrio, { backgroundColor: prioColor(ins.priority) + '18' }]}>
                    <Text style={[ai.insightPrioText, { color: prioColor(ins.priority) }]}>{ins.priority}</Text>
                  </View>
                </View>
                <Text style={ai.insightTitle}>{ins.title}</Text>
                <Text style={ai.insightBody}>{ins.body}</Text>
              </View>
            ))}
          </>
        )}

        {/* ═══ GARMIN VITALS ═══ */}
        <Text style={styles.sectionTitle}>TODAY'S HEART RATE</Text>

        {/* Hero HR card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <PulsingDot color={todayStatus.color} />
              <Text style={styles.heroLabel}>HEART RATE  ·  TODAY</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: todayStatus.color + '22' }]}>
              <Text style={[styles.statusBadgeText, { color: todayStatus.color }]}>{todayStatus.label}</Text>
            </View>
          </View>
          <Text style={[styles.heroBpm, { color: todayStatus.color }]}>
            {today.hrAvg.toFixed(1)}<Text style={styles.heroBpmUnit}> bpm</Text>
          </Text>
          <View style={styles.heroRangeRow}>
            {[{ l: 'MIN', v: today.hrMin }, { l: 'MAX', v: today.hrMax }, { l: 'AVG', v: today.hrAvg }].map((item, i) => (
              <React.Fragment key={item.l}>
                {i > 0 && <View style={styles.heroRangeDivider} />}
                <View style={styles.heroRangeItem}>
                  <Text style={styles.heroRangeLabel}>{item.l}</Text>
                  <Text style={[styles.heroRangeVal, item.l === 'AVG' && { color: todayStatus.color }]}>
                    {typeof item.v === 'number' ? item.v.toFixed(0) : item.v}
                  </Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Metric grid */}
        <Text style={styles.sectionTitle}>Last Full Reading  ·  {shortDate(lastFull.date)}</Text>
        <View style={styles.metricGrid}>
          {[
            { label: 'HRV',         value: lastFull.hrvAvg!, unit: 'ms',   color: C.hrv,  dim: C.hrvDim,  emoji: '💜' },
            { label: 'O₂ Sat',      value: lastFull.o2Avg!,  unit: '%',    color: C.o2,   dim: C.o2Dim,   emoji: '🫁' },
            { label: 'Resp Rate',    value: lastFull.respAvg!, unit: 'br/m', color: C.resp, dim: C.respDim, emoji: '🌬️' },
            { label: 'Resting HR',   value: lastFull.rhrAvg!, unit: 'bpm',  color: C.rhr,  dim: C.rhrDim,  emoji: '🛌' },
          ].map(m => (
            <View key={m.label} style={[styles.metricCard, { borderColor: m.color + '30' }]}>
              <View style={[styles.metricIconBg, { backgroundColor: m.dim }]}><Text style={{ fontSize: 18 }}>{m.emoji}</Text></View>
              <Text style={[styles.metricValue, { color: m.color }]}>{m.value}<Text style={styles.metricUnit}> {m.unit}</Text></Text>
              <Text style={styles.metricLabel}>{m.label}</Text>
            </View>
          ))}
        </View>

        {/* 7-day trend */}
        <Text style={styles.sectionTitle}>7-Day Heart Rate Trend</Text>
        <View style={styles.trendContainer}>
          {last7.map(entry => {
            const ratio = entry.hrAvg / maxHR;
            const color = entry.hrAvg >= 100 ? C.heart : entry.hrAvg >= 85 ? C.rhr : C.resp;
            return (
              <View key={entry.date} style={styles.trendBarWrapper}>
                <View style={styles.trendBarTrack}>
                  <View style={[styles.trendBarFill, { height: `${ratio * 100}%`, backgroundColor: color }]} />
                </View>
                <Text style={styles.trendBarLabel}>{shortDate(entry.date).split(' ')[1]}</Text>
              </View>
            );
          })}
        </View>

        {/* Recent history */}
        <Text style={styles.sectionTitle}>Recent History</Text>
        <View style={styles.historyContainer}>
          {healthData.slice().reverse().slice(0, 10).map(entry => {
            const status = hrStatus(entry.hrAvg);
            const isToday = entry.date === today.date;
            return (
              <View key={entry.date} style={[styles.historyRow, isToday && styles.historyRowToday]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.historyDate, isToday && { color: C.white, fontWeight: '700' }]}>
                    {isToday ? 'Today  ' : ''}{fmtDate(entry.date)}
                  </Text>
                  <Text style={styles.historyRange}>{entry.hrMin} – {entry.hrMax} bpm</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={[styles.historyAvg, { color: status.color }]}>{entry.hrAvg.toFixed(1)}</Text>
                  <View style={[styles.statusPill, { backgroundColor: status.color + '22' }]}>
                    <Text style={[styles.statusPillText, { color: status.color }]}>{status.label}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <Text style={styles.footer}>Synced from Garmin Connect · AI by Claude</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── AI styles ────────────────────────────────────────────────────────────────
const ai = StyleSheet.create({
  loadingCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.claudeDim, borderRadius: 14, borderWidth: 1, borderColor: C.claude + '40', padding: 16, marginBottom: 16 },
  loadingText: { fontSize: 14, color: C.claude, fontWeight: '600' },

  errorCard: { backgroundColor: C.heart + '0C', borderWidth: 1, borderColor: C.heart + '40', borderRadius: 14, padding: 14, marginBottom: 16, gap: 4 },
  errorTitle: { fontSize: 14, fontWeight: '700', color: C.heart },
  errorBody: { fontSize: 12, color: C.muted, lineHeight: 17 },
  errorRetry:{ fontSize: 12, color: C.heart, fontWeight: '700', marginTop: 4 },

  briefCard:  { backgroundColor: C.claudeDim, borderRadius: 16, borderWidth: 1, borderColor: C.claude + '40', padding: 16, marginBottom: 16 },
  briefTop:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  briefIcon:  { fontSize: 16, color: C.claude },
  briefLabel: { fontSize: 10, fontWeight: '800', color: C.claude, letterSpacing: 1, flex: 1 },
  briefText:  { fontSize: 14, color: C.muted, lineHeight: 22 },
  refreshBtn: { padding: 6 },
  refreshText:{ color: C.claude, fontSize: 16, fontWeight: '700' },

  scoreRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16, paddingHorizontal: 20 },

  warnCard:  { borderRadius: 12, borderWidth: 1, padding: 12, gap: 4 },
  warnTitle: { fontSize: 13, fontWeight: '800' },
  warnBody:  { fontSize: 13, color: C.muted, lineHeight: 19 },

  predCard:  { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 14, width: 160, gap: 6 },
  predMetric:{ fontSize: 12, color: C.muted, fontWeight: '700', letterSpacing: 0.5 },
  predRow:   { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  predCurr:  { fontSize: 14, color: C.white, fontWeight: '600' },
  predArrow: { fontSize: 18, fontWeight: '900' },
  predTarget:{ fontSize: 18, fontWeight: '900', color: C.white },
  predTime:  { fontSize: 10, color: C.faint },

  trendsCard:{ backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, marginBottom: 16 },
  trendRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.border },
  trendDot:  { width: 7, height: 7, borderRadius: 3.5 },
  trendMetric:{ fontSize: 13, color: C.white, fontWeight: '500' },
  trendChange:{ fontSize: 13, fontWeight: '800' },
  trendDir:  { fontSize: 11, fontWeight: '600', width: 62, textAlign: 'right' },

  dualRow:   { flexDirection: 'row', gap: 10, marginBottom: 16 },
  dualCard:  { flex: 1, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, padding: 14, gap: 4, alignItems: 'center' },
  dualLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  dualBig:   { fontSize: 28, fontWeight: '900' },
  dualSub:   { fontSize: 11, color: C.muted },
  dualDetail:{ fontSize: 11, color: C.faint, textAlign: 'center' },

  insightCard: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 8, gap: 6 },
  insightTop:  { flexDirection: 'row', gap: 6 },
  insightCat:  { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  insightCatText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  insightPrio:    { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  insightPrioText:{ fontSize: 10, fontWeight: '700' },
  insightTitle:{ fontSize: 14, fontWeight: '700', color: C.white },
  insightBody: { fontSize: 13, color: C.muted, lineHeight: 19 },
});

// ─── Main styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1, backgroundColor: C.bg },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 20, paddingBottom: 20 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: C.white, letterSpacing: -0.5 },
  headerSub: { fontSize: 14, color: C.muted, marginTop: 2 },
  garminBadge: { backgroundColor: C.garmin + '22', borderWidth: 1, borderColor: C.garmin + '66', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  garminBadgeText: { color: C.garmin, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },

  sectionTitle: { fontSize: 12, fontWeight: '700', color: C.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },

  heroCard: { backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.border, padding: 20, marginBottom: 24 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  heroLabel: { color: C.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },
  heroBpm: { fontSize: 64, fontWeight: '800', letterSpacing: -2, lineHeight: 68, marginBottom: 16 },
  heroBpmUnit: { fontSize: 22, fontWeight: '400', letterSpacing: 0 },
  heroRangeRow: { flexDirection: 'row', marginBottom: 8 },
  heroRangeItem: { flex: 1, alignItems: 'center', gap: 4 },
  heroRangeLabel: { fontSize: 10, color: C.muted, fontWeight: '700', letterSpacing: 1 },
  heroRangeVal: { fontSize: 22, fontWeight: '700', color: C.white },
  heroRangeDivider: { width: 1, backgroundColor: C.border, marginVertical: 4 },

  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  metricCard: { width: (SCREEN_WIDTH - 42) / 2, borderRadius: 16, borderWidth: 1, backgroundColor: C.card, padding: 16, gap: 6 },
  metricIconBg: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  metricValue: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  metricUnit: { fontSize: 14, fontWeight: '400', color: C.muted },
  metricLabel: { fontSize: 13, color: C.muted, fontWeight: '600' },

  trendContainer: { flexDirection: 'row', alignItems: 'flex-end', height: 90, gap: 6, marginBottom: 28, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 12, paddingBottom: 28 },
  trendBarWrapper: { flex: 1, alignItems: 'center', height: '100%', gap: 4 },
  trendBarTrack: { flex: 1, width: '70%', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 4, justifyContent: 'flex-end', overflow: 'hidden' },
  trendBarFill: { borderRadius: 4, minHeight: 4 },
  trendBarLabel: { fontSize: 10, color: C.faint, fontWeight: '600', position: 'absolute', bottom: -18 },

  historyContainer: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 24 },
  historyRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  historyRowToday: { backgroundColor: 'rgba(255,255,255,0.04)' },
  historyDate: { fontSize: 14, color: C.muted, fontWeight: '500', marginBottom: 3 },
  historyRange: { fontSize: 12, color: C.faint },
  historyAvg: { fontSize: 20, fontWeight: '700' },
  statusPill: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  statusPillText: { fontSize: 11, fontWeight: '700' },

  footer: { textAlign: 'center', fontSize: 11, color: C.faint, marginBottom: 8 },
});
