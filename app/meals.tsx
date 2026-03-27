import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform,
  RefreshControl, ScrollView, StatusBar, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { fetchMeals, insertMeal, deleteMeal, updateMeal, Meal, NewMeal } from '@/lib/supabase';

// ─── Theme ────────────────────────────────────────────────────────────────────
const C = {
  bg:      '#080D1A',
  card:    '#111827',
  cardAlt: '#0D1526',
  border:  'rgba(255,255,255,0.07)',
  white:   '#FFFFFF',
  muted:   'rgba(255,255,255,0.5)',
  faint:   'rgba(255,255,255,0.2)',
  input:   '#1C2539',
  indigo:  '#6366F1',
  indigoDim:'rgba(99,102,241,0.15)',
  cal:     '#FF6B6B',
  fat:     '#FBBF24',
  protein: '#34D399',
  carbs:   '#22D3EE',
  error:   '#FF4B6E',
  success: '#34D399',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function dateLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const same = (a: Date, b: Date) =>
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();

  if (same(d, today))     return 'Today';
  if (same(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString('en-IE', { weekday: 'long', month: 'short', day: 'numeric' });
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' });
}

function groupByDay(meals: Meal[]): { label: string; date: string; items: Meal[] }[] {
  const map = new Map<string, Meal[]>();
  for (const m of meals) {
    const day = m.date_eaten.split('T')[0];
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(m);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, items]) => ({ label: dateLabel(items[0].date_eaten), date, items }));
}

function sum(meals: Meal[], key: keyof Meal): number {
  return meals.reduce((acc, m) => acc + (Number(m[key]) || 0), 0);
}

