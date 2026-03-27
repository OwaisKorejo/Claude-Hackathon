import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, StatusBar, KeyboardAvoidingView, Platform, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

const C = {
  bg: '#080D1A', card: '#111827', cardAlt: '#0D1526',
  border: 'rgba(255,255,255,0.07)', white: '#FFFFFF',
  muted: 'rgba(255,255,255,0.5)', faint: 'rgba(255,255,255,0.2)',
  heart: '#FF4B6E', hrv: '#A78BFA', o2: '#22D3EE',
  resp: '#34D399', rhr: '#FBBF24', indigo: '#6366F1',
  claude: '#CC9B4A', claudeDim: 'rgba(204,155,74,0.15)',
  input: '#1C2539',
};

// ─── Garmin summary (derived from data) ───────────────────────────────────────
const DATA_SUMMARY = {
  avgHRV:      43.5,
  latestHRV:   48,
  avgHR:       79.4,
  todayHR:     103.95,
  avgO2:       96.2,
  avgRHR:      57.0,
  avgSleep:    7.2,
  avgSteps:    10200,
  bestHRVDay:  'Mar 15 (59 ms)',
  worstHRDay:  'Today (103.95 bpm)',
  hrvTrend:    'stable with occasional stress spikes',
  hrTrend:     'elevated today — possible high-intensity day',
};

// ─── Pre-built insights ────────────────────────────────────────────────────────
const INSIGHTS = [
  {
    id: 'i1',
    category: 'HRV',
    icon: '💜',
    color: C.hrv,
    title: 'Your HRV is trending stable',
    body: `Your average HRV over the last 30 days is ${DATA_SUMMARY.avgHRV} ms — in a healthy range for your age profile. Your best reading was ${DATA_SUMMARY.bestHRVDay}. Days with high HR (like Mar 7–8 and Mar 17–18) correlate with HRV dips below 30 ms, suggesting those were high-stress or intense training days.`,
    action: 'Prioritise 7–8h sleep before intense sessions to protect HRV.',
    expanded: false,
  },
  {
    id: 'i2',
    category: 'Heart Rate',
    icon: '❤️',
    color: C.heart,
    title: 'Today\'s HR is significantly elevated',
    body: `Your average heart rate today is 103.95 bpm — well above your 30-day average of ${DATA_SUMMARY.avgHR} bpm. This is the highest single-day reading in your dataset. Possible causes: high-intensity exercise, illness, high stress, or caffeine.`,
    action: 'If not exercising today, consider rest and hydration. Monitor overnight.',
    expanded: false,
  },
  {
    id: 'i3',
    category: 'Sleep',
    icon: '🌙',
    color: C.hrv,
    title: 'Sleep quality correlates with HRV',
    body: `On days where you slept 8+ hours (Mar 5, 14, 15, 22), your HRV averaged 56 ms vs 38 ms on sub-6h nights. Your average sleep of ${DATA_SUMMARY.avgSleep}h is decent, but boosting it toward 8h consistently could add 10–15 ms to your average HRV.`,
    action: 'Aim to be in bed by 22:30 to hit 8h before your typical wake time.',
    expanded: false,
  },
  {
    id: 'i4',
    category: 'O₂ Saturation',
    icon: '🫁',
    color: C.o2,
    title: 'O₂ sat dips on high-output days',
    body: `Your oxygen saturation averages ${DATA_SUMMARY.avgO2}% — excellent. However, on your most active days (Mar 7, 8, 17, 18) it dropped to 92–93%. This is normal during exertion but worth monitoring if you experience breathlessness at rest.`,
    action: 'If O₂ drops below 90% at rest, consult a physician.',
    expanded: false,
  },
  {
    id: 'i5',
    category: 'Resting HR',
    icon: '🛌',
    color: C.rhr,
    title: 'Resting HR reflects training load',
    body: `Your resting HR averaged ${DATA_SUMMARY.avgRHR} bpm, with your lowest readings (51–52 bpm) on easy days and peaks of 65–66 bpm following hard training blocks. This pattern is consistent with good aerobic conditioning. Target: sustained resting HR below 55 bpm.`,
    action: 'Add one full recovery day per week to bring resting HR down long-term.',
    expanded: false,
  },
  {
    id: 'i6',
    category: 'Pattern',
    icon: '📈',
    color: C.resp,
    title: 'Weekly training pattern detected',
    body: `Your data reveals a clear weekly cycle: HR and respiratory rate spike on Saturdays and Sundays (likely your hard days), followed by recovery Mon–Wed, then building again Thu–Fri. Your body is adapting well — maintain this structure.`,
    action: 'Schedule your check-in measurements on Wednesday mornings for most accurate baseline readings.',
    expanded: false,
  },
];

