/**
 * AI Dashboard Intelligence — aggregates ALL data sources
 * and calls Claude to generate insights, predictions, and summaries.
 */

import { fetchMeals, fetchExercises, fetchBodyFatHistory, fetchHealthLogs, Meal, Exercise, HealthLog } from './supabase';

const API = 'https://api.anthropic.com/v1/messages';
const API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY!;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DashboardData {
  garmin: GarminEntry[];
  meals: Meal[];
  exercises: Exercise[];
  bodyFatHistory: HealthLog[];
  healthLogs: HealthLog[];
}

export interface AIDashboardResult {
  dailyBrief: string;
  healthScore: number;          // 0-100
  healthScoreLabel: string;
  predictions: Prediction[];
  insights: Insight[];
  warnings: Warning[];
  weeklyTrends: WeeklyTrend[];
  recoveryStatus: RecoveryStatus;
  nutritionScore: NutritionScore;
  trainingLoad: TrainingLoad;
}

export interface Prediction {
  metric: string;
  current: string;
  predicted: string;
  timeframe: string;
  direction: 'up' | 'down' | 'stable';
  confidence: string;
}

export interface Insight {
  title: string;
  body: string;
  category: 'health' | 'fitness' | 'nutrition' | 'recovery' | 'pattern';
  priority: 'high' | 'medium' | 'low';
}

export interface Warning {
  title: string;
  body: string;
  severity: 'critical' | 'warning' | 'info';
}

export interface WeeklyTrend {
  metric: string;
  direction: 'improving' | 'declining' | 'stable';
  change: string;
}

export interface RecoveryStatus {
  score: number;          // 0-100
  label: string;
  factors: string[];
}

export interface NutritionScore {
  score: number;          // 0-100
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
  feedback: string;
}

export interface TrainingLoad {
  weeklyVolume: number;
  weeklyExercises: number;
  dominantCategory: string;
  feedback: string;
  rpeAvg: number | null;
}

// ─── Garmin data (embedded, same as dashboard) ───────────────────────────────

export interface GarminEntry {
  date: string; hrMin: number; hrMax: number; hrAvg: number;
  hrvAvg: number | null; o2Avg: number | null; respAvg: number | null; rhrAvg: number | null;
}

