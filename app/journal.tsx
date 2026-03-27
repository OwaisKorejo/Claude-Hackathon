import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, StatusBar, Alert, KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { store, JournalEntry, MoodLevel } from '@/store/data';

const C = {
  bg: '#080D1A', card: '#111827', cardAlt: '#0F1A2E',
  border: 'rgba(255,255,255,0.07)', white: '#FFFFFF',
  muted: 'rgba(255,255,255,0.5)', faint: 'rgba(255,255,255,0.18)',
  rhr: '#FBBF24', resp: '#34D399', heart: '#FF4B6E', o2: '#22D3EE',
  hrv: '#A78BFA', indigo: '#6366F1',
  input: '#1C2539',
};

const MOODS: { level: MoodLevel; emoji: string; label: string; color: string }[] = [
  { level: 1, emoji: '😔', label: 'Rough',   color: '#EF4444' },
  { level: 2, emoji: '😐', label: 'Meh',     color: '#F97316' },
  { level: 3, emoji: '🙂', label: 'Okay',    color: C.rhr },
  { level: 4, emoji: '😊', label: 'Good',    color: C.resp },
  { level: 5, emoji: '🤩', label: 'Amazing', color: '#22D3EE' },
];

const ENERGY_LABELS = ['', 'Drained', 'Low', 'Moderate', 'Good', 'Energised'];

function today() {
  return new Date().toISOString().split('T')[0];
}

function fmtDate(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const yStr = new Date(now.getTime() - 86400000).toISOString().split('T')[0];
  if (iso === todayStr) return 'Today';
  if (iso === yStr) return 'Yesterday';
  return d.toLocaleDateString('en-IE', { weekday: 'short', month: 'short', day: 'numeric' });
}

// ─── Entry Form (inline modal) ─────────────────────────────────────────────────
interface EntryFormProps {
  visible: boolean;
  initial?: JournalEntry | null;
  onClose: () => void;
  onSave: (data: Omit<JournalEntry, 'id' | 'createdAt'>) => void;
}