// ─── Real Claude API call ──────────────────────────────────────────────────────
const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

const DATA_CONTEXT = `You are a health data analyst. Here is the user's 30-day Garmin data summary:
- 30-day HR avg: 79.4 bpm, today: 103.95 bpm (highest), best: 67.1 bpm (Mar 15)
- HRV avg: 43.5 ms, best: 59 ms (Mar 15), worst: 25 ms (Mar 8)
- O₂ sat avg: 96.2%, resting HR avg: 57 bpm
- Sleep avg: ~7.2h, steps avg: ~10.2k/day
- Today's HR is significantly elevated at 103.95 bpm
- HRV dips to 25-28 ms correlate with high-intensity days (Mar 7-8, 17-18)
- Days with 8h+ sleep show +18ms HRV improvement next day

Answer questions specifically about this person's data. Be concise (2-4 paragraphs max). Use specific numbers from the data.`;

async function generateResponse(question: string): Promise<string> {
  if (!API_KEY) {
    return 'API key not configured. Set EXPO_PUBLIC_ANTHROPIC_API_KEY in your .env file.';
  }

  try {
    const resp = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 600,
        system: DATA_CONTEXT,
        messages: [{ role: 'user', content: question }],
      }),
    });

    if (!resp.ok) throw new Error(`API error ${resp.status}`);
    const json = await resp.json();
    return json.content?.[0]?.text ?? 'No response received.';
  } catch (e: any) {
    return `Error: ${e?.message ?? 'Failed to reach Claude API'}`;
  }
}

type Message = { id: string; role: 'user' | 'assistant'; text: string; };

