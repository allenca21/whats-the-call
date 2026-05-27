import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  TextInput,
  Modal,
  Animated,
  Dimensions,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import QUESTION_BANK from './questionBank';
import REFERENCE_LIBRARY from './referenceLibrary';

const CHAPTERS = ['All', 1, 2, 3, 4, 5, 6, 7, 8, 9, 'RVI', 'ADV', 'Tournament'];
const QUIZ_SIZES = [5, 10, 15, 20, 25, 30];
const MODES = [
  { key: 'mixed', label: 'Mixed' },
  { key: 'trivia', label: 'Trivia' },
  { key: 'whats', label: "What\'s the Call" },
  { key: 'truefalse', label: 'True / False' },
  { key: 'advanced', label: 'Advanced' },
];
const DIFFICULTIES = ['All', 'easy', 'medium', 'hard'];

const STORAGE_KEYS = {
  progress: 'll_progress_v1',
  missed: 'll_missed_v1',
  settings: 'll_settings_v1',
};

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getDefaultSettings() {
  return {
    chapter: 'All',
    quizSize: 10,
    mode: 'mixed',
    difficulty: 'All',
  };
}

function getModeLabel(mode) {
  const found = MODES.find((m) => m.key === mode);
  return found ? found.label : mode;
}

function getChapterLabel(chapter) {
  if (chapter === 'All') return 'All';
  if (chapter === 'RVI') return 'Reg VI';
  if (chapter === 'ADV') return 'Advanced';
  if (chapter === 'Tournament') return 'Tournament';
  return `Ch ${chapter}`;
}

function formatDifficulty(value) {
  if (value === 'All') return 'All';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function initProgress() {
  return {
    1: { correct: 0, attempted: 0 },
    2: { correct: 0, attempted: 0 },
    3: { correct: 0, attempted: 0 },
    4: { correct: 0, attempted: 0 },
    5: { correct: 0, attempted: 0 },
    6: { correct: 0, attempted: 0 },
    7: { correct: 0, attempted: 0 },
    8: { correct: 0, attempted: 0 },
    9: { correct: 0, attempted: 0 },
    RVI: { correct: 0, attempted: 0 },
    ADV: { correct: 0, attempted: 0 },
  };
}

function TopBar({ title, onHome }) {
  return (
    <View style={styles.topBar}>
      <Text style={styles.topBarTitle}>{title}</Text>
      <TouchableOpacity style={styles.homeButton} onPress={onHome}>
        <Text style={styles.homeButtonText}>Home</Text>
      </TouchableOpacity>
    </View>
  );
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CONFETTI_COLORS = ['#FFD700', '#FF6347', '#00CED1', '#9370DB', '#16a34a', '#1f6feb', '#FFA500'];

function ConfettiPiece({ color, startX, delay }) {
  const translateY = React.useRef(new Animated.Value(-20)).current;
  const translateX = React.useRef(new Animated.Value(0)).current;
  const opacity = React.useRef(new Animated.Value(1)).current;
  const rotate = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const drift = (Math.random() - 0.5) * 120;
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT + 40,
        duration: 2800 + Math.random() * 1200,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: drift,
        duration: 2800 + Math.random() * 1200,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 2800 + Math.random() * 1200,
        delay: delay + 1800,
        useNativeDriver: true,
      }),
      Animated.timing(rotate, {
        toValue: Math.random() > 0.5 ? 10 : -10,
        duration: 2800 + Math.random() * 1200,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const spin = rotate.interpolate({ inputRange: [-10, 10], outputRange: ['-360deg', '360deg'] });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: startX,
        top: 0,
        width: 8 + Math.random() * 6,
        height: 8 + Math.random() * 6,
        borderRadius: Math.random() > 0.5 ? 4 : 0,
        backgroundColor: color,
        transform: [{ translateY }, { translateX }, { rotate: spin }],
        opacity,
      }}
    />
  );
}

function Confetti({ count = 80 }) {
  const pieces = React.useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      startX: Math.random() * SCREEN_WIDTH,
      delay: Math.random() * 600,
    })), [count]);

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }}>
      {pieces.map((p) => (
        <ConfettiPiece key={p.id} color={p.color} startX={p.startX} delay={p.delay} />
      ))}
    </View>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff', padding: 20, justifyContent: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: 'red', marginBottom: 10 }}>App Error</Text>
          <Text style={{ fontSize: 14, color: '#333' }}>{String(this.state.error)}</Text>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

