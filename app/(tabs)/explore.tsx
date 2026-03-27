import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

const C = {
  bg:      '#080D1A',
  card:    '#111827',
  border:  'rgba(255,255,255,0.07)',
  white:   '#FFFFFF',
  muted:   'rgba(255,255,255,0.5)',
  faint:   'rgba(255,255,255,0.2)',
  heart:   '#FF4B6E',
  hrv:     '#A78BFA',
  o2:      '#22D3EE',
  resp:    '#34D399',
  rhr:     '#FBBF24',
  indigo:  '#6366F1',
};

const FEATURES = [
  {
    route: '/health-logs' as const,
    emoji: '📊',
    title: 'Health Logs',
    description: 'HRV, sleep phases, steps, resting heart rate — full trend analysis.',
    color: C.o2,
    dim: 'rgba(34,211,238,0.12)',
    tags: ['HRV', 'Sleep', 'Steps', 'O₂ Sat'],
  },
  {
    route: '/journal' as const,
    emoji: '📓',
    title: 'Daily Journal',
    description: 'Mood, energy, meals, and daily notes — track your whole self.',
    color: C.rhr,
    dim: 'rgba(251,191,36,0.12)',
    tags: ['Mood', 'Energy', 'Meals', 'Notes'],
  },
  {
    route: '/ai-insights' as const,
    emoji: '✦',
    title: 'AI Insights',
    description: 'Daily briefings powered by Claude, tailored to your physiology.',
    color: C.hrv,
    dim: 'rgba(167,139,250,0.12)',
    tags: ['Trends', 'Recommendations', 'Patterns'],
  },
  {
    route: '/meals' as const,
    emoji: '🍽️',
    title: 'Meals (Supabase)',
    description: 'Live query to your Supabase `meals` table with pull-to-refresh.',
    color: C.indigo,
    dim: 'rgba(99,102,241,0.12)',
    tags: ['Supabase', 'Meals', 'Live Data'],
  },
  {
    route: '/exercises' as const,
    emoji: '🏋️',
    title: 'Exercises',
    description: 'Log every set, rep, and run. Tracks to Supabase with volume and RPE.',
    color: '#F97316',
    dim: 'rgba(249,115,22,0.12)',
    tags: ['Push', 'Pull', 'Legs', 'Cardio', 'RPE'],
  },
  {
    route: '/body-scan' as const,
    emoji: '🔬',
    title: 'Body Scan',
    description: 'Camera-guided body composition scan using the U.S. Navy formula to estimate body fat %.',
    color: '#F472B6',
    dim: 'rgba(244,114,182,0.12)',
    tags: ['Body Fat %', 'Camera', 'Navy Formula'],
  },
  {
    route: '/profile' as const,
    emoji: '🎯',
    title: 'Profile & Goals',
    description: 'Health goals, injuries, chronic conditions, and target metrics.',
    color: C.resp,
    dim: 'rgba(52,211,153,0.12)',
    tags: ['Goals', 'Conditions', 'Targets'],
  },
];

export default function ExploreScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>Your Health Hub</Text>
          <Text style={s.headerSub}>Tap any section to explore</Text>
        </View>

        {/* Add Data CTA */}
        <TouchableOpacity style={s.addCta} activeOpacity={0.8} onPress={() => router.push('/add-data')}>
          <Text style={s.addCtaIcon}>＋</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.addCtaTitle}>Add Today&apos;s Data</Text>
            <Text style={s.addCtaSub}>Log health metrics manually</Text>
          </View>
          <Text style={s.addCtaArrow}>›</Text>
        </TouchableOpacity>

        {/* Feature cards */}
        {FEATURES.map(f => (
          <TouchableOpacity
            key={f.route}
            style={[s.card, { borderColor: f.color + '30' }]}
            activeOpacity={0.75}
            onPress={() => router.push(f.route)}
          >
            <View style={s.cardTop}>
              <View style={[s.iconBg, { backgroundColor: f.dim }]}>
                <Text style={s.iconEmoji}>{f.emoji}</Text>
              </View>
              <Text style={[s.cardArrow, { color: f.color }]}>›</Text>
            </View>
            <Text style={[s.cardTitle, { color: f.color }]}>{f.title}</Text>
            <Text style={s.cardDesc}>{f.description}</Text>
            <View style={s.tagRow}>
              {f.tags.map(t => (
                <View key={t} style={[s.tag, { backgroundColor: f.color + '18' }]}>
                  <Text style={[s.tagText, { color: f.color }]}>{t}</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        ))}

        <Text style={s.footer}>Data source: Garmin Connect · Europe/Dublin</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: C.bg },
  scroll:     { flex: 1, backgroundColor: C.bg },
  content:    { paddingHorizontal: 16, paddingBottom: 40 },

  header: { paddingTop: 20, paddingBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: C.white, letterSpacing: -0.5 },
  headerSub:   { fontSize: 14, color: C.muted, marginTop: 3 },

  addCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.indigo + '22',
    borderWidth: 1,
    borderColor: C.indigo + '55',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  addCtaIcon:  { fontSize: 24, color: C.indigo },
  addCtaTitle: { fontSize: 16, fontWeight: '700', color: C.white },
  addCtaSub:   { fontSize: 13, color: C.muted, marginTop: 2 },
  addCtaArrow: { fontSize: 26, color: C.indigo, marginRight: 4 },

  card: {
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 14,
  },
  cardTop:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  iconBg:    { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  iconEmoji: { fontSize: 24 },
  cardArrow: { fontSize: 32, lineHeight: 48 },
  cardTitle: { fontSize: 20, fontWeight: '800', marginBottom: 6, letterSpacing: -0.3 },
  cardDesc:  { fontSize: 14, color: C.muted, lineHeight: 20, marginBottom: 14 },
  tagRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag:       { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  tagText:   { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },

  footer: { textAlign: 'center', fontSize: 11, color: C.faint, marginTop: 8 },
});
