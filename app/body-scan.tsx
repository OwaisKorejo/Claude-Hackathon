/**
 * Body Scan — AI-powered body composition estimator
 *
 * Tier 1: Claude Vision API — visual body fat analysis from photo
 * Tier 2: Multi-formula ensemble — Navy + RFM (2018) + CUN-BAE (2012) + BMI-based
 *
 * Camera → Photo → AI analysis (or manual measurements) → Results
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar,
  ScrollView, TextInput, Dimensions, Image, KeyboardAvoidingView,
  Platform, Alert, ActivityIndicator, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import {
  analyzeWithClaude, formulaEnsemble, calcBMI, getCategory,
  AIAnalysisResult, FormulaResult, Sex,
} from '@/lib/body-analysis';
import { saveBodyFat, fetchBodyFatHistory, deleteHealthLog, HealthLog } from '@/lib/supabase';

const { width: W } = Dimensions.get('window');

// ─── Theme ────────────────────────────────────────────────────────────────────
const C = {
  bg:       '#080D1A',
  card:     '#111827',
  border:   'rgba(255,255,255,0.07)',
  white:    '#FFFFFF',
  muted:    'rgba(255,255,255,0.5)',
  faint:    'rgba(255,255,255,0.2)',
  input:    '#1C2539',
  pink:     '#F472B6',
  pinkDim:  'rgba(244,114,182,0.15)',
  resp:     '#34D399',
  rhr:      '#FBBF24',
  heart:    '#FF4B6E',
  o2:       '#22D3EE',
  hrv:      '#A78BFA',
  claude:   '#CC9B4A',
  claudeDim:'rgba(204,155,74,0.15)',
  indigo:   '#6366F1',
};

const HAS_API_KEY = !!process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

// ─── Gauge ────────────────────────────────────────────────────────────────────
function BFGauge({ bf, sex }: { bf: number; sex: Sex }) {
  const maxBF = sex === 'male' ? 40 : 50;
  const ratio = Math.min(Math.max(bf / maxBF, 0), 1);
  const cat   = getCategory(bf, sex);

  const segments = sex === 'male'
    ? [{ to: 6 }, { to: 14 }, { to: 18 }, { to: 25 }, { to: maxBF }]
    : [{ to: 14 }, { to: 21 }, { to: 25 }, { to: 32 }, { to: maxBF }];
  const segColors = [C.o2, C.resp, '#86EFAC', C.rhr, C.heart];

  return (
    <View style={gauge.wrap}>
      <View style={gauge.track}>
        {segments.map((seg, i) => {
          const prev = i > 0 ? segments[i - 1].to : 0;
          return (
            <View key={i} style={[gauge.seg, {
              width: `${((seg.to - prev) / maxBF) * 100}%`,
              backgroundColor: segColors[i] + '55',
            }]} />
          );
        })}
        <View style={[gauge.needle, { left: `${ratio * 100}%` }]} />
      </View>
      <View style={gauge.labels}>
        {['Essential', 'Athlete', 'Fitness', 'Accept.', 'Obese'].map(l => (
          <Text key={l} style={gauge.segLabel}>{l}</Text>
        ))}
      </View>
      <View style={gauge.center}>
        <Text style={[gauge.bfNum, { color: cat.color }]}>
          {bf.toFixed(1)}<Text style={gauge.pct}>%</Text>
        </Text>
        <View style={[gauge.pill, { backgroundColor: cat.color + '22', borderColor: cat.color + '55' }]}>
          <Text style={[gauge.pillText, { color: cat.color }]}>{cat.label}</Text>
        </View>
      </View>
    </View>
  );
}

const gauge = StyleSheet.create({
  wrap:     { gap: 10 },
  track:    { height: 16, flexDirection: 'row', borderRadius: 8, overflow: 'hidden', position: 'relative' },
  seg:      { height: '100%' },
  needle:   { position: 'absolute', top: -4, width: 4, height: 24, backgroundColor: C.white, borderRadius: 2, marginLeft: -2, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 4, elevation: 4 },
  labels:   { flexDirection: 'row', justifyContent: 'space-between' },
  segLabel: { fontSize: 9, color: C.faint, fontWeight: '600' },
  center:   { alignItems: 'center', gap: 8, marginTop: 8 },
  bfNum:    { fontSize: 64, fontWeight: '900', letterSpacing: -2, lineHeight: 70 },
  pct:      { fontSize: 28, fontWeight: '400' },
  pill:     { borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6 },
  pillText: { fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },
});

// ─── Pulsing scanner animation ────────────────────────────────────────────────
function ScanPulse() {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={[scan.pulse, {
      opacity: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 0.15, 0.6] }),
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, 250] }) }],
    }]} />
  );
}

const scan = StyleSheet.create({
  pulse: { position: 'absolute', left: 20, right: 20, height: 3, backgroundColor: C.pink, borderRadius: 2, top: 80 },
});

// ─── Body outline guide ───────────────────────────────────────────────────────
function BodyGuide() {
  return (
    <View style={bod.container} pointerEvents="none">
      <View style={bod.head} />
      <View style={bod.neck} />
      <View style={bod.shoulders} />
      <View style={bod.torso} />
    </View>
  );
}

const bod = StyleSheet.create({
  container:  { position: 'absolute', top: 50, alignSelf: 'center', alignItems: 'center', opacity: 0.45 },
  head:       { width: 48, height: 60, borderRadius: 24, borderWidth: 2, borderColor: C.pink },
  neck:       { width: 20, height: 18, borderLeftWidth: 2, borderRightWidth: 2, borderColor: C.pink },
  shoulders:  { width: 100, height: 14, borderTopLeftRadius: 18, borderTopRightRadius: 18, borderTopWidth: 2, borderLeftWidth: 2, borderRightWidth: 2, borderColor: C.pink },
  torso:      { width: 50, height: 130, borderLeftWidth: 2, borderRightWidth: 2, borderColor: C.pink },
});

// ─── Steps ────────────────────────────────────────────────────────────────────
type Step = 'landing' | 'camera' | 'info' | 'analyzing' | 'results';
type Mode = 'ai' | 'formulas';

export default function BodyScanScreen() {
  const router  = useRouter();
  const camRef  = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [step,      setStep]      = useState<Step>('landing');
  const [mode,      setMode]      = useState<Mode>(HAS_API_KEY ? 'ai' : 'formulas');
  const [facing,    setFacing]    = useState<'front' | 'back'>('front');
  const [photoUri,  setPhotoUri]  = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  // User info
  const [sex,    setSex]    = useState<Sex>('male');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [age,    setAge]    = useState('');
  const [neck,   setNeck]   = useState('');
  const [waist,  setWaist]  = useState('');
  const [hip,    setHip]    = useState('');

  // Results
  const [aiResult,      setAiResult]      = useState<AIAnalysisResult | null>(null);
  const [formulaResult, setFormulaResult] = useState<FormulaResult | null>(null);
  const [error,         setError]         = useState<string | null>(null);

  // BF% history from Supabase
  const [bfHistory, setBfHistory] = useState<HealthLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try { setBfHistory(await fetchBodyFatHistory()); } catch {}
    setHistoryLoading(false);
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // Take photo
  const takePicture = useCallback(async () => {
    if (!camRef.current || capturing) return;
    setCapturing(true);
    try {
      const photo = await camRef.current.takePictureAsync({ quality: 0.8 });
      setPhotoUri(photo?.uri ?? null);
      setStep('info');
    } catch {
      Alert.alert('Error', 'Could not capture photo.');
    } finally {
      setCapturing(false);
    }
  }, [capturing]);

  // Run analysis
  async function runAnalysis() {
    setError(null);

    if (mode === 'ai') {
      // AI mode — just needs sex + optional context
      setStep('analyzing');
      try {
        const result = await analyzeWithClaude(
          photoUri!,
          sex,
          height ? parseFloat(height) : undefined,
          weight ? parseFloat(weight) : undefined,
          age ? parseInt(age) : undefined,
        );
        setAiResult(result);

        // Also run formulas if we have the data
        if (height && weight && age) {
          const fr = formulaEnsemble(
            sex, parseFloat(height), parseFloat(weight), parseInt(age),
            neck ? parseFloat(neck) : undefined,
            waist ? parseFloat(waist) : undefined,
            hip ? parseFloat(hip) : undefined,
          );
          setFormulaResult(fr);
        }

        setStep('results');
        // Save to Supabase
        const todayStr = new Date().toISOString().split('T')[0];
        saveBodyFat(todayStr, result.bfPercentage, `AI scan: ${result.bfRange} (${result.confidence})`).then(() => loadHistory()).catch(() => {});
      } catch (e: any) {
        setError(e?.message ?? 'AI analysis failed');
        setStep('info');
      }
    } else {
      // Formula mode — needs measurements
      const h = parseFloat(height);
      const w = parseFloat(weight);
      const a = parseInt(age);

      if (!h || !w || !a) {
        Alert.alert('Required', 'Height, weight, and age are needed for formula-based analysis.');
        return;
      }

      setStep('analyzing');
      // Fake brief delay for UX
      await new Promise(r => setTimeout(r, 800));

      const fr = formulaEnsemble(
        sex, h, w, a,
        neck ? parseFloat(neck) : undefined,
        waist ? parseFloat(waist) : undefined,
        hip ? parseFloat(hip) : undefined,
      );
      setFormulaResult(fr);
      setStep('results');
      // Save to Supabase
      const todayStr = new Date().toISOString().split('T')[0];
      saveBodyFat(todayStr, fr.average, `Formula ensemble: Navy=${fr.navy ?? 'N/A'}%, RFM=${fr.rfm ?? 'N/A'}%, CUN-BAE=${fr.cunbae}%, BMI=${fr.bmi}%`).then(() => loadHistory()).catch(() => {});
    }
  }

  function reset() {
    setStep('landing');
    setPhotoUri(null);
    setAiResult(null);
    setFormulaResult(null);
    setError(null);
  }

  // ── LANDING ─────────────────────────────────────────────────────────────────
  if (step === 'landing') {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Body Scan</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={l.content} showsVerticalScrollIndicator={false}>

          <View style={l.hero}>
            <Text style={l.heroEmoji}>🔬</Text>
            <Text style={l.heroTitle}>AI Body Composition{'\n'}Analysis</Text>
            <Text style={l.heroSub}>
              {HAS_API_KEY
                ? 'Powered by Claude Vision — take a photo and get an instant AI body fat analysis.'
                : 'Uses an ensemble of 4 clinical formulas for accurate body fat estimation.'
              }
            </Text>
          </View>

          {/* Mode selector */}
          <Text style={l.sectionLabel}>ANALYSIS METHOD</Text>
          <View style={l.modeRow}>
            <TouchableOpacity
              style={[l.modeCard, mode === 'ai' && l.modeCardActive, !HAS_API_KEY && l.modeCardDisabled]}
              onPress={() => HAS_API_KEY && setMode('ai')}
              activeOpacity={HAS_API_KEY ? 0.7 : 1}
            >
              <Text style={l.modeEmoji}>✦</Text>
              <Text style={[l.modeTitle, mode === 'ai' && { color: C.claude }]}>Claude Vision</Text>
              <Text style={l.modeDesc}>AI analyses your{'\n'}photo directly</Text>
              {!HAS_API_KEY && (
                <View style={l.modeNote}>
                  <Text style={l.modeNoteText}>Set ANTHROPIC_API_KEY</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[l.modeCard, mode === 'formulas' && l.modeCardActive]}
              onPress={() => setMode('formulas')}
              activeOpacity={0.7}
            >
              <Text style={l.modeEmoji}>📐</Text>
              <Text style={[l.modeTitle, mode === 'formulas' && { color: C.pink }]}>Formula Ensemble</Text>
              <Text style={l.modeDesc}>Navy + RFM + CUN-BAE{'\n'}+ BMI formulas</Text>
            </TouchableOpacity>
          </View>

          {/* How it works */}
          <Text style={l.sectionLabel}>HOW IT WORKS</Text>
          {mode === 'ai' ? (
            <View style={l.howCard}>
              {[
                { n: '1', text: 'Take a front-facing photo — good lighting, minimal clothing', color: C.pink },
                { n: '2', text: 'Optionally enter height / weight / age for better accuracy', color: C.rhr },
                { n: '3', text: 'Claude Vision analyses muscle definition, fat distribution, and proportions', color: C.claude },
                { n: '4', text: 'Get your BF%, body comp category, and personalised recommendations', color: C.resp },
              ].map(item => (
                <View key={item.n} style={l.howStep}>
                  <View style={[l.howDot, { backgroundColor: item.color }]}>
                    <Text style={l.howDotText}>{item.n}</Text>
                  </View>
                  <Text style={l.howText}>{item.text}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={l.howCard}>
              {[
                { n: '1', text: 'Take a reference photo and enter your measurements', color: C.pink },
                { n: '2', text: 'Height, weight, and age are required; neck/waist/hip improve accuracy', color: C.rhr },
                { n: '3', text: 'Four formulas are run simultaneously and cross-referenced', color: C.hrv },
                { n: '4', text: 'Get averaged BF% with per-formula breakdown and confidence', color: C.resp },
              ].map(item => (
                <View key={item.n} style={l.howStep}>
                  <View style={[l.howDot, { backgroundColor: item.color }]}>
                    <Text style={l.howDotText}>{item.n}</Text>
                  </View>
                  <Text style={l.howText}>{item.text}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Formula info */}
          <View style={l.infoCard}>
            <Text style={l.infoTitle}>Formulas used</Text>
            {[
              { name: 'U.S. Navy (1984)',      desc: 'Neck + waist + height → BF%' },
              { name: 'RFM — Woolcott (2018)', desc: 'Height + waist only — simpler, comparable to DEXA' },
              { name: 'CUN-BAE (2012)',         desc: 'BMI + age + sex — validated on 6,500 subjects' },
              { name: 'Deurenberg (1991)',      desc: 'BMI + age + sex — classic epidemiological formula' },
            ].map(f => (
              <View key={f.name} style={l.formulaRow}>
                <Text style={l.formulaName}>{f.name}</Text>
                <Text style={l.formulaDesc}>{f.desc}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={l.startBtn} onPress={async () => {
            if (!permission?.granted) {
              const res = await requestPermission();
              if (!res.granted) {
                Alert.alert('Camera required', 'Please allow camera access to use Body Scan.');
                return;
              }
            }
            setStep('camera');
          }} activeOpacity={0.85}>
            <Text style={l.startBtnText}>Open Camera</Text>
          </TouchableOpacity>

          {/* Past scans */}
          {bfHistory.length > 0 && (
            <>
              <Text style={[l.sectionLabel, { marginTop: 24 }]}>PAST SCANS</Text>
              <View style={l.pastCard}>
                {bfHistory.slice(0, 5).map(h => {
                  const bf = h.body_fat_pct ?? 0;
                  const hCat = getCategory(bf, sex);
                  const d = new Date(h.log_date + 'T00:00:00');
                  return (
                    <View key={h.id} style={l.pastRow}>
                      <Text style={l.pastDate}>{d.toLocaleDateString('en-IE', { month: 'short', day: 'numeric' })}</Text>
                      <View style={{ flex: 1 }} />
                      <Text style={[l.pastBf, { color: hCat.color }]}>{bf.toFixed(1)}%</Text>
                      <View style={[l.pastPill, { backgroundColor: hCat.color + '22' }]}>
                        <Text style={[l.pastPillText, { color: hCat.color }]}>{hCat.label}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── CAMERA ──────────────────────────────────────────────────────────────────
  if (step === 'camera') {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <StatusBar barStyle="light-content" />
        <CameraView ref={camRef} style={StyleSheet.absoluteFill} facing={facing} mode="picture" />
        <SafeAreaView style={cam.overlay} edges={['top', 'bottom']}>
          <View style={cam.topBar}>
            <TouchableOpacity onPress={() => setStep('landing')} style={cam.btn}>
              <Text style={cam.btnText}>✕</Text>
            </TouchableOpacity>
            <Text style={cam.instruction}>Face camera · arms relaxed · good lighting</Text>
            <TouchableOpacity onPress={() => setFacing(f => f === 'front' ? 'back' : 'front')} style={cam.btn}>
              <Text style={cam.btnText}>⟳</Text>
            </TouchableOpacity>
          </View>

          <BodyGuide />

          {/* Sex selector */}
          <View style={cam.sexRow}>
            {(['male', 'female'] as const).map(opt => (
              <TouchableOpacity
                key={opt}
                style={[cam.sexBtn, sex === opt && cam.sexActive]}
                onPress={() => setSex(opt)}
              >
                <Text style={[cam.sexText, sex === opt && { color: C.pink }]}>
                  {opt === 'male' ? '♂ Male' : '♀ Female'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={cam.shutterRow}>
            <TouchableOpacity
              style={[cam.shutter, capturing && { opacity: 0.4 }]}
              onPress={takePicture}
              disabled={capturing}
              activeOpacity={0.8}
            >
              <View style={cam.shutterInner} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ── INFO / MEASUREMENTS ─────────────────────────────────────────────────────
  if (step === 'info') {
    const isAI = mode === 'ai';
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <View style={s.header}>
          <TouchableOpacity onPress={() => setStep('camera')} style={s.backBtn}>
            <Text style={s.backArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>{isAI ? 'Scan Details' : 'Measurements'}</Text>
          <View style={{ width: 40 }} />
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={inf.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            {/* Photo preview */}
            {photoUri && (
              <View style={inf.photoRow}>
                <Image source={{ uri: photoUri }} style={inf.photo} resizeMode="cover" />
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={[inf.methodPill, { backgroundColor: isAI ? C.claudeDim : C.pinkDim, borderColor: isAI ? C.claude + '55' : C.pink + '55' }]}>
                    <Text style={{ color: isAI ? C.claude : C.pink, fontSize: 11, fontWeight: '800' }}>
                      {isAI ? '✦ CLAUDE VISION' : '📐 FORMULA ENSEMBLE'}
                    </Text>
                  </View>
                  <Text style={inf.photoHint}>
                    {isAI
                      ? 'Claude will visually analyse this photo. Add details below for better accuracy.'
                      : 'Enter your body measurements to run the formula ensemble.'
                    }
                  </Text>
                </View>
              </View>
            )}

            {error && (
              <View style={inf.errorCard}>
                <Text style={inf.errorTitle}>Analysis failed</Text>
                <Text style={inf.errorBody}>{error}</Text>
              </View>
            )}

            {/* Sex */}
            <Text style={inf.label}>BIOLOGICAL SEX</Text>
            <View style={inf.sexRow}>
              {(['male', 'female'] as const).map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={[inf.sexBtn, sex === opt && { backgroundColor: C.pink + '22', borderColor: C.pink }]}
                  onPress={() => setSex(opt)}
                >
                  <Text style={inf.sexEmoji}>{opt === 'male' ? '♂' : '♀'}</Text>
                  <Text style={[inf.sexLabel, sex === opt && { color: C.pink }]}>
                    {opt === 'male' ? 'Male' : 'Female'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Basic info */}
            <Text style={[inf.label, { marginTop: 20 }]}>
              {isAI ? 'BODY INFO (OPTIONAL — IMPROVES ACCURACY)' : 'BODY INFO (REQUIRED)'}
            </Text>
            <View style={inf.row3}>
              <Field label="Height" value={height} onChange={setHeight} unit="cm" placeholder="175" color={C.pink} />
              <Field label="Weight" value={weight} onChange={setWeight} unit="kg" placeholder="75" color={C.resp} />
              <Field label="Age" value={age} onChange={setAge} unit="yrs" placeholder="28" color={C.o2} />
            </View>

            {/* Measurements (optional for AI, used for formula enrichment) */}
            <Text style={[inf.label, { marginTop: 20 }]}>
              {isAI ? 'TAPE MEASUREMENTS (OPTIONAL)' : 'TAPE MEASUREMENTS (FOR NAVY + RFM FORMULAS)'}
            </Text>
            <View style={inf.row3}>
              <Field label="Neck" value={neck} onChange={setNeck} unit="cm" placeholder="38" color={C.o2} />
              <Field label="Waist" value={waist} onChange={setWaist} unit="cm" placeholder="82" color={C.rhr} />
              {sex === 'female' && (
                <Field label="Hip" value={hip} onChange={setHip} unit="cm" placeholder="96" color={C.hrv} />
              )}
            </View>

            {/* BMI preview */}
            {height && weight && (
              <View style={inf.bmiCard}>
                <Text style={inf.bmiLabel}>BMI</Text>
                <Text style={inf.bmiVal}>
                  {calcBMI(parseFloat(weight), parseFloat(height)).toFixed(1)}
                </Text>
              </View>
            )}

            {/* Run */}
            <TouchableOpacity style={inf.runBtn} onPress={runAnalysis} activeOpacity={0.85}>
              <Text style={inf.runBtnText}>
                {isAI ? '✦  Analyse with Claude' : '📐  Run Formula Ensemble'}
              </Text>
            </TouchableOpacity>

            {isAI && (
              <Text style={inf.disclaimer}>
                Your photo is sent to Anthropic's Claude API for analysis. The image is not stored after processing.
              </Text>
            )}

            <View style={{ height: 60 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── ANALYZING ───────────────────────────────────────────────────────────────
  if (step === 'analyzing') {
    return (
      <SafeAreaView style={[s.safe, { alignItems: 'center', justifyContent: 'center' }]} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        {photoUri && (
          <Image source={{ uri: photoUri }} style={[StyleSheet.absoluteFill, { opacity: 0.15 }]} resizeMode="cover" blurRadius={20} />
        )}
        <ScanPulse />
        <View style={ana.box}>
          <ActivityIndicator size="large" color={mode === 'ai' ? C.claude : C.pink} />
          <Text style={ana.title}>
            {mode === 'ai' ? 'Claude is analysing your photo…' : 'Running formula ensemble…'}
          </Text>
          <Text style={ana.sub}>
            {mode === 'ai'
              ? 'Assessing muscle definition, fat distribution, and body proportions.'
              : 'Navy · RFM · CUN-BAE · Deurenberg'
            }
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── RESULTS ─────────────────────────────────────────────────────────────────
  if (step === 'results') {
    const hasAI      = aiResult !== null;
    const hasFormula  = formulaResult !== null;
    const primaryBF   = hasAI ? aiResult.bfPercentage : formulaResult?.average ?? 0;
    const primaryCat  = getCategory(primaryBF, sex);

    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <View style={s.header}>
          <TouchableOpacity onPress={() => setStep('info')} style={s.backBtn}>
            <Text style={s.backArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Results</Text>
          <TouchableOpacity onPress={reset}>
            <Text style={{ color: C.pink, fontSize: 14, fontWeight: '700' }}>New Scan</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={r.content} showsVerticalScrollIndicator={false}>

          {/* Photo */}
          {photoUri && (
            <Image source={{ uri: photoUri }} style={r.photo} resizeMode="cover" />
          )}

          {/* Method badge */}
          <View style={[r.methodBadge, { backgroundColor: hasAI ? C.claudeDim : C.pinkDim, borderColor: hasAI ? C.claude + '55' : C.pink + '55' }]}>
            <Text style={{ color: hasAI ? C.claude : C.pink, fontSize: 12, fontWeight: '800' }}>
              {hasAI ? '✦ CLAUDE VISION ANALYSIS' : '📐 FORMULA ENSEMBLE (4 MODELS)'}
            </Text>
          </View>

          {/* Gauge */}
          <View style={r.gaugeCard}>
            <BFGauge bf={primaryBF} sex={sex} />
          </View>

          {/* AI confidence + range */}
          {hasAI && (
            <View style={r.aiCard}>
              <View style={r.aiRow}>
                <Text style={r.aiLabel}>AI Range</Text>
                <Text style={[r.aiVal, { color: C.claude }]}>{aiResult.bfRange}</Text>
              </View>
              <View style={r.aiRow}>
                <Text style={r.aiLabel}>Confidence</Text>
                <View style={[r.confPill, {
                  backgroundColor: aiResult.confidence === 'high' ? C.resp + '22' : aiResult.confidence === 'medium' ? C.rhr + '22' : C.heart + '22',
                  borderColor: aiResult.confidence === 'high' ? C.resp + '55' : aiResult.confidence === 'medium' ? C.rhr + '55' : C.heart + '55',
                }]}>
                  <Text style={[r.confText, {
                    color: aiResult.confidence === 'high' ? C.resp : aiResult.confidence === 'medium' ? C.rhr : C.heart,
                  }]}>{aiResult.confidence.toUpperCase()}</Text>
                </View>
              </View>
              <View style={r.aiDivider} />
              <View style={r.aiRow}>
                <Text style={r.aiLabel}>Muscle def.</Text>
                <Text style={r.aiDetail}>{aiResult.muscleDef}</Text>
              </View>
              <View style={r.aiRow}>
                <Text style={r.aiLabel}>Fat distribution</Text>
                <Text style={r.aiDetail}>{aiResult.fatDistribution}</Text>
              </View>
            </View>
          )}

          {/* AI observations */}
          {hasAI && aiResult.observations.length > 0 && (
            <>
              <Text style={r.sectionLabel}>AI OBSERVATIONS</Text>
              {aiResult.observations.map((obs, i) => (
                <View key={i} style={r.obsRow}>
                  <View style={[r.obsDot, { backgroundColor: C.claude }]} />
                  <Text style={r.obsText}>{obs}</Text>
                </View>
              ))}
            </>
          )}

          {/* Body composition split */}
          <View style={r.splitCard}>
            <Text style={r.splitTitle}>BODY COMPOSITION</Text>
            <View style={r.splitBar}>
              <View style={[r.splitFat,  { flex: primaryBF }]} />
              <View style={[r.splitLean, { flex: 100 - primaryBF }]} />
            </View>
            <View style={r.splitLegend}>
              <View style={r.legendItem}>
                <View style={[r.legendDot, { backgroundColor: primaryCat.color }]} />
                <Text style={r.legendText}>Body Fat  <Text style={{ color: primaryCat.color, fontWeight: '700' }}>{primaryBF.toFixed(1)}%</Text></Text>
              </View>
              <View style={r.legendItem}>
                <View style={[r.legendDot, { backgroundColor: C.resp }]} />
                <Text style={r.legendText}>Lean Mass  <Text style={{ color: C.resp, fontWeight: '700' }}>{(100 - primaryBF).toFixed(1)}%</Text></Text>
              </View>
            </View>
          </View>

          {/* Formula breakdown (if available) */}
          {hasFormula && (
            <>
              <Text style={r.sectionLabel}>FORMULA BREAKDOWN</Text>
              <View style={r.formulaCard}>
                {[
                  { name: 'U.S. Navy (1984)',      val: formulaResult.navy,   color: C.o2 },
                  { name: 'RFM — Woolcott (2018)', val: formulaResult.rfm,    color: C.hrv },
                  { name: 'CUN-BAE (2012)',         val: formulaResult.cunbae, color: C.rhr },
                  { name: 'Deurenberg (1991)',      val: formulaResult.bmi,    color: C.pink },
                ].map(f => (
                  <View key={f.name} style={r.fRow}>
                    <Text style={r.fName}>{f.name}</Text>
                    <Text style={[r.fVal, { color: f.val !== null ? f.color : C.faint }]}>
                      {f.val !== null ? `${f.val}%` : 'N/A'}
                    </Text>
                  </View>
                ))}
                <View style={r.fDivider} />
                <View style={r.fRow}>
                  <Text style={[r.fName, { color: C.white, fontWeight: '700' }]}>Ensemble Average</Text>
                  <Text style={[r.fVal, { color: C.white, fontWeight: '900', fontSize: 18 }]}>{formulaResult.average}%</Text>
                </View>
              </View>
            </>
          )}

          {/* Category + description */}
          <View style={[r.catCard, { borderColor: primaryCat.color + '40', backgroundColor: primaryCat.color + '0C' }]}>
            <Text style={[r.catTitle, { color: primaryCat.color }]}>{primaryCat.label}</Text>
            <Text style={r.catDesc}>{primaryCat.desc}</Text>
          </View>

          {/* Recommendations */}
          <Text style={r.sectionLabel}>RECOMMENDATIONS</Text>
          {(hasAI ? aiResult.recommendations : primaryCat.tips).map((tip, i) => (
            <View key={i} style={r.tipRow}>
              <View style={[r.tipDot, { backgroundColor: primaryCat.color }]} />
              <Text style={r.tipText}>{tip}</Text>
            </View>
          ))}

          {/* Reference ranges */}
          <View style={r.rangesCard}>
            <Text style={r.rangesTitle}>REFERENCE RANGES  ·  {sex === 'male' ? '♂ Male' : '♀ Female'}</Text>
            {(sex === 'male'
              ? [ ['Essential fat', '2–5%', C.o2], ['Athlete', '6–13%', C.resp], ['Fitness', '14–17%', '#86EFAC'], ['Acceptable', '18–24%', C.rhr], ['Obese', '25%+', C.heart] ]
              : [ ['Essential fat', '10–13%', C.o2], ['Athlete', '14–20%', C.resp], ['Fitness', '21–24%', '#86EFAC'], ['Acceptable', '25–31%', C.rhr], ['Obese', '32%+', C.heart] ]
            ).map(([label, range, color]) => (
              <View key={label} style={r.rangeRow}>
                <View style={[r.rangeInd, { backgroundColor: color + '22', borderColor: color + '55' }]}>
                  <Text style={[r.rangeLabel, { color: color as string }]}>{label}</Text>
                </View>
                <Text style={[r.rangeVal, { color: color as string }]}>{range}</Text>
              </View>
            ))}
          </View>

          {/* ── BF% History from Supabase ── */}
          {bfHistory.length > 0 && (
            <>
              <Text style={r.sectionLabel}>BODY FAT HISTORY</Text>
              <View style={r.historyCard}>
                {/* Mini trend bars */}
                <View style={r.histBars}>
                  {bfHistory.slice(0, 10).reverse().map(h => {
                    const bf = h.body_fat_pct ?? 0;
                    const maxBf = Math.max(...bfHistory.slice(0, 10).map(x => x.body_fat_pct ?? 0), 1);
                    const ratio = bf / (maxBf * 1.2);
                    const hCat = getCategory(bf, sex);
                    return (
                      <View key={h.id} style={r.histBarWrap}>
                        <View style={r.histBarTrack}>
                          <View style={[r.histBarFill, { height: `${ratio * 100}%`, backgroundColor: hCat.color }]} />
                        </View>
                        <Text style={r.histBarVal}>{bf.toFixed(0)}</Text>
                      </View>
                    );
                  })}
                </View>

                {/* List */}
                {bfHistory.slice(0, 10).map(h => {
                  const bf = h.body_fat_pct ?? 0;
                  const hCat = getCategory(bf, sex);
                  const d = new Date(h.log_date + 'T00:00:00');
                  return (
                    <View key={h.id} style={r.histRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={r.histDate}>{d.toLocaleDateString('en-IE', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                        {h.notes ? <Text style={r.histNotes} numberOfLines={1}>{h.notes}</Text> : null}
                      </View>
                      <Text style={[r.histBf, { color: hCat.color }]}>{bf.toFixed(1)}%</Text>
                      <TouchableOpacity
                        style={r.histDel}
                        onPress={() => {
                          Alert.alert('Delete', 'Remove this scan entry?', [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Delete', style: 'destructive', onPress: async () => {
                              try { await deleteHealthLog(h.id); await loadHistory(); } catch {}
                            }},
                          ]);
                        }}
                      >
                        <Text style={r.histDelText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </>
          )}

          <TouchableOpacity style={r.newBtn} onPress={reset} activeOpacity={0.85}>
            <Text style={r.newBtnText}>Start New Scan</Text>
          </TouchableOpacity>

          <Text style={r.disclaimer}>
            {hasAI
              ? 'AI-based estimate — accuracy varies with photo quality, lighting, and pose. Not a substitute for DEXA or clinical assessment.'
              : 'Formula-based estimate — accuracy ±3–5% depending on measurement precision. Not a substitute for clinical assessment.'
            }
          </Text>
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return null;
}

// ─── Shared field component ───────────────────────────────────────────────────
function Field({ label, value, onChange, unit, placeholder, color = C.pink }: {
  label: string; value: string; onChange: (v: string) => void;
  unit: string; placeholder: string; color?: string;
}) {
  return (
    <View style={f.wrap}>
      <Text style={[f.label, { color }]}>{label}</Text>
      <View style={f.inputRow}>
        <TextInput
          style={f.input}
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          placeholder={placeholder}
          placeholderTextColor={C.faint}
        />
        <Text style={f.unit}>{unit}</Text>
      </View>
    </View>
  );
}
const f = StyleSheet.create({
  wrap:     { flex: 1, gap: 6 },
  label:    { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.input, borderRadius: 10, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 10 },
  input:    { flex: 1, color: C.white, fontSize: 18, fontWeight: '700' },
  unit:     { fontSize: 12, color: C.muted },
});

// ─── Shared styles ────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: C.bg },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  backBtn:     { width: 40, height: 40, justifyContent: 'center' },
  backArrow:   { fontSize: 32, color: C.white, lineHeight: 40 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: C.white },
});

// ─── Landing ──────────────────────────────────────────────────────────────────
const l = StyleSheet.create({
  content:   { paddingHorizontal: 16, paddingTop: 8 },
  hero:      { alignItems: 'center', paddingVertical: 24, gap: 10 },
  heroEmoji: { fontSize: 52 },
  heroTitle: { fontSize: 26, fontWeight: '900', color: C.white, textAlign: 'center', letterSpacing: -0.5 },
  heroSub:   { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 21, paddingHorizontal: 8 },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: C.muted, letterSpacing: 1, marginBottom: 10, marginTop: 20 },

  modeRow:  { flexDirection: 'row', gap: 10 },
  modeCard: { flex: 1, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16, alignItems: 'center', gap: 6 },
  modeCardActive:  { borderColor: C.pink + '88', backgroundColor: C.pink + '0A' },
  modeCardDisabled:{ opacity: 0.5 },
  modeEmoji: { fontSize: 24 },
  modeTitle: { fontSize: 14, fontWeight: '800', color: C.muted, textAlign: 'center' },
  modeDesc:  { fontSize: 12, color: C.faint, textAlign: 'center', lineHeight: 17 },
  modeNote:  { backgroundColor: C.rhr + '22', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4 },
  modeNoteText: { fontSize: 9, color: C.rhr, fontWeight: '700' },

  howCard:   { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16, gap: 14 },
  howStep:   { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  howDot:    { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  howDotText:{ color: '#000', fontSize: 12, fontWeight: '900' },
  howText:   { flex: 1, fontSize: 13, color: C.muted, lineHeight: 19 },

  infoCard:    { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 14, marginTop: 16, gap: 10 },
  infoTitle:   { fontSize: 13, fontWeight: '800', color: C.white, marginBottom: 4 },
  formulaRow:  { gap: 2 },
  formulaName: { fontSize: 13, fontWeight: '700', color: C.hrv },
  formulaDesc: { fontSize: 12, color: C.faint },

  startBtn:    { backgroundColor: C.pink, borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginTop: 20 },
  startBtnText:{ color: '#000', fontSize: 17, fontWeight: '900' },

  pastCard:    { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  pastRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border, gap: 10 },
  pastDate:    { fontSize: 14, color: C.muted, fontWeight: '500', width: 55 },
  pastBf:      { fontSize: 18, fontWeight: '800' },
  pastPill:    { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  pastPillText:{ fontSize: 11, fontWeight: '700' },
});

// ─── Camera ───────────────────────────────────────────────────────────────────
const cam = StyleSheet.create({
  overlay:     { flex: 1, justifyContent: 'space-between' },
  topBar:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8 },
  instruction: { color: C.white, fontSize: 13, fontWeight: '600', textShadowColor: '#000', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
  btn:         { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  btnText:     { color: C.white, fontSize: 20, fontWeight: '700' },
  sexRow:      { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingHorizontal: 40 },
  sexBtn:      { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  sexActive:   { backgroundColor: 'rgba(244,114,182,0.3)', borderColor: C.pink },
  sexText:     { color: C.white, fontSize: 15, fontWeight: '700' },
  shutterRow:  { alignItems: 'center', paddingBottom: 20 },
  shutter:     { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.25)', borderWidth: 4, borderColor: C.white, alignItems: 'center', justifyContent: 'center' },
  shutterInner:{ width: 60, height: 60, borderRadius: 30, backgroundColor: C.white },
});

// ─── Info / measurements ──────────────────────────────────────────────────────
const inf = StyleSheet.create({
  content:    { paddingHorizontal: 16, paddingTop: 12 },
  photoRow:   { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 12, marginBottom: 16 },
  photo:      { width: 64, height: 80, borderRadius: 10 },
  methodPill: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  photoHint:  { fontSize: 12, color: C.muted, lineHeight: 17 },

  errorCard:  { backgroundColor: C.heart + '12', borderWidth: 1, borderColor: C.heart + '40', borderRadius: 12, padding: 12, marginBottom: 12, gap: 4 },
  errorTitle: { fontSize: 13, fontWeight: '700', color: C.heart },
  errorBody:  { fontSize: 12, color: C.muted, lineHeight: 17 },

  label:      { fontSize: 11, fontWeight: '700', color: C.muted, letterSpacing: 1, marginBottom: 10 },
  sexRow:     { flexDirection: 'row', gap: 12 },
  sexBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  sexEmoji:   { fontSize: 22 },
  sexLabel:   { fontSize: 16, fontWeight: '700', color: C.muted },
  row3:       { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },

  bmiCard:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14, marginTop: 16 },
  bmiLabel:   { fontSize: 14, color: C.muted, fontWeight: '600' },
  bmiVal:     { fontSize: 22, fontWeight: '900', color: C.white },

  runBtn:     { backgroundColor: C.pink, borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginTop: 20 },
  runBtnText: { color: '#000', fontSize: 17, fontWeight: '900' },

  disclaimer: { fontSize: 11, color: C.faint, textAlign: 'center', marginTop: 14, lineHeight: 17, paddingHorizontal: 20 },
});

// ─── Analyzing ────────────────────────────────────────────────────────────────
const ana = StyleSheet.create({
  box:   { alignItems: 'center', gap: 16, paddingHorizontal: 32 },
  title: { fontSize: 18, fontWeight: '800', color: C.white, textAlign: 'center' },
  sub:   { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 20 },
});

// ─── Results ──────────────────────────────────────────────────────────────────
const r = StyleSheet.create({
  content:      { paddingHorizontal: 16, paddingTop: 8 },
  photo:        { width: W - 32, height: 200, borderRadius: 16, alignSelf: 'center', marginBottom: 12 },
  methodBadge:  { alignSelf: 'center', borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 14 },
  gaugeCard:    { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 20, marginBottom: 14 },

  aiCard:    { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.claude + '30', paddingHorizontal: 16, marginBottom: 14 },
  aiRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.border },
  aiLabel:   { fontSize: 13, color: C.muted },
  aiVal:     { fontSize: 16, fontWeight: '800' },
  aiDetail:  { fontSize: 13, color: C.white, fontWeight: '500', flex: 1, textAlign: 'right', marginLeft: 12 },
  aiDivider: { height: 1, backgroundColor: C.claude + '30', marginVertical: 2 },
  confPill:  { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  confText:  { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: C.muted, letterSpacing: 1, marginBottom: 10, marginTop: 6 },

  obsRow:  { flexDirection: 'row', gap: 10, marginBottom: 8, alignItems: 'flex-start' },
  obsDot:  { width: 7, height: 7, borderRadius: 3.5, marginTop: 6 },
  obsText: { flex: 1, fontSize: 14, color: C.white, lineHeight: 20 },

  splitCard:  { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 14 },
  splitTitle: { fontSize: 11, fontWeight: '700', color: C.muted, letterSpacing: 1, marginBottom: 10 },
  splitBar:   { height: 16, borderRadius: 8, flexDirection: 'row', overflow: 'hidden', marginBottom: 10 },
  splitFat:   { backgroundColor: C.heart + '99' },
  splitLean:  { backgroundColor: C.resp + '99' },
  splitLegend:{ flexDirection: 'row', gap: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:  { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 13, color: C.muted },

  formulaCard: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, paddingHorizontal: 16, marginBottom: 14 },
  fRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.border },
  fName:       { fontSize: 13, color: C.muted },
  fVal:        { fontSize: 15, fontWeight: '800' },
  fDivider:    { height: 1, backgroundColor: C.pink + '30', marginVertical: 2 },

  catCard:  { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 16, gap: 6 },
  catTitle: { fontSize: 17, fontWeight: '800' },
  catDesc:  { fontSize: 14, color: C.muted, lineHeight: 20 },

  tipRow:  { flexDirection: 'row', gap: 10, marginBottom: 10, alignItems: 'flex-start' },
  tipDot:  { width: 7, height: 7, borderRadius: 3.5, marginTop: 6 },
  tipText: { flex: 1, fontSize: 14, color: C.white, lineHeight: 21 },

  rangesCard:  { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16, marginTop: 6, marginBottom: 16 },
  rangesTitle: { fontSize: 11, fontWeight: '700', color: C.muted, letterSpacing: 1, marginBottom: 12 },
  rangeRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  rangeInd:    { borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 4 },
  rangeLabel:  { fontSize: 12, fontWeight: '700' },
  rangeVal:    { fontSize: 14, fontWeight: '800' },

  newBtn:     { backgroundColor: C.pink, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginBottom: 14 },
  newBtnText: { color: '#000', fontSize: 16, fontWeight: '900' },
  disclaimer: { fontSize: 11, color: C.faint, textAlign: 'center', lineHeight: 17, paddingHorizontal: 10 },

  // History
  historyCard:  { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 14 },
  histBars:     { flexDirection: 'row', alignItems: 'flex-end', height: 60, gap: 4, marginBottom: 14 },
  histBarWrap:  { flex: 1, alignItems: 'center', height: '100%', gap: 3 },
  histBarTrack: { flex: 1, width: '65%', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, justifyContent: 'flex-end', overflow: 'hidden' },
  histBarFill:  { borderRadius: 3, minHeight: 3 },
  histBarVal:   { fontSize: 9, color: C.faint, fontWeight: '600' },
  histRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.border, gap: 10 },
  histDate:     { fontSize: 13, fontWeight: '600', color: C.white },
  histNotes:    { fontSize: 11, color: C.faint, marginTop: 2 },
  histBf:       { fontSize: 18, fontWeight: '800' },
  histDel:      { padding: 6 },
  histDelText:  { fontSize: 14, color: C.faint },
});
