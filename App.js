import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SectionList,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Modal,
  Alert,
  Vibration,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

// =====================================================
// HABBIT OS v1.1 — SYSTEM INTEGRITY PATCH
// Fixes: Hoisting crash, State side-effects, Persistence gaps
// Feature: Daily "Audit Tick" for hard state transitions
// =====================================================

// -------------------- THEME ENGINE --------------------
const PALETTE = {
  red: '#D50000',    // Blood Cherry
  purple: '#9C27B0', // Deep Electric Purple
  teal: '#00E5FF',   // Cyan
  blue: '#2962FF',   // Cobalt
  green: '#00C853',  // Emerald
  gold: '#FFD700',   // Prestige
};

const DARK_THEME = {
  mode: 'dark',
  bg: '#000000',
  cardBg: 'rgba(12, 12, 12, 0.95)',
  text: '#FFFFFF',
  sub: '#888888',
  border: 'rgba(255,255,255,0.15)',
  border2: 'rgba(255,255,255,0.10)',
  glass: 'rgba(255,255,255,0.08)',
  navBg: 'rgba(15,15,15,0.95)',
  inputBg: 'rgba(20,20,20,0.8)',
  ...PALETTE,
  primary: PALETTE.purple,
  accent: PALETTE.teal,
};

const LIGHT_THEME = {
  mode: 'light',
  bg: '#F2F2F7',
  cardBg: '#FFFFFF',
  text: '#000000',
  sub: '#8E8E93',
  border: 'rgba(0,0,0,0.1)',
  border2: 'rgba(0,0,0,0.06)',
  glass: 'rgba(0,0,0,0.04)',
  navBg: 'rgba(255,255,255,0.95)',
  inputBg: '#FFFFFF',
  ...PALETTE,
  primary: PALETTE.purple,
  accent: PALETTE.teal,
};

const KEYS = {
  DATA: '@habbit_v1_data',
  SETTINGS: '@habbit_v1_settings',
  PRO: '@habbit_v1_pro',
};

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

// -------------------- LOGIC CORE --------------------
const id = () => globalThis?.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
const atMidnight = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const dateKey = (d) => {
  const x = atMidnight(d);
  return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
};
const parseKey = (k) => new Date(k + 'T00:00:00');

const computeStreak = (history, nowKey) => {
  const set = new Set(history || []);
  const today = atMidnight(parseKey(nowKey));
  const start = set.has(nowKey) ? today : addDays(today, -1);
  if (!set.has(dateKey(start))) return 0;
  let s = 0; let cursor = start;
  while (true) {
    const k = dateKey(cursor);
    if (!set.has(k)) break;
    s += 1; cursor = addDays(cursor, -1);
  }
  return s;
};

const getDaysLeft = (startStr, windowDays, nowStr) => {
  if (!startStr || !windowDays) return 0;
  const start = parseKey(startStr);
  const end = addDays(start, windowDays);
  const now = parseKey(nowStr);
  const diffTime = end - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
};

