import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform,
  RefreshControl, ScrollView, StatusBar, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  fetchExercises, insertExercise, updateExercise, deleteExercise,
  Exercise, NewExercise,
} from '@/lib/supabase';

const C = {
  bg: '#080D1A', card: '#111827', border: 'rgba(255,255,255,0.07)',
  white: '#FFFFFF', muted: 'rgba(255,255,255,0.5)', faint: 'rgba(255,255,255,0.2)',
  input: '#1C2539',
  orange: '#F97316', orangeDim: 'rgba(249,115,22,0.15)',
  push: '#FF6B6B', pull: '#6366F1', legs: '#FBBF24', cardio: '#34D399', core: '#A78BFA',
  error: '#FF4B6E',
};

const CATEGORIES = [
  { key: 'push',   label: 'Push',   color: C.push,   emoji: '💪' },
  { key: 'pull',   label: 'Pull',   color: C.pull,   emoji: '🏋️' },
  { key: 'legs',   label: 'Legs',   color: C.legs,   emoji: '🦵' },
  { key: 'cardio', label: 'Cardio', color: C.cardio, emoji: '🏃' },
  { key: 'core',   label: 'Core',   color: C.core,   emoji: '🧘' },
];

function catColor(cat: string | null): string {
  return CATEGORIES.find(c => c.key === cat)?.color ?? C.orange;
}

function today() { return new Date().toISOString().split('T')[0]; }

function dateLabel(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  const t = new Date(); const y = new Date(t); y.setDate(t.getDate() - 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, t)) return 'Today';
  if (same(d, y)) return 'Yesterday';
  return d.toLocaleDateString('en-IE', { weekday: 'short', month: 'short', day: 'numeric' });
}

function groupByDay(exercises: Exercise[]) {
  const map = new Map<string, Exercise[]>();
  for (const e of exercises) {
    if (!map.has(e.workout_date)) map.set(e.workout_date, []);
    map.get(e.workout_date)!.push(e);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, items]) => ({ date, label: dateLabel(date), items }));
}

// ─── Exercise form ────────────────────────────────────────────────────────────
function ExerciseForm({ visible, initial, onClose, onSave }: {
  visible: boolean; initial?: Exercise | null; onClose: () => void;
  onSave: (data: NewExercise) => Promise<void>;
}) {
  const [name, setName]     = useState('');
  const [cat, setCat]       = useState('');
  const [date, setDate]     = useState(today());
  const [sets, setSets]     = useState('');
  const [reps, setReps]     = useState('');
  const [weight, setWeight] = useState('');
  const [dur, setDur]       = useState('');
  const [dist, setDist]     = useState('');
  const [rest, setRest]     = useState('');
  const [rpe, setRpe]       = useState('');
  const [notes, setNotes]   = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) {
      setName(initial.exercise_name ?? '');
      setCat(initial.exercise_category ?? '');
      setDate(initial.workout_date ?? today());
      setSets(initial.set_count != null ? String(initial.set_count) : '');
      setReps(initial.reps != null ? String(initial.reps) : '');
      setWeight(initial.weight_kg != null ? String(initial.weight_kg) : '');
      setDur(initial.duration_sec != null ? String(initial.duration_sec) : '');
      setDist(initial.distance_km != null ? String(initial.distance_km) : '');
      setRest(initial.rest_sec != null ? String(initial.rest_sec) : '');
      setRpe(initial.rpe != null ? String(initial.rpe) : '');
      setNotes(initial.notes ?? '');
    } else {
      setName(''); setCat(''); setDate(today()); setSets(''); setReps('');
      setWeight(''); setDur(''); setDist(''); setRest(''); setRpe(''); setNotes('');
    }
  }, [visible, initial]);

  const num = (v: string) => v ? parseFloat(v) : null;
  const int = (v: string) => v ? parseInt(v, 10) : null;

  async function handleSave() {
    if (!name.trim()) { Alert.alert('Missing', 'Exercise name is required.'); return; }
    setSaving(true);
    try {
      const s = int(sets); const rp = int(reps);
      await onSave({
        workout_date: date,
        exercise_name: name.trim(),
        exercise_category: cat || null,
        set_count: s,
        reps: rp,
        total_reps: s && rp ? s * rp : null,
        weight_kg: num(weight),
        duration_sec: int(dur),
        distance_km: num(dist),
        rest_sec: int(rest),
        rpe: num(rpe),
        notes: notes.trim() || null,
      });
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to save');
    } finally { setSaving(false); }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <SafeAreaView style={ef.safe} edges={['top']}>
          <View style={ef.header}>
            <TouchableOpacity onPress={onClose}><Text style={ef.cancel}>Cancel</Text></TouchableOpacity>
            <Text style={ef.title}>{initial ? 'Edit Exercise' : 'Log Exercise'}</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color={C.orange} /> : <Text style={ef.save}>Save</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={ef.content} keyboardShouldPersistTaps="handled">
            {/* Name */}
            <Text style={ef.label}>EXERCISE NAME</Text>
            <TextInput style={ef.input} value={name} onChangeText={setName} placeholder="e.g. Bench Press, 5K Run…" placeholderTextColor={C.faint} autoFocus />

            {/* Category chips */}
            <Text style={[ef.label, { marginTop: 16 }]}>CATEGORY</Text>
            <View style={ef.catRow}>
              {CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c.key}
                  style={[ef.catChip, cat === c.key && { backgroundColor: c.color + '22', borderColor: c.color }]}
                  onPress={() => setCat(cat === c.key ? '' : c.key)}
                >
                  <Text style={ef.catEmoji}>{c.emoji}</Text>
                  <Text style={[ef.catLabel, cat === c.key && { color: c.color }]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Date */}
            <Text style={[ef.label, { marginTop: 16 }]}>DATE</Text>
            <TextInput style={ef.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={C.faint} keyboardType="numbers-and-punctuation" />

            {/* Sets x reps x weight */}
            <Text style={[ef.label, { marginTop: 16 }]}>SETS × REPS × WEIGHT</Text>
            <View style={ef.row3}>
              <View style={ef.field}><Text style={ef.fLabel}>Sets</Text>
                <TextInput style={ef.fInput} value={sets} onChangeText={setSets} keyboardType="numeric" placeholder="4" placeholderTextColor={C.faint} /></View>
              <View style={ef.field}><Text style={ef.fLabel}>Reps</Text>
                <TextInput style={ef.fInput} value={reps} onChangeText={setReps} keyboardType="numeric" placeholder="10" placeholderTextColor={C.faint} /></View>
              <View style={ef.field}><Text style={ef.fLabel}>Weight (kg)</Text>
                <TextInput style={ef.fInput} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="60" placeholderTextColor={C.faint} /></View>
            </View>

            {/* Duration / distance / rest */}
            <Text style={[ef.label, { marginTop: 16 }]}>CARDIO / TIMING</Text>
            <View style={ef.row3}>
              <View style={ef.field}><Text style={ef.fLabel}>Duration (s)</Text>
                <TextInput style={ef.fInput} value={dur} onChangeText={setDur} keyboardType="numeric" placeholder="1800" placeholderTextColor={C.faint} /></View>
              <View style={ef.field}><Text style={ef.fLabel}>Distance (km)</Text>
                <TextInput style={ef.fInput} value={dist} onChangeText={setDist} keyboardType="decimal-pad" placeholder="5.0" placeholderTextColor={C.faint} /></View>
              <View style={ef.field}><Text style={ef.fLabel}>Rest (s)</Text>
                <TextInput style={ef.fInput} value={rest} onChangeText={setRest} keyboardType="numeric" placeholder="90" placeholderTextColor={C.faint} /></View>
            </View>

            {/* RPE */}
            <Text style={[ef.label, { marginTop: 16 }]}>RPE (EFFORT 1–10)</Text>
            <View style={ef.rpeRow}>
              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                <TouchableOpacity
                  key={n}
                  style={[ef.rpeBtn, rpe === String(n) && { backgroundColor: C.orange + '33', borderColor: C.orange }]}
                  onPress={() => setRpe(rpe === String(n) ? '' : String(n))}
                >
                  <Text style={[ef.rpeText, rpe === String(n) && { color: C.orange }]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Notes */}
            <Text style={[ef.label, { marginTop: 16 }]}>NOTES</Text>
            <TextInput style={[ef.input, { height: 80, textAlignVertical: 'top' }]} value={notes} onChangeText={setNotes} placeholder="Felt strong, increased weight…" placeholderTextColor={C.faint} multiline />
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const ef = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: C.bg },
  header:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  cancel:  { fontSize: 16, color: C.muted },
  title:   { fontSize: 17, fontWeight: '800', color: C.white },
  save:    { fontSize: 16, color: C.orange, fontWeight: '800' },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 60 },
  label:   { fontSize: 11, fontWeight: '700', color: C.muted, letterSpacing: 1, marginBottom: 8 },
  input:   { backgroundColor: C.input, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14, color: C.white, fontSize: 16 },
  catRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  catEmoji:{ fontSize: 14 },
  catLabel:{ fontSize: 13, fontWeight: '600', color: C.muted },
  row3:    { flexDirection: 'row', gap: 10 },
  field:   { flex: 1, gap: 4 },
  fLabel:  { fontSize: 10, color: C.faint, fontWeight: '600' },
  fInput:  { backgroundColor: C.input, borderRadius: 10, borderWidth: 1, borderColor: C.border, paddingHorizontal: 10, paddingVertical: 10, color: C.white, fontSize: 16, fontWeight: '700' },
  rpeRow:  { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  rpeBtn:  { width: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  rpeText: { fontSize: 14, fontWeight: '700', color: C.muted },
});

// ─── Exercise card ────────────────────────────────────────────────────────────
function ExCard({ ex, onEdit, onDelete }: { ex: Exercise; onEdit: () => void; onDelete: () => void }) {
  const cc = catColor(ex.exercise_category);
  const catInfo = CATEGORIES.find(c => c.key === ex.exercise_category);
  const hasWeight = ex.set_count || ex.reps || ex.weight_kg;
  const hasCardio = ex.duration_sec || ex.distance_km;

  const volume = ex.set_count && ex.reps && ex.weight_kg
    ? ex.set_count * ex.reps * ex.weight_kg
    : null;

  return (
    <View style={[ec.card, { borderColor: cc + '25' }]}>
      <View style={ec.top}>
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {catInfo && <Text style={{ fontSize: 16 }}>{catInfo.emoji}</Text>}
            <Text style={ec.name}>{ex.exercise_name}</Text>
          </View>
          {catInfo && (
            <View style={[ec.catPill, { backgroundColor: cc + '18', borderColor: cc + '40' }]}>
              <Text style={[ec.catPillText, { color: cc }]}>{catInfo.label}</Text>
            </View>
          )}
        </View>
        <View style={ec.actions}>
          <TouchableOpacity onPress={onEdit} style={ec.actionBtn}><Text style={ec.actionEdit}>Edit</Text></TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={[ec.actionBtn, { borderColor: C.error + '40' }]}><Text style={ec.actionDel}>Del</Text></TouchableOpacity>
        </View>
      </View>

      {/* Metrics row */}
      <View style={ec.metricsRow}>
        {hasWeight ? (
          <>
            {ex.set_count != null && <Metric label="Sets" val={String(ex.set_count)} color={cc} />}
            {ex.reps != null && <Metric label="Reps" val={String(ex.reps)} color={cc} />}
            {ex.weight_kg != null && <Metric label="Weight" val={`${ex.weight_kg}kg`} color={cc} />}
            {volume != null && <Metric label="Volume" val={`${volume}kg`} color={C.orange} />}
          </>
        ) : null}
        {hasCardio ? (
          <>
            {ex.duration_sec != null && <Metric label="Duration" val={ex.duration_sec >= 60 ? `${Math.floor(ex.duration_sec / 60)}m${ex.duration_sec % 60 ? ` ${ex.duration_sec % 60}s` : ''}` : `${ex.duration_sec}s`} color={cc} />}
            {ex.distance_km != null && <Metric label="Distance" val={`${ex.distance_km}km`} color={cc} />}
          </>
        ) : null}
        {ex.rpe != null && <Metric label="RPE" val={`${ex.rpe}/10`} color={C.orange} />}
        {ex.rest_sec != null && <Metric label="Rest" val={`${ex.rest_sec}s`} color={C.muted} />}
      </View>

      {ex.notes ? <Text style={ec.notes} numberOfLines={2}>{ex.notes}</Text> : null}
    </View>
  );
}

function Metric({ label, val, color }: { label: string; val: string; color: string }) {
  return (
    <View style={ec.metric}>
      <Text style={[ec.metricVal, { color }]}>{val}</Text>
      <Text style={ec.metricLabel}>{label}</Text>
    </View>
  );
}

const ec = StyleSheet.create({
  card:       { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 8 },
  top:        { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  name:       { fontSize: 15, fontWeight: '700', color: C.white, flexShrink: 1 },
  catPill:    { alignSelf: 'flex-start', borderRadius: 20, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4 },
  catPillText:{ fontSize: 10, fontWeight: '700' },
  actions:    { flexDirection: 'row', gap: 6, marginLeft: 8 },
  actionBtn:  { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: C.border },
  actionEdit: { fontSize: 12, color: C.muted, fontWeight: '600' },
  actionDel:  { fontSize: 12, color: C.error, fontWeight: '600' },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric:     { alignItems: 'center', gap: 2 },
  metricVal:  { fontSize: 15, fontWeight: '800' },
  metricLabel:{ fontSize: 10, color: C.faint, fontWeight: '600' },
  notes:      { fontSize: 13, color: C.muted, marginTop: 8, lineHeight: 18 },
});

// ─── Day summary ──────────────────────────────────────────────────────────────
function DaySummary({ exercises }: { exercises: Exercise[] }) {
  const totalSets = exercises.reduce((a, e) => a + (e.set_count ?? 0), 0);
  const totalVol  = exercises.reduce((a, e) => a + ((e.set_count ?? 0) * (e.reps ?? 0) * (e.weight_kg ?? 0)), 0);
  const cats = [...new Set(exercises.map(e => e.exercise_category).filter(Boolean))];
  return (
    <View style={ds.card}>
      <View style={ds.row}>
        <View style={ds.stat}>
          <Text style={[ds.statVal, { color: C.orange }]}>{exercises.length}</Text>
          <Text style={ds.statLabel}>exercises</Text>
        </View>
        <View style={ds.stat}>
          <Text style={[ds.statVal, { color: C.orange }]}>{totalSets}</Text>
          <Text style={ds.statLabel}>total sets</Text>
        </View>
        {totalVol > 0 && (
          <View style={ds.stat}>
            <Text style={[ds.statVal, { color: C.orange }]}>{totalVol.toLocaleString()}</Text>
            <Text style={ds.statLabel}>vol (kg)</Text>
          </View>
        )}
      </View>
      <View style={ds.catRow}>
        {cats.map(c => {
          const info = CATEGORIES.find(x => x.key === c);
          return info ? (
            <View key={c} style={[ds.catTag, { backgroundColor: info.color + '18', borderColor: info.color + '40' }]}>
              <Text style={{ fontSize: 12 }}>{info.emoji}</Text>
              <Text style={[ds.catTagText, { color: info.color }]}>{info.label}</Text>
            </View>
          ) : null;
        })}
      </View>
    </View>
  );
}

const ds = StyleSheet.create({
  card:    { backgroundColor: C.orangeDim, borderRadius: 14, borderWidth: 1, borderColor: C.orange + '25', padding: 14, marginBottom: 10 },
  row:     { flexDirection: 'row', gap: 20, marginBottom: 8 },
  stat:    { alignItems: 'center', gap: 2 },
  statVal: { fontSize: 22, fontWeight: '900' },
  statLabel:{ fontSize: 11, color: C.muted, fontWeight: '600' },
  catRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  catTag:  { flexDirection: 'row', gap: 4, alignItems: 'center', borderRadius: 20, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  catTagText: { fontSize: 11, fontWeight: '700' },
});

// ─── Main screen ───────────────────────────────────────────────────────────────
export default function ExercisesScreen() {
  const router = useRouter();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [formOpen, setFormOpen]   = useState(false);
  const [editing, setEditing]     = useState<Exercise | null>(null);

  const load = useCallback(async () => {
    try { setError(null); setExercises(await fetchExercises()); }
    catch (e: any) { setError(e?.message ?? 'Failed to fetch'); }
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  async function handleSave(data: NewExercise) {
    if (editing) {
      const updated = await updateExercise(editing.id, data);
      setExercises(prev => prev.map(e => e.id === editing.id ? updated : e));
    } else {
      const created = await insertExercise(data);
      setExercises(prev => [created, ...prev]);
    }
  }

  function handleDelete(ex: Exercise) {
    Alert.alert('Delete', `Remove "${ex.exercise_name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteExercise(ex.id); setExercises(prev => prev.filter(e => e.id !== ex.id)); }
        catch (e: any) { Alert.alert('Error', e?.message ?? 'Failed'); }
      }},
    ]);
  }

  const groups = groupByDay(exercises);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={s.title}>Exercises</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => { setEditing(null); setFormOpen(true); }}>
          <Text style={s.addBtnText}>+ Log</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={C.orange} /><Text style={s.loadingText}>Loading…</Text></View>
      ) : (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.muted} />}
          showsVerticalScrollIndicator={false}
        >
          {error && (
            <View style={s.errorCard}>
              <Text style={s.errorTitle}>Connection error</Text>
              <Text style={s.errorBody}>{error}</Text>
              <TouchableOpacity style={s.retryBtn} onPress={onRefresh}><Text style={s.retryText}>Retry</Text></TouchableOpacity>
            </View>
          )}

          {!error && exercises.length === 0 && (
            <View style={s.emptyState}>
              <Text style={{ fontSize: 52 }}>🏋️</Text>
              <Text style={s.emptyTitle}>No exercises logged</Text>
              <Text style={s.emptyBody}>Tap "+ Log" to track your first exercise.</Text>
              <TouchableOpacity style={s.emptyBtn} onPress={() => { setEditing(null); setFormOpen(true); }}>
                <Text style={s.emptyBtnText}>Log first exercise</Text>
              </TouchableOpacity>
            </View>
          )}

          {groups.map(g => (
            <View key={g.date}>
              <View style={s.dayHeader}>
                <Text style={s.dayLabel}>{g.label}</Text>
                <View style={s.dayDivider} />
              </View>
              <DaySummary exercises={g.items} />
              {g.items.map(ex => (
                <ExCard key={ex.id} ex={ex}
                  onEdit={() => { setEditing(ex); setFormOpen(true); }}
                  onDelete={() => handleDelete(ex)}
                />
              ))}
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      <ExerciseForm
        visible={formOpen}
        initial={editing}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: C.bg },
  header:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backArrow: { fontSize: 32, color: C.white, lineHeight: 40 },
  title:     { fontSize: 22, fontWeight: '800', color: C.white },
  addBtn:    { backgroundColor: C.orange + '22', borderWidth: 1, borderColor: C.orange + '55', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText:{ color: C.orange, fontWeight: '800', fontSize: 14 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText:{ color: C.muted, fontSize: 14 },
  scroll:    { flex: 1 },
  content:   { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },
  errorCard: { backgroundColor: C.error + '12', borderWidth: 1, borderColor: C.error + '40', borderRadius: 14, padding: 16, gap: 8, marginBottom: 16 },
  errorTitle:{ color: C.error, fontSize: 15, fontWeight: '700' },
  errorBody: { color: C.muted, fontSize: 13, lineHeight: 18 },
  retryBtn:  { alignSelf: 'flex-start', backgroundColor: C.error + '22', borderRadius: 8, borderWidth: 1, borderColor: C.error + '50', paddingHorizontal: 14, paddingVertical: 7 },
  retryText: { color: C.error, fontWeight: '700', fontSize: 13 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, marginTop: 10 },
  dayLabel:  { fontSize: 14, fontWeight: '800', color: C.white },
  dayDivider:{ flex: 1, height: 1, backgroundColor: C.border },
  emptyState:{ alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle:{ fontSize: 22, fontWeight: '800', color: C.white },
  emptyBody: { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 21, paddingHorizontal: 20 },
  emptyBtn:  { backgroundColor: C.orange + '22', borderWidth: 1, borderColor: C.orange + '55', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  emptyBtnText: { color: C.orange, fontWeight: '700', fontSize: 15 },
});
