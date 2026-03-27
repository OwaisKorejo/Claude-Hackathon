/**
 * Body composition analysis engine
 *
 * Tier 1: Claude Vision API — sends photo to Claude for visual BF% estimation
 * Tier 2: Multi-formula ensemble — Navy + RFM (2018) + CUN-BAE (2012) + BMI-based
 * Tier 3: Single-formula fallback
 */

import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AIAnalysisResult {
  bfPercentage: number;
  bfRange: string;
  category: string;
  confidence: 'low' | 'medium' | 'high';
  muscleDef: string;
  fatDistribution: string;
  observations: string[];
  recommendations: string[];
  method: 'ai-vision';
}

export interface FormulaResult {
  navy:   number | null;
  rfm:    number | null;
  cunbae: number | null;
  bmi:    number | null;
  average: number;
  category: string;
  method: 'formula-ensemble';
}

export type Sex = 'male' | 'female';

// ─── Category lookup ──────────────────────────────────────────────────────────

export function getCategory(bf: number, sex: Sex): {
  label: string; color: string; desc: string; tips: string[];
} {
  if (sex === 'male') {
    if (bf < 6)  return { label: 'Essential Fat', color: '#22D3EE', desc: 'Below minimum for bodily functions. May indicate health risk.',        tips: ['Consult a physician — this level is clinically low', 'Increase caloric intake with healthy fats', 'Monitor hormonal health'] };
    if (bf < 14) return { label: 'Athlete',       color: '#34D399', desc: 'Typical of competitive athletes with well-defined musculature.',       tips: ['Maintain training load to preserve muscle', 'Prioritise protein intake (1.8–2.2 g/kg)', 'Monitor recovery with HRV'] };
    if (bf < 18) return { label: 'Fitness',       color: '#86EFAC', desc: 'Excellent body composition with visible muscle definition.',             tips: ['Stay consistent with current routine', 'Focus on strength training', 'Aim for 8h sleep'] };
    if (bf < 25) return { label: 'Acceptable',    color: '#FBBF24', desc: 'Within healthy range. Improvement possible with targeted training.',     tips: ['Add 2–3 strength sessions per week', 'Protein at each meal (25–30g)', 'Reduce processed foods'] };
    return        { label: 'Obese',               color: '#FF4B6E', desc: 'Elevated body fat — increased cardiovascular risk.',                     tips: ['Prioritise daily movement', 'Aim for 300–500 kcal deficit', 'Consult a dietitian', 'Monitor resting HR'] };
  } else {
    if (bf < 14) return { label: 'Essential Fat', color: '#22D3EE', desc: 'Below safe minimum for female physiology.',                             tips: ['Consult a physician immediately', 'Increase dietary fat', 'Monitor menstrual health'] };
    if (bf < 21) return { label: 'Athlete',       color: '#34D399', desc: 'Elite female athlete range. Exceptional fitness.',                       tips: ['High protein intake critical', 'Prioritise recovery and sleep', 'Watch HRV for overtraining'] };
    if (bf < 25) return { label: 'Fitness',       color: '#86EFAC', desc: 'Lean and active. Great cardiovascular health.',                          tips: ['Maintain balanced routine', 'Include resistance training 3x/week', 'Sleep for hormonal balance'] };
    if (bf < 32) return { label: 'Acceptable',    color: '#FBBF24', desc: 'Healthy range. Improvement possible with lifestyle changes.',             tips: ['Add resistance training', 'Focus on nutrient-dense foods', 'Aim for 7k–10k steps/day'] };
    return        { label: 'Obese',               color: '#FF4B6E', desc: 'Elevated body fat. Reducing this lowers cardiovascular risk.',            tips: ['Speak with a healthcare professional', 'Start with daily 30-min walks', '300–500 kcal deficit/day'] };
  }
}

// ─── Tier 1: Claude Vision API ────────────────────────────────────────────────

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

async function imageToBase64(uri: string): Promise<string> {
  return await readAsStringAsync(uri, { encoding: EncodingType.Base64 });
}