// ─── Macro bar ────────────────────────────────────────────────────────────────
function MacroBar({ label, value, unit, color, max }: {
  label: string; value: number; unit: string; color: string; max: number;
}) {
  const ratio = max > 0 ? Math.min(value / max, 1) : 0;
  return (
    <View style={mb.wrapper}>
      <View style={mb.top}>
        <Text style={[mb.label, { color }]}>{label}</Text>
        <Text style={[mb.val, { color }]}>{value}<Text style={mb.unit}>{unit}</Text></Text>
      </View>
      <View style={mb.track}>
        <View style={[mb.fill, { width: `${ratio * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}
const mb = StyleSheet.create({
  wrapper: { gap: 4 },
  top:     { flexDirection: 'row', justifyContent: 'space-between' },
  label:   { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  val:     { fontSize: 13, fontWeight: '800' },
  unit:    { fontSize: 10, fontWeight: '400' },
  track:   { height: 5, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' },
  fill:    { height: '100%', borderRadius: 3 },
});

// ─── Meal form modal ──────────────────────────────────────────────────────────
interface MealFormProps {
  visible:  boolean;
  initial?: Meal | null;
  onClose:  () => void;
  onSave:   (data: NewMeal) => Promise<void>;
}

function MealForm({ visible, initial, onClose, onSave }: MealFormProps) {
  const [name,     setName]     = useState('');
  const [calories, setCalories] = useState('');
  const [fat,      setFat]      = useState('');
  const [protein,  setProtein]  = useState('');
  const [carbs,    setCarbs]    = useState('');
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    if (initial) {
      setName(initial.meal_name ?? '');
      setCalories(initial.calories != null ? String(initial.calories) : '');
      setFat(initial.fat != null ? String(initial.fat) : '');
      setProtein(initial.protien != null ? String(initial.protien) : '');
      setCarbs(initial.carbs != null ? String(initial.carbs) : '');
    } else {
      setName(''); setCalories(''); setFat(''); setProtein(''); setCarbs('');
    }
  }, [visible, initial]);

  async function handleSave() {
    if (!name.trim()) { Alert.alert('Missing', 'Please enter a meal name.'); return; }
    setSaving(true);
    try {
      await onSave({
        meal_name: name.trim(),
        calories:  calories  ? parseInt(calories,  10) : null,
        fat:       fat       ? parseInt(fat,       10) : null,
        protien:   protein   ? parseInt(protein,   10) : null,
        carbs:     carbs     ? parseInt(carbs,     10) : null,
      });
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  // Auto-calc calories if blank
  function autoCalc() {
    if (calories) return;
    const f = parseFloat(fat)     || 0;
    const p = parseFloat(protein) || 0;
    const c = parseFloat(carbs)   || 0;
    const est = Math.round(f * 9 + p * 4 + c * 4);
    if (est > 0) setCalories(String(est));
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <SafeAreaView style={mf.safe} edges={['top']}>
          <View style={mf.header}>
            <TouchableOpacity onPress={onClose} disabled={saving}>
              <Text style={mf.cancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={mf.title}>{initial ? 'Edit Meal' : 'Log Meal'}</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color={C.indigo} />
                : <Text style={mf.save}>Save</Text>
              }
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={mf.content} keyboardShouldPersistTaps="handled">

            {/* Meal name */}
            <Text style={mf.label}>MEAL NAME</Text>
            <TextInput
              style={mf.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Grilled salmon with rice"
              placeholderTextColor={C.faint}
              autoFocus
            />

            {/* Macros */}
            <Text style={[mf.label, { marginTop: 20 }]}>NUTRITION</Text>
            <View style={mf.macroGrid}>
              {[
                { label: 'Calories', val: calories, set: setCalories, color: C.cal,     suffix: 'kcal', placeholder: '450' },
                { label: 'Protein',  val: protein,  set: setProtein,  color: C.protein, suffix: 'g',    placeholder: '35' },
                { label: 'Carbs',    val: carbs,    set: setCarbs,    color: C.carbs,   suffix: 'g',    placeholder: '60' },
                { label: 'Fat',      val: fat,       set: setFat,      color: C.fat,     suffix: 'g',    placeholder: '12' },
              ].map(f => (
                <View key={f.label} style={mf.macroField}>
                  <Text style={[mf.macroLabel, { color: f.color }]}>{f.label}</Text>
                  <View style={[mf.macroInput, { borderColor: f.color + '30' }]}>
                    <TextInput
                      style={mf.macroText}
                      value={f.val}
                      onChangeText={f.set}
                      onBlur={f.label !== 'Calories' ? autoCalc : undefined}
                      placeholder={f.placeholder}
                      placeholderTextColor={C.faint}
                      keyboardType="numeric"
                    />
                    <Text style={mf.macroSuffix}>{f.suffix}</Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={mf.hint}>
              <Text style={mf.hintText}>💡 Calories auto-estimated from macros if left blank</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const mf = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: C.bg },
  header:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  cancel:  { fontSize: 16, color: C.muted },
  title:   { fontSize: 17, fontWeight: '800', color: C.white },
  save:    { fontSize: 16, color: C.indigo, fontWeight: '800' },
  content: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 60 },
  label:   { fontSize: 11, fontWeight: '700', color: C.muted, letterSpacing: 1, marginBottom: 8 },
  input:   { backgroundColor: C.input, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 15, color: C.white, fontSize: 16 },
  macroGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  macroField: { width: '47%', gap: 6 },
  macroLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  macroInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.input, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  macroText:  { flex: 1, color: C.white, fontSize: 18, fontWeight: '700' },
  macroSuffix:{ fontSize: 12, color: C.muted, marginLeft: 4 },
  hint:  { marginTop: 16, backgroundColor: C.indigoDim, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: C.indigo + '30' },
  hintText: { fontSize: 13, color: C.muted },
});

// ─── Meal card ────────────────────────────────────────────────────────────────
function MealCard({ meal, onEdit, onDelete }: {
  meal: Meal; onEdit: () => void; onDelete: () => void;
}) {
  const hasMacros = meal.calories || meal.fat || meal.protien || meal.carbs;
  return (
    <View style={mc.card}>
      <View style={mc.top}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={mc.name}>{meal.meal_name || 'Unnamed meal'}</Text>
          <Text style={mc.time}>{timeLabel(meal.date_eaten)}</Text>
        </View>
        <View style={mc.actions}>
          <TouchableOpacity onPress={onEdit} style={mc.actionBtn}>
            <Text style={mc.actionEdit}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={[mc.actionBtn, mc.deleteBtn]}>
            <Text style={mc.actionDelete}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>

      {hasMacros ? (
        <View style={mc.macroRow}>
          {meal.calories != null && (
            <View style={[mc.macroPill, { backgroundColor: C.cal + '18', borderColor: C.cal + '30' }]}>
              <Text style={[mc.macroVal, { color: C.cal }]}>{meal.calories}</Text>
              <Text style={[mc.macroUnit, { color: C.cal }]}>kcal</Text>
            </View>
          )}
          {meal.protien != null && (
            <View style={[mc.macroPill, { backgroundColor: C.protein + '18', borderColor: C.protein + '30' }]}>
              <Text style={[mc.macroVal, { color: C.protein }]}>{meal.protien}g</Text>
              <Text style={[mc.macroUnit, { color: C.protein }]}>protein</Text>
            </View>
          )}
          {meal.carbs != null && (
            <View style={[mc.macroPill, { backgroundColor: C.carbs + '18', borderColor: C.carbs + '30' }]}>
              <Text style={[mc.macroVal, { color: C.carbs }]}>{meal.carbs}g</Text>
              <Text style={[mc.macroUnit, { color: C.carbs }]}>carbs</Text>
            </View>
          )}
          {meal.fat != null && (
            <View style={[mc.macroPill, { backgroundColor: C.fat + '18', borderColor: C.fat + '30' }]}>
              <Text style={[mc.macroVal, { color: C.fat }]}>{meal.fat}g</Text>
              <Text style={[mc.macroUnit, { color: C.fat }]}>fat</Text>
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

const mc = StyleSheet.create({
  card:      { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 8 },
  top:       { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  name:      { fontSize: 15, fontWeight: '700', color: C.white, flexShrink: 1 },
  time:      { fontSize: 12, color: C.muted },
  actions:   { flexDirection: 'row', gap: 6 },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: C.border },
  deleteBtn: { borderColor: C.error + '40' },
  actionEdit:  { fontSize: 12, color: C.muted, fontWeight: '600' },
  actionDelete:{ fontSize: 12, color: C.error, fontWeight: '600' },
  macroRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  macroPill: { flexDirection: 'row', alignItems: 'baseline', gap: 3, borderRadius: 20, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  macroVal:  { fontSize: 13, fontWeight: '800' },
  macroUnit: { fontSize: 10, fontWeight: '600', opacity: 0.8 },
});

// ─── Day summary card ─────────────────────────────────────────────────────────
function DaySummary({ meals }: { meals: Meal[] }) {
  const totalCal  = sum(meals, 'calories');
  const totalProt = sum(meals, 'protien');
  const totalCarbs= sum(meals, 'carbs');
  const totalFat  = sum(meals, 'fat');

  return (
    <View style={ds.card}>
      <View style={ds.topRow}>
        <Text style={ds.totalCal}>{totalCal}<Text style={ds.totalCalUnit}> kcal</Text></Text>
        <Text style={ds.mealCount}>{meals.length} meal{meals.length !== 1 ? 's' : ''}</Text>
      </View>
      <View style={ds.bars}>
        <MacroBar label="PROTEIN" value={totalProt} unit="g" color={C.protein} max={200} />
        <MacroBar label="CARBS"   value={totalCarbs}unit="g" color={C.carbs}   max={300} />
        <MacroBar label="FAT"     value={totalFat}  unit="g" color={C.fat}     max={100} />
      </View>
    </View>
  );
}

const ds = StyleSheet.create({
  card:    { backgroundColor: C.indigoDim, borderRadius: 14, borderWidth: 1, borderColor: C.indigo + '25', padding: 14, marginBottom: 10 },
  topRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 },
  totalCal:    { fontSize: 28, fontWeight: '900', color: C.cal },
  totalCalUnit:{ fontSize: 14, fontWeight: '400', color: C.muted },
  mealCount:   { fontSize: 13, color: C.muted, fontWeight: '600' },
  bars:    { gap: 8 },
});

// ─── Main screen ───────────────────────────────────────────────────────────────
export default function MealsScreen() {
  const router = useRouter();
  const [meals,      setMeals]      = useState<Meal[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [formOpen,   setFormOpen]   = useState(false);
  const [editing,    setEditing]    = useState<Meal | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const rows = await fetchMeals();
      setMeals(rows);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to fetch meals');
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  async function handleSave(data: NewMeal) {
    if (editing) {
      const updated = await updateMeal(editing.id, data);
      setMeals(prev => prev.map(m => m.id === editing.id ? updated : m));
    } else {
      const created = await insertMeal(data);
      setMeals(prev => [created, ...prev]);
    }
  }

  function handleDelete(meal: Meal) {
    Alert.alert(
      'Delete meal',
      `Remove "${meal.meal_name || 'this meal'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await deleteMeal(meal.id);
              setMeals(prev => prev.filter(m => m.id !== meal.id));
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'Failed to delete.');
            }
          },
        },
      ]
    );
  }

  const groups = groupByDay(meals);

  // All-time totals
  const allCal  = sum(meals, 'calories');
  const allProt = sum(meals, 'protien');
  const allCarbs= sum(meals, 'carbs');
  const allFat  = sum(meals, 'fat');

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={s.title}>Meals</Text>
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => { setEditing(null); setFormOpen(true); }}
          activeOpacity={0.8}
        >
          <Text style={s.addBtnText}>+ Log</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.indigo} />
          <Text style={s.loadingText}>Loading from Supabase…</Text>
        </View>
      ) : (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.muted} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Error */}
          {error && (
            <View style={s.errorCard}>
              <Text style={s.errorTitle}>Connection error</Text>
              <Text style={s.errorBody}>{error}</Text>
              <TouchableOpacity style={s.retryBtn} onPress={onRefresh}>
                <Text style={s.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Summary pills (all time) */}
          {!error && meals.length > 0 && (
            <>
              <Text style={s.sectionLabel}>ALL TIME</Text>
              <View style={s.summaryRow}>
                {[
                  { label: 'Total kcal', val: allCal.toLocaleString(), color: C.cal },
                  { label: 'Protein',    val: allProt + 'g',           color: C.protein },
                  { label: 'Carbs',      val: allCarbs + 'g',          color: C.carbs },
                  { label: 'Fat',        val: allFat + 'g',            color: C.fat },
                ].map(p => (
                  <View key={p.label} style={[s.summaryPill, { borderColor: p.color + '30' }]}>
                    <Text style={[s.summaryVal, { color: p.color }]}>{p.val}</Text>
                    <Text style={s.summaryLabel}>{p.label}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Empty state */}
          {!error && meals.length === 0 && (
            <View style={s.emptyState}>
              <Text style={s.emptyEmoji}>🍽️</Text>
              <Text style={s.emptyTitle}>No meals logged yet</Text>
              <Text style={s.emptyBody}>Tap "+ Log" to add your first meal and start tracking your nutrition.</Text>
              <TouchableOpacity style={s.emptyBtn} onPress={() => { setEditing(null); setFormOpen(true); }}>
                <Text style={s.emptyBtnText}>Log first meal</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Days */}
          {groups.map(group => (
            <View key={group.date}>
              <View style={s.dayHeader}>
                <Text style={s.dayLabel}>{group.label}</Text>
                <View style={s.dayDivider} />
              </View>
              <DaySummary meals={group.items} />
              {group.items.map(meal => (
                <MealCard
                  key={meal.id}
                  meal={meal}
                  onEdit={() => { setEditing(meal); setFormOpen(true); }}
                  onDelete={() => handleDelete(meal)}
                />
              ))}
            </View>
          ))}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      <MealForm
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
  backArrow:   { fontSize: 32, color: C.white, lineHeight: 40 },
  title:       { fontSize: 22, fontWeight: '800', color: C.white, letterSpacing: -0.5 },
  addBtn:      { backgroundColor: C.indigo + '22', borderWidth: 1, borderColor: C.indigo + '55', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText:  { color: C.indigo, fontWeight: '800', fontSize: 14 },

  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: C.muted, fontSize: 14 },

  scroll:  { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: C.muted, letterSpacing: 1, marginBottom: 10 },

  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 24, flexWrap: 'wrap' },
  summaryPill:  { flex: 1, minWidth: 70, backgroundColor: C.card, borderRadius: 12, borderWidth: 1, padding: 12, alignItems: 'center', gap: 3 },
  summaryVal:   { fontSize: 15, fontWeight: '800' },
  summaryLabel: { fontSize: 10, color: C.muted, fontWeight: '600' },

  errorCard:  { backgroundColor: C.error + '12', borderWidth: 1, borderColor: C.error + '40', borderRadius: 14, padding: 16, gap: 8, marginBottom: 16 },
  errorTitle: { color: C.error, fontSize: 15, fontWeight: '700' },
  errorBody:  { color: C.muted, fontSize: 13, lineHeight: 18 },
  retryBtn:   { alignSelf: 'flex-start', backgroundColor: C.error + '22', borderRadius: 8, borderWidth: 1, borderColor: C.error + '50', paddingHorizontal: 14, paddingVertical: 7 },
  retryText:  { color: C.error, fontWeight: '700', fontSize: 13 },

  dayHeader:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, marginTop: 10 },
  dayLabel:   { fontSize: 14, fontWeight: '800', color: C.white },
  dayDivider: { flex: 1, height: 1, backgroundColor: C.border },

  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: C.white },
  emptyBody:  { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 21, paddingHorizontal: 20 },
  emptyBtn:   { backgroundColor: C.indigo + '22', borderWidth: 1, borderColor: C.indigo + '55', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  emptyBtnText: { color: C.indigo, fontWeight: '700', fontSize: 15 },
});