function AppInner() {
  const defaultSettings = getDefaultSettings();

  const [screen, setScreen] = useState('home');
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  const [chapter, setChapter] = useState(defaultSettings.chapter);
  const [quizSize, setQuizSize] = useState(defaultSettings.quizSize);
  const [mode, setMode] = useState(defaultSettings.mode);
  const [difficulty, setDifficulty] = useState(defaultSettings.difficulty);

  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);

  const [missedQuestions, setMissedQuestions] = useState([]);
  const [progressByChapter, setProgressByChapter] = useState(initProgress());
  const [storageReady, setStorageReady] = useState(true);

  const [referenceSearch, setReferenceSearch] = useState('');
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [isPro, setIsPro] = useState(false);
  const [purchasePending, setPurchasePending] = useState(false);
  const IAP_PRODUCT_ID = 'com.allenca21.whatsthecall.gamemode';

  // Initialize RevenueCat
  useEffect(() => {
    if (Platform.OS !== 'web') {
      Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
      Purchases.configure({ apiKey: Platform.OS === 'ios' ? 'appl_CJRcipmVCIqWoOaANPiMjFrToHS' : 'goog_UPTfkQANSgjOMpYwlGFPILclVam' });
    }
  }, []);

  // Load saved Pro status on startup
  useEffect(() => {
    const loadProStatus = async () => {
      try {
        if (Platform.OS === 'web') {
          const saved = await AsyncStorage.getItem('isPro');
          if (saved === 'true') setIsPro(true);
          return;
        }
        // Check RevenueCat entitlement
        const customerInfo = await Purchases.getCustomerInfo();
        if (customerInfo.entitlements.active['pro']) {
          setIsPro(true);
        }
      } catch (e) {
        console.log('Error loading pro status:', e);
      }
    };
    loadProStatus();
  }, []);

  const handlePurchase = async () => {
    if (Platform.OS === 'web') {
      // Web preview only -- simulate purchase
      setIsPro(true);
      return;
    }
    try {
      setPurchasePending(true);
      const offerings = await Purchases.getOfferings();
      // Debug: show what we got
      const debugMsg = offerings.current
        ? 'Offering found. Packages: ' + offerings.current.availablePackages.map(p => p.identifier).join(', ')
        : 'No current offering found. All offerings: ' + JSON.stringify(Object.keys(offerings.all));
      Alert.alert('Debug', debugMsg);

      if (offerings.current !== null) {
        const pkg = offerings.current.lifetime ||
                    offerings.current.annual ||
                    offerings.current.monthly ||
                    (offerings.current.availablePackages.length > 0 ? offerings.current.availablePackages[0] : null);
        if (pkg) {
          Alert.alert('Debug', 'Attempting purchase of: ' + pkg.identifier);
          const { customerInfo } = await Purchases.purchasePackage(pkg);
          const activeKeys = Object.keys(customerInfo.entitlements.active);
          Alert.alert('Debug', 'Purchase done. Active entitlements: ' + (activeKeys.length > 0 ? activeKeys.join(', ') : 'NONE'));
          if (customerInfo.entitlements.active['pro']) {
            setIsPro(true);
          }
        } else {
          Alert.alert('No packages found', 'Available: ' + JSON.stringify(offerings.current));
        }
      } else {
        Alert.alert('No offering', 'offerings.current is null');
      }
    } catch (e) {
      if (!e.userCancelled) {
        Alert.alert('Purchase error', 'Code: ' + (e.code || 'none') + '\nMessage: ' + (e.message || JSON.stringify(e)));
      }
    } finally {
      setPurchasePending(false);
    }
  };

  const handleRestore = async () => {
    if (Platform.OS === 'web') return;
    try {
      setPurchasePending(true);
      const customerInfo = await Purchases.restorePurchases();
      if (customerInfo.entitlements.active['pro']) {
        setIsPro(true);
        alert('Purchase restored!');
      } else {
        alert('No previous purchase found.');
      }
    } catch (e) {
      console.log('Restore error:', e);
    } finally {
      setPurchasePending(false);
    }
  };


  const [gameModeCategory, setGameModeCategory] = useState(null);
  const [gameModeAnswers, setGameModeAnswers] = useState([]);

  useEffect(() => {
    const loadSavedData = async () => {
      try {
        const [savedProgress, savedMissed, savedSettings] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.progress),
          AsyncStorage.getItem(STORAGE_KEYS.missed),
          AsyncStorage.getItem(STORAGE_KEYS.settings),
        ]);

        if (savedProgress) {
          setProgressByChapter(JSON.parse(savedProgress));
        }

        if (savedMissed) {
          setMissedQuestions(JSON.parse(savedMissed));
        }

        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          setChapter(parsed.chapter ?? defaultSettings.chapter);
          setQuizSize(parsed.quizSize ?? defaultSettings.quizSize);
          setMode(parsed.mode ?? defaultSettings.mode);
          setDifficulty(parsed.difficulty ?? defaultSettings.difficulty);
        }
      } catch (error) {
        console.log('Error loading saved app data:', error);
      } finally {
        setStorageReady(true);
      }
    };

    loadSavedData();
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    AsyncStorage.setItem(STORAGE_KEYS.progress, JSON.stringify(progressByChapter)).catch((error) =>
      console.log('Error saving progress:', error)
    );
  }, [progressByChapter, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    AsyncStorage.setItem(STORAGE_KEYS.missed, JSON.stringify(missedQuestions)).catch((error) =>
      console.log('Error saving missed questions:', error)
    );
  }, [missedQuestions, storageReady]);

  useEffect(() => {
    if (!storageReady) return;

    const settings = {
      chapter,
      quizSize,
      mode,
      difficulty,
    };

    AsyncStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings)).catch((error) =>
      console.log('Error saving settings:', error)
    );
  }, [chapter, quizSize, mode, difficulty, storageReady]);

  const pool = useMemo(() => {
    let filtered = QUESTION_BANK;

    if (chapter !== 'All') {
      filtered = filtered.filter((q) => q.chapter === chapter);
    }

    if (mode !== 'mixed') {
      filtered = filtered.filter((q) => q.mode === mode);
    }

    if (difficulty !== 'All') {
      filtered = filtered.filter((q) => q.difficulty === difficulty);
    }

    return filtered;
  }, [chapter, mode, difficulty]);

  const misconceptionCount = QUESTION_BANK.filter((q) => q.tags && q.tags.includes('misconception')).length;

  const breakdown = useMemo(() => {
    const triviaCount = pool.filter((q) => q.mode === 'trivia').length;
    const whatsCount = pool.filter((q) => q.mode === 'whats').length;
    const trueFalseCount = pool.filter((q) => q.mode === 'truefalse').length;
    const advancedCount = pool.filter((q) => q.mode === 'advanced').length;
    return { triviaCount, whatsCount, trueFalseCount, advancedCount };
  }, [pool]);

  const filteredReferences = useMemo(() => {
    const term = referenceSearch.trim().toLowerCase();
    if (!term) return REFERENCE_LIBRARY;
    return REFERENCE_LIBRARY.filter(
      (item) =>
        item.title.toLowerCase().includes(term) ||
        item.body.toLowerCase().includes(term)
    );
  }, [referenceSearch]);

  const progressRows = useMemo(() => {
    return CHAPTERS.filter((c) => c !== 'All').map((key) => {
      const row = progressByChapter[key] || { correct: 0, attempted: 0 };
      const pct = row.attempted === 0 ? 0 : Math.round((row.correct / row.attempted) * 100);
      return { key, ...row, pct };
    });
  }, [progressByChapter]);

  const startQuiz = () => {
    const picked = shuffle(pool).slice(0, Math.min(quizSize, pool.length));
    setQuestions(picked);
    setIndex(0);
    setSelected(null);
    setShowExplanation(false);
    setScore(0);
    setCurrentStreak(0);
    setScreen('quiz');
  };

  const startMisconceptions = () => {
    const misconceptionPool = QUESTION_BANK.filter((q) => q.tags && q.tags.includes('misconception'));
    if (!misconceptionPool.length) return;
    const picked = shuffle(misconceptionPool).slice(0, Math.min(quizSize, misconceptionPool.length));
    setQuestions(picked);
    setIndex(0);
    setSelected(null);
    setShowExplanation(false);
    setScore(0);
    setScreen('quiz');
  };

  const startMissedReview = () => {
    if (!missedQuestions.length) return;
    setQuestions(shuffle(missedQuestions));
    setIndex(0);
    setSelected(null);
    setShowExplanation(false);
    setScore(0);
    setCurrentStreak(0);
    setScreen('quiz');
  };

  const resetProgress = async () => {
    const fresh = initProgress();
    const defaults = getDefaultSettings();

    setProgressByChapter(fresh);
    setMissedQuestions([]);
    setChapter(defaults.chapter);
    setQuizSize(defaults.quizSize);
    setMode(defaults.mode);
    setDifficulty(defaults.difficulty);

    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.progress,
        STORAGE_KEYS.missed,
        STORAGE_KEYS.settings,
      ]);
    } catch (error) {
      console.log('Error clearing saved data:', error);
    }
  };

  const current = questions[index];

  const chooseAnswer = (answerIndex) => {
    if (selected !== null) return;
    setSelected(answerIndex);

    const correct = answerIndex === current.answerIndex;

    if (correct) {
      setScore((s) => s + 1);
      setCurrentStreak((s) => {
        const next = s + 1;
        setBestStreak((b) => Math.max(b, next));
        return next;
      });
    } else {
      setCurrentStreak(0);
      setMissedQuestions((prev) => {
        const exists = prev.some((item) => item.id === current.id);
        return exists ? prev : [...prev, current];
      });
    }

    setProgressByChapter((prev) => ({
      ...prev,
      [current.chapter]: {
        attempted: (prev[current.chapter]?.attempted || 0) + 1,
        correct: (prev[current.chapter]?.correct || 0) + (correct ? 1 : 0),
      },
    }));

    setShowExplanation(true);
  };

  const nextQuestion = () => {
    if (index + 1 >= questions.length) {
      setScreen('results');
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setShowExplanation(false);
  };

  const goHome = () => {
    setScreen('home');
    setSelected(null);
    setShowExplanation(false);
    setIndex(0);
    setQuestions([]);
  };

  const restartSameQuiz = () => {
    startQuiz();
  };

  const getScoreMessage = () => {
    if (questions.length === 0) return null;
    const pct = Math.round((score / questions.length) * 100);
    if (pct === 100) return { emoji: '🎆', title: 'Perfect Score!', subtitle: 'You know your stuff cold.' };
    if (pct >= 90) return { emoji: '⭐', title: 'Outstanding!', subtitle: 'Almost perfect -- great work.' };
    if (pct >= 80) return { emoji: '👏', title: 'Great Job!', subtitle: 'Solid knowledge of the rules.' };
    if (pct >= 70) return { emoji: '✅', title: 'Not Bad!', subtitle: 'Keep studying and you\'ll get there.' };
    return { emoji: '💪', title: 'Keep Practicing!', subtitle: 'Review your missed questions to improve.' };
  };

  if (!storageReady) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={[styles.container, styles.centered]}>
          <Text style={styles.resultsTitle}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (screen === 'progress') {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          <TopBar title="Session Progress" onHome={goHome} />

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Progress by Section</Text>
            {progressRows.map((row) => (
              <View key={String(row.key)} style={styles.progressRow}>
                <Text style={styles.progressLabel}>{getChapterLabel(row.key)}</Text>
                <View style={styles.progressRightCol}>
                  <Text style={styles.progressValue}>{row.attempted === 0 ? '--' : `${row.correct}/${row.attempted} (${row.pct}%)`}</Text>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, {
                      width: row.attempted === 0 ? '0%' : `${row.pct}%`,
                      backgroundColor: row.pct >= 80 ? '#16a34a' : row.pct >= 60 ? '#f59e0b' : '#dc2626',
                    }]} />
                  </View>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Saved Review</Text>
            <Text style={styles.cardText}>Missed questions saved: {missedQuestions.length}</Text>
          </View>

          <TouchableOpacity
            style={[styles.button, missedQuestions.length === 0 && styles.buttonDisabled]}
            onPress={startMissedReview}
            disabled={missedQuestions.length === 0}
          >
            <Text style={styles.buttonText}>Fix My Mistakes</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={resetProgress}>
            <Text style={styles.secondaryButtonText}>Reset Progress & Missed Questions</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'references') {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          <TopBar title="Rule Reference Library" onHome={goHome} />

          <TextInput
            style={styles.searchInput}
            value={referenceSearch}
            onChangeText={setReferenceSearch}
            placeholder="Search rules, terms, or sections"
            placeholderTextColor="#667085"
          />

          {filteredReferences.map((item) => (
            <View key={item.title} style={styles.card}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardText}>{item.body}</Text>
            </View>
          ))}

          <TouchableOpacity
            style={styles.rulebookButton}
            onPress={() => Linking.openURL('https://www.littleleague.org/playing-rules/rules-regulations-policies/')}
          >
            <Text style={styles.rulebookButtonIcon}>📖</Text>
            <View style={styles.rulebookButtonText}>
              <Text style={styles.rulebookButtonTitle}>Official Little League Rulebook</Text>
              <View style={styles.rulebookBadgeRow}>
                <Text style={styles.rulebookButtonSub}>littleleague.org</Text>
                <TouchableOpacity
                  onPress={() => Linking.openURL('https://apps.apple.com/us/app/id1464594539')}
                  style={styles.storeBadge}
                >
                  <Text style={styles.storeBadgeText}>🍎 App Store</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => Linking.openURL('https://play.google.com/store/apps/details?id=com.littleleaguerulebook')}
                  style={styles.storeBadge}
                >
                  <Text style={styles.storeBadgeText}>▶ Google Play</Text>
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.rulebookButtonArrow}>→</Text>
          </TouchableOpacity>

        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'home') {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.hero}>
            <Text style={styles.kicker}>Little League Baseball</Text>
            <Text style={styles.heroTitle}>Make the right call.</Text>
            <Text style={styles.subtitle}>
              Instant rulings for coaches, umpires, and parents.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.gameModeButton}
            onPress={() => {
              setGameModeCategory(null);
              setGameModeAnswers([]);
              setScreen('gamemode');
            }}
          >
            <Text style={styles.gameModeButtonIcon}>⚡</Text>
            <View style={styles.gameModeButtonInner}>
              <Text style={styles.gameModeButtonTitle}>Game Mode</Text>
              <Text style={styles.gameModeButtonSub}>Instant rulings -- tap, tap, done</Text>
            </View>
            <Text style={styles.gameModeButtonBadge}>{isPro ? 'PRO' : 'Try Free'}</Text>
          </TouchableOpacity>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Mode</Text>
            <View style={styles.rowWrap}>
              {MODES.map((item) => {
                const active = mode === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.pill, active && styles.pillActive]}
                    onPress={() => setMode(item.key)}
                  >
                    <Text style={[styles.pillText, active && styles.pillTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Pick a Section</Text>
            <View style={styles.rowWrap}>
              {CHAPTERS.map((item) => {
                const active = chapter === item;
                return (
                  <TouchableOpacity
                    key={String(item)}
                    style={[styles.pill, active && styles.pillActive]}
                    onPress={() => setChapter(item)}
                  >
                    <Text style={[styles.pillText, active && styles.pillTextActive]}>
                      {getChapterLabel(item)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Difficulty</Text>
            <View style={styles.rowWrap}>
              {DIFFICULTIES.map((item) => {
                const active = difficulty === item;
                return (
                  <TouchableOpacity
                    key={item}
                    style={[styles.pill, active && styles.pillActive]}
                    onPress={() => setDifficulty(item)}
                  >
                    <Text style={[styles.pillText, active && styles.pillTextActive]}>
                      {formatDifficulty(item)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Quiz Size</Text>
            <View style={styles.rowWrap}>
              {QUIZ_SIZES.map((size) => {
                const active = quizSize === size;
                return (
                  <TouchableOpacity
                    key={size}
                    style={[styles.pill, active && styles.pillActive]}
                    onPress={() => setQuizSize(size)}
                  >
                    <Text style={[styles.pillText, active && styles.pillTextActive]}>
                      {size}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Question Bank</Text>
            <Text style={styles.cardText}>{pool.length} questions available</Text>
            <Text style={styles.metaLine}>Mode: {getModeLabel(mode)}</Text>
            <Text style={styles.metaLine}>Trivia: {breakdown.triviaCount}</Text>
            <Text style={styles.metaLine}>What\'s the Call: {breakdown.whatsCount}</Text>
            <Text style={styles.metaLine}>True / False: {breakdown.trueFalseCount}</Text>
            <Text style={styles.metaLine}>Advanced: {breakdown.advancedCount}</Text>
          </View>

          <TouchableOpacity
            style={[styles.button, pool.length === 0 && styles.buttonDisabled]}
            onPress={startQuiz}
            disabled={pool.length === 0}
          >
            <Text style={styles.buttonText}>Start Quiz</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={() => setScreen('progress')}>
            <Text style={styles.secondaryButtonText}>Progress</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={() => setScreen('references')}>
            <Text style={styles.secondaryButtonText}>Rule Library</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowHowToPlay(true)}>
            <Text style={styles.secondaryButtonText}>How to Play</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.misconceptionButton} onPress={startMisconceptions}>
            <Text style={styles.misconceptionButtonText}>⚠️ Common Misconceptions</Text>
            <View style={styles.misconceptionBadge}>
              <Text style={styles.misconceptionBadgeText}>{Math.min(quizSize, misconceptionCount)} questions</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>

        <Modal
          visible={showHowToPlay}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowHowToPlay(false)}
        >
          <View style={styles.modalOverlay}>
            <ScrollView contentContainerStyle={styles.modalScroll}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>How to Play</Text>

                <Text style={styles.modalSection}>🎯 Pick Your Settings</Text>
                <Text style={styles.modalText}>Choose a mode, chapter, difficulty, and quiz size. Then tap Start Quiz.</Text>

                <Text style={styles.modalSection}>📋 Modes</Text>
                <Text style={styles.modalText}>- Mixed -- all question types</Text>
                <Text style={styles.modalText}>- Trivia -- rule knowledge questions</Text>
                <Text style={styles.modalText}>- What\'s the Call -- real game situations</Text>
                <Text style={styles.modalText}>- True / False -- quick rule checks</Text>
                <Text style={styles.modalText}>- Advanced -- complex multi-rule scenarios</Text>

                <Text style={styles.modalSection}>✅ Answering</Text>
                <Text style={styles.modalText}>Tap your answer. The correct answer turns green and you\'ll see an explanation with the official rule reference.</Text>

                <Text style={styles.modalSection}>⚠️ Misconceptions</Text>
                <Text style={styles.modalText}>A focused quiz on the rules most commonly argued or misunderstood on the field.</Text>

                <Text style={styles.modalSection}>📊 Tracking</Text>
                <Text style={styles.modalText}>Missed questions are saved automatically. Use Review Missed to drill your weak spots. Check Progress to see your score by chapter.</Text>

                <Text style={styles.modalSection}>⚠️ Disclaimer</Text>
                <Text style={styles.modalText}>This app is an educational tool for learning rules -- not a replacement for certified umpires. All final rulings on the field belong to the umpire. Local ground rules may vary.</Text>

                <TouchableOpacity style={styles.modalButton} onPress={() => setShowHowToPlay(false)}>
                  <Text style={styles.modalButtonText}>Got it!</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  if (screen === 'quiz' && current) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          <TopBar title="Quiz" onHome={goHome} />

          <Text style={styles.progress}>
            Question {index + 1} of {questions.length}
            {currentStreak >= 3 ? ` -- ${currentStreak} in a row!` : ''}
          </Text>
          <Text style={styles.meta}>
            {getChapterLabel(current.chapter)} - {getModeLabel(current.mode)} - {formatDifficulty(current.difficulty)}
          </Text>

          <Text style={styles.question}>{current.question}</Text>

          {current.options.map((option, optionIndex) => {
            const isCorrect = optionIndex === current.answerIndex;
            const isSelected = optionIndex === selected;
            let extraStyle = null;

            if (selected !== null) {
              if (isCorrect) extraStyle = styles.correct;
              else if (isSelected) extraStyle = styles.incorrect;
            }

            return (
              <TouchableOpacity
                key={`${current.id}_${optionIndex}`}
                style={[styles.answer, extraStyle]}
                onPress={() => chooseAnswer(optionIndex)}
              >
                <Text style={styles.answerText}>{option}</Text>
              </TouchableOpacity>
            );
          })}

          {showExplanation && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {selected === current.answerIndex ? 'Correct' : 'Not quite'}
              </Text>
              <Text style={styles.cardText}>{current.explanation}</Text>
              <Text style={styles.reference}>Reference: {current.reference}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, selected === null && styles.buttonDisabled]}
            disabled={selected === null}
            onPress={nextQuestion}
          >
            <Text style={styles.buttonText}>
              {index + 1 === questions.length ? 'See Results' : 'Next Question'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'results') {
  const scoreMessage = getScoreMessage();
  const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
  const shouldFireConfetti = pct >= 80;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={[styles.container, styles.centered]}>
        <TopBar title="Results" onHome={goHome} />

        {scoreMessage && (
          <View style={styles.celebrationCard}>
            <Text style={styles.celebrationEmoji}>{scoreMessage.emoji}</Text>
            <Text style={styles.celebrationTitle}>{scoreMessage.title}</Text>
            <Text style={styles.celebrationSubtitle}>{scoreMessage.subtitle}</Text>
          </View>
        )}

        <Text style={styles.resultsTitle}>Final Score</Text>
        <Text style={styles.score}>
          {score} / {questions.length}
        </Text>
        <Text style={styles.cardText}>
          {questions.length > 0
            ? `You got ${pct}% correct.`
            : 'No questions answered.'}
        </Text>

        <View style={styles.resultsCard}>
          <Text style={styles.metaLine}>Section: {getChapterLabel(chapter)}</Text>
          <Text style={styles.metaLine}>Mode: {getModeLabel(mode)}</Text>
          <Text style={styles.metaLine}>Difficulty: {formatDifficulty(difficulty)}</Text>
          <Text style={styles.metaLine}>Quiz Size: {questions.length}</Text>
          <Text style={styles.metaLine}>Missed Saved: {missedQuestions.length}</Text>
          {bestStreak >= 3 && (
            <Text style={styles.streakLine}>Best streak this quiz: {bestStreak} in a row</Text>
          )}
        </View>

        <TouchableOpacity style={styles.button} onPress={restartSameQuiz}>
          <Text style={styles.buttonText}>Play Again</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, missedQuestions.length === 0 && styles.buttonDisabled]}
          onPress={startMissedReview}
          disabled={missedQuestions.length === 0}
        >
          <Text style={styles.secondaryButtonText}>Fix My Mistakes</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => setScreen('progress')}>
          <Text style={styles.secondaryButtonText}>Open Session Progress</Text>
        </TouchableOpacity>

        {shouldFireConfetti && (
          <Confetti count={pct === 100 ? 120 : 70} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
  }


  if (screen === 'paywall') {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          <TopBar title="Game Mode" onHome={goHome} />
          <View style={styles.paywallHero}>
            <Text style={styles.paywallEmoji}>⚡</Text>
            <Text style={styles.paywallTitle}>Game Mode</Text>
            <Text style={styles.paywallSubtitle}>Make the right call in seconds</Text>
          </View>
          <View style={styles.paywallFeatures}>
            {[
              { emoji: '⚾', text: 'Batted ball rulings -- fair, foul, caught, deflected' },
              { emoji: '🏃', text: 'Base running -- force plays, appeals, overruns' },
              { emoji: '💪', text: 'Pitching -- illegal pitches, balks, hit batters' },
              { emoji: '🚫', text: 'Interference -- batter, runner, spectator, umpire' },
              { emoji: '🛑', text: 'Obstruction -- fake tags, blocking base paths' },
              { emoji: '🏏', text: 'Batting -- dropped 3rd strike, infield fly, batting order' },
              { emoji: '🏠', text: 'Scoring -- does the run count?' },
              { emoji: '⚡', text: 'Common calls -- instant answers during live games' },
            ].map((f, i) => (
              <View key={i} style={styles.paywallFeatureRow}>
                <Text style={styles.paywallFeatureEmoji}>{f.emoji}</Text>
                <Text style={styles.paywallFeatureText}>{f.text}</Text>
              </View>
            ))}
          </View>
          <View style={styles.paywallPriceCard}>
            <Text style={styles.paywallPriceLabel}>One-Time Purchase</Text>
            <Text style={styles.paywallPrice}>$2.99</Text>
            <Text style={styles.paywallPriceNote}>Unlock forever -- no subscription</Text>
          </View>
          <TouchableOpacity
            style={[styles.paywallBuyButton, purchasePending && { opacity: 0.6 }]}
            onPress={async () => {
              await handlePurchase();
              if (isPro) {
                setGameModeCategory(null);
                setGameModeAnswers([]);
                setScreen('gamemode');
              }
            }}
            disabled={purchasePending}
          >
            <Text style={styles.paywallBuyButtonText}>
              {purchasePending ? 'Processing...' : 'Unlock Game Mode -- $2.99'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleRestore}>
            <Text style={styles.secondaryButtonText}>Restore Purchase</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={goHome}>
            <Text style={styles.secondaryButtonText}>Maybe Later</Text>
          </TouchableOpacity>


          <Text style={styles.disclaimer}>This app is an educational tool for learning rules -- not a replacement for certified umpires. All final rulings on the field belong to the umpire. Local ground rules may vary.</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'gamemode') {
    if (!gameModeCategory) {
      return (
        <SafeAreaView style={styles.safe}>
          <ScrollView contentContainerStyle={styles.container}>
            <TopBar title="Game Mode ⚡" onHome={goHome} />
            <View style={styles.gmHero}>
              <Text style={styles.gmHeroText}>What just happened?</Text>
              <Text style={styles.gmHeroSub}>Pick a category for an instant ruling</Text>
            </View>
            <View style={styles.gmGrid}>
              {GAME_MODE_CATEGORIES.map((cat) => {
                const isFree = cat.key === 'common';
                return (
                  <TouchableOpacity
                    key={cat.key}
                    style={[styles.gmCatButton, !isPro && !isFree && styles.gmCatLocked]}
                    onPress={() => {
                      if (!isPro && !isFree) {
                        setScreen('paywall');
                        return;
                      }
                      setGameModeCategory(cat.key);
                      setGameModeAnswers([]);
                    }}
                  >
                    <Text style={styles.gmCatEmoji}>{cat.emoji}</Text>
                    <Text style={styles.gmCatLabel}>{cat.label}</Text>
                    {!isPro && !isFree && <Text style={styles.gmCatLockBadge}>🔒</Text>}
                    {isFree && !isPro && <Text style={styles.gmCatFreeBadge}>FREE</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
            {!isPro && (
              <TouchableOpacity style={styles.paywallBuyButton} onPress={() => setScreen('paywall')}>
                <Text style={styles.paywallBuyButtonText}>⚡ Unlock All Categories -- $2.99</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </SafeAreaView>
      );
    }

    const tree = GAME_MODE_TREES[gameModeCategory];
    let node = tree;
    let result = null;

    for (let i = 0; i < gameModeAnswers.length; i++) {
      const opt = node.options[gameModeAnswers[i]];
      if (opt.result) { result = opt.result; break; }
      if (opt.next) { node = opt.next; } else { node = opt; }
    }
    if (!result && node && node.result) result = node.result;

    if (result) {
      return (
        <SafeAreaView style={styles.safe}>
          <ScrollView contentContainerStyle={styles.container}>
            <TopBar title="Game Mode ⚡" onHome={goHome} />
            <View style={styles.gmResultCard}>
              <Text style={styles.gmResultLabel}>THE RULING</Text>
              <Text style={styles.gmResultRuling}>{result.ruling}</Text>
            </View>
            <View style={styles.gmRuleCard}>
              <Text style={styles.gmRuleRef}>{result.rule}</Text>
              <Text style={styles.gmRuleDetail}>{result.detail}</Text>
            </View>
            <TouchableOpacity style={styles.button} onPress={() => { setGameModeCategory(null); setGameModeAnswers([]); }}>
              <Text style={styles.buttonText}>New Ruling</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setGameModeAnswers(gameModeAnswers.slice(0, -1))}>
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          <TopBar title="Game Mode ⚡" onHome={goHome} />
          <View style={styles.gmQuestionCard}>
            <Text style={styles.gmStepLabel}>{GAME_MODE_CATEGORIES.find(c => c.key === gameModeCategory)?.label}</Text>
            <Text style={styles.gmQuestion}>{node.question}</Text>
          </View>
          <View style={{ gap: 10 }}>
            {node.options.map((opt, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.gmOptionButton}
                onPress={() => setGameModeAnswers([...gameModeAnswers, idx])}
              >
                <Text style={styles.gmOptionText}>{opt.label}</Text>
                <Text style={styles.gmOptionArrow}>{'›'}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {gameModeAnswers.length > 0 ? (
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setGameModeAnswers(gameModeAnswers.slice(0, -1))}>
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setGameModeCategory(null)}>
              <Text style={styles.secondaryButtonText}>Categories</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return null;
}

// ============================================================
// GAME MODE DECISION TREE DATA
// ============================================================
const GAME_MODE_CATEGORIES = [
  { key: 'batted_ball', label: 'Batted Ball', emoji: '⚾' },
  { key: 'base_running', label: 'Base Running', emoji: '🏃' },
  { key: 'pitching', label: 'Pitching', emoji: '💪' },
  { key: 'interference', label: 'Interference', emoji: '🚫' },
  { key: 'obstruction', label: 'Obstruction', emoji: '🛑' },
  { key: 'batting', label: 'Batting', emoji: '🏏' },
  { key: 'scoring', label: 'Scoring', emoji: '🏠' },
  { key: 'common', label: 'Common Calls', emoji: '⚡' },
];

const GAME_MODE_TREES = {
  batted_ball: {
    question: 'What happened to the batted ball?',
    options: [
      { label: 'Settled on fair/foul ground', next: {
        question: 'Did it pass first or third base?',
        options: [
          { label: 'Still in infield -- not yet', result: { ruling: 'Fair or Foul based on where it STOPS or is first TOUCHED', rule: 'Rule 2 -- Fair Ball', detail: 'A batted ball in the infield is fair or foul based on where it stops or is first touched by a fielder. Position of the ball on or near the line matters, not the fielder.' } },
          { label: 'Yes -- passed first or third base', result: { ruling: 'Fair or Foul based on position when it CROSSED the base', rule: 'Rule 2 -- Fair Ball', detail: 'Once the ball passes first or third base, fair or foul is determined by the position of the ball when it crossed the bag, not where it lands beyond.' } },
          { label: 'Hit a base', result: { ruling: 'FAIR BALL -- ball in play', rule: 'Rule 2 -- Fair Ball', detail: 'A batted ball that hits a base (first, second, or third) is a fair ball regardless of where it goes afterward.' } },
        ],
      }},
      { label: 'Caught by a fielder', next: {
        question: 'What happened after the catch?',
        options: [
          { label: 'Normal catch -- held it', result: { ruling: 'OUT -- batter is out, ball is live', rule: 'Rule 6.05(a)', detail: 'A fair or foul fly ball legally caught by a fielder retires the batter. Runners may tag up and advance after the catch.' } },
          { label: 'Fielder fell into the stands after catching', result: { ruling: 'OUT recorded -- then DEAD BALL. Each runner advances one base.', rule: 'Rule 5.10(f) / Rule 7.04(b)', detail: 'The catch stands and the batter is out. The ball is then dead and each runner is awarded one base from the base occupied at the time of the pitch.' } },
          { label: 'Juggled but finally held before touching ground', result: { ruling: 'LEGAL CATCH -- batter is out', rule: 'Rule 2 -- Catch', detail: 'A catch is legal if the ball is finally held by any fielder even though juggled, as long as it does not touch the ground.' } },
          { label: 'Fielder collided with wall and dropped it', result: { ruling: 'NOT A CATCH -- ball is live', rule: 'Rule 2 -- Catch', detail: 'It is not a catch if the fielder collides with a wall or another player and drops the ball as a result of that collision.' } },
        ],
      }},
      { label: 'Hit a runner or umpire in fair territory', next: {
        question: 'Had the ball passed any fielder?',
        options: [
          { label: 'No -- hit runner/umpire before passing any fielder', result: { ruling: 'DEAD BALL -- runner is OUT, batter awarded first base', rule: 'Rule 5.09(f)', detail: 'When a fair batted ball hits a runner or umpire in fair territory before passing a fielder (other than the pitcher), the runner is out, ball is dead, and batter goes to first.' } },
          { label: 'Yes -- passed or touched a fielder first', result: { ruling: 'LIVE BALL -- play continues', rule: 'Rule 5.09(f)', detail: 'If the ball has already passed or touched a fielder before hitting a runner or umpire, the ball is live and play continues.' } },
        ],
      }},
      { label: 'Over or through the outfield fence', next: {
        question: 'Where did it go over?',
        options: [
          { label: 'Over fence in fair territory (165ft+ away)', result: { ruling: 'HOME RUN -- batter and all runners score', rule: 'Rule 6.09(d)', detail: 'A fair fly ball clearing the fence at 165 feet or more (Major Division) is a home run. All runners score.' } },
          { label: 'Over fence -- but less than 165 feet from home', result: { ruling: 'GROUND RULE DOUBLE -- batter awarded second base', rule: 'Rule 6.09(d)', detail: 'A fair fly ball clearing the fence at less than 165 feet entitles the batter to second base only, not a home run.' } },
          { label: 'Bounced over or through fence', result: { ruling: 'GROUND RULE DOUBLE -- two bases awarded', rule: 'Rule 6.09(e)', detail: 'A fair ball that bounces and goes over or through the fence is a ground rule double. Batter and all runners are awarded two bases from the base occupied at time of pitch.' } },
        ],
      }},
      { label: 'Deflected by a fielder', next: {
        question: 'Where did the deflection go?',
        options: [
          { label: 'Into the stands in fair territory (165ft+)', result: { ruling: 'HOME RUN', rule: 'Rule 6.09(h)', detail: 'A fair fly deflected by a fielder into the stands in fair territory at 165 feet or more is a home run.' } },
          { label: 'Into the stands in foul territory or under 165ft', result: { ruling: 'GROUND RULE DOUBLE -- two bases', rule: 'Rule 6.09(h)', detail: 'If deflected into foul territory or at a point less than 165 feet from home, the batter is entitled to two bases only.' } },
        ],
      }},
      { label: 'Ball hit twice by the batter', next: {
        question: 'Was it intentional?',
        options: [
          { label: 'Bat accidentally rolled against the ball -- no intent', result: { ruling: 'LIVE BALL -- play continues', rule: 'Rule 6.05(g)', detail: 'If the batter drops the bat and the ball rolls against it in fair territory and in the umpire\'s judgment there was no intention to interfere, the ball is alive and in play.' } },
          { label: 'Batter intentionally hit the ball a second time', result: { ruling: 'Batter is OUT -- ball is dead, no runners advance', rule: 'Rule 6.05(g)', detail: 'After hitting a fair ball, if the bat hits the ball a second time in fair territory intentionally, the batter is out and the ball is dead.' } },
        ],
      }},
      { label: 'Batted ball hits the pitcher', next: {
        question: 'Where did it hit and what happened after?',
        options: [
          { label: 'Hit the pitcher then went to an infielder', result: { ruling: 'LIVE BALL -- play continues', rule: 'Rule 5.09(f)', detail: 'If a fair ball touches the pitcher and then is fielded by a fielder, the ball is in play. The pitcher is considered to have deflected the ball.' } },
          { label: 'Hit the pitcher before any fielder touched it', result: { ruling: 'LIVE BALL -- pitcher is treated like any fielder', rule: 'Rule 5.09(f)', detail: 'A fair ball that touches the pitcher in fair territory is treated the same as touching any fielder. The ball remains live.' } },
        ],
      }},
      { label: 'Fielder throws glove or cap at a batted ball', next: {
        question: 'Did the glove or cap touch the ball?',
        options: [
          { label: 'Yes -- glove thrown and touched the ball', result: { ruling: 'THREE BASES awarded -- ball remains in play', rule: 'Rule 7.05(c)', detail: 'If a fielder deliberately throws a glove and it touches a fair ball, the batter and all runners are awarded three bases. The ball is in play so the batter may attempt to score at their own risk.' } },
          { label: 'Yes -- cap or uniform piece touched the ball', result: { ruling: 'THREE BASES awarded -- ball remains in play', rule: 'Rule 7.05(b)', detail: 'If a fielder deliberately touches a fair ball with a cap, mask, or any part of their uniform detached from its proper place, three bases are awarded. Ball is in play.' } },
          { label: 'No -- missed the ball', result: { ruling: 'No award -- but unsportsmanlike conduct may be called', rule: 'Rule 7.05', detail: 'If the thrown glove or cap misses the ball, no automatic award is made. However the act may be considered unsportsmanlike.' } },
        ],
      }},
      { label: 'Ball lodges in or goes through the outfield fence', next: {
        question: 'What happened exactly?',
        options: [
          { label: 'Ball went through an opening in the fence', result: { ruling: 'GROUND RULE DOUBLE -- two bases from time of pitch', rule: 'Rule 6.09(f)', detail: 'A fair ball that goes through or under a fence, through a scoreboard, or through shrubbery entitles the batter and all runners to advance two bases.' } },
          { label: 'Ball became lodged or stuck in the fence', result: { ruling: 'GROUND RULE DOUBLE -- two bases from time of pitch', rule: 'Rule 6.09(f)', detail: 'A fair ball that sticks in the fence or scoreboard is a ground rule double. Batter and runners are awarded two bases from their position at the time of the pitch.' } },
        ],
      }},
      { label: 'Batter running to first -- did they interfere?', next: {
        question: 'What happened in the running lane?',
        options: [
          { label: 'Batter-runner ran outside the three-foot lane and interfered with fielder taking throw', result: { ruling: 'Batter-runner is OUT', rule: 'Rule 6.05(j)', detail: 'In the last half of the distance from home to first, if the batter-runner runs outside the runner\'s lane and in the umpire\'s judgment interferes with the fielder taking the throw, the batter-runner is out.' } },
          { label: 'Batter-runner ran outside the lane to avoid a fielder fielding a batted ball', result: { ruling: 'LEGAL -- exception to the lane rule', rule: 'Rule 6.05(j)', detail: 'The batter-runner may run outside the lane or inside the foul line to avoid a fielder attempting to field a batted ball. This is a specific exception.' } },
        ],
      }},
    ],
  },

  base_running: {
    question: 'What happened on the bases?',
    options: [
      { label: 'Runner missed a base', next: {
        question: 'Did the defense appeal before next pitch?',
        options: [
          { label: 'Yes -- appealed properly', result: { ruling: 'Runner is OUT on appeal', rule: 'Rule 7.10(b)', detail: 'A runner who misses a base may be called out on appeal. The defense must appeal before the next pitch, play, or attempted play. The ball must be live.' } },
          { label: 'No appeal made', result: { ruling: 'SAFE -- no appeal, no call', rule: 'Rule 7.10', detail: 'Missing a base is only enforced on a proper appeal by the defense before the next pitch. If no appeal, the runner is safe.' } },
        ],
      }},
      { label: 'Runner left base early on fly ball', next: {
        question: 'Did the defense appeal?',
        options: [
          { label: 'Yes -- appealed before next pitch', result: { ruling: 'Runner is OUT on appeal', rule: 'Rule 7.10(a)', detail: 'After a fly ball is caught, a runner must tag up (retouch from the base after the catch). Leaving early and failing to properly retouch is an appeal play.' } },
          { label: 'No appeal', result: { ruling: 'SAFE -- no appeal made', rule: 'Rule 7.10(a)', detail: 'Leaving early is only called on a proper appeal by the defense. If no appeal is made, the runner is safe.' } },
        ],
      }},
      { label: 'Batter-runner overran first base', next: {
        question: 'Which direction did the runner turn?',
        options: [
          { label: 'Toward foul territory or straight back', result: { ruling: 'SAFE -- cannot be tagged out', rule: 'Rule 7.08(c)', detail: 'A batter-runner who overruns first base and immediately returns without making a move toward second cannot be tagged out.' } },
          { label: 'Made a move toward second base', result: { ruling: 'Can be TAGGED OUT', rule: 'Rule 7.08(c)', detail: 'If the batter-runner turns toward second after overrunning first, they may be tagged out if a play is made on them.' } },
        ],
      }},
      { label: 'Two runners on same base', next: {
        question: 'Is it a force play situation?',
        options: [
          { label: 'Yes -- force play', result: { ruling: 'Trailing runner is OUT -- tag the base', rule: 'Rule 7.03', detail: 'When two runners are on the same base and a force exists, the trailing runner is out. Tag the base to retire them.' } },
          { label: 'No -- not a force play', result: { ruling: 'Leading runner is entitled to the base -- TAG the trailing runner', rule: 'Rule 7.03', detail: 'Without a force, the lead runner is entitled to the base. Tag the runner who just arrived to put them out.' } },
        ],
      }},
      { label: 'Runner passed another runner', options: [], result: { ruling: 'Runner who passed is AUTOMATICALLY OUT', rule: 'Rule 7.08(h)', detail: 'A runner is automatically out when they pass a preceding runner before that runner is out. No tag or appeal needed.' } },
      { label: 'Runner ran more than 3 feet out of base path', options: [], result: { ruling: 'Runner is OUT', rule: 'Rule 7.08(a)(1)', detail: 'A runner is out when running more than three feet away from the direct base path to avoid a tag. The base path is established at the moment the tag attempt occurs.' } },
      { label: 'Runner hit by a thrown ball', options: [], result: { ruling: 'LIVE BALL -- play continues, runner is NOT out', rule: 'Rule 5.08', detail: 'If a thrown ball accidentally touches a base coach or a pitched or thrown ball touches an umpire, the ball is alive and in play. A runner being hit by a thrown ball is not automatically out -- the ball remains live.' } },
      { label: 'Runner interfered with a fielder on a batted ball', options: [], result: { ruling: 'Runner is OUT -- ball is dead', rule: 'Rule 7.09(j)', detail: 'Any runner is out when they fail to avoid a fielder who is attempting to field a batted ball. The ball is dead and no other runners may advance, except those forced.' } },
      { label: 'Coach physically assisted a runner', next: {
        question: 'Was a play being made on the assisted runner?',
        options: [
          { label: 'Yes -- play was being made on them', result: { ruling: 'DEAD BALL -- runner is out, all runners return', rule: 'Rule 7.09(h)', detail: 'When a play is being made on the assisted runner and the coach touches or holds the runner, the runner is out and the ball is dead. All runners return to bases occupied at the time of the interference.' } },
          { label: 'No -- no play being made on them', result: { ruling: 'DELAYED DEAD BALL -- runner is out but play continues', rule: 'Rule 7.09(h) A.R.', detail: 'If no play is being made on the assisted runner, the runner is out but play continues as a delayed dead ball.' } },
        ],
      }},
      { label: 'Runner intentionally kicked a batted ball to break up a double play', options: [], result: { ruling: 'DEAD BALL -- runner AND batter-runner are BOTH out', rule: 'Rule 7.09(f)', detail: 'If a runner willfully and deliberately interferes with a batted ball or fielder with obvious intent to break up a double play, the ball is dead, the runner is out, and the batter-runner is also called out.' } },
      { label: 'Runner ran bases in reverse order to confuse the defense', options: [], result: { ruling: 'Runner is immediately OUT -- umpire calls Time', rule: 'Rule 7.08(i)', detail: 'Any runner is out when, after acquiring legal possession of a base, they run the bases in reverse order for the purpose of confusing the defense or making a travesty of the game.' } },
      { label: 'Base was dislodged during a play', options: [], result: { ruling: 'Runner is SAFE -- may use dislodged bag or original position', rule: 'Rule 7.08(c) A.R.2', detail: 'If the impact of a runner breaks a base loose from its position, no play can be made on that runner at that base if the runner had reached the base safely. Following runners may touch the dislodged bag or the original location.' } },
      { label: 'Runner missed home plate and walked away', next: {
        question: 'What did the defense do?',
        options: [
          { label: 'Fielder held ball touching home and appealed', result: { ruling: 'Runner is OUT on appeal', rule: 'Rule 7.08(k)', detail: 'If the runner misses home plate and makes no attempt to return, and a fielder holds the ball touching home base and appeals, the runner is out.' } },
          { label: 'Runner missed but immediately tried to return and touch it', result: { ruling: 'Runner must be TAGGED -- not an appeal play', rule: 'Rule 7.08(k) Note', detail: 'This rule applies only where the runner is heading to the bench. If the runner misses the plate and immediately tries to touch it, the fielder must tag the runner before they touch the plate.' } },
        ],
      }},
    ],
  },

  pitching: {
    question: 'What happened with the pitch or pitcher?',
    options: [
      { label: 'Illegal pitch -- no runners on (Major/Minor)', options: [], result: { ruling: 'BALL added to the count', rule: 'Rule 8.05 / Rule 2', detail: 'In Little League (Major) Division and below with no runners on base, an illegal pitch is called a ball. There are no balks in Major/Minor Division.' } },
      { label: 'Illegal pitch -- runners on base (Major/Minor)', options: [], result: { ruling: 'DEAD BALL -- BALL added to count, runners do not advance', rule: 'Rule 8.05', detail: 'In Major/Minor League, an illegal pitch with runners on base is still just a ball added to the count. Runners do not advance. NOTE: There is NO balk in Major/Minor League.' } },
      { label: 'Balk -- Intermediate / Junior / Senior League', options: [], result: { ruling: 'DEAD BALL -- all runners advance one base', rule: 'Rule 8.05', detail: 'A balk in Intermediate/Junior/Senior League results in all runners advancing one base. The balk applies ONLY to these divisions -- not Major/Minor.' } },
      { label: 'Pitched ball lodged in catcher or umpire equipment', options: [], result: { ruling: 'DEAD BALL -- runners advance one base', rule: 'Rule 5.09(g)', detail: 'When a pitched ball lodges in the catcher\'s or umpire\'s mask or equipment, the ball is dead and each runner advances one base.' } },
      { label: 'Pitch hit the batter', next: {
        question: 'Where was the pitch and did the batter swing?',
        options: [
          { label: 'Outside strike zone -- batter did not swing', result: { ruling: 'DEAD BALL -- batter awarded first base, forced runners advance', rule: 'Rule 6.08(b)', detail: 'When a pitched ball not in the strike zone touches the batter and the batter did not swing, the batter is awarded first base.' } },
          { label: 'In the strike zone', result: { ruling: 'STRIKE -- batter not awarded first base', rule: 'Rule 6.08(b)', detail: 'If the pitch is in the strike zone when it touches the batter, it is a strike. The batter is not awarded first base.' } },
          { label: 'Batter swung at the pitch', result: { ruling: 'STRIKE -- batter not awarded first base', rule: 'Rule 6.08(b)', detail: 'If the batter swings at a pitch and is hit, it counts as a strike and the batter is not awarded first base.' } },
        ],
      }},
      { label: 'Pitcher went to mouth while on rubber', options: [], result: { ruling: 'BALL called -- warning issued. If pitch was hit, manager may accept the play.', rule: 'Rule 8.02(a)(1)', detail: 'The pitcher may not bring the pitching hand to the mouth while in contact with the pitcher\'s plate. A ball is called and the pitcher is warned. Exception: allowed inside the 10-foot circle if the hand is wiped before contacting the ball.' } },
      { label: 'Pitcher accidentally drops the ball while on the rubber', next: {
        question: 'Are there runners on base?',
        options: [
          { label: 'Yes -- runners on base', result: { ruling: 'ILLEGAL PITCH (Major/Minor) or BALK (Intermediate+) -- runners advance', rule: 'Rule 8.05(j)', detail: 'The pitcher accidentally or intentionally dropping the ball while touching the rubber is an illegal pitch in Major/Minor League and a balk in Intermediate/Junior/Senior League.' } },
          { label: 'No -- bases empty', result: { ruling: 'If ball crosses foul line -- BALL called. Otherwise -- NO PITCH.', rule: 'Rule 8.01(d)', detail: 'A ball which slips out of the pitcher\'s hand and crosses the foul line shall be called a ball. Otherwise it is no pitch with bases empty.' } },
        ],
      }},
      { label: 'Pitcher takes too long between pitches -- bases empty', options: [], result: { ruling: 'BALL called after 20 seconds', rule: 'Rule 8.04', detail: 'When the bases are unoccupied, the pitcher must deliver the ball within 20 seconds after receiving it. Each violation results in a ball being called.' } },
      { label: 'Pitcher steps off rubber -- wild throw to a base', options: [], result: { ruling: 'Treated as a wild throw by an INFIELDER -- two base award if goes out of play', rule: 'Rule 8.01(e)', detail: 'If the pitcher removes the pivot foot from contact with the pitcher\'s plate by stepping backward, the pitcher becomes an infielder and a wild throw is treated the same as any other infielder.' } },
      { label: 'Manager comes out to the mound -- is it a visit?', next: {
        question: 'Who did the manager speak to?',
        options: [
          { label: 'Spoke to the pitcher', result: { ruling: 'YES -- charged as a visit. Second visit same inning = pitcher removed (Major Division)', rule: 'Rule 8.06(a)', detail: 'Any conference with the pitcher is a charged visit. In Major Division, the second visit in the same inning requires the pitcher to be removed.' } },
          { label: 'Spoke only to another fielder -- not the pitcher', result: { ruling: 'YES -- still charged as a visit to the pitcher', rule: 'Rule 8.06(c)', detail: 'A manager or coach who is granted a timeout to talk to ANY defensive player is charged with a visit to the pitcher, regardless of whether the pitcher was spoken to.' } },
          { label: 'Evaluating pitcher after an injury', result: { ruling: 'NOT charged as a visit -- injury evaluation exception', rule: 'Rule 8.06 A.R.2', detail: 'A conference to evaluate a player\'s condition after an injury is not counted as a visit. The manager should advise the umpire of the purpose.' } },
          { label: 'Manager comes out only to make a pitching change', result: { ruling: 'NOT charged as a visit -- if no player is spoken to before the change', rule: 'Rule 8.06 A.R.1', detail: 'When a manager requests timeout to make a pitching change, it is not considered a visit provided the manager makes the substitution before speaking to any defensive player.' } },
        ],
      }},
    ],
  },

  interference: {
    question: 'Who interfered?',
    options: [
      { label: 'Batter interfered with catcher', next: {
        question: 'Was a runner stealing?',
        options: [
          { label: 'Yes -- runner was stealing', result: { ruling: 'DEAD BALL -- batter is OUT, runner returns', rule: 'Rule 6.06(c)', detail: 'When the batter interferes with the catcher attempting to retire a stealing runner, the batter is out and the runner must return to their base.' } },
          { label: 'No runner stealing', result: { ruling: 'DEAD BALL -- batter is OUT', rule: 'Rule 6.06(c)', detail: 'Batter interference with the catcher results in the batter being called out.' } },
        ],
      }},
      { label: 'Runner interfered with fielder', next: {
        question: 'What was the fielder doing?',
        options: [
          { label: 'Fielding a batted ball', result: { ruling: 'DEAD BALL -- runner is OUT', rule: 'Rule 7.09(j)', detail: 'A runner who fails to avoid a fielder attempting to field a batted ball is out. The ball is dead.' } },
          { label: 'Trying to complete a double play -- runner did it deliberately', result: { ruling: 'DEAD BALL -- runner OUT and batter-runner also OUT', rule: 'Rule 7.09(f)', detail: 'If a runner willfully interferes to break up a double play, both the runner and batter-runner are called out. No bases may be run.' } },
        ],
      }},
      { label: 'Spectator interfered with live ball', next: {
        question: 'What did the spectator affect?',
        options: [
          { label: 'Reached out and touched a live ball', result: { ruling: 'DEAD BALL -- umpire places runners using judgment', rule: 'Rule 3.16', detail: 'When a spectator reaches into the field and touches a live ball, the ball is dead. The umpire awards bases as needed to nullify the interference.' } },
          { label: 'Prevented a fielder from catching a fly ball', result: { ruling: 'DEAD BALL -- batter is OUT', rule: 'Rule 3.16 A.R.', detail: 'If spectator interference clearly prevents a fielder from catching a fly ball, the umpire shall declare the batter out.' } },
        ],
      }},
      { label: 'Umpire interfered', next: {
        question: 'What happened?',
        options: [
          { label: 'Umpire blocked catcher throw to retire runner', result: { ruling: 'UMPIRE INTERFERENCE -- runner returns to base', rule: 'Rule 2 -- Umpire Interference', detail: 'Umpire interference occurs when an umpire hinders the catcher from throwing to retire a runner. Only the plate umpire may interfere, and only on a cleanly caught ball.' } },
          { label: 'Fair ball hit umpire before passing any fielder', result: { ruling: 'DEAD BALL -- batter awarded first, forced runners advance', rule: 'Rule 5.09(f)', detail: 'When a fair ball touches an umpire in fair territory before passing a fielder, the ball is dead. Batter is awarded first and runners advance if forced.' } },
          { label: 'Fair ball hit umpire AFTER passing a fielder', result: { ruling: 'LIVE BALL -- play continues', rule: 'Rule 5.09(f)', detail: 'If a fair ball touches an umpire after having passed a fielder other than the pitcher, or after having touched a fielder, the ball is in play.' } },
        ],
      }},
      { label: 'Batter-runner interfered to break up a double play', options: [], result: { ruling: 'DEAD BALL -- batter-runner OUT and the closest runner to home is also OUT', rule: 'Rule 7.09(g)', detail: 'If the batter-runner willfully and deliberately interferes with a batted ball or fielder to break up a double play, the ball is dead, the batter-runner is out, and the runner who advanced closest to home plate is also out.' } },
      { label: 'Retired runner interfered with a following play', options: [], result: { ruling: 'Runner on whom the play is being made is OUT', rule: 'Rule 7.09(e)', detail: 'Any batter or runner who has just been retired and then hinders or impedes any following play being made on a runner -- the runner being played on is declared out for the interference of the teammate.' } },
      { label: 'Offensive team members crowded around a base to confuse fielders', options: [], result: { ruling: 'Runner is declared OUT for teammate interference', rule: 'Rule 7.09(d)', detail: 'Any member or members of the offensive team who stand or gather around any base to which a runner is advancing, to confuse or hinder fielders, shall cause that runner to be declared out.' } },
      { label: 'Catcher interfered with the batter -- but batter reached base safely', options: [], result: { ruling: 'Offense may ACCEPT the play OR take the interference penalty', rule: 'Rule 6.08(c)', detail: 'If the catcher interferes with the batter but the batter reaches first base on a hit, error, or otherwise, and all runners advance at least one base, the play proceeds without reference to the interference. The manager may elect to accept the play instead.' } },
      { label: 'Batter intentionally deflected a foul ball while running to first', options: [], result: { ruling: 'Batter-runner is OUT -- ball is dead', rule: 'Rule 6.05(h)', detail: 'After hitting or bunting a foul ball, the batter-runner is out if they intentionally deflect the course of the ball in any manner while running to first base. The ball is dead and no runners may advance.' } },
    ],
  },

  obstruction: {
    question: 'What type of obstruction occurred?',
    options: [
      { label: 'Fielder without ball blocked runner -- play BEING made on that runner', options: [], result: { ruling: 'IMMEDIATE DEAD BALL -- runner awarded base they were heading to', rule: 'Rule 7.06(a)', detail: 'When obstruction occurs while a play is being made on the obstructed runner, the ball is immediately dead. The obstructed runner is awarded at least the base they were heading to. Any preceding runners forced to advance also advance without liability.' } },
      { label: 'Fielder without ball blocked runner -- NO play being made on them', options: [], result: { ruling: 'DELAYED DEAD BALL -- play continues, umpire awards bases after', rule: 'Rule 7.06(b)', detail: 'When obstruction occurs with no play on the obstructed runner, the umpire calls obstruction and play continues. After all action stops, the umpire awards bases to nullify the obstruction. The obstructed runner gets at least the base they were going to.' } },
      { label: 'Fielder used a fake tag without the ball', options: [], result: { ruling: 'OBSTRUCTION -- fake tag is obstruction even without contact', rule: 'Rule 2 -- Obstruction', detail: 'A fake tag is explicitly defined as obstruction in the rules. The fielder need not make physical contact -- the act of faking a tag to impede the runner is sufficient.' } },
      { label: 'Catcher blocked home plate without the ball', options: [], result: { ruling: 'OBSTRUCTION -- runner awarded home plate', rule: 'Rule 7.06 / Rule 2', detail: 'Obstruction shall be called on a catcher or fielder who blocks home plate from a base runner while not in possession of the ball.' } },
      { label: 'Fielder standing in the base path without the ball', options: [], result: { ruling: 'OBSTRUCTION -- fielder must have the ball to block the path', rule: 'Rule 2 -- Obstruction Note', detail: 'Obstruction shall be called on a defensive player who blocks off a base, base line, or home plate from a base runner while not in possession of the ball.' } },
      { label: 'Obstructed runner advances beyond the awarded base', options: [], result: { ruling: 'Runner advances at own risk -- can be tagged out beyond the awarded base', rule: 'Rule 7.06(b) Note 1', detail: 'When the ball is not dead on obstruction and the obstructed runner advances beyond the base the umpire would have awarded, the runner does so at their own risk and may be tagged out. This is a judgment call.' } },
      { label: 'Runner is obstructed but still scores -- does the run count?', options: [], result: { ruling: 'YES -- if the runner would have scored without obstruction, the run counts', rule: 'Rule 7.06', detail: 'The purpose of the obstruction rule is to give the runner what they would have had without interference. If the umpire judges the runner would have scored, the run counts even if they were thrown out.' } },
    ],
  },

  batting: {
    question: 'What happened at the plate?',
    options: [
      { label: 'Third strike not caught by catcher', next: {
        question: 'Is first base occupied with fewer than 2 outs?',
        options: [
          { label: 'Yes -- first base occupied, less than 2 outs', result: { ruling: 'Batter is OUT -- cannot run to first', rule: 'Rule 6.05(b)(2)', detail: 'When first base is occupied before two are out, the batter is automatically out on an uncaught third strike and may not attempt to run to first.' } },
          { label: 'No -- first base empty OR two outs', result: { ruling: 'Batter may RUN to first base', rule: 'Rule 6.09(b)', detail: 'On an uncaught third strike with first base unoccupied or with two outs, the batter becomes a runner and must be put out at first.' } },
        ],
      }},
      { label: 'Infield fly situation', next: {
        question: 'What are the base/out conditions?',
        options: [
          { label: 'Runners on 1st and 2nd OR bases loaded, fewer than 2 outs', result: { ruling: 'INFIELD FLY -- batter is automatically OUT', rule: 'Rule 2 -- Infield Fly', detail: 'The umpire calls Infield Fly and the batter is automatically out. The ball is alive -- runners may advance at their own risk or tag up.' } },
          { label: 'Other situation', result: { ruling: 'No infield fly -- normal play', rule: 'Rule 2 -- Infield Fly', detail: 'The infield fly rule only applies with runners on 1st and 2nd, or bases loaded, with fewer than two outs. Not on line drives or bunts.' } },
        ],
      }},
      { label: 'Batter bunted foul on third strike', options: [], result: { ruling: 'Batter is OUT -- foul bunt on third strike is a strikeout', rule: 'Rule 6.05(c)', detail: 'If a batter bunts foul on the third strike, they are out. This applies even if the catcher drops the ball.' } },
      { label: 'Batter hit ball with one or both feet outside box', options: [], result: { ruling: 'Batter is OUT for illegal action', rule: 'Rule 6.06(a)', detail: 'If a batter hits a ball fair or foul while out of the batter\'s box (one or both feet entirely on the ground outside), the batter is called out.' } },
      { label: 'Batting out of order', next: {
        question: 'Did the defense appeal before the next pitch?',
        options: [
          { label: 'Yes -- appealed before next pitch', result: { ruling: 'PROPER batter is called OUT -- runners return', rule: 'Rule 6.07(b)', detail: 'When the defense appeals batting out of order before the next pitch, the proper batter (who should have batted) is called out. Any advancement is nullified.' } },
          { label: 'No -- pitch was delivered first', result: { ruling: 'IMPROPER batter becomes the PROPER batter -- play stands', rule: 'Rule 6.07(c)', detail: 'If no appeal is made before the next pitch, the improper batter\'s turn is legalized and becomes the proper batter.' } },
        ],
      }},
      { label: 'Batter stepped from one box to the other while pitcher was ready', options: [], result: { ruling: 'Batter is OUT for illegal action', rule: 'Rule 6.06(b)', detail: 'A batter is out for illegal action when stepping from one batter\'s box to the other while the pitcher is in position ready to pitch.' } },
      { label: 'Infielder intentionally dropped a fly ball with runners on', next: {
        question: 'Which bases were occupied with fewer than two outs?',
        options: [
          { label: 'First base only occupied', result: { ruling: 'Ball DEAD -- batter OUT, runner returns to first', rule: 'Rule 6.05(k)', detail: 'When an infielder intentionally drops a fair fly ball with first base occupied and fewer than two outs, the ball is dead and the batter is out. Runners return to their original bases.' } },
          { label: 'First and second, or bases loaded', result: { ruling: 'Ball DEAD -- batter OUT, all runners return', rule: 'Rule 6.05(k)', detail: 'When an infielder intentionally drops a fair fly ball or line drive with first and second or bases loaded occupied before two are out, the ball is dead and the batter is out.' } },
          { label: 'No force situation -- other base combination', result: { ruling: 'LIVE BALL -- no penalty', rule: 'Rule 6.05(k) A.R.', detail: 'The batter is not out if the infielder permits the ball to drop untouched to the ground and there is no force situation, except when the Infield Fly rule applies.' } },
        ],
      }},
      { label: 'Illegal bat discovered after the play', next: {
        question: 'When was the illegal bat discovered?',
        options: [
          { label: 'Before the next batter enters the box', result: { ruling: 'Ball DEAD -- batter OUT -- manager and batter EJECTED', rule: 'Rule 6.06(d)', detail: 'If discovered before the next batter enters, the ball is dead, the batter is out, runners return, and both the manager and batter are ejected. The defense may decline the penalty and accept the play.' } },
          { label: 'After the next batter has entered the box', result: { ruling: 'Play STANDS -- too late to call it', rule: 'Rule 6.06(d)', detail: 'Once the next batter enters the box following the turn at bat of the player who used an illegal bat, it is too late to call the infraction.' } },
        ],
      }},
      { label: 'Batter left the box after pitcher was set -- no pitch yet', next: {
        question: 'Which division?',
        options: [
          { label: 'Major/Minor Division', result: { ruling: 'After warning -- STRIKE called, ball is DEAD', rule: 'Rule 6.02(c)', detail: 'In Major/Minor Division after one warning, the umpire shall call a strike with no pitch thrown and the ball is dead. Runners may not advance.' } },
          { label: 'Intermediate/Junior/Senior League', result: { ruling: 'After warning -- STRIKE called, ball is LIVE', rule: 'Rule 6.02(c)', detail: 'In Intermediate/Junior/Senior League after a warning, a strike is called with no pitch thrown but the ball is live and runners may advance at their own risk.' } },
        ],
      }},
      { label: 'Intentional walk -- does the pitcher have to throw four balls?', options: [], result: { ruling: 'NO -- defense just notifies the umpire', rule: 'Rule 6.08(a)(2)', detail: 'The defense may elect to intentionally walk a batter by announcing the decision to the plate umpire at any time during the at-bat. No pitches need to be thrown. The ball is dead and no runners advance unless forced.' } },
      { label: 'Batter hit by pitch while attempting to bunt', options: [], result: { ruling: 'STRIKE -- not awarded first base when batter swings', rule: 'Rule 6.08(b)', detail: 'If a batter is hit by a pitch while making a bona fide attempt to bunt (swing), the pitch counts as a strike and the batter is not awarded first base.' } },
    ],
  },

  scoring: {
    question: 'Does the run count?',
    options: [
      { label: 'Run scored on same play as third out', next: {
        question: 'How was the third out made?',
        options: [
          { label: 'Force play -- runner forced to a base', result: { ruling: 'Run does NOT count', rule: 'Rule 4.09(a)', detail: 'No run may score when the third out is a force play, regardless of when the runner crossed home plate. This includes the batter-runner being thrown out at first.' } },
          { label: 'Tag out on a runner not being forced', result: { ruling: 'Run COUNTS if runner touched home BEFORE the out was made', rule: 'Rule 4.09(a)', detail: 'On a non-force third out, it is a time play. The run counts if the runner touched home plate before the fielder completed the third out.' } },
          { label: 'Caught fly ball for third out', result: { ruling: 'Run COUNTS if runner tagged up and scored BEFORE the catch', rule: 'Rule 4.09(a)', detail: 'If a runner legally tags up and scores before the fly ball is caught for the third out, the run counts. This is a time play.' } },
          { label: 'Batter struck out for third out', result: { ruling: 'Run does NOT count', rule: 'Rule 4.09(a)', detail: 'No run may score when the third out is the batter being retired before reaching first base, including strikeouts.' } },
        ],
      }},
      { label: 'Appeal play created the third out', next: {
        question: 'Was the appeal the third out?',
        options: [
          { label: 'Yes -- appeal was the third out', result: { ruling: 'Run does NOT count', rule: 'Rule 4.09(a) Exception 3', detail: 'No run scores if the third out is a preceding runner declared out on appeal for failing to touch a base.' } },
          { label: 'No -- not the third out', result: { ruling: 'Run COUNTS', rule: 'Rule 4.09(a)', detail: 'If the appeal is not for the third out, any runs scored before the appeal was made count.' } },
        ],
      }},
      { label: 'Winning run scored on a bases-loaded walk or HBP', options: [], result: { ruling: 'Game does NOT end until the forced runner touches home AND batter-runner touches first', rule: 'Rule 4.09(b)', detail: 'When the winning run is scored on a walk, hit batter, or other play with bases full that forces a runner from third, the umpire shall not declare the game ended until the runner touches home and the batter-runner touches first.' } },
      { label: 'Home run -- batter-runner passed a preceding runner', next: {
        question: 'Was the batter-runner called out for passing?',
        options: [
          { label: 'Yes -- batter-runner was called out', result: { ruling: 'Batter-runner is out but preceding runner\'s run COUNTS', rule: 'Rule 7.08(h) / Rule 4.11(c)', detail: 'The batter-runner is automatically out for passing a preceding runner. However, because it is a home run, the preceding runner is still entitled to score. The run counts.' } },
          { label: 'No -- they did not pass anyone', result: { ruling: 'Home run -- all runners score normally', rule: 'Rule 4.11(c)', detail: 'A fair ball clearing the fence is a home run and all runners including the batter-runner are entitled to score as long as they touch all bases.' } },
        ],
      }},
      { label: 'Interference by batter while run scores', next: {
        question: 'How many outs were there?',
        options: [
          { label: 'Fewer than two outs', result: { ruling: 'Runner is OUT -- run does NOT count', rule: 'Rule 7.08(g)', detail: 'With fewer than two outs, if the batter interferes with a play at home plate, the runner attempting to score is out and the run does not count.' } },
          { label: 'Two outs', result: { ruling: 'Batter is OUT -- run does NOT count', rule: 'Rule 7.08(g)', detail: 'With two outs, batter interference puts the batter out and no run counts regardless of when the runner touched home.' } },
        ],
      }},
      { label: 'Runner left base early on a fly ball -- run scored before appeal', next: {
        question: 'Was the early departure the third out on appeal?',
        options: [
          { label: 'Yes -- third out on appeal', result: { ruling: 'Run does NOT count', rule: 'Rule 4.09(a)', detail: 'If an appeal on a runner leaving early results in the third out, no runs score on the play.' } },
          { label: 'No -- not the third out', result: { ruling: 'Run COUNTS -- runner is out but the run scored before the appeal', rule: 'Rule 4.09(a)', detail: 'If the appeal is not for the third out, the run counts even though the runner who left early is called out.' } },
        ],
      }},
    ],
  },

  common: {
    question: 'Pick a common call:',
    options: [
      { label: 'Obstruction vs Interference -- what is it?', options: [], result: { ruling: 'OBSTRUCTION = defense impedes runner. INTERFERENCE = offense impedes fielder.', rule: 'Rule 2', detail: 'Memory tip: Obstruction is on the Defense (fielder blocking). Interference is on the Offense (runner or batter hindering a fielder). Both result in dead ball awards.' } },
      { label: 'Force play -- is the force still on?', next: {
        question: 'Was the lead runner retired first?',
        options: [
          { label: 'Yes -- lead runner was put out', result: { ruling: 'FORCE REMOVED -- trailing runner must be TAGGED', rule: 'Rule 2 -- Force Play', detail: 'Once the lead runner is retired, the force play is removed. Any following runner must now be tagged, not just beaten to the base.' } },
          { label: 'No -- lead runner is still running', result: { ruling: 'FORCE STILL IN EFFECT -- step on base for out', rule: 'Rule 2 -- Force Play', detail: 'As long as the batter-runner is advancing and the lead runner has not been retired, all force plays remain in effect.' } },
        ],
      }},
      { label: 'Foul tip -- what happens?', options: [], result: { ruling: 'STRIKE -- ball is LIVE if caught by the catcher', rule: 'Rule 2 -- Foul Tip', detail: 'A foul tip goes sharp and direct from the bat to the catcher\'s hands and is legally caught. It is a strike and the ball is LIVE -- runners may attempt to steal.' } },
      { label: 'Infield fly -- can runners advance?', options: [], result: { ruling: 'YES -- runners may advance at their own risk', rule: 'Rule 2 -- Infield Fly', detail: 'On an infield fly the ball is alive. Runners may advance at the risk of the ball being caught, or retouch and advance after the ball is touched. The batter is automatically out.' } },
      { label: 'Runner hit by batted ball in fair territory', options: [], result: { ruling: 'Runner is OUT -- DEAD BALL -- batter goes to first', rule: 'Rule 5.09(f)', detail: 'When a fair batted ball hits a runner in fair territory before passing a fielder, the runner is out, the ball is dead, and the batter is awarded first base.' } },
      { label: 'Does the run count on a third out?', next: {
        question: 'Was the third out a force play?',
        options: [
          { label: 'Yes -- force out', result: { ruling: 'Run does NOT count', rule: 'Rule 4.09(a)', detail: 'No run scores when the third out is a force play, regardless of when the runner crossed home plate.' } },
          { label: 'No -- tag out or fly ball', result: { ruling: 'Run COUNTS if runner touched home BEFORE the out', rule: 'Rule 4.09(a)', detail: 'On a non-force third out it is a time play. The run counts if the runner touched home before the fielder recorded the out.' } },
        ],
      }},
      { label: 'Catch or trap -- did the fielder catch it?', next: {
        question: 'What happened after the fielder touched the ball?',
        options: [
          { label: 'Fielder had secure possession before it hit the ground', result: { ruling: 'CATCH -- batter is out', rule: 'Rule 2 -- Catch', detail: 'A legal catch requires secure possession in the hand or glove before the ball touches the ground, and the fielder must hold it long enough to prove complete control.' } },
          { label: 'Ball hit the ground before or during the catch attempt', result: { ruling: 'NOT a catch -- ball is in play', rule: 'Rule 2 -- Catch', detail: 'If the ball touches the ground before or during the fielder securing possession, it is not a catch. The ball is in play and runners may advance.' } },
          { label: 'Fielder juggled it but held it before it hit the ground', result: { ruling: 'LEGAL CATCH -- juggled catches count', rule: 'Rule 2 -- Catch', detail: 'A catch is legal if the ball is finally held by any fielder even though juggled, as long as it does not touch the ground. Runners may leave the instant the first fielder touches the ball.' } },
          { label: 'Fielder caught it then dropped it colliding with a wall', result: { ruling: 'NOT a catch -- collision caused the drop', rule: 'Rule 2 -- Catch', detail: 'It is not a catch if the fielder collides with a wall or another player and drops the ball as a result of that collision.' } },
        ],
      }},
      { label: 'Tag up -- when can runners leave?', next: {
        question: 'What happened?',
        options: [
          { label: 'Runner left before the ball was caught', result: { ruling: 'Runner must RETOUCH and may be called out on APPEAL', rule: 'Rule 7.10(a)', detail: 'After a fly ball is caught, a runner must tag up -- start from contact with the base after the ball is caught. Leaving early is only enforced on a proper appeal by the defense before the next pitch.' } },
          { label: 'Runner left the instant the first fielder touched the ball', result: { ruling: 'LEGAL -- runners may leave when first fielder touches the ball', rule: 'Rule 2 -- Catch', detail: 'Runners may leave their bases the instant the first fielder touches the ball -- they do not have to wait for the catch to be completed.' } },
        ],
      }},
      { label: 'Runner on base touched by a declared Infield Fly', next: {
        question: 'Was the runner touching the base?',
        options: [
          { label: 'Yes -- runner was touching the base', result: { ruling: 'Runner is NOT out -- batter is out on the infield fly', rule: 'Rule 7.08(f) Exception', detail: 'If a runner is touching a base when touched by an Infield Fly, the runner is not out. The batter is still out on the infield fly call.' } },
          { label: 'No -- runner was off the base', result: { ruling: 'BOTH the runner AND the batter are out', rule: 'Rule 7.08(f) Note 1', detail: 'If a runner is touched by an Infield Fly when NOT touching a base, both the runner and the batter are out.' } },
        ],
      }},
      { label: 'Ball thrown out of play -- how many bases?', next: {
        question: 'Who made the throw and when?',
        options: [
          { label: 'Infielder\'s first throw after the pitch goes out of play', result: { ruling: 'TWO bases from where runners were when the PITCH was thrown', rule: 'Rule 7.05(g)', detail: 'When a wild throw is the first play by an infielder and goes out of play, runners are awarded two bases from their position at the time of the pitch -- IF all runners had advanced at least one base when the throw was made.' } },
          { label: 'Any other throw goes out of play', result: { ruling: 'TWO bases from where runners were when the THROW was made', rule: 'Rule 7.05(g)', detail: 'For any throw other than the first play by an infielder, runners are awarded two bases from their position at the time the wild throw was made.' } },
          { label: 'Pitcher throws from rubber and ball goes out of play', result: { ruling: 'ONE base from where runners were at time of pitch', rule: 'Rule 7.05(h)', detail: 'A ball thrown by the pitcher from the pitcher\'s plate position that goes into the stands or over the fence results in a one-base award from the base occupied at the time of the pitch.' } },
        ],
      }},
      { label: 'Batter is hit by a pitch -- is it always a free base?', next: {
        question: 'What were the circumstances?',
        options: [
          { label: 'Pitch was outside the strike zone and batter did not swing', result: { ruling: 'YES -- batter awarded first base', rule: 'Rule 6.08(b)', detail: 'When a pitched ball not in the strike zone touches the batter and the batter did not swing or attempt to avoid the ball, the batter is awarded first base.' } },
          { label: 'Pitch was in the strike zone', result: { ruling: 'NO -- it is a STRIKE', rule: 'Rule 6.08(b)', detail: 'If the pitch is in the strike zone when it touches the batter, it is called a strike. The batter is not awarded first base.' } },
          { label: 'Batter swung at the pitch', result: { ruling: 'NO -- it is a STRIKE', rule: 'Rule 6.08(b)', detail: 'If the batter swings at a pitch and is hit by it, the pitch counts as a strike and the batter is not awarded first base.' } },
          { label: 'Batter made no attempt to avoid the pitch', result: { ruling: 'NO award -- batter must attempt to avoid the pitch', rule: 'Rule 6.08(b)', detail: 'If the batter makes no attempt to avoid being touched by the pitch, the batter is not awarded first base. The ball is dead and it is called a ball if outside the zone.' } },
        ],
      }},
    ],
  },
};


const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f4f7fb',
  },
  container: {
    padding: 20,
    gap: 14,
  },
  centered: {
    justifyContent: 'center',
    flex: 1,
  },
  hero: {
    backgroundColor: '#111827',
    borderRadius: 22,
    padding: 20,
    marginTop: 8,
  },
  kicker: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#93c5fd',
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#ffffff',
  },
  resultsTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    color: '#dbeafe',
    marginTop: 10,
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  pill: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#c9d3e0',
  },
  pillActive: {
    backgroundColor: '#1f6feb',
    borderColor: '#1f6feb',
  },
  pillText: {
    color: '#223',
    fontWeight: '500',
  },
  pillTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#d9e2ef',
  },
  resultsCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#d9e2ef',
    width: '100%',
    marginTop: 10,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    color: '#111827',
  },
  cardText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#334',
  },
  metaLine: {
    fontSize: 14,
    lineHeight: 20,
    color: '#445',
    marginTop: 2,
  },
  button: {
    backgroundColor: '#111827',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#c9d3e0',
    marginTop: 2,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButtonText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
  },
  progress: {
    fontSize: 15,
    color: '#445',
    marginTop: 8,
  },
  meta: {
    fontSize: 14,
    color: '#556',
  },
  question: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
    marginTop: 4,
    marginBottom: 6,
    color: '#111827',
  },
  answer: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#d9e2ef',
  },
  answerText: {
    fontSize: 16,
    color: '#223',
    lineHeight: 22,
  },
  correct: {
    borderColor: '#16a34a',
    borderWidth: 2,
    backgroundColor: '#f0fdf4',
  },
  incorrect: {
    borderColor: '#dc2626',
    borderWidth: 2,
    backgroundColor: '#fef2f2',
  },
  reference: {
    marginTop: 8,
    fontSize: 13,
    color: '#556',
  },
  score: {
    fontSize: 44,
    fontWeight: '800',
    marginVertical: 10,
    color: '#111827',
  },
  searchInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#c9d3e0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f7',
  },
  progressLabel: {
    fontSize: 15,
    color: '#223',
    fontWeight: '600',
  },
  progressValue: {
    fontSize: 15,
    color: '#445',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  topBarTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  homeButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#c9d3e0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  homeButtonText: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 15,
  },
  celebrationCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d9e2ef',
    width: '100%',
    marginBottom: 4,
  },
  celebrationEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  celebrationTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
    textAlign: 'center',
  },
  celebrationSubtitle: {
    fontSize: 15,
    color: '#445',
    textAlign: 'center',
    lineHeight: 22,
  },
  misconceptionButton: {
    backgroundColor: '#fef3c7',
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f59e0b',
    marginTop: 2,
  },
  misconceptionButtonText: {
    color: '#92400e',
    fontSize: 16,
    fontWeight: '700',
  },
  misconceptionBadge: {
    marginTop: 4,
    backgroundColor: '#f59e0b',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  misconceptionBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 24,
    width: '100%',
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalSection: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginTop: 14,
    marginBottom: 4,
  },
  modalText: {
    fontSize: 14,
    color: '#445',
    lineHeight: 22,
  },
  modalButton: {
    backgroundColor: '#111827',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  rulebookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f4ff',
    borderRadius: 14,
    padding: 16,
    marginTop: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#c7d7f9',
  },
  rulebookButtonIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  rulebookButtonText: {
    flex: 1,
  },
  rulebookButtonTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  rulebookButtonSub: {
    fontSize: 12,
    color: '#667085',
    marginTop: 2,
  },
  rulebookButtonArrow: {
    fontSize: 18,
    color: '#1d4ed8',
    fontWeight: '700',
  },
  rulebookBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  storeBadge: {
    backgroundColor: '#111827',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  storeBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },

  // Game Mode button on home screen -- lighter blue, fits naturally
  gameModeButton: {
    backgroundColor: '#eff6ff',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  gameModeButtonIcon: { fontSize: 22, marginRight: 12 },
  gameModeButtonInner: { flex: 1 },
  gameModeButtonTitle: { fontSize: 16, fontWeight: '800', color: '#1d4ed8' },
  gameModeButtonSub: { fontSize: 12, color: '#3b82f6', marginTop: 2 },
  gameModeButtonBadge: {
    fontSize: 12, fontWeight: '700', color: '#1d4ed8',
    backgroundColor: '#dbeafe', paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 20,
  },

  // Paywall
  paywallHero: { alignItems: 'center', paddingVertical: 20 },
  paywallEmoji: { fontSize: 56, marginBottom: 8 },
  paywallTitle: { fontSize: 30, fontWeight: '900', color: '#111827', textAlign: 'center' },
  paywallSubtitle: { fontSize: 16, color: '#445', textAlign: 'center', marginTop: 6 },
  paywallFeatures: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#d9e2ef' },
  paywallFeatureRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eef2f7' },
  paywallFeatureEmoji: { fontSize: 20, width: 32 },
  paywallFeatureText: { fontSize: 14, color: '#334', flex: 1 },
  paywallPriceCard: { backgroundColor: '#111827', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 16 },
  paywallPriceLabel: { fontSize: 12, color: '#93c5fd', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  paywallPrice: { fontSize: 52, fontWeight: '900', color: '#ffffff', marginVertical: 4 },
  paywallPriceNote: { fontSize: 13, color: '#9ca3af' },
  paywallBuyButton: { backgroundColor: '#1d4ed8', borderRadius: 14, paddingVertical: 18, alignItems: 'center', marginBottom: 10 },
  paywallBuyButtonText: { fontSize: 18, fontWeight: '800', color: '#ffffff' },

  // Game Mode screens
  gmHero: { alignItems: 'center', paddingVertical: 12, marginBottom: 4 },
  gmHeroText: { fontSize: 22, fontWeight: '800', color: '#111827', textAlign: 'center' },
  gmHeroSub: { fontSize: 14, color: '#667085', marginTop: 4, textAlign: 'center' },
  gmGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
  gmCatButton: { backgroundColor: '#fff', borderRadius: 14, padding: 16, width: '47%', alignItems: 'center', borderWidth: 1, borderColor: '#d9e2ef', marginBottom: 4 },
  gmCatEmoji: { fontSize: 30, marginBottom: 6 },
  gmCatLabel: { fontSize: 13, fontWeight: '700', color: '#111827', textAlign: 'center' },
  gmQuestionCard: { backgroundColor: '#111827', borderRadius: 16, padding: 20, marginBottom: 16 },
  gmStepLabel: { fontSize: 11, color: '#93c5fd', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  gmQuestion: { fontSize: 20, fontWeight: '800', color: '#ffffff', lineHeight: 28 },
  gmOptionButton: { backgroundColor: '#fff', borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#d9e2ef' },
  gmOptionText: { fontSize: 15, color: '#111827', flex: 1, fontWeight: '600', lineHeight: 22 },
  gmOptionArrow: { fontSize: 22, color: '#1d4ed8', fontWeight: '700', marginLeft: 8 },
  gmResultCard: { backgroundColor: '#16a34a', borderRadius: 16, padding: 20, marginBottom: 14, alignItems: 'center' },
  gmResultLabel: { fontSize: 11, color: '#bbf7d0', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 },
  gmResultRuling: { fontSize: 20, fontWeight: '900', color: '#ffffff', textAlign: 'center', lineHeight: 28 },
  gmRuleCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#1d4ed8', borderWidth: 1, borderColor: '#d9e2ef' },
  gmRuleRef: { fontSize: 12, color: '#1d4ed8', fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  gmRuleDetail: { fontSize: 15, color: '#334', lineHeight: 22 },
  gmCatLocked: { opacity: 0.5 },
  gmCatLockBadge: { fontSize: 14, marginTop: 4 },
  gmCatFreeBadge: { fontSize: 10, fontWeight: '800', color: '#16a34a', marginTop: 4, letterSpacing: 0.5 },
  disclaimer: {
    fontSize: 12,
    color: '#667085',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
    paddingHorizontal: 8,
  },
  streakLine: {
    fontSize: 14,
    color: '#f59e0b',
    fontWeight: '700',
    marginTop: 4,
  },
  progressRightCol: {
    alignItems: 'flex-end',
    minWidth: 140,
  },
  progressBarBg: {
    height: 6,
    width: 120,
    backgroundColor: '#eef2f7',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressBarFill: {
    height: 6,
    borderRadius: 4,
  },
});

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}