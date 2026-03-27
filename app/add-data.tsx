import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, StatusBar, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { store } from '@/store/data';

const C = {
  bg: '#080D1A', card: '#111827', border: 'rgba(255,255,255,0.07)',
  white: '#FFFFFF', muted: 'rgba(255,255,255,0.5)', faint: 'rgba(255,255,255,0.18)',
  heart: '#FF4B6E', hrv: '#A78BFA', o2: '#22D3EE', resp: '#34D399', rhr: '#FBBF24',
  sleep: '#818CF8', steps: '#F472B6', indigo: '#6366F1', input: '#1C2539',
  success: '#34D399',
};

function today() {
  return new Date().toISOString().split('T')[0];
}

// ─── Number input ──────────────────────────────────────────────────────────────
function NumInput({ label, value, onChange, placeholder, suffix, color }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; suffix?: string; color?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={ni.wrapper}>
      <Text style={ni.label}>{label}</Text>
      <View style={[ni.row, focused && { borderColor: (color ?? C.indigo) + '80' }]}>
        <TextInput
          style={ni.input}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder ?? '—'}
          placeholderTextColor={C.faint}
          keyboardType="decimal-pad"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {suffix ? <Text style={[ni.suffix, focused && { color: color ?? C.indigo }]}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

const ni = StyleSheet.create({
  wrapper: { flex: 1, gap: 6 },
  label:   { fontSize: 11, fontWeight: '700', color: C.muted, letterSpacing: 0.5 },
  row:     { flexDirection: 'row', alignItems: 'center', backgroundColor: C.input, borderRadius: 10, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 10 },
  input:   { flex: 1, color: C.white, fontSize: 16, fontWeight: '600' },
  suffix:  { fontSize: 12, color: C.muted, marginLeft: 4 },
});

// ─── Section header ────────────────────────────────────────────────────────────
function SectionHead({ emoji, label, color }: { emoji: string; label: string; color: string }) {
  return (
    <View style={sh.row}>
      <View style={[sh.iconBg, { backgroundColor: color + '18' }]}>
        <Text style={{ fontSize: 16 }}>{emoji}</Text>
      </View>
      <Text style={[sh.label, { color }]}>{label}</Text>
    </View>
  );
}

const sh = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, marginTop: 20 },
  iconBg:{ width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 14, fontWeight: '800', letterSpacing: 0.3 },
});