function EntryForm({ visible, initial, onClose, onSave }: EntryFormProps) {
  const [date,   setDate]   = useState(today());
  const [mood,   setMood]   = useState<MoodLevel>(3);
  const [energy, setEnergy] = useState<MoodLevel>(3);
  const [meals,  setMeals]  = useState<string[]>([]);
  const [meal,   setMeal]   = useState('');
  const [notes,  setNotes]  = useState('');

  useEffect(() => {
    if (initial) {
      setDate(initial.date);
      setMood(initial.mood);
      setEnergy(initial.energy);
      setMeals([...initial.meals]);
      setNotes(initial.notes);
    } else {
      setDate(today());
      setMood(3);
      setEnergy(3);
      setMeals([]);
      setNotes('');
    }
    setMeal('');
  }, [visible, initial]);

  function addMeal() {
    if (meal.trim()) { setMeals(m => [...m, meal.trim()]); setMeal(''); }
  }

  function save() {
    onSave({ date, mood, energy, meals, notes });
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <SafeAreaView style={fs.safe} edges={['top']}>
          <View style={fs.header}>
            <TouchableOpacity onPress={onClose}><Text style={fs.cancel}>Cancel</Text></TouchableOpacity>
            <Text style={fs.title}>{initial ? 'Edit Entry' : 'New Entry'}</Text>
            <TouchableOpacity onPress={save}><Text style={fs.saveBtn}>Save</Text></TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={fs.content} keyboardShouldPersistTaps="handled">
            {/* Date */}
            <Text style={fs.label}>DATE</Text>
            <TextInput
              style={fs.input}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={C.faint}
              keyboardType="numbers-and-punctuation"
            />

            {/* Mood */}
            <Text style={fs.label}>HOW WAS YOUR DAY?</Text>
            <View style={fs.moodRow}>
              {MOODS.map(m => (
                <TouchableOpacity
                  key={m.level}
                  style={[fs.moodBtn, mood === m.level && { backgroundColor: m.color + '22', borderColor: m.color }]}
                  onPress={() => setMood(m.level)}
                  activeOpacity={0.7}
                >
                  <Text style={fs.moodEmoji}>{m.emoji}</Text>
                  <Text style={[fs.moodLabel, mood === m.level && { color: m.color }]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Energy */}
            <Text style={fs.label}>ENERGY LEVEL</Text>
            <View style={fs.energyRow}>
              {([1,2,3,4,5] as MoodLevel[]).map(lvl => (
                <TouchableOpacity
                  key={lvl}
                  style={[fs.energyBtn, energy === lvl && { backgroundColor: C.resp + '22', borderColor: C.resp }]}
                  onPress={() => setEnergy(lvl)}
                  activeOpacity={0.7}
                >
                  <Text style={[fs.energyNum, energy === lvl && { color: C.resp }]}>{lvl}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={fs.energyHint}>{ENERGY_LABELS[energy]}</Text>

            {/* Meals */}
            <Text style={fs.label}>MEALS</Text>
            <View style={fs.mealInput}>
              <TextInput
                style={fs.mealTextField}
                value={meal}
                onChangeText={setMeal}
                placeholder="e.g. Oats, Grilled salmon…"
                placeholderTextColor={C.faint}
                onSubmitEditing={addMeal}
                returnKeyType="done"
              />
              <TouchableOpacity style={fs.mealAddBtn} onPress={addMeal}>
                <Text style={fs.mealAddText}>+</Text>
              </TouchableOpacity>
            </View>
            <View style={fs.mealTags}>
              {meals.map((m, i) => (
                <TouchableOpacity key={i} style={fs.mealTag} onPress={() => setMeals(ms => ms.filter((_, j) => j !== i))}>
                  <Text style={fs.mealTagText}>{m}  ✕</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Notes */}
            <Text style={fs.label}>NOTES</Text>
            <TextInput
              style={[fs.input, fs.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="How are you feeling? Anything to note…"
              placeholderTextColor={C.faint}
              multiline
              textAlignVertical="top"
            />
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Entry card ────────────────────────────────────────────────────────────────
function EntryCard({ entry, onEdit, onDelete }: { entry: JournalEntry; onEdit: () => void; onDelete: () => void }) {
  const mood = MOODS.find(m => m.level === entry.mood)!;
  return (
    <View style={ec.card}>
      <View style={ec.top}>
        <View style={ec.topLeft}>
          <Text style={[ec.moodEmoji]}>{mood.emoji}</Text>
          <View>
            <Text style={ec.date}>{fmtDate(entry.date)}</Text>
            <Text style={[ec.moodLabel, { color: mood.color }]}>{mood.label}</Text>
          </View>
        </View>
        <View style={ec.actions}>
          <TouchableOpacity onPress={onEdit} style={ec.actionBtn}>
            <Text style={ec.actionText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={[ec.actionBtn, { borderColor: C.heart + '50' }]}>
            <Text style={[ec.actionText, { color: C.heart }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Energy bar */}
      <View style={ec.energyRow}>
        <Text style={ec.energyLabel}>Energy</Text>
        <View style={ec.energyTrack}>
          <View style={[ec.energyFill, { width: `${(entry.energy / 5) * 100}%`, backgroundColor: C.resp }]} />
        </View>
        <Text style={[ec.energyNum, { color: C.resp }]}>{entry.energy}/5</Text>
      </View>

      {entry.meals.length > 0 && (
        <View style={ec.mealRow}>
          <Text style={ec.metaKey}>Meals: </Text>
          <Text style={ec.metaVal}>{entry.meals.join('  ·  ')}</Text>
        </View>
      )}

      {entry.notes ? (
        <Text style={ec.notes} numberOfLines={3}>{entry.notes}</Text>
      ) : null}
    </View>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────
export default function JournalScreen() {
  const router = useRouter();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<JournalEntry | null>(null);

  useEffect(() => {
    setEntries(store.getJournal());
    return store.subscribe(() => setEntries(store.getJournal()));
  }, []);

  function handleSave(data: Omit<JournalEntry, 'id' | 'createdAt'>) {
    if (editing) {
      store.updateJournalEntry(editing.id, data);
    } else {
      store.addJournalEntry(data);
    }
  }

  function handleDelete(id: string) {
    Alert.alert('Delete Entry', 'Remove this journal entry?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => store.deleteJournalEntry(id) },
    ]);
  }

  // Summary stats
  const avgMood = entries.length ? entries.reduce((a, e) => a + e.mood, 0) / entries.length : 0;
  const avgEnergy = entries.length ? entries.reduce((a, e) => a + e.energy, 0) / entries.length : 0;
  const streak = (() => {
    if (!entries.length) return 0;
    let s = 0;
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today.getTime() - i * 86400000).toISOString().split('T')[0];
      if (entries.find(e => e.date === d)) s++;
      else break;
    }
    return s;
  })();

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Daily Journal</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => { setEditing(null); setFormVisible(true); }}>
          <Text style={s.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Stats */}
        {entries.length > 0 && (
          <View style={s.statsRow}>
            <View style={[s.statCard, { borderColor: C.rhr + '40' }]}>
              <Text style={[s.statVal, { color: C.rhr }]}>{MOODS.find(m => m.level === Math.round(avgMood))?.emoji ?? '—'}</Text>
              <Text style={s.statLabel}>Avg Mood</Text>
              <Text style={[s.statSub, { color: C.rhr }]}>{avgMood.toFixed(1)}/5</Text>
            </View>
            <View style={[s.statCard, { borderColor: C.resp + '40' }]}>
              <Text style={[s.statVal, { color: C.resp }]}>{avgEnergy.toFixed(1)}</Text>
              <Text style={s.statLabel}>Avg Energy</Text>
              <Text style={[s.statSub, { color: C.resp }]}>/5</Text>
            </View>
            <View style={[s.statCard, { borderColor: C.hrv + '40' }]}>
              <Text style={[s.statVal, { color: C.hrv }]}>{streak}</Text>
              <Text style={s.statLabel}>Day Streak</Text>
              <Text style={[s.statSub, { color: C.hrv }]}>days</Text>
            </View>
          </View>
        )}

        {/* Mood heatmap (last 14 days) */}
        {entries.length > 0 && (
          <>
            <Text style={s.sectionLabel}>LAST 14 DAYS</Text>
            <View style={s.heatmapRow}>
              {Array.from({ length: 14 }).map((_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (13 - i));
                const iso = d.toISOString().split('T')[0];
                const entry = entries.find(e => e.date === iso);
                const mood = entry ? MOODS.find(m => m.level === entry.mood) : null;
                return (
                  <View key={iso} style={[s.heatCell, { backgroundColor: mood ? mood.color + '33' : C.card }]}>
                    <Text style={{ fontSize: 14 }}>{mood?.emoji ?? ''}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Entries list */}
        <Text style={s.sectionLabel}>ENTRIES  ({entries.length})</Text>
        {entries.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={s.emptyEmoji}>📓</Text>
            <Text style={s.emptyTitle}>No entries yet</Text>
            <Text style={s.emptyBody}>Tap "+ New" to log your first journal entry.</Text>
          </View>
        ) : (
          entries.map(e => (
            <EntryCard
              key={e.id}
              entry={e}
              onEdit={() => { setEditing(e); setFormVisible(true); }}
              onDelete={() => handleDelete(e.id)}
            />
          ))
        )}
      </ScrollView>

      <EntryForm
        visible={formVisible}
        initial={editing}
        onClose={() => setFormVisible(false)}
        onSave={handleSave}
      />
    </SafeAreaView>
  );
}

// ─── Form styles ───────────────────────────────────────────────────────────────
const fs = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: C.bg },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  cancel:     { fontSize: 16, color: C.muted },
  title:      { fontSize: 17, fontWeight: '700', color: C.white },
  saveBtn:    { fontSize: 16, color: C.resp, fontWeight: '700' },
  content:    { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  label:      { fontSize: 11, fontWeight: '700', color: C.muted, letterSpacing: 1, marginBottom: 8, marginTop: 16 },
  input:      { backgroundColor: C.input, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14, color: C.white, fontSize: 15 },
  notesInput: { height: 120, paddingTop: 14 },
  moodRow:    { flexDirection: 'row', gap: 8 },
  moodBtn:    { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, gap: 4 },
  moodEmoji:  { fontSize: 24 },
  moodLabel:  { fontSize: 11, color: C.muted, fontWeight: '600' },
  energyRow:  { flexDirection: 'row', gap: 8 },
  energyBtn:  { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  energyNum:  { fontSize: 18, fontWeight: '800', color: C.muted },
  energyHint: { fontSize: 13, color: C.muted, marginTop: 6, textAlign: 'center' },
  mealInput:  { flexDirection: 'row', gap: 8 },
  mealTextField: { flex: 1, backgroundColor: C.input, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14, color: C.white, fontSize: 15 },
  mealAddBtn: { backgroundColor: C.resp + '22', borderWidth: 1, borderColor: C.resp + '55', borderRadius: 12, paddingHorizontal: 18, justifyContent: 'center' },
  mealAddText:{ color: C.resp, fontSize: 22, fontWeight: '700' },
  mealTags:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  mealTag:    { backgroundColor: C.rhr + '22', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: C.rhr + '40' },
  mealTagText:{ color: C.rhr, fontSize: 12, fontWeight: '600' },
});

// ─── Entry card styles ─────────────────────────────────────────────────────────
const ec = StyleSheet.create({
  card:       { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 12 },
  top:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  topLeft:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  moodEmoji:  { fontSize: 32 },
  date:       { fontSize: 15, fontWeight: '700', color: C.white },
  moodLabel:  { fontSize: 13, fontWeight: '600', marginTop: 2 },
  actions:    { flexDirection: 'row', gap: 8 },
  actionBtn:  { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: C.border },
  actionText: { fontSize: 12, color: C.muted, fontWeight: '600' },
  energyRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  energyLabel:{ fontSize: 12, color: C.muted, width: 44 },
  energyTrack:{ flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' },
  energyFill: { height: '100%', borderRadius: 3 },
  energyNum:  { fontSize: 12, fontWeight: '700', width: 26, textAlign: 'right' },
  mealRow:    { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  metaKey:    { fontSize: 13, color: C.muted },
  metaVal:    { fontSize: 13, color: C.white, flex: 1 },
  notes:      { fontSize: 14, color: C.muted, lineHeight: 20, marginTop: 4 },
});

// ─── Screen styles ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: C.bg },
  scroll:  { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  header:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backArrow:   { fontSize: 32, color: C.white, lineHeight: 40 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: C.white },
  addBtn:      { backgroundColor: C.resp + '22', borderWidth: 1, borderColor: C.resp + '55', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  addBtnText:  { color: C.resp, fontWeight: '700', fontSize: 14 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, padding: 14, alignItems: 'center', gap: 4 },
  statVal:  { fontSize: 26, fontWeight: '800' },
  statLabel:{ fontSize: 11, color: C.muted, fontWeight: '600', letterSpacing: 0.3 },
  statSub:  { fontSize: 12, fontWeight: '600' },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: C.muted, letterSpacing: 1, marginBottom: 10, marginTop: 4 },

  heatmapRow: { flexDirection: 'row', gap: 5, marginBottom: 20, flexWrap: 'wrap' },
  heatCell:   { width: (Math.min(400, 375) - 32 - 5 * 13) / 14, aspectRatio: 1, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },

  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: C.white },
  emptyBody:  { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 20 },
});