// -------------------- DYNAMIC STYLES (HOISTED) --------------------
// Moved outside component to prevent initialization crash
function getStyles(theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    safeArea: { flex: 1 },
    content: { flex: 1, paddingHorizontal: 16 },
    header: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: theme.glass, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' },
    iconTxt: { color: theme.text, fontSize: 16 },
    brand: { color: theme.text, fontSize: 22, fontWeight: '900', letterSpacing: 5 },
    brandSub: { color: theme.sub, fontSize: 10, letterSpacing: 2, marginTop: 2 },
    pillRow: { flexDirection: 'row', gap: 8 },
    pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.glass },
    pillTxt: { color: theme.sub, fontSize: 10, letterSpacing: 1.5, fontWeight: '800' },
    inputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 10 },
    input: { flex: 1, height: 52, borderRadius: 18, paddingHorizontal: 16, color: theme.text, backgroundColor: theme.inputBg, borderWidth: 1, borderColor: theme.border, fontSize: 14, fontWeight: '600', shadowColor: theme.mode === 'light' ? '#000' : 'transparent', shadowOpacity: theme.mode === 'light' ? 0.05 : 0, shadowRadius: 4, elevation: 2 },
    inputFocus: { borderColor: theme.teal, shadowColor: theme.teal, shadowOpacity: theme.mode === 'light' ? 0.2 : 0.5, shadowRadius: 8, elevation: 4 },
    addBtn: { width: 52, height: 52, marginLeft: 10, borderRadius: 18, backgroundColor: theme.teal + '20', borderWidth: 1, borderColor: theme.teal + '80', alignItems: 'center', justifyContent: 'center' },
    addBtnText: { color: theme.teal, fontSize: 26, fontWeight: '900', marginTop: -2 },
    section: { marginTop: 16, marginBottom: 6, color: theme.sub, fontSize: 11, letterSpacing: 3, fontWeight: '900' },
    empty: { paddingTop: 46, alignItems: 'center' },
    emptyTitle: { color: theme.text, fontSize: 14, letterSpacing: 4, fontWeight: '900' },
    emptySub: { marginTop: 8, color: theme.sub, fontSize: 12, textAlign: 'center', maxWidth: 280, lineHeight: 18 },
    card: { backgroundColor: theme.cardBg, borderRadius: 22, borderWidth: 2, marginBottom: 12, shadowOffset: { width: 0, height: 0 }, shadowOpacity: theme.mode === 'dark' ? 0.6 : 0.2, shadowRadius: theme.mode === 'dark' ? 12 : 6, elevation: 6 },
    cardBody: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
    cardTitle: { color: theme.text, fontSize: 16, fontWeight: '800' },
    meta: { marginTop: 8, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
    metaTxt: { color: theme.sub, fontSize: 10, letterSpacing: 1, fontWeight: '700' },
    forgeBtn: { width: 38, height: 38, borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.glass, alignItems: 'center', justifyContent: 'center' },
    forgeIcon: { color: theme.text, fontSize: 16, fontWeight: '900' },
    checkRing: { width: 24, height: 24, borderRadius: 99, borderWidth: 2, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' },
    checkCore: { width: 12, height: 12, borderRadius: 99 },
    heroLabel: { color: theme.sub, fontSize: 10, letterSpacing: 3, fontWeight: '900' },
    heroRank: { marginTop: 6, color: theme.primary, fontSize: 24, fontWeight: '900', letterSpacing: 2 },
    heroScore: { marginTop: 6, color: theme.sub, fontSize: 12, letterSpacing: 2, fontWeight: '800' },
    upTitle: { color: theme.teal, fontSize: 12, letterSpacing: 3, fontWeight: '900' },
    upSub: { marginTop: 6, color: theme.sub, fontSize: 12, lineHeight: 18 },
    blockTitle: { color: theme.text, fontSize: 12, letterSpacing: 3, fontWeight: '900' },
    legacyRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border2 },
    legacyTitle: { color: theme.text, fontWeight: '900', fontSize: 13 },
    legacyMeta: { marginTop: 4, color: theme.sub, fontSize: 10, letterSpacing: 1 },
    nav: { position: 'absolute', left: 14, right: 14, bottom: 14, flexDirection: 'row', backgroundColor: theme.navBg, borderWidth: 1, borderColor: theme.border, borderRadius: 18, padding: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 8 },
    navBtn: { flex: 1, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    navBtnOn: { backgroundColor: theme.glass, borderWidth: 1, borderColor: theme.border },
    navTxt: { color: theme.sub, fontSize: 10, letterSpacing: 2, fontWeight: '900' },
    navTxtOn: { color: theme.text },
    modalOverlay: { flex: 1, backgroundColor: theme.mode === 'dark' ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
    modalCard: { width: '100%', maxWidth: 420, backgroundColor: theme.mode === 'dark' ? 'rgba(15,15,15,0.98)' : '#FFFFFF', borderWidth: 2, borderRadius: 22, padding: 20, shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 20 },
    modalTitle: { fontSize: 16, fontWeight: '900', letterSpacing: 4, color: theme.text },
    modalSub: { marginTop: 8, color: theme.sub, fontSize: 12, lineHeight: 18 },
    hr: { height: 1, backgroundColor: theme.border, marginTop: 14, marginBottom: 14 },
    primaryBtn: { width: '100%', height: 48, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.glass },
    primaryBtnText: { fontWeight: '900', letterSpacing: 4, fontSize: 11 },
    smallLink: { color: theme.sub, fontSize: 10, letterSpacing: 2, textAlign: 'center' },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    settingLabel: { color: theme.sub, fontSize: 10, letterSpacing: 2, fontWeight: '900' },
    stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    stepBtn: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.glass, alignItems: 'center', justifyContent: 'center' },
    stepTxt: { color: theme.text, fontSize: 16, fontWeight: '900' },
    stepVal: { color: theme.text, fontWeight: '900', letterSpacing: 2, minWidth: 24, textAlign: 'center' },
    settingBtn: { width: '100%', height: 48, borderRadius: 18, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.glass, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
    settingTxt: { color: theme.text, fontWeight: '800', fontSize: 12, letterSpacing: 1 },
    settingVal: { color: theme.sub, fontWeight: '900', letterSpacing: 2, fontSize: 11 },
    feature: { color: theme.text, fontSize: 12, fontWeight: '700', marginBottom: 8 },
    pillSelect: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    pillOption: { flex: 1, height: 40, borderRadius: 12, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.glass, alignItems: 'center', justifyContent: 'center' },
    pillText: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
    floatBtn: { position: 'absolute', right: 16, bottom: 92, paddingHorizontal: 14, height: 42, borderRadius: 16, borderWidth: 1, borderColor: theme.primary + '66', backgroundColor: theme.primary + '14', alignItems: 'center', justifyContent: 'center', shadowColor: theme.primary, shadowOpacity: 0.4, shadowRadius: 8 },
    floatBtnTxt: { color: theme.primary, fontSize: 10, letterSpacing: 2, fontWeight: '900' },
  });
}

