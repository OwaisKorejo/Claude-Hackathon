// ─── Shared in-session data store ────────────────────────────────────────────
// Persists data during the app session. Swap in AsyncStorage for persistence.

export type MoodLevel = 1 | 2 | 3 | 4 | 5;

export interface JournalEntry {
  id: string;
  date: string;          // YYYY-MM-DD
  mood: MoodLevel;
  energy: MoodLevel;
  meals: string[];
  notes: string;
  createdAt: string;     // ISO datetime
}

export interface UserHealthEntry {
  id: string;
  date: string;
  hrMin?: number | null;
  hrMax?: number | null;
  hrAvg?: number | null;
  hrv?: number | null;
  o2?: number | null;
  respRate?: number | null;
  rhr?: number | null;
  steps?: number | null;
  sleepHours?: number | null;
  sleepDeep?: number | null;
  sleepRem?: number | null;
  sleepLight?: number | null;
  notes?: string;
}

export interface Goal {
  id: string;
  label: string;
  active: boolean;
  custom?: boolean;
}

export interface UserProfile {
  name: string;
  age: string;
  height: string;
  weight: string;
  sex: 'male' | 'female' | 'other' | '';
  targetHRV: string;
  targetRHR: string;
  targetSteps: string;
  conditions: string[];
}

// ─── Default data ─────────────────────────────────────────────────────────────
const DEFAULT_GOALS: Goal[] = [
  { id: 'g1', label: 'Improve HRV',          active: true },
  { id: 'g2', label: 'Lower resting HR',     active: true },
  { id: 'g3', label: 'Better sleep quality', active: false },
  { id: 'g4', label: 'Run 5K',               active: false },
  { id: 'g5', label: 'Reduce stress',        active: true },
  { id: 'g6', label: 'Improve O₂ sat',       active: false },
  { id: 'g7', label: 'Lose weight',          active: false },
  { id: 'g8', label: 'Build muscle',         active: false },
];

const DEFAULT_PROFILE: UserProfile = {
  name: '',
  age: '',
  height: '',
  weight: '',
  sex: '',
  targetHRV: '50',
  targetRHR: '52',
  targetSteps: '8000',
  conditions: [],
};

// ─── Mutable store ────────────────────────────────────────────────────────────
let journalEntries: JournalEntry[] = [];
let userHealthEntries: UserHealthEntry[] = [];
let goals: Goal[] = DEFAULT_GOALS.map(g => ({ ...g }));
let profile: UserProfile = { ...DEFAULT_PROFILE };
let listeners: (() => void)[] = [];

function notify() {
  listeners.forEach(fn => fn());
}

export const store = {
  // ── Subscriptions ──
  subscribe(fn: () => void) {
    listeners.push(fn);
    return () => { listeners = listeners.filter(l => l !== fn); };
  },

  // ── Journal ──
  getJournal: () => [...journalEntries].sort((a, b) => b.date.localeCompare(a.date)),
  addJournalEntry(entry: Omit<JournalEntry, 'id' | 'createdAt'>) {
    const id = `j-${Date.now()}`;
    journalEntries = [{ ...entry, id, createdAt: new Date().toISOString() }, ...journalEntries];
    notify();
    return id;
  },
  updateJournalEntry(id: string, updates: Partial<JournalEntry>) {
    journalEntries = journalEntries.map(e => e.id === id ? { ...e, ...updates } : e);
    notify();
  },
  deleteJournalEntry(id: string) {
    journalEntries = journalEntries.filter(e => e.id !== id);
    notify();
  },

  // ── User health data ──
  getUserHealth: () => [...userHealthEntries].sort((a, b) => b.date.localeCompare(a.date)),
  addHealthEntry(entry: Omit<UserHealthEntry, 'id'>) {
    const id = `h-${Date.now()}`;
    userHealthEntries = [{ ...entry, id }, ...userHealthEntries];
    notify();
    return id;
  },

  // ── Goals ──
  getGoals: () => [...goals],
  toggleGoal(id: string) {
    goals = goals.map(g => g.id === id ? { ...g, active: !g.active } : g);
    notify();
  },
  addCustomGoal(label: string) {
    const id = `gc-${Date.now()}`;
    goals = [...goals, { id, label, active: true, custom: true }];
    notify();
    notify();
  },
  removeGoal(id: string) {
    goals = goals.filter(g => g.id !== id);
    notify();
  },

  // ── Profile ──
  getProfile: () => ({ ...profile }),
  updateProfile(updates: Partial<UserProfile>) {
    profile = { ...profile, ...updates };
    notify();
  },
  addCondition(condition: string) {
    if (!profile.conditions.includes(condition)) {
      profile = { ...profile, conditions: [...profile.conditions, condition] };
      notify();
    }
  },
  removeCondition(condition: string) {
    profile = { ...profile, conditions: profile.conditions.filter(c => c !== condition) };
    notify();
  },
};
