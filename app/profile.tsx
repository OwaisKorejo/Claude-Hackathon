import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, StatusBar, Modal, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { store, Goal, UserProfile } from '@/store/data';

const C = {
  bg: '#080D1A', card: '#111827', border: 'rgba(255,255,255,0.07)',
  white: '#FFFFFF', muted: 'rgba(255,255,255,0.5)', faint: 'rgba(255,255,255,0.18)',
  heart: '#FF4B6E', hrv: '#A78BFA', o2: '#22D3EE', resp: '#34D399', rhr: '#FBBF24',
  indigo: '#6366F1', input: '#1C2539',
};

const SEX_OPTIONS = ['male', 'female', 'other'] as const;
const COMMON_CONDITIONS = ['Asthma', 'Hypertension', 'Diabetes', 'Anxiety', 'Lower back pain', 'Knee injury', 'Plantar fasciitis', 'Sleep apnea', 'High cholesterol', 'Migraine'];

// ─── Editable field ────────────────────────────────────────────────────────────
function EditField({ label, value, onSave, keyboardType = 'default', suffix }: {
  label: string; value: string; onSave: (v: string) => void;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad'; suffix?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  return (
    <View style={ef.row}>
      <Text style={ef.label}>{label}</Text>
      {editing ? (
        <View style={ef.inputRow}>
          <TextInput
            style={ef.input}
            value={draft}
            onChangeText={setDraft}
            keyboardType={keyboardType}
            autoFocus
            selectTextOnFocus
          />
          {suffix ? <Text style={ef.suffix}>{suffix}</Text> : null}
          <TouchableOpacity onPress={() => { onSave(draft); setEditing(false); }} style={ef.saveBtn}>
            <Text style={ef.saveTxt}>✓</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={ef.valueRow} onPress={() => { setDraft(value); setEditing(true); }}>
          <Text style={ef.value}>{value || 'Tap to set'}{suffix ? ' ' + suffix : ''}</Text>
          <Text style={ef.editIcon}>✎</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const ef = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.border },
  label:    { width: 110, fontSize: 14, color: C.muted, fontWeight: '500' },
  inputRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  input:    { flex: 1, backgroundColor: C.input, borderRadius: 8, borderWidth: 1, borderColor: C.border, paddingHorizontal: 10, paddingVertical: 7, color: C.white, fontSize: 15 },
  suffix:   { fontSize: 13, color: C.muted },
  saveBtn:  { backgroundColor: C.resp + '22', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: C.resp + '55' },
  saveTxt:  { color: C.resp, fontSize: 16, fontWeight: '700' },
  valueRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  value:    { fontSize: 15, color: C.white, fontWeight: '500' },
  editIcon: { fontSize: 16, color: C.faint },
});

// ─── Goal toggle card ──────────────────────────────────────────────────────────
function GoalCard({ goal, onToggle, onRemove }: { goal: Goal; onToggle: () => void; onRemove?: () => void }) {
  return (
    <View style={[gc.card, goal.active && gc.activeCard]}>
      <TouchableOpacity style={gc.toggle} onPress={onToggle} activeOpacity={0.7}>
        <View style={[gc.check, goal.active && gc.checkActive]}>
          {goal.active && <Text style={gc.checkMark}>✓</Text>}
        </View>
        <Text style={[gc.label, goal.active && { color: C.white }]}>{goal.label}</Text>
      </TouchableOpacity>
      {goal.custom && (
        <TouchableOpacity onPress={onRemove} style={gc.removeBtn}>
          <Text style={gc.removeTxt}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const gc = StyleSheet.create({
  card:       { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 8 },
  activeCard: { borderColor: C.resp + '55', backgroundColor: C.resp + '0A' },
  toggle:     { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  check:      { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: C.faint, alignItems: 'center', justifyContent: 'center' },
  checkActive:{ backgroundColor: C.resp, borderColor: C.resp },
  checkMark:  { color: '#000', fontSize: 13, fontWeight: '800' },
  label:      { fontSize: 15, color: C.muted, fontWeight: '500' },
  removeBtn:  { padding: 6 },
  removeTxt:  { color: C.heart, fontSize: 16 },
});

// ─── Condition tag ─────────────────────────────────────────────────────────────
function ConditionTag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <View style={ct.tag}>
      <Text style={ct.text}>{label}</Text>
      <TouchableOpacity onPress={onRemove}><Text style={ct.x}>✕</Text></TouchableOpacity>
    </View>
  );
}

const ct = StyleSheet.create({
  tag:  { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.heart + '1A', borderWidth: 1, borderColor: C.heart + '40', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  text: { fontSize: 13, color: C.heart, fontWeight: '600' },
  x:    { fontSize: 12, color: C.heart },
});

// ─── Condition picker modal ────────────────────────────────────────────────────
function ConditionPicker({ visible, conditions, onClose, onAdd }: {
  visible: boolean; conditions: string[]; onClose: () => void; onAdd: (c: string) => void;
}) {
  const [custom, setCustom] = useState('');
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
        <View style={cp.header}>
          <TouchableOpacity onPress={onClose}><Text style={cp.done}>Done</Text></TouchableOpacity>
          <Text style={cp.title}>Add Condition</Text>
          <View style={{ width: 50 }} />
        </View>
        <ScrollView contentContainerStyle={cp.content}>
          <Text style={cp.label}>COMMON CONDITIONS</Text>
          {COMMON_CONDITIONS.map(c => (
            <TouchableOpacity key={c} style={[cp.item, conditions.includes(c) && cp.itemActive]} onPress={() => { onAdd(c); }} disabled={conditions.includes(c)}>
              <Text style={[cp.itemText, conditions.includes(c) && { color: C.muted }]}>{c}</Text>
              {conditions.includes(c) ? <Text style={{ color: C.resp }}>✓ Added</Text> : <Text style={cp.plus}>+</Text>}
            </TouchableOpacity>
          ))}
          <Text style={[cp.label, { marginTop: 20 }]}>CUSTOM</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              style={[cp.input, { flex: 1 }]}
              value={custom}
              onChangeText={setCustom}
              placeholder="e.g. Tendinitis…"
              placeholderTextColor={C.faint}
            />
            <TouchableOpacity style={cp.addBtn} onPress={() => { if (custom.trim()) { onAdd(custom.trim()); setCustom(''); } }}>
              <Text style={cp.addTxt}>Add</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const cp = StyleSheet.create({
  header:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  done:     { fontSize: 16, color: C.resp, fontWeight: '700' },
  title:    { fontSize: 17, fontWeight: '700', color: C.white },
  content:  { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  label:    { fontSize: 11, fontWeight: '700', color: C.muted, letterSpacing: 1, marginBottom: 10 },
  item:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  itemActive:{ opacity: 0.5 },
  itemText: { fontSize: 15, color: C.white },
  plus:     { fontSize: 20, color: C.resp },
  input:    { backgroundColor: C.input, borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 11, color: C.white, fontSize: 15 },
  addBtn:   { backgroundColor: C.resp + '22', borderRadius: 12, borderWidth: 1, borderColor: C.resp + '55', paddingHorizontal: 18, justifyContent: 'center' },
  addTxt:   { color: C.resp, fontWeight: '700' },
});

// ─── Goal input modal ──────────────────────────────────────────────────────────
function GoalInput({ visible, onClose, onAdd }: { visible: boolean; onClose: () => void; onAdd: (label: string) => void }) {
  const [text, setText] = useState('');
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={gi.overlay} behavior="padding">
        <View style={gi.box}>
          <Text style={gi.title}>New Goal</Text>
          <TextInput style={gi.input} value={text} onChangeText={setText} placeholder="e.g. Walk 10k steps daily" placeholderTextColor={C.faint} autoFocus />
          <View style={gi.btnRow}>
            <TouchableOpacity style={gi.cancelBtn} onPress={onClose}><Text style={gi.cancelTxt}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={gi.addBtn} onPress={() => { if (text.trim()) { onAdd(text.trim()); setText(''); onClose(); } }}>
              <Text style={gi.addTxt}>Add Goal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const gi = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', paddingHorizontal: 24 },
  box:     { backgroundColor: '#1A2235', borderRadius: 20, borderWidth: 1, borderColor: C.border, padding: 20, gap: 16 },
  title:   { fontSize: 18, fontWeight: '800', color: C.white },
  input:   { backgroundColor: C.input, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14, color: C.white, fontSize: 15 },
  btnRow:  { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: C.border },
  cancelTxt: { color: C.muted, fontWeight: '600' },
  addBtn:    { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: C.resp + '22', borderWidth: 1, borderColor: C.resp + '55' },
  addTxt:    { color: C.resp, fontWeight: '700' },
});

// ─── Main screen ───────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile>(store.getProfile());
  const [goals, setGoals] = useState<Goal[]>(store.getGoals());
  const [conditionPickerVisible, setConditionPickerVisible] = useState(false);
  const [goalInputVisible, setGoalInputVisible] = useState(false);

  useEffect(() => {
    return store.subscribe(() => {
      setProfile(store.getProfile());
      setGoals(store.getGoals());
    });
  }, []);

  function updateField(key: keyof UserProfile) {
    return (val: string) => { store.updateProfile({ [key]: val }); };
  }

  const activeGoals = goals.filter(g => g.active);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Profile & Goals</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Progress summary */}
        <View style={s.progressCard}>
          <Text style={s.progressTitle}>Active Goals</Text>
          <Text style={[s.progressNum, { color: C.resp }]}>{activeGoals.length}</Text>
          <Text style={s.progressSub}>of {goals.length} total</Text>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${(activeGoals.length / Math.max(goals.length, 1)) * 100}%` }]} />
          </View>
          <View style={s.activeGoalTags}>
            {activeGoals.slice(0, 3).map(g => (
              <View key={g.id} style={s.activeGoalTag}>
                <Text style={s.activeGoalTagText}>{g.label}</Text>
              </View>
            ))}
            {activeGoals.length > 3 && (
              <View style={s.activeGoalTag}>
                <Text style={s.activeGoalTagText}>+{activeGoals.length - 3} more</Text>
              </View>
            )}
          </View>
        </View>

        {/* Profile */}
        <Text style={s.sectionLabel}>PERSONAL INFO</Text>
        <View style={s.card}>
          <EditField label="Name" value={profile.name} onSave={updateField('name')} />
          <EditField label="Age" value={profile.age} onSave={updateField('age')} keyboardType="numeric" suffix="yrs" />
          <EditField label="Height" value={profile.height} onSave={updateField('height')} keyboardType="numeric" suffix="cm" />
          <EditField label="Weight" value={profile.weight} onSave={updateField('weight')} keyboardType="decimal-pad" suffix="kg" />
          <View style={[ef.row, { borderBottomWidth: 0 }]}>
            <Text style={ef.label}>Sex</Text>
            <View style={{ flex: 1, flexDirection: 'row', gap: 8 }}>
              {SEX_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={[s.sexBtn, profile.sex === opt && { backgroundColor: C.indigo + '22', borderColor: C.indigo }]}
                  onPress={() => store.updateProfile({ sex: opt })}
                >
                  <Text style={[s.sexBtnText, profile.sex === opt && { color: C.indigo }]}>
                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Target metrics */}
        <Text style={s.sectionLabel}>TARGET METRICS</Text>
        <View style={s.card}>
          <View style={s.targetRefRow}>
            <Text style={s.targetRefText}>Your 30-day averages — HRV: 43.5 ms  ·  RHR: 57 bpm  ·  Steps: 10.2k</Text>
          </View>
          <EditField label="Target HRV"   value={profile.targetHRV}   onSave={v => store.updateProfile({ targetHRV: v })}   keyboardType="numeric" suffix="ms" />
          <EditField label="Target RHR"   value={profile.targetRHR}   onSave={v => store.updateProfile({ targetRHR: v })}   keyboardType="numeric" suffix="bpm" />
          <EditField label="Daily Steps"  value={profile.targetSteps} onSave={v => store.updateProfile({ targetSteps: v })} keyboardType="numeric" suffix="steps" />
        </View>

        {/* Goals */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionLabel}>HEALTH GOALS</Text>
          <TouchableOpacity style={s.sectionAddBtn} onPress={() => setGoalInputVisible(true)}>
            <Text style={[s.sectionAddTxt, { color: C.resp }]}>+ Custom</Text>
          </TouchableOpacity>
        </View>
        {goals.map(g => (
          <GoalCard
            key={g.id}
            goal={g}
            onToggle={() => store.toggleGoal(g.id)}
            onRemove={g.custom ? () => store.removeGoal(g.id) : undefined}
          />
        ))}

        {/* Conditions */}
        <View style={s.sectionHeader}>
          <Text style={[s.sectionLabel, { marginBottom: 0 }]}>CONDITIONS & INJURIES</Text>
          <TouchableOpacity style={s.sectionAddBtn} onPress={() => setConditionPickerVisible(true)}>
            <Text style={[s.sectionAddTxt, { color: C.heart }]}>+ Add</Text>
          </TouchableOpacity>
        </View>
        <View style={s.tagsContainer}>
          {profile.conditions.length === 0 ? (
            <Text style={s.emptyTags}>No conditions added. Tap "+ Add" to log any injuries or chronic conditions.</Text>
          ) : (
            profile.conditions.map(c => (
              <ConditionTag key={c} label={c} onRemove={() => store.removeCondition(c)} />
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <ConditionPicker
        visible={conditionPickerVisible}
        conditions={profile.conditions}
        onClose={() => setConditionPickerVisible(false)}
        onAdd={(c) => store.addCondition(c)}
      />
      <GoalInput
        visible={goalInputVisible}
        onClose={() => setGoalInputVisible(false)}
        onAdd={(label) => store.addCustomGoal(label)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: C.bg },
  scroll:  { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  header:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backArrow:   { fontSize: 32, color: C.white, lineHeight: 40 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: C.white },

  progressCard: { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.resp + '30', padding: 18, marginBottom: 24, gap: 4 },
  progressTitle:{ fontSize: 12, color: C.muted, fontWeight: '700', letterSpacing: 0.5 },
  progressNum:  { fontSize: 42, fontWeight: '900', lineHeight: 50 },
  progressSub:  { fontSize: 13, color: C.muted, marginBottom: 8 },
  progressTrack:{ height: 6, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden', marginBottom: 12 },
  progressFill: { height: '100%', backgroundColor: C.resp, borderRadius: 3 },
  activeGoalTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  activeGoalTag:  { backgroundColor: C.resp + '18', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: C.resp + '40' },
  activeGoalTagText: { color: C.resp, fontSize: 12, fontWeight: '600' },

  sectionLabel:  { fontSize: 11, fontWeight: '700', color: C.muted, letterSpacing: 1, marginBottom: 10, marginTop: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 10 },
  sectionAddBtn: { paddingVertical: 3 },
  sectionAddTxt: { fontSize: 14, fontWeight: '700' },

  card: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, paddingHorizontal: 16, overflow: 'hidden' },

  sexBtn:     { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg },
  sexBtnText: { fontSize: 13, color: C.muted, fontWeight: '600' },

  targetRefRow:  { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  targetRefText: { fontSize: 12, color: C.faint, lineHeight: 18 },

  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  emptyTags:     { fontSize: 13, color: C.muted, lineHeight: 20, fontStyle: 'italic' },
});