export async function analyzeWithClaude(
  photoUri: string,
  sex: Sex,
  heightCm?: number,
  weightKg?: number,
  age?: number,
): Promise<AIAnalysisResult> {
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('EXPO_PUBLIC_ANTHROPIC_API_KEY not set');

  const base64 = await imageToBase64(photoUri);

  const contextParts: string[] = [];
  if (sex)       contextParts.push(`Sex: ${sex}`);
  if (heightCm)  contextParts.push(`Height: ${heightCm} cm`);
  if (weightKg)  contextParts.push(`Weight: ${weightKg} kg`);
  if (age)       contextParts.push(`Age: ${age} years`);
  const context = contextParts.length ? `\n\nKnown data: ${contextParts.join(', ')}` : '';

  const prompt = `You are an expert body composition analyst and sports scientist. Analyze this body photo to estimate body fat percentage.

Study the image carefully and assess:
- Visible muscle definition (abs, arms, shoulders, legs)
- Subcutaneous fat distribution patterns
- Body proportions and bone structure
- Skin fold indicators where visible
- Overall physique category${context}

Provide your analysis as valid JSON (no markdown, no code fences). Use exactly this structure:
{
  "bfPercentage": <number — your best midpoint estimate>,
  "bfRange": "<string — e.g. '15-19%'>",
  "category": "<Essential Fat|Athlete|Fitness|Acceptable|Obese>",
  "confidence": "<low|medium|high>",
  "muscleDef": "<string — brief muscle definition assessment>",
  "fatDistribution": "<string — where fat is primarily carried>",
  "observations": ["<string>", "<string>", "<string>"],
  "recommendations": ["<string>", "<string>", "<string>"]
}

Be direct and specific. Estimate to the nearest 0.5%. Consider that photos can make people appear slightly leaner than reality due to lighting and posing — adjust accordingly.`;

  const response = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/jpeg', data: base64 },
          },
          { type: 'text', text: prompt },
        ],
      }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error (${response.status}): ${err}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text ?? '';

  // Parse JSON from response (handle possible markdown fences)
  const jsonStr = text.replace(/```json?\s*/g, '').replace(/```/g, '').trim();
  const parsed = JSON.parse(jsonStr);

  return { ...parsed, method: 'ai-vision' as const };
}

// ─── Tier 2: Multi-formula ensemble ───────────────────────────────────────────

/** U.S. Navy Formula (1984) */
function navyBF(sex: Sex, heightCm: number, neckCm: number, waistCm: number, hipCm?: number): number | null {
  const log = Math.log10;
  if (sex === 'male') {
    const d = waistCm - neckCm;
    if (d <= 0) return null;
    return (495 / (1.0324 - 0.19077 * log(d) + 0.15456 * log(heightCm))) - 450;
  } else {
    const s = waistCm + (hipCm ?? waistCm * 1.05) - neckCm;
    if (s <= 0) return null;
    return (495 / (1.29579 - 0.35004 * log(s) + 0.22100 * log(heightCm))) - 450;
  }
}

/** Relative Fat Mass — Woolcott & Bergman (2018, Cedars-Sinai) */
function rfmBF(sex: Sex, heightCm: number, waistCm: number): number {
  // RFM = 64 − (20 × height/waist) + (12 × sex)  [sex: 0=male, 1=female]
  const s = sex === 'female' ? 1 : 0;
  return 64 - (20 * (heightCm / waistCm)) + (12 * s);
}

/** CUN-BAE formula — Gómez-Ambrosi et al. (2012, Clinica Universidad Navarra) */
function cunbaeBF(sex: Sex, bmi: number, age: number): number {
  const s = sex === 'female' ? 1 : 0;
  return -44.988 + (0.503 * age) + (10.689 * s) + (3.172 * bmi)
       - (0.026 * bmi * bmi) + (0.181 * bmi * s)
       - (0.02 * bmi * age) - (0.005 * bmi * bmi * s)
       + (0.00021 * bmi * bmi * age);
}

/** BMI-based — Deurenberg et al. (1991) */
function bmiBF(sex: Sex, bmi: number, age: number): number {
  const s = sex === 'male' ? 1 : 0;
  return (1.20 * bmi) + (0.23 * age) - (10.8 * s) - 5.4;
}

export function calcBMI(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

export function formulaEnsemble(
  sex: Sex,
  heightCm: number,
  weightKg: number,
  age: number,
  neckCm?: number,
  waistCm?: number,
  hipCm?: number,
): FormulaResult {
  const bmi = calcBMI(weightKg, heightCm);

  const navy = neckCm && waistCm ? navyBF(sex, heightCm, neckCm, waistCm, hipCm) : null;
  const rfm  = waistCm ? rfmBF(sex, heightCm, waistCm) : null;
  const cun  = cunbaeBF(sex, bmi, age);
  const bmiEst = bmiBF(sex, bmi, age);

  const vals = [navy, rfm, cun, bmiEst].filter((v): v is number => v !== null && !isNaN(v) && v > 0 && v < 70);
  const average = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;

  const cat = getCategory(average, sex);

  return {
    navy:    navy !== null && !isNaN(navy) ? Math.round(navy * 10) / 10 : null,
    rfm:     rfm  !== null && !isNaN(rfm)  ? Math.round(rfm * 10) / 10 : null,
    cunbae:  Math.round(cun * 10) / 10,
    bmi:     Math.round(bmiEst * 10) / 10,
    average: Math.round(average * 10) / 10,
    category: cat.label,
    method: 'formula-ensemble',
  };
}
