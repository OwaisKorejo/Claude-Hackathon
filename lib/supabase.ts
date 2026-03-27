import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ═══════════════════════════════════════════════════════════════════════════════
// MEALS
// ═══════════════════════════════════════════════════════════════════════════════

export interface Meal {
  id:         number;
  meal_name:  string | null;
  calories:   number | null;
  fat:        number | null;
  protien:    number | null;   // DB typo preserved
  carbs:      number | null;
  date_eaten: string;
}

export type NewMeal = Omit<Meal, 'id' | 'date_eaten'> & { date_eaten?: string };

export async function fetchMeals(): Promise<Meal[]> {
  const { data, error } = await supabase.from('meals').select('*').order('date_eaten', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Meal[];
}

export async function insertMeal(meal: NewMeal): Promise<Meal> {
  const { data, error } = await supabase.from('meals').insert([meal]).select().single();
  if (error) throw error;
  return data as Meal;
}

export async function deleteMeal(id: number): Promise<void> {
  const { error } = await supabase.from('meals').delete().eq('id', id);
  if (error) throw error;
}

export async function updateMeal(id: number, updates: Partial<NewMeal>): Promise<Meal> {
  const { data, error } = await supabase.from('meals').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data as Meal;
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORKOUT EXERCISES
// ═══════════════════════════════════════════════════════════════════════════════

export interface Exercise {
  id:                string;
  created_at:        string;
  user_id:           string | null;
  workout_date:      string;    // date
  exercise_name:     string;
  exercise_category: string | null;
  set_count:         number | null;
  reps:              number | null;
  total_reps:        number | null;
  weight_kg:         number | null;
  duration_sec:      number | null;
  distance_km:       number | null;
  rest_sec:          number | null;
  rpe:               number | null;
  notes:             string | null;
}

export type NewExercise = Omit<Exercise, 'id' | 'created_at' | 'user_id'>;

export async function fetchExercises(): Promise<Exercise[]> {
  const { data, error } = await supabase
    .from('workout_exercises')
    .select('*')
    .order('workout_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Exercise[];
}

export async function fetchExercisesByDate(date: string): Promise<Exercise[]> {
  const { data, error } = await supabase
    .from('workout_exercises')
    .select('*')
    .eq('workout_date', date)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Exercise[];
}

export async function insertExercise(ex: NewExercise): Promise<Exercise> {
  const { data, error } = await supabase.from('workout_exercises').insert([ex]).select().single();
  if (error) throw error;
  return data as Exercise;
}

export async function updateExercise(id: string, updates: Partial<NewExercise>): Promise<Exercise> {
  const { data, error } = await supabase.from('workout_exercises').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data as Exercise;
}

export async function deleteExercise(id: string): Promise<void> {
  const { error } = await supabase.from('workout_exercises').delete().eq('id', id);
  if (error) throw error;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HEALTH LOGS  (body fat, HR, HRV, etc.)
// ═══════════════════════════════════════════════════════════════════════════════

export interface HealthLog {
  id:            string;
  created_at:    string;
  user_id:       string | null;
  log_date:      string;
  hr_min:        number | null;
  hr_max:        number | null;
  hr_avg:        number | null;
  hrv:           number | null;
  o2:            number | null;
  resp_rate:     number | null;
  rhr:           number | null;
  steps:         number | null;
  sleep_hours:   number | null;
  sleep_deep:    number | null;
  sleep_rem:     number | null;
  sleep_light:   number | null;
  notes:         string | null;
  body_fat_pct:  number | null;
}

export type NewHealthLog = Omit<HealthLog, 'id' | 'created_at' | 'user_id'>;

export async function fetchHealthLogs(): Promise<HealthLog[]> {
  const { data, error } = await supabase
    .from('health_logs')
    .select('*')
    .order('log_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as HealthLog[];
}

export async function fetchBodyFatHistory(): Promise<HealthLog[]> {
  const { data, error } = await supabase
    .from('health_logs')
    .select('*')
    .not('body_fat_pct', 'is', null)
    .order('log_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as HealthLog[];
}

export async function upsertHealthLog(log: NewHealthLog): Promise<HealthLog> {
  // upsert keyed on log_date (unique constraint handles conflicts)
  const { data, error } = await supabase
    .from('health_logs')
    .upsert([log], { onConflict: 'user_id,log_date' })
    .select()
    .single();
  if (error) throw error;
  return data as HealthLog;
}

export async function saveBodyFat(date: string, bfPct: number, notes?: string): Promise<HealthLog> {
  return upsertHealthLog({
    log_date: date,
    body_fat_pct: bfPct,
    notes: notes ?? null,
    hr_min: null, hr_max: null, hr_avg: null, hrv: null, o2: null,
    resp_rate: null, rhr: null, steps: null,
    sleep_hours: null, sleep_deep: null, sleep_rem: null, sleep_light: null,
  });
}

export async function deleteHealthLog(id: string): Promise<void> {
  const { error } = await supabase.from('health_logs').delete().eq('id', id);
  if (error) throw error;
}