const GARMIN_DATA: GarminEntry[] = [
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

// ─── Fetch all data ───────────────────────────────────────────────────────────

export async function fetchAllData(): Promise<DashboardData> {
  const [meals, exercises, bodyFatHistory, healthLogs] = await Promise.allSettled([
    fetchMeals(),
    fetchExercises(),
    fetchBodyFatHistory(),
    fetchHealthLogs(),
  ]);

  return {
    garmin: GARMIN_DATA,
    meals:          meals.status === 'fulfilled' ? meals.value : [],
    exercises:      exercises.status === 'fulfilled' ? exercises.value : [],
    bodyFatHistory: bodyFatHistory.status === 'fulfilled' ? bodyFatHistory.value : [],
    healthLogs:     healthLogs.status === 'fulfilled' ? healthLogs.value : [],
  };
}

// ─── Build data summary for Claude ────────────────────────────────────────────

function buildDataSummary(data: DashboardData): string {
  const g = data.garmin;
  const lastFull = g.slice().reverse().find(d => d.hrvAvg !== null);
  const today = g[g.length - 1];
  const last7 = g.slice(-7);
  const fullData = g.filter(d => d.hrvAvg !== null);

  const avgHR  = fullData.reduce((a, d) => a + d.hrAvg, 0) / fullData.length;
  const avgHRV = fullData.reduce((a, d) => a + (d.hrvAvg ?? 0), 0) / fullData.length;
  const avgRHR = fullData.reduce((a, d) => a + (d.rhrAvg ?? 0), 0) / fullData.length;
  const avgO2  = fullData.reduce((a, d) => a + (d.o2Avg ?? 0), 0) / fullData.length;

  let summary = `=== GARMIN HEALTH DATA (30 days) ===
Today's HR: ${today.hrAvg} bpm (min ${today.hrMin}, max ${today.hrMax})
Last full reading: ${lastFull?.date} — HR ${lastFull?.hrAvg}, HRV ${lastFull?.hrvAvg}ms, O2 ${lastFull?.o2Avg}%, RHR ${lastFull?.rhrAvg}
30-day averages: HR ${avgHR.toFixed(1)} bpm, HRV ${avgHRV.toFixed(1)} ms, RHR ${avgRHR.toFixed(1)} bpm, O2 ${avgO2.toFixed(1)}%
7-day HR trend: ${last7.map(d => `${d.date.slice(5)}: ${d.hrAvg}`).join(', ')}
Best HRV: ${Math.max(...fullData.map(d => d.hrvAvg ?? 0))} ms
Worst HRV: ${Math.min(...fullData.map(d => d.hrvAvg ?? 999))} ms`;

  // Meals
  if (data.meals.length > 0) {
    const totalCal = data.meals.reduce((a, m) => a + (m.calories ?? 0), 0);
    const totalProt = data.meals.reduce((a, m) => a + (m.protien ?? 0), 0);
    const totalCarbs = data.meals.reduce((a, m) => a + (m.carbs ?? 0), 0);
    const totalFat = data.meals.reduce((a, m) => a + (m.fat ?? 0), 0);
    const days = new Set(data.meals.map(m => m.date_eaten.split('T')[0])).size;
    summary += `\n\n=== NUTRITION (${data.meals.length} meals across ${days} days) ===
Total: ${totalCal} kcal, ${totalProt}g protein, ${totalCarbs}g carbs, ${totalFat}g fat
Daily avg: ${days > 0 ? Math.round(totalCal / days) : 0} kcal, ${days > 0 ? Math.round(totalProt / days) : 0}g protein
Recent meals: ${data.meals.slice(0, 5).map(m => `${m.meal_name} (${m.calories ?? '?'} kcal)`).join(', ')}`;
  }

  // Exercises
  if (data.exercises.length > 0) {
    const last7Days = data.exercises.filter(e => {
      const d = new Date(e.workout_date + 'T00:00:00');
      const now = new Date();
      return (now.getTime() - d.getTime()) / 86400000 < 7;
    });
    const weeklyVol = last7Days.reduce((a, e) => a + ((e.set_count ?? 0) * (e.reps ?? 0) * (e.weight_kg ?? 0)), 0);
    const cats = [...new Set(data.exercises.map(e => e.exercise_category).filter(Boolean))];
    const rpes = data.exercises.map(e => e.rpe).filter((r): r is number => r !== null);
    const avgRpe = rpes.length ? rpes.reduce((a, b) => a + b, 0) / rpes.length : null;
    summary += `\n\n=== EXERCISES (${data.exercises.length} total, ${last7Days.length} this week) ===
Weekly volume: ${weeklyVol.toLocaleString()} kg
Categories trained: ${cats.join(', ')}
Average RPE: ${avgRpe !== null ? avgRpe.toFixed(1) : 'N/A'}/10
Recent: ${data.exercises.slice(0, 5).map(e => `${e.exercise_name} (${e.set_count ?? '?'}×${e.reps ?? '?'} @ ${e.weight_kg ?? '?'}kg)`).join(', ')}`;
  }

  // Body fat
  if (data.bodyFatHistory.length > 0) {
    const sorted = [...data.bodyFatHistory].sort((a, b) => b.log_date.localeCompare(a.log_date));
    const latest = sorted[0];
    const oldest = sorted[sorted.length - 1];
    summary += `\n\n=== BODY FAT (${sorted.length} scans) ===
Latest: ${latest.body_fat_pct}% on ${latest.log_date}
${sorted.length > 1 ? `First scan: ${oldest.body_fat_pct}% on ${oldest.log_date}` : ''}
${sorted.length > 1 ? `Change: ${((latest.body_fat_pct ?? 0) - (oldest.body_fat_pct ?? 0)).toFixed(1)}%` : ''}
History: ${sorted.slice(0, 5).map(h => `${h.log_date}: ${h.body_fat_pct}%`).join(', ')}`;
  }

  return summary;
}

// ─── Call Claude for AI analysis ──────────────────────────────────────────────

export async function generateAIDashboard(data: DashboardData): Promise<AIDashboardResult> {
  const summary = buildDataSummary(data);

  const prompt = `You are an elite sports scientist and health analytics AI. Analyse ALL the following health, fitness, nutrition, and body composition data for one person, and provide a comprehensive dashboard analysis.

${summary}

Today's date: ${new Date().toISOString().split('T')[0]}

Respond in VALID JSON only (no markdown, no code fences). Use this exact structure:
{
  "dailyBrief": "<2-3 sentence overview of current health status, most important takeaway today>",
  "healthScore": <number 0-100, overall health score based on all data>,
  "healthScoreLabel": "<Excellent|Good|Fair|Needs Attention|Critical>",
  "predictions": [
    {"metric": "<e.g. HRV, Body Fat, Resting HR>", "current": "<current value>", "predicted": "<predicted value>", "timeframe": "<e.g. 2 weeks, 1 month>", "direction": "<up|down|stable>", "confidence": "<high|medium|low>"}
  ],
  "insights": [
    {"title": "<short title>", "body": "<1-2 sentence insight>", "category": "<health|fitness|nutrition|recovery|pattern>", "priority": "<high|medium|low>"}
  ],
  "warnings": [
    {"title": "<short>", "body": "<explanation>", "severity": "<critical|warning|info>"}
  ],
  "weeklyTrends": [
    {"metric": "<e.g. Heart Rate>", "direction": "<improving|declining|stable>", "change": "<e.g. -3 bpm, +5 ms>"}
  ],
  "recoveryStatus": {
    "score": <0-100>,
    "label": "<Fully Recovered|Recovering|Fatigued|Overtrained>",
    "factors": ["<factor 1>", "<factor 2>"]
  },
  "nutritionScore": {
    "score": <0-100>,
    "avgCalories": <number>,
    "avgProtein": <number>,
    "avgCarbs": <number>,
    "avgFat": <number>,
    "feedback": "<1 sentence feedback>"
  },
  "trainingLoad": {
    "weeklyVolume": <number>,
    "weeklyExercises": <number>,
    "dominantCategory": "<category>",
    "feedback": "<1 sentence>",
    "rpeAvg": <number or null>
  }
}

IMPORTANT — keep the response compact:
- 3 predictions max (keep values short)
- 4 insights max (1 sentence body each)
- 1-2 warnings max
- 4 weekly trends max
- Keep all string values SHORT (under 80 chars)
- Do NOT add extra fields
- The ENTIRE response must be valid JSON that fits in ~1500 tokens`;

  const resp = await fetch(API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Claude API ${resp.status}: ${err}`);
  }

  const json = await resp.json();
  const text: string = json.content?.[0]?.text ?? '';

  // Strip markdown fences if present
  let clean = text.replace(/```json?\s*/g, '').replace(/```/g, '').trim();

  // If response was truncated (no closing brace), attempt to repair
  if (!clean.endsWith('}')) {
    // Find the last complete object/array boundary
    const lastBrace = clean.lastIndexOf('}');
    if (lastBrace > 0) {
      clean = clean.slice(0, lastBrace + 1);
      // Count braces to ensure balance
      let depth = 0;
      for (const ch of clean) {
        if (ch === '{' || ch === '[') depth++;
        if (ch === '}' || ch === ']') depth--;
      }
      // Close any unclosed braces/brackets
      while (depth > 0) {
        // Guess whether we need } or ] based on what was last opened
        const lastOpen = clean.lastIndexOf('{') > clean.lastIndexOf('[') ? '}' : ']';
        clean += lastOpen;
        depth--;
      }
    }
  }

  try {
    return JSON.parse(clean);
  } catch {
    // If JSON still fails, return a minimal valid result
    console.warn('AI Dashboard JSON parse failed, returning fallback. Raw:', text.slice(0, 200));
    return {
      dailyBrief: 'AI analysis completed but response parsing failed. Pull to refresh for a new analysis.',
      healthScore: 70,
      healthScoreLabel: 'Good',
      predictions: [],
      insights: [{ title: 'Analysis available', body: 'Pull down to refresh for full AI insights.', category: 'health' as const, priority: 'medium' as const }],
      warnings: [],
      weeklyTrends: [],
      recoveryStatus: { score: 70, label: 'Recovering', factors: ['Data available'] },
      nutritionScore: { score: 60, avgCalories: 0, avgProtein: 0, avgCarbs: 0, avgFat: 0, feedback: 'Refresh for detailed analysis' },
      trainingLoad: { weeklyVolume: 0, weeklyExercises: 0, dominantCategory: 'N/A', feedback: 'Refresh for details', rpeAvg: null },
    };
  }
}