// -------------------- UI COMPONENTS --------------------

const Badge = ({ label, color }) => (
  <View style={{
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
    borderWidth: 1, borderColor: color, backgroundColor: color + '15',
  }}>
    <Text style={{ fontSize: 9, letterSpacing: 1, fontWeight: '900', color: color }}>{label}</Text>
  </View>
);

const Card = ({ children, accent, theme, styles, failed }) => (
  <View style={[
    styles.card, 
    { 
      borderColor: failed ? theme.red : (accent ?? theme.purple), 
      shadowColor: failed ? theme.red : (accent ?? theme.purple),
      opacity: failed ? 0.8 : 1
    }
  ]}>
    {children}
  </View>
);

// -------------------- MODALS --------------------

const ForgeModal = ({ visible, onClose, onConfirm, theme, styles }) => {
  const [target, setTarget] = useState(7);
  const [duration, setDuration] = useState(14); 
  const [unit, setUnit] = useState('days');

  useEffect(() => {
    if (!visible) return;
    setTarget(7); setDuration(14); setUnit('days');
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { borderColor: theme.teal, shadowColor: theme.teal }] }>
          <Text style={[styles.modalTitle, { color: theme.teal }]}>FORGE PROTOCOL</Text>
          <View style={styles.hr} />

          <View style={styles.rowBetween}>
            <Text style={styles.settingLabel}>TARGET PROOF</Text>
            <View style={styles.stepRow}>
              <TouchableOpacity onPress={() => setTarget(Math.max(1, target - 1))} style={styles.stepBtn}><Text style={styles.stepTxt}>-</Text></TouchableOpacity>
              <Text style={styles.stepVal}>{target}</Text>
              <TouchableOpacity onPress={() => setTarget(target + 1)} style={styles.stepBtn}><Text style={styles.stepTxt}>+</Text></TouchableOpacity>
            </View>
          </View>

          <View style={styles.hr} />

          <View style={{marginBottom: 16}}>
            <Text style={styles.settingLabel}>DURATION UNIT</Text>
            <View style={styles.pillSelect}>
              {['days', 'weeks', 'months'].map((u) => (
                <TouchableOpacity key={u} onPress={() => { setUnit(u); if(u==='days') setDuration(14); if(u==='weeks') setDuration(4); if(u==='months') setDuration(1); }}
                  style={[styles.pillOption, unit === u && { backgroundColor: theme.teal, borderColor: theme.teal }]}> 
                  <Text style={[styles.pillText, {color: unit === u ? (theme.mode==='light'?'#FFF':'#000') : theme.sub}]}>{u.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.rowBetween}>
            <Text style={styles.settingLabel}>DURATION ({unit.toUpperCase()})</Text>
            <View style={styles.stepRow}>
              <TouchableOpacity onPress={() => setDuration(Math.max(1, duration - 1))} style={styles.stepBtn}><Text style={styles.stepTxt}>-</Text></TouchableOpacity>
              <Text style={styles.stepVal}>{duration}</Text>
              <TouchableOpacity onPress={() => setDuration(duration + 1)} style={styles.stepBtn}><Text style={styles.stepTxt}>+</Text></TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity onPress={() => {
              let mul = 1; if(unit==='weeks') mul=7; if(unit==='months') mul=30;
              onConfirm({ target, windowDays: duration * mul });
            }}
            style={[styles.primaryBtn, { borderColor: theme.teal, marginTop: 20 }]}> 
            <Text style={[styles.primaryBtnText, { color: theme.teal }]}>INITIATE</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={{ marginTop: 12 }}><Text style={styles.smallLink}>CANCEL</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const SettingsModal = ({ visible, onClose, settings, setSettings, onWipe, onOpenPro, theme, styles }) => {
  if (!visible) return null;
  const toggle = (k) => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setSettings(p => ({ ...p, [k]: !p[k] })); };
  const toggleTheme = () => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setSettings(p => ({ ...p, themeMode: p.themeMode === 'light' ? 'dark' : 'light' })); };

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { borderColor: theme.sub }]}> 
          <Text style={styles.modalTitle}>SYSTEM SETTINGS</Text>
          <View style={styles.hr} />
          <TouchableOpacity onPress={onOpenPro} style={styles.settingBtn}><Text style={styles.settingTxt}>Unlock Pro</Text><Text style={styles.settingVal}>›</Text></TouchableOpacity>
          <TouchableOpacity onPress={toggleTheme} style={styles.settingBtn}><Text style={styles.settingTxt}>Theme</Text><Text style={styles.settingVal}>{settings.themeMode === 'light' ? 'LIGHT' : 'DARK'}</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => toggle('reduceMotion')} style={styles.settingBtn}><Text style={styles.settingTxt}>Reduce Motion</Text><Text style={styles.settingVal}>{settings.reduceMotion ? 'ON' : 'OFF'}</Text></TouchableOpacity>
          <View style={styles.hr} />
          <TouchableOpacity onPress={onWipe} style={[styles.settingBtn, { borderColor: theme.red + '80' }]}><Text style={[styles.settingTxt, { color: theme.red }]}>Factory Reset</Text><Text style={styles.settingVal}>!</Text></TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={{ marginTop: 12 }}><Text style={styles.smallLink}>CLOSE</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const PaywallModal = ({ visible, onClose, onUnlock, isPro, theme, styles }) => {
  if (!visible) return null;
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { borderColor: theme.purple, shadowColor: theme.purple }]}> 
          <Text style={[styles.modalTitle, { color: theme.purple }]}>HABBIT PRO</Text>
          <Text style={styles.modalSub}>Unlimited protocols + deeper analytics.</Text>
          <View style={styles.hr} />
          <Text style={styles.feature}>• Unlimited Protocols</Text>
          <Text style={styles.feature}>• Full Data Retention</Text>
          <Text style={styles.feature}>• Advanced Statistics</Text>
          <TouchableOpacity onPress={onUnlock} style={[styles.primaryBtn, { borderColor: theme.purple, marginTop: 16 }]}> 
            <Text style={[styles.primaryBtnText, { color: theme.purple }]}>{isPro ? 'PRO ACTIVE' : 'UNLOCK SYSTEM'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={{ marginTop: 12 }}><Text style={styles.smallLink}>CLOSE</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// -------------------- MAIN APP --------------------
export default function App() {
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState('forge'); 
  const [now, setNow] = useState(new Date());
  const [isPro, setIsPro] = useState(false);
  
  // Data State
  const [userXP, setUserXP] = useState(0); 
  const [tasks, setTasks] = useState([]);
  
  const [settings, setSettings] = useState({ reduceMotion: false, themeMode: 'dark' });
  const [input, setInput] = useState('');
  const [focus, setFocus] = useState(false);
  
  // Modals
  const [forgeOpen, setForgeOpen] = useState(false);
  const [forgeId, setForgeId] = useState(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const theme = settings.themeMode === 'light' ? LIGHT_THEME : DARK_THEME;
  const styles = useMemo(() => getStyles(theme), [theme]);
  const todayKey = dateKey(now);

  // -------------------- SYSTEM LOGIC --------------------

  const getRank = (xp) => {
    if (xp >= 10000) return 'SINGULARITY';
    if (xp >= 5000) return 'SYSTEM CORE';
    if (xp >= 2500) return 'ARCHITECT';
    if (xp >= 1000) return 'BUILDER';
    if (xp >= 250) return 'OPERATOR';
    return 'INITIATE';
  };

  // Safe Audit Logic (Pure Function)
  const processSystemEvents = (taskList, currentXP, nowKey) => {
    let newXP = currentXP;
    const updatedTasks = taskList.map(t => {
      // Check Protocol Expiry (Strict)
      if (t.type === 'protocol' && t.status === 'active') {
        const start = parseKey(t.startDate);
        const end = addDays(start, t.windowDays);
        const current = parseKey(nowKey);
        
        if (current > end) {
          // It's strictly past the deadline -> Fail it.
          // Note: XP penalties could go here
          return { ...t, status: 'failed', failedAt: nowKey };
        }
      }
      return t;
    });
    return { updatedTasks, newXP };
  };

  const unlockPro = async () => {
    setIsPro(true);
    await AsyncStorage.setItem(KEYS.PRO, 'true').catch(() => {});
    setPaywallOpen(false);
    Vibration.vibrate(80);
  };

  // -------------------- ACTIONS --------------------

  const addIntention = () => {
    const title = input.trim();
    if (!title) return;
    if (!settings.reduceMotion) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    const newTask = { 
      id: id(), 
      title, 
      type: 'intention',
      status: 'active', 
      done: false, 
      history: [], 
      streak: 0, 
      attempts: 1,
      createdAt: Date.now() 
    };
    
    setTasks(p => [newTask, ...p]);
    setInput('');
  };

  // FIXED: Decoupled Logic
  const toggleTask = (taskId) => {
    if (!settings.reduceMotion) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    let xpDelta = 0;
    let graduationAlert = null;

    const newTasks = tasks.map(t => {
      if (t.id !== taskId) return t;

      // 1. INTENTION
      if (t.type === 'intention') {
        const next = !t.done;
        if (next) xpDelta = 10;
        else xpDelta = 0; // Prevent negative XP abuse
        return { ...t, done: next };
      }

      // 2. PROTOCOL / CORE
      const set = new Set(t.history || []);
      const wasDone = set.has(todayKey);
      
      if (wasDone) {
        set.delete(todayKey);
        xpDelta = -50;
      } else {
        set.add(todayKey);
        xpDelta = 50;
      }

      const hist = Array.from(set);
      const streak = computeStreak(hist, todayKey);
      
      // Check Graduation
      if (t.type === 'protocol' && hist.length >= t.target) {
        graduationAlert = { title: t.title };
        xpDelta += 500;
        return { 
          ...t, 
          type: 'core', 
          status: 'graduated', 
          history: hist, 
          streak, 
          graduatedAt: todayKey 
        };
      }

      return { ...t, history: hist, streak };
    });

    setTasks(newTasks);
    setUserXP(prev => Math.max(0, prev + xpDelta)); // Clamp XP
    
    // Side Effects
    if (xpDelta > 0) Vibration.vibrate(20);
    if (graduationAlert) {
        Vibration.vibrate([50, 100, 50]);
        setTimeout(() => Alert.alert("PROTOCOL COMPLETE", `System upgrade: ${graduationAlert.title} is now Core.\n+500 XP`), 300);
    }
  };

  const openForge = (taskId) => {
    // FIXED: Gate logic matches Audit state
    const activeProtocols = tasks.filter(t => t.type === 'protocol' && t.status === 'active').length;
    if (!isPro && activeProtocols >= 3) { setPaywallOpen(true); return; }
    setForgeId(taskId); setForgeOpen(true);
  };

  const confirmForge = ({ target, windowDays }) => {
    if (!settings.reduceMotion) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setTasks(p => p.map(t => t.id !== forgeId ? t : { 
      ...t, 
      type: 'protocol', 
      target, 
      windowDays, 
      startDate: todayKey, 
      history: [], 
      streak: 0,
      status: 'active' 
    }));
    setForgeOpen(false); setForgeId(null);
  };

  const recoverProtocol = (taskId) => {
    if (!settings.reduceMotion) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      return { 
        ...t, 
        status: 'active', 
        startDate: todayKey, 
        history: [], 
        streak: 0, 
        attempts: (t.attempts || 1) + 1, 
        failedAt: null 
      };
    }));
  };

  // FIXED: The Audit Tick
  const nextDay = () => {
    if (!settings.reduceMotion) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const nxt = addDays(now, 1);
    const nxtKey = dateKey(nxt);
    
    // 1. Run Audit on current tasks against the NEW day
    // (If window ended yesterday, today it is failed)
    const { updatedTasks, newXP } = processSystemEvents(tasks, userXP, nxtKey);
    
    // 2. Clean Intentions (remove completed ones)
    const finalTasks = updatedTasks.filter(t => t.type !== 'intention' || !t.done).map(t => ({
      ...t,
      streak: t.type !== 'intention' ? computeStreak(t.history || [], nxtKey) : 0
    }));

    setNow(nxt);
    setTasks(finalTasks);
    setUserXP(newXP);
  };

  // FIXED: Safe Wipe
  const wipe = () => {
    Alert.alert('SYSTEM WIPE', 'Factory reset all data?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Wipe', style: 'destructive', onPress: async () => {
          try {
            await AsyncStorage.multiRemove([KEYS.DATA, KEYS.SETTINGS, KEYS.PRO]);
          } catch(e) {}
          setTasks([]); setUserXP(0); setNow(new Date()); setSettings({ reduceMotion: false, themeMode: 'dark' }); setIsPro(false);
          setTab('forge');
        }
      },
    ]);
  };

  // -------------------- LIFECYCLE --------------------

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(KEYS.DATA);
      const savedSettings = await AsyncStorage.getItem(KEYS.SETTINGS);
      const pro = await AsyncStorage.getItem(KEYS.PRO);
      
      if (savedSettings) try { setSettings(p => ({ ...p, ...JSON.parse(savedSettings) })); } catch {}
      if (pro === 'true') setIsPro(true);
      
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          const loadedNow = parsed.now ? new Date(parsed.now) : new Date();
          const loadedTodayKey = dateKey(loadedNow);
          
          setNow(loadedNow);
          setUserXP(parsed.xp || 0);
          
          const safeTasks = (parsed?.tasks ?? []).map(t => ({
            ...t,
            history: t.history || [],
            streak: t.streak || 0,
            type: t.type || 'intention',
            status: t.status || 'active',
            attempts: t.attempts || 1,
          }));
          
          // Run Audit on Load to catch up if user missed days
          const { updatedTasks, newXP } = processSystemEvents(safeTasks, parsed.xp || 0, loadedTodayKey);
          setTasks(updatedTasks);
          setUserXP(newXP);
          
        } catch {}
      }
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    const data = { now: now.toISOString(), tasks, xp: userXP };
    AsyncStorage.setItem(KEYS.DATA, JSON.stringify(data)).catch(() => {});
  }, [tasks, now, userXP, ready]);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings)).catch(() => {});
  }, [settings, ready]);

  // -------------------- RENDERERS --------------------

  const renderForge = () => (
    <View style={{ flex: 1 }}>
      <View style={styles.inputRow}>
        <TextInput
          value={input} onChangeText={setInput} placeholder="Initialize new intention..." placeholderTextColor={theme.sub}
          style={[styles.input, focus && styles.inputFocus]} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          returnKeyType="done" onSubmitEditing={addIntention}
        />
        <TouchableOpacity onPress={addIntention} style={styles.addBtn}><Text style={styles.addBtnText}>+</Text></TouchableOpacity>
      </View>
      <SectionList
        sections={[
          { title: 'FORGE', data: tasks.filter(t => t.type === 'intention' && !t.done) },
          { title: 'PROTOCOLS', data: tasks.filter(t => t.type === 'protocol') }, 
          { title: 'SYSTEM CORE', data: tasks.filter(t => t.type === 'core') }
        ].filter(s => s.data.length > 0)}
        keyExtractor={item => item.id} contentContainerStyle={{ paddingBottom: 120 }}
        renderSectionHeader={({ section }) => <Text style={styles.section}>{section.title}</Text>}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>SYSTEM EMPTY</Text>
            <Text style={styles.emptySub}>Initialize an intention to begin.</Text>
            <TouchableOpacity onPress={nextDay} style={[styles.primaryBtn, { borderColor: theme.primary, marginTop: 16 }]}> 
              <Text style={[styles.primaryBtnText, { color: theme.primary }]}>SIMULATE +1 DAY</Text>
            </TouchableOpacity>
          </View>
        )}
        renderItem={({ item }) => {
          let daysLeft = null;
          let isExpired = item.status === 'failed';
          
          if (item.type === 'protocol' && !isExpired) {
            daysLeft = getDaysLeft(item.startDate, item.windowDays, todayKey);
            // Visual check for current render (state catch-up happens on nextDay/reload)
            if (daysLeft < 0) isExpired = true; 
          }

          const accent = isExpired ? theme.red : (item.type==='core' ? theme.purple : item.type==='protocol' ? theme.teal : theme.blue);
          const completed = item.type==='intention' ? item.done : (item.history||[]).includes(todayKey);
          
          return (
            <TouchableOpacity activeOpacity={0.92} onPress={() => !isExpired && toggleTask(item.id)} onLongPress={() => {
              Alert.alert('MANAGE', item.title, [
                { text: 'Delete', style: 'destructive', onPress: () => setTasks(p => p.filter(x => x.id !== item.id)) },
                { text: 'Cancel', style: 'cancel' }
              ]);
            }}>
              <Card accent={accent} theme={theme} styles={styles} failed={isExpired}>
                <View style={styles.cardBody}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, (completed || isExpired) && { opacity: 0.5, textDecorationLine: isExpired ? 'none' : 'line-through' }]}> 
                      {item.title} {isExpired ? '(FAILED)' : ''}
                    </Text>
                    <View style={styles.meta}> 
                      <Badge label={isExpired ? 'FAILURE' : item.type.toUpperCase()} color={accent} />
                       
                      {item.type === 'protocol' && !isExpired && (
                        <Text style={[styles.metaTxt, {color: theme.teal}]}> {daysLeft} DAYS LEFT</Text>
                      )}

                      {item.type !== 'intention' && (
                        <Text style={styles.metaTxt}>
                           PROOF {(item.history||[]).length}{item.type==='protocol'?'/'+item.target:''} 
                           {item.streak > 0 ? ` • STRK ${item.streak}` : ''}
                           {item.attempts > 1 ? ` • TRY ${item.attempts}` : ''}
                        </Text>
                      )}
                    </View>
                  </View>
                  
                  {item.type === 'intention' && (
                    <TouchableOpacity onPress={() => openForge(item.id)} style={styles.forgeBtn}><Text style={styles.forgeIcon}>⚒︎</Text></TouchableOpacity>
                  )}

                  {isExpired && (
                    <TouchableOpacity onPress={() => recoverProtocol(item.id)} style={[styles.forgeBtn, { borderColor: theme.red }]}> 
                      <Text style={[styles.forgeIcon, { color: theme.red, fontSize: 10 }]}>↻</Text>
                    </TouchableOpacity>
                  )}
                  
                  {!isExpired && (
                    <View style={[styles.checkRing, completed && { borderColor: accent }]}>
                      <View style={[styles.checkCore, completed && { backgroundColor: accent }]} />
                    </View>
                  )}
                </View>
              </Card>
            </TouchableOpacity>
          );
        }}
      />
      <TouchableOpacity onPress={nextDay} style={styles.floatBtn}><Text style={styles.floatBtnTxt}>+1 DAY</Text></TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle={settings.themeMode === 'light' ? "dark-content" : "light-content"} />
      <SafeAreaView style={styles.safeArea}> 
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSettingsOpen(true)} style={styles.iconBtn}><Text style={styles.iconTxt}>☰</Text></TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.brand}>HABBIT</Text>
            <Text style={styles.brandSub}>OS_V1.1</Text>
          </View>
          <View style={styles.pillRow}>
            {/* Upsell Trigger */}
            <TouchableOpacity onPress={() => setPaywallOpen(true)} style={styles.pill}>
              <Text style={[styles.pillTxt, { color: isPro ? theme.purple : theme.sub }]}>{isPro ? 'PRO' : 'FREE'}</Text>
            </TouchableOpacity>
            <View style={styles.pill}><Text style={styles.pillTxt}>{todayKey}</Text></View>
          </View>
        </View>

        <View style={styles.content}> 
          {tab === 'forge' && renderForge()}
          {tab === 'records' && (
            <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
              <Card accent={theme.purple} theme={theme} styles={styles}><View style={{ padding: 16 }}><Text style={styles.heroLabel}>IDENTITY RANK</Text><Text style={styles.heroRank}>{getRank(userXP)}</Text><Text style={styles.heroScore}>XP: {userXP}</Text></View></Card>
              {tasks.filter(t => t.status === 'graduated').map(t => <Card key={t.id} accent={theme.gold} theme={theme} styles={styles}><View style={{ padding: 16 }}><Text style={styles.legacyTitle}>{t.title}</Text><Text style={styles.legacyMeta}>GRADUATED {t.graduatedAt}</Text></View></Card>)}
            </ScrollView>
          )}
          {tab === 'vault' && (
            <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
              <Card accent={theme.sub} theme={theme} styles={styles}><View style={{ padding: 16 }}><Text style={styles.blockTitle}>VAULT</Text><Text style={styles.upSub}>Failure logs & Archives.</Text></View></Card>
              {tasks.filter(t => t.status === 'failed').map(t => (
                 <Card key={t.id} accent={theme.red} theme={theme} styles={styles} failed><View style={{ padding: 16 }}><Text style={styles.legacyTitle}>{t.title}</Text><Text style={[styles.legacyMeta, {color: theme.red}]}>FAILED {t.failedAt}</Text><Text style={styles.legacyMeta}>ATTEMPTS: {t.attempts}</Text></View></Card>
              ))} 
            </ScrollView>
          )}
        </View>

        <View style={styles.nav}> 
          {['forge', 'records', 'vault'].map(t => (
            <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.navBtn, tab === t && styles.navBtnOn]}> 
              <Text style={[styles.navTxt, tab === t && styles.navTxtOn]}>{t.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView> 

      <ForgeModal visible={forgeOpen} onClose={() => setForgeOpen(false)} onConfirm={confirmForge} theme={theme} styles={styles} />
      <SettingsModal visible={settingsOpen} onClose={() => setSettingsOpen(false)} settings={settings} setSettings={setSettings} onWipe={wipe} onOpenPro={() => setPaywallOpen(true)} theme={theme} styles={styles} />
      <PaywallModal visible={paywallOpen} onClose={() => setPaywallOpen(false)} onUnlock={unlockPro} isPro={isPro} theme={theme} styles={styles} />
    </View>
  );
}
