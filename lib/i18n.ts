import { I18n } from 'i18n-js';

// ─── Locale code map ──────────────────────────────────────────────────────────
// Maps the display name stored on profile.language → BCP-47 locale code

export const LANGUAGE_NAME_TO_LOCALE: Record<string, string> = {
  English: 'en',
  Arabic: 'ar',
  'Chinese (Simplified)': 'zh',
  French: 'fr',
  German: 'de',
  Hindi: 'hi',
  Indonesian: 'id',
  Italian: 'it',
  Japanese: 'ja',
  Korean: 'ko',
  Malay: 'ms',
  Polish: 'pl',
  Portuguese: 'pt',
  Romanian: 'ro',
  Russian: 'ru',
  Spanish: 'es',
  Swedish: 'sv',
  Thai: 'th',
  Turkish: 'tr',
  Ukrainian: 'uk',
  Vietnamese: 'vi',
};

// ─── Translations ─────────────────────────────────────────────────────────────

const translations = {
  en: {
    tabs: { home: 'Home', practice: 'Practice', plan: 'My Plan', profile: 'Profile' },
    common: {
      save: 'Save', cancel: 'Cancel', continue: 'Continue', back: 'Back',
      loading: 'Loading…', error: 'Error', retry: 'Retry', done: 'Done',
    },
    settings: {
      title: 'Settings',
      editProfile: 'Edit Profile',
      account: 'Account',
      preferences: 'Preferences',
      support: 'Support',
      legal: 'Legal',
      subscription: 'Subscription',
      logout: 'Logout',
      appLanguage: 'App Language',
      nationality: 'Nationality',
      learningGoals: 'Learning Goals',
      notifications: 'Notifications',
      lesson: 'Lesson',
      theme: 'Theme',
    },
    profile: {
      title: 'Profile',
      timeStudied: 'Time Studied',
      pronunciation: 'Pronunciation',
      confidenceScore: 'Confidence Score',
      streak: 'Streak',
      viewStreak: 'View Streak',
      continuePractice: 'Continue Practice',
      bestDays: 'Best: {{count}} Days',
      dayStreak: '{{count}}-Day Streak',
      noStreak: 'No Streak Yet',
      keepItGoing: 'Keep It Going',
      startStreak: 'Start a Streak',
      streakTip: 'Complete daily focus and lessons on consecutive days to grow your streak. Open the streak page for a full view.',
    },
    account: {
      savedDrills: 'Saved Drills',
      assignedDrills: 'Assigned Drills',
      seeAll: 'See all',
      yourProgress: 'Your Progress',
      noDrillsYet: 'No drills assigned yet',
    },
    language: {
      screenTitle: 'What language should the app use?',
    },
  },

  ko: {
    tabs: { home: '홈', practice: '연습', plan: '내 플랜', profile: '프로필' },
    common: {
      save: '저장', cancel: '취소', continue: '계속', back: '뒤로',
      loading: '로딩 중…', error: '오류', retry: '다시 시도', done: '완료',
    },
    settings: {
      title: '설정',
      editProfile: '프로필 편집',
      account: '계정',
      preferences: '기본 설정',
      support: '지원',
      legal: '법률',
      subscription: '구독',
      logout: '로그아웃',
      appLanguage: '앱 언어',
      nationality: '국적',
      learningGoals: '학습 목표',
      notifications: '알림',
      lesson: '수업',
      theme: '테마',
    },
    profile: {
      title: '프로필',
      timeStudied: '학습 시간',
      pronunciation: '발음',
      confidenceScore: '자신감 점수',
      streak: '연속 학습',
      viewStreak: '연속 학습 보기',
      continuePractice: '연습 계속',
      bestDays: '최고: {{count}}일',
      dayStreak: '{{count}}일 연속',
      noStreak: '아직 연속 없음',
      keepItGoing: '계속 하세요',
      startStreak: '연속 학습 시작',
      streakTip: '매일 연속으로 일일 집중 및 수업을 완료하여 연속 기록을 늘리세요.',
    },
    language: {
      screenTitle: '앱에서 사용할 언어를 선택하세요',
    },
  },

  zh: {
    tabs: { home: '首页', practice: '练习', plan: '我的计划', profile: '个人' },
    common: {
      save: '保存', cancel: '取消', continue: '继续', back: '返回',
      loading: '加载中…', error: '错误', retry: '重试', done: '完成',
    },
    settings: {
      title: '设置',
      editProfile: '编辑个人资料',
      account: '账户',
      preferences: '偏好设置',
      support: '支持',
      legal: '法律',
      subscription: '订阅',
      logout: '退出登录',
      appLanguage: '应用语言',
      nationality: '国籍',
      learningGoals: '学习目标',
      notifications: '通知',
      lesson: '课程',
      theme: '主题',
    },
    profile: {
      title: '个人资料',
      timeStudied: '学习时间',
      pronunciation: '发音',
      confidenceScore: '自信心评分',
      streak: '连续学习',
      viewStreak: '查看连续记录',
      continuePractice: '继续练习',
      bestDays: '最佳: {{count}}天',
      dayStreak: '连续{{count}}天',
      noStreak: '暂无连续记录',
      keepItGoing: '继续保持',
      startStreak: '开始连续学习',
      streakTip: '每天连续完成日常专注和课程，增加连续记录。',
    },
    language: {
      screenTitle: '选择应用使用的语言',
    },
  },

  ja: {
    tabs: { home: 'ホーム', practice: '練習', plan: 'マイプラン', profile: 'プロフィール' },
    common: {
      save: '保存', cancel: 'キャンセル', continue: '続ける', back: '戻る',
      loading: '読み込み中…', error: 'エラー', retry: '再試行', done: '完了',
    },
    settings: {
      title: '設定',
      editProfile: 'プロフィール編集',
      account: 'アカウント',
      preferences: '設定',
      support: 'サポート',
      legal: '法律',
      subscription: 'サブスクリプション',
      logout: 'ログアウト',
      appLanguage: 'アプリの言語',
      nationality: '国籍',
      learningGoals: '学習目標',
      notifications: '通知',
      lesson: 'レッスン',
      theme: 'テーマ',
    },
    profile: {
      title: 'プロフィール',
      timeStudied: '学習時間',
      pronunciation: '発音',
      confidenceScore: '自信スコア',
      streak: '連続学習',
      viewStreak: '連続記録を見る',
      continuePractice: '練習を続ける',
      bestDays: '最高: {{count}}日',
      dayStreak: '{{count}}日連続',
      noStreak: '連続記録なし',
      keepItGoing: '続けましょう',
      startStreak: '連続学習を始める',
      streakTip: '毎日連続してデイリーフォーカスとレッスンを完了して記録を伸ばしましょう。',
    },
    language: {
      screenTitle: 'アプリの言語を選択してください',
    },
  },

  es: {
    tabs: { home: 'Inicio', practice: 'Práctica', plan: 'Mi Plan', profile: 'Perfil' },
    common: {
      save: 'Guardar', cancel: 'Cancelar', continue: 'Continuar', back: 'Atrás',
      loading: 'Cargando…', error: 'Error', retry: 'Reintentar', done: 'Listo',
    },
    settings: {
      title: 'Configuración',
      editProfile: 'Editar perfil',
      account: 'Cuenta',
      preferences: 'Preferencias',
      support: 'Soporte',
      legal: 'Legal',
      subscription: 'Suscripción',
      logout: 'Cerrar sesión',
      appLanguage: 'Idioma de la app',
      nationality: 'Nacionalidad',
      learningGoals: 'Objetivos de aprendizaje',
      notifications: 'Notificaciones',
      lesson: 'Lección',
      theme: 'Tema',
    },
    profile: {
      title: 'Perfil',
      timeStudied: 'Tiempo estudiado',
      pronunciation: 'Pronunciación',
      confidenceScore: 'Puntuación de confianza',
      streak: 'Racha',
      viewStreak: 'Ver racha',
      continuePractice: 'Continuar práctica',
      bestDays: 'Mejor: {{count}} días',
      dayStreak: 'Racha de {{count}} días',
      noStreak: 'Sin racha aún',
      keepItGoing: 'Sigue así',
      startStreak: 'Empieza una racha',
      streakTip: 'Completa el enfoque diario y las lecciones en días consecutivos para aumentar tu racha.',
    },
    language: {
      screenTitle: '¿Qué idioma debe usar la app?',
    },
  },

  fr: {
    tabs: { home: 'Accueil', practice: 'Pratique', plan: 'Mon Plan', profile: 'Profil' },
    common: {
      save: 'Enregistrer', cancel: 'Annuler', continue: 'Continuer', back: 'Retour',
      loading: 'Chargement…', error: 'Erreur', retry: 'Réessayer', done: 'Terminer',
    },
    settings: {
      title: 'Paramètres',
      editProfile: 'Modifier le profil',
      account: 'Compte',
      preferences: 'Préférences',
      support: 'Support',
      legal: 'Légal',
      subscription: 'Abonnement',
      logout: 'Se déconnecter',
      appLanguage: "Langue de l'application",
      nationality: 'Nationalité',
      learningGoals: "Objectifs d'apprentissage",
      notifications: 'Notifications',
      lesson: 'Leçon',
      theme: 'Thème',
    },
    profile: {
      title: 'Profil',
      timeStudied: 'Temps étudié',
      pronunciation: 'Prononciation',
      confidenceScore: 'Score de confiance',
      streak: 'Série',
      viewStreak: 'Voir la série',
      continuePractice: 'Continuer la pratique',
      bestDays: 'Meilleur : {{count}} jours',
      dayStreak: 'Série de {{count}} jours',
      noStreak: 'Pas encore de série',
      keepItGoing: 'Continue comme ça',
      startStreak: 'Commencer une série',
      streakTip: 'Complétez le focus quotidien et les leçons sur des jours consécutifs pour augmenter votre série.',
    },
    language: {
      screenTitle: "Quelle langue l'application doit-elle utiliser ?",
    },
  },
};

// ─── i18n instance ────────────────────────────────────────────────────────────

export const i18n = new I18n(translations);
i18n.defaultLocale = 'en';
i18n.locale = 'en';
i18n.enableFallback = true;

/** Resolve a profile language display name to a locale code, defaulting to 'en'. */
export function resolveLocale(languageName?: string | null): string {
  if (!languageName) return 'en';
  return LANGUAGE_NAME_TO_LOCALE[languageName] ?? 'en';
}