// ─── Main screen ───────────────────────────────────────────────────────────────
export default function AIInsightsScreen() {
  const router = useRouter();
  const [insights, setInsights] = useState(INSIGHTS);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm0',
      role: 'assistant',
      text: `Hi! I've analysed your 30 days of Garmin health data. Your biggest signal today is an elevated heart rate of **103.95 bpm** — your highest recorded reading. Ask me anything about your data.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const flatRef = useRef<FlatList>(null);

  function toggleExpand(id: string) {
    setInsights(prev => prev.map(ins => ins.id === id ? { ...ins, expanded: !ins.expanded } : ins));
  }

  async function sendMessage() {
    if (!input.trim() || loading) return;
    const userMsg: Message = { id: `m${Date.now()}`, role: 'user', text: input.trim() };
    setInput('');
    setLoading(true);
    setMessages(prev => [...prev, userMsg]);
    try {
      const text = await generateResponse(userMsg.text);
      const reply: Message = { id: `m${Date.now() + 1}`, role: 'assistant', text };
      setMessages(prev => [...prev, reply]);
    } catch {
      setMessages(prev => [...prev, { id: `m${Date.now() + 1}`, role: 'assistant', text: 'Sorry, I couldn\'t process that. Please try again.' }]);
    }
    setLoading(false);
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
  }

  const QUICK = ['Why is my HR elevated?', 'How can I improve HRV?', 'Analyse my sleep', 'What are my top tips?'];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>AI Insights</Text>
        <View style={[s.claudeBadge]}>
          <Text style={s.claudeBadgeText}>Claude</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
        <FlatList
          ref={flatRef}
          data={['insights', 'chat']}
          keyExtractor={item => item}
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            if (item === 'insights') {
              return (
                <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
                  {/* Today's brief */}
                  <View style={s.brief}>
                    <View style={s.briefTop}>
                      <Text style={s.briefIcon}>✦</Text>
                      <Text style={s.briefTitle}>Today's Brief</Text>
                    </View>
                    <Text style={s.briefBody}>
                      Heart rate is <Text style={{ color: C.heart, fontWeight: '700' }}>significantly elevated</Text> at 103.95 bpm. HRV last reading: <Text style={{ color: C.hrv, fontWeight: '700' }}>48 ms</Text> (stable). Average O₂ sat: <Text style={{ color: C.o2, fontWeight: '700' }}>96.2%</Text>. Prioritise rest and monitor over the next 24–48 hours.
                    </Text>
                  </View>

                  {/* Metric summary pills */}
                  <View style={s.pillRow}>
                    {[
                      { label: 'HRV', val: '43.5 ms', color: C.hrv },
                      { label: 'O₂', val: '96.2%',   color: C.o2 },
                      { label: 'RHR', val: '57 bpm', color: C.rhr },
                      { label: 'Sleep', val: '7.2h',  color: C.hrv },
                    ].map(p => (
                      <View key={p.label} style={[s.pill, { borderColor: p.color + '40' }]}>
                        <Text style={[s.pillVal, { color: p.color }]}>{p.val}</Text>
                        <Text style={s.pillLabel}>{p.label} avg</Text>
                      </View>
                    ))}
                  </View>

                  {/* Insight cards */}
                  <Text style={s.sectionLabel}>INSIGHTS  ({insights.length})</Text>
                  {insights.map(ins => (
                    <TouchableOpacity
                      key={ins.id}
                      style={[s.insightCard, { borderColor: ins.color + '30' }]}
                      onPress={() => toggleExpand(ins.id)}
                      activeOpacity={0.7}
                    >
                      <View style={s.insightTop}>
                        <View style={[s.insightIconBg, { backgroundColor: ins.color + '18' }]}>
                          <Text style={{ fontSize: 18 }}>{ins.icon}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={[s.catPill, { backgroundColor: ins.color + '18' }]}>
                            <Text style={[s.catPillText, { color: ins.color }]}>{ins.category}</Text>
                          </View>
                          <Text style={s.insightTitle}>{ins.title}</Text>
                        </View>
                        <Text style={[s.chevron, { color: ins.color }]}>{ins.expanded ? '˄' : '˅'}</Text>
                      </View>
                      {ins.expanded && (
                        <View style={s.insightBody}>
                          <Text style={s.insightText}>{ins.body}</Text>
                          <View style={[s.actionBox, { borderColor: ins.color + '40', backgroundColor: ins.color + '0F' }]}>
                            <Text style={[s.actionLabel, { color: ins.color }]}>RECOMMENDATION</Text>
                            <Text style={s.actionText}>{ins.action}</Text>
                          </View>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}

                  <Text style={s.sectionLabel}>ASK CLAUDE</Text>
                </View>
              );
            }

            // Chat section
            return (
              <View style={{ paddingHorizontal: 16 }}>
                {messages.map(msg => (
                  <View key={msg.id} style={[s.bubble, msg.role === 'user' ? s.userBubble : s.aiBubble]}>
                    {msg.role === 'assistant' && (
                      <View style={s.aiAvatar}><Text style={s.aiAvatarText}>✦</Text></View>
                    )}
                    <View style={[s.bubbleInner, msg.role === 'user' ? s.userBubbleInner : s.aiBubbleInner]}>
                      <Text style={s.bubbleText}>{msg.text}</Text>
                    </View>
                  </View>
                ))}
                {loading && (
                  <View style={[s.bubble, s.aiBubble]}>
                    <View style={s.aiAvatar}><Text style={s.aiAvatarText}>✦</Text></View>
                    <View style={[s.bubbleInner, s.aiBubbleInner]}>
                      <Text style={s.loadingDots}>• • •</Text>
                    </View>
                  </View>
                )}

                {/* Quick prompts */}
                {messages.length <= 1 && (
                  <View style={s.quickRow}>
                    {QUICK.map(q => (
                      <TouchableOpacity key={q} style={s.quickBtn} onPress={() => { setInput(q); }}>
                        <Text style={s.quickText}>{q}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                <View style={{ height: 16 }} />
              </View>
            );
          }}
          onScrollToIndexFailed={() => {}}
        />

        {/* Input bar */}
        <View style={s.inputBar}>
          <TextInput
            style={s.inputField}
            value={input}
            onChangeText={setInput}
            placeholder="Ask about your health data…"
            placeholderTextColor={C.faint}
            multiline
            maxLength={400}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[s.sendBtn, (!input.trim() || loading) && { opacity: 0.4 }]}
            onPress={sendMessage}
            disabled={!input.trim() || loading}
          >
            <Text style={s.sendBtnText}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: C.bg },
  header:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backArrow:    { fontSize: 32, color: C.white, lineHeight: 40 },
  headerTitle:  { fontSize: 20, fontWeight: '800', color: C.white },
  claudeBadge:  { backgroundColor: C.claudeDim, borderWidth: 1, borderColor: C.claude + '55', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  claudeBadgeText: { color: C.claude, fontSize: 12, fontWeight: '700' },

  brief:    { backgroundColor: C.claudeDim, borderWidth: 1, borderColor: C.claude + '40', borderRadius: 16, padding: 16, marginBottom: 14 },
  briefTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  briefIcon:  { fontSize: 18, color: C.claude },
  briefTitle: { fontSize: 14, fontWeight: '800', color: C.claude, letterSpacing: 0.3 },
  briefBody:  { fontSize: 14, color: C.muted, lineHeight: 21 },

  pillRow: { flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  pill:    { flex: 1, minWidth: 70, backgroundColor: C.card, borderRadius: 12, borderWidth: 1, padding: 12, alignItems: 'center', gap: 3 },
  pillVal: { fontSize: 15, fontWeight: '800' },
  pillLabel: { fontSize: 10, color: C.muted, fontWeight: '600' },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: C.muted, letterSpacing: 1, marginBottom: 10 },

  insightCard:  { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 10 },
  insightTop:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  insightIconBg:{ width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  catPill:  { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 4 },
  catPillText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  insightTitle: { fontSize: 14, fontWeight: '700', color: C.white, lineHeight: 19 },
  chevron: { fontSize: 18, fontWeight: '700' },
  insightBody: { marginTop: 12, gap: 10 },
  insightText: { fontSize: 14, color: C.muted, lineHeight: 21 },
  actionBox:   { borderRadius: 10, borderWidth: 1, padding: 12, gap: 4 },
  actionLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  actionText:  { fontSize: 13, color: C.white, lineHeight: 19 },

  // Chat
  bubble:      { flexDirection: 'row', marginBottom: 10, gap: 8 },
  userBubble:  { justifyContent: 'flex-end' },
  aiBubble:    { justifyContent: 'flex-start', alignItems: 'flex-end' },
  bubbleInner: { maxWidth: '80%', borderRadius: 16, padding: 12 },
  userBubbleInner: { backgroundColor: C.indigo + '33', borderWidth: 1, borderColor: C.indigo + '55', borderBottomRightRadius: 4 },
  aiBubbleInner:   { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderBottomLeftRadius: 4 },
  bubbleText:  { fontSize: 14, color: C.white, lineHeight: 20 },
  loadingDots: { fontSize: 18, color: C.muted, letterSpacing: 4 },
  aiAvatar:    { width: 28, height: 28, borderRadius: 8, backgroundColor: C.claudeDim, borderWidth: 1, borderColor: C.claude + '55', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  aiAvatarText:{ color: C.claude, fontSize: 12, fontWeight: '800' },

  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  quickBtn: { backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 8 },
  quickText:{ fontSize: 13, color: C.muted },

  inputBar:    { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.border, gap: 10, backgroundColor: C.bg },
  inputField:  { flex: 1, backgroundColor: C.input, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 12, color: C.white, fontSize: 15, maxHeight: 100 },
  sendBtn:     { width: 42, height: 42, borderRadius: 21, backgroundColor: C.indigo, alignItems: 'center', justifyContent: 'center' },
  sendBtnText: { color: C.white, fontSize: 20, fontWeight: '800' },
});