// ─── Main screen ───────────────────────────────────────────────────────────────
export default function AddDataScreen() {
  const router = useRouter();

  const [date,       setDate]       = useState(today());
  const [hrMin,      setHrMin]      = useState('');
  const [hrMax,      setHrMax]      = useState('');
  const [hrAvg,      setHrAvg]      = useState('');
  const [hrv,        setHrv]        = useState('');
  const [o2,         setO2]         = useState('');
  const [respRate,   setRespRate]   = useState('');
  const [rhr,        setRhr]        = useState('');
  const [steps,      setSteps]      = useState('');
  const [sleepH,     setSleepH]     = useState('');
  const [sleepDeep,  setSleepDeep]  = useState('');
  const [sleepRem,   setSleepRem]   = useState('');
  const [sleepLight, setSleepLight] = useState('');
  const [notes,      setNotes]      = useState('');
  const [saved,      setSaved]      = useState(false);

  function parseNum(v: string): number | null {
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  }

  function validate(): string | null {
    if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) return 'Date must be in YYYY-MM-DD format.';
    if (!hrMin && !hrMax && !hrAvg && !hrv && !o2 && !steps && !sleepH) {
      return 'Please fill in at least one health metric.';
    }
    return null;
  }

  function handleSave() {
    const err = validate();
    if (err) { Alert.alert('Missing info', err); return; }

    store.addHealthEntry({
      date,
      hrMin:      parseNum(hrMin),
      hrMax:      parseNum(hrMax),
      hrAvg:      parseNum(hrAvg),
      hrv:        parseNum(hrv),
      o2:         parseNum(o2),
      respRate:   parseNum(respRate),
      rhr:        parseNum(rhr),
      steps:      parseNum(steps),
      sleepHours: parseNum(sleepH),
      sleepDeep:  parseNum(sleepDeep),
      sleepRem:   parseNum(sleepRem),
      sleepLight: parseNum(sleepLight),
      notes,
    });

    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      router.back();
    }, 1200);
  }

  function handleClear() {
    Alert.alert('Clear all fields?', 'This will reset the form.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => {
        setDate(today());
        setHrMin(''); setHrMax(''); setHrAvg('');
        setHrv(''); setO2(''); setRespRate(''); setRhr('');
        setSteps(''); setSleepH(''); setSleepDeep(''); setSleepRem(''); setSleepLight('');
        setNotes('');
      }},
    ]);
  }

  if (saved) {
    return (
      <SafeAreaView style={[s.safe, { alignItems: 'center', justifyContent: 'center' }]} edges={['top']}>
        <View style={s.savedBox}>
          <Text style={s.savedCheck}>✓</Text>
          <Text style={s.savedTitle}>Entry Saved</Text>
          <Text style={s.savedSub}>{date}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Add Health Data</Text>
        <TouchableOpacity onPress={handleClear}>
          <Text style={s.clearBtn}>Clear</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Date */}
          <Text style={s.sectionLabel}>DATE</Text>
          <TextInput
            style={s.dateInput}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={C.faint}
            keyboardType="numbers-and-punctuation"
          />

          {/* Heart Rate */}
          <SectionHead emoji="❤️" label="Heart Rate" color={C.heart} />
          <View style={s.row}>
            <NumInput label="MIN" value={hrMin} onChange={setHrMin} suffix="bpm" color={C.heart} placeholder="52" />
            <NumInput label="MAX" value={hrMax} onChange={setHrMax} suffix="bpm" color={C.heart} placeholder="136" />
            <NumInput label="AVG" value={hrAvg} onChange={setHrAvg} suffix="bpm" color={C.heart} placeholder="73.4" />
          </View>

          {/* HRV */}
          <SectionHead emoji="💜" label="Heart Rate Variability" color={C.hrv} />
          <View style={s.row}>
            <NumInput label="HRV AVG" value={hrv} onChange={setHrv} suffix="ms" color={C.hrv} placeholder="48" />
          </View>

          {/* O2 + Resp */}
          <SectionHead emoji="🫁" label="Oxygen & Breathing" color={C.o2} />
          <View style={s.row}>
            <NumInput label="O₂ SAT" value={o2} onChange={setO2} suffix="%" color={C.o2} placeholder="97.0" />
            <NumInput label="RESP RATE" value={respRate} onChange={setRespRate} suffix="br/m" color={C.o2} placeholder="14.5" />
          </View>

          {/* Resting HR */}
          <SectionHead emoji="🛌" label="Resting Heart Rate" color={C.rhr} />
          <View style={s.row}>
            <NumInput label="RESTING HR" value={rhr} onChange={setRhr} suffix="bpm" color={C.rhr} placeholder="55" />
          </View>

          {/* Steps */}
          <SectionHead emoji="👟" label="Activity" color={C.steps} />
          <View style={s.row}>
            <NumInput label="STEPS" value={steps} onChange={setSteps} suffix="steps" color={C.steps} placeholder="8500" />
          </View>

          {/* Sleep */}
          <SectionHead emoji="🌙" label="Sleep" color={C.sleep} />
          <View style={s.row}>
            <NumInput label="TOTAL" value={sleepH} onChange={setSleepH} suffix="hrs" color={C.sleep} placeholder="7.5" />
          </View>
          <View style={[s.row, { marginTop: 8 }]}>
            <NumInput label="DEEP" value={sleepDeep} onChange={setSleepDeep} suffix="hrs" color={C.sleep} placeholder="1.2" />
            <NumInput label="REM" value={sleepRem} onChange={setSleepRem} suffix="hrs" color={C.sleep} placeholder="1.8" />
            <NumInput label="LIGHT" value={sleepLight} onChange={setSleepLight} suffix="hrs" color={C.sleep} placeholder="4.5" />
          </View>

          {/* Notes */}
          <Text style={[s.sectionLabel, { marginTop: 24 }]}>NOTES</Text>
          <TextInput
            style={s.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="How was your day? Any context for these readings…"
            placeholderTextColor={C.faint}
            multiline
            textAlignVertical="top"
          />

          {/* Quick fill hint */}
          <View style={s.hintCard}>
            <Text style={s.hintTitle}>💡 Garmin auto-sync</Text>
            <Text style={s.hintBody}>
              Data from your Garmin Connect app is pre-loaded for Feb 25 – Mar 27. Use this form to add any manual corrections or supplement with data from other sources.
            </Text>
          </View>

          {/* Save */}
          <TouchableOpacity style={s.saveBtn} onPress={handleSave} activeOpacity={0.85}>
            <Text style={s.saveBtnText}>Save Entry</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: C.bg },
  scroll:  { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40 },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  backBtn:     { width: 40, height: 40, justifyContent: 'center' },
  backArrow:   { fontSize: 32, color: C.white, lineHeight: 40 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: C.white },
  clearBtn:    { fontSize: 15, color: C.muted },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: C.muted, letterSpacing: 1, marginBottom: 8 },
  dateInput:    { backgroundColor: C.input, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14, color: C.white, fontSize: 16, fontWeight: '600' },

  row: { flexDirection: 'row', gap: 10 },

  notesInput: { backgroundColor: C.input, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14, color: C.white, fontSize: 15, height: 100, textAlignVertical: 'top' },

  hintCard: { backgroundColor: C.indigo + '12', borderWidth: 1, borderColor: C.indigo + '35', borderRadius: 14, padding: 14, marginTop: 20, marginBottom: 20, gap: 6 },
  hintTitle:{ fontSize: 14, fontWeight: '700', color: C.white },
  hintBody: { fontSize: 13, color: C.muted, lineHeight: 19 },

  saveBtn:     { backgroundColor: C.success, borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  saveBtnText: { color: '#000', fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },

  savedBox:   { alignItems: 'center', gap: 12 },
  savedCheck: { fontSize: 64, color: C.success },
  savedTitle: { fontSize: 24, fontWeight: '800', color: C.white },
  savedSub:   { fontSize: 15, color: C.muted },
});
