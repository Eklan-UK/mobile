import type {
  NationalityOption,
  LanguageOption,
  LearningGoalOption,
} from '@/types/settings';

// ─── Nationality options ───────────────────────────────────────────────────────

export const NATIONALITY_OPTIONS: NationalityOption[] = [
  { id: 'af', name: 'Afghan', native: 'افغان', flag: '🇦🇫' },
  { id: 'al', name: 'Albanian', native: 'Shqiptar', flag: '🇦🇱' },
  { id: 'dz', name: 'Algerian', native: 'جزائري', flag: '🇩🇿' },
  { id: 'ar', name: 'Argentine', native: 'Argentino', flag: '🇦🇷' },
  { id: 'au', name: 'Australian', native: 'Australian', flag: '🇦🇺' },
  { id: 'at', name: 'Austrian', native: 'Österreicher', flag: '🇦🇹' },
  { id: 'bd', name: 'Bangladeshi', native: 'বাংলাদেশী', flag: '🇧🇩' },
  { id: 'be', name: 'Belgian', native: 'Belge', flag: '🇧🇪' },
  { id: 'br', name: 'Brazilian', native: 'Brasileiro', flag: '🇧🇷' },
  { id: 'bg', name: 'Bulgarian', native: 'Български', flag: '🇧🇬' },
  { id: 'ca', name: 'Canadian', native: 'Canadian', flag: '🇨🇦' },
  { id: 'cl', name: 'Chilean', native: 'Chileno', flag: '🇨🇱' },
  { id: 'cn', name: 'Chinese', native: '中国人', flag: '🇨🇳' },
  { id: 'co', name: 'Colombian', native: 'Colombiano', flag: '🇨🇴' },
  { id: 'hr', name: 'Croatian', native: 'Hrvatski', flag: '🇭🇷' },
  { id: 'cz', name: 'Czech', native: 'Český', flag: '🇨🇿' },
  { id: 'dk', name: 'Danish', native: 'Dansk', flag: '🇩🇰' },
  { id: 'eg', name: 'Egyptian', native: 'مصري', flag: '🇪🇬' },
  { id: 'fi', name: 'Finnish', native: 'Suomalainen', flag: '🇫🇮' },
  { id: 'fr', name: 'French', native: 'Français', flag: '🇫🇷' },
  { id: 'de', name: 'German', native: 'Deutsch', flag: '🇩🇪' },
  { id: 'gr', name: 'Greek', native: 'Έλληνας', flag: '🇬🇷' },
  { id: 'hk', name: 'Hong Konger', native: '香港人', flag: '🇭🇰' },
  { id: 'hu', name: 'Hungarian', native: 'Magyar', flag: '🇭🇺' },
  { id: 'in', name: 'Indian', native: 'भारतीय', flag: '🇮🇳' },
  { id: 'id', name: 'Indonesian', native: 'Indonesia', flag: '🇮🇩' },
  { id: 'ir', name: 'Iranian', native: 'ایرانی', flag: '🇮🇷' },
  { id: 'iq', name: 'Iraqi', native: 'عراقي', flag: '🇮🇶' },
  { id: 'ie', name: 'Irish', native: 'Éireannach', flag: '🇮🇪' },
  { id: 'il', name: 'Israeli', native: 'ישראלי', flag: '🇮🇱' },
  { id: 'it', name: 'Italian', native: 'Italiano', flag: '🇮🇹' },
  { id: 'jp', name: 'Japanese', native: '日本人', flag: '🇯🇵' },
  { id: 'jo', name: 'Jordanian', native: 'أردني', flag: '🇯🇴' },
  { id: 'kz', name: 'Kazakhstani', native: 'Қазақ', flag: '🇰🇿' },
  { id: 'ke', name: 'Kenyan', native: 'Mkenya', flag: '🇰🇪' },
  { id: 'kr', name: 'Korean', native: '한국인', flag: '🇰🇷' },
  { id: 'kw', name: 'Kuwaiti', native: 'كويتي', flag: '🇰🇼' },
  { id: 'lb', name: 'Lebanese', native: 'لبناني', flag: '🇱🇧' },
  { id: 'ly', name: 'Libyan', native: 'ليبي', flag: '🇱🇾' },
  { id: 'my', name: 'Malaysian', native: 'Malaysia', flag: '🇲🇾' },
  { id: 'mx', name: 'Mexican', native: 'Mexicano', flag: '🇲🇽' },
  { id: 'ma', name: 'Moroccan', native: 'مغربي', flag: '🇲🇦' },
  { id: 'nl', name: 'Dutch', native: 'Nederlands', flag: '🇳🇱' },
  { id: 'nz', name: 'New Zealander', native: 'New Zealander', flag: '🇳🇿' },
  { id: 'ng', name: 'Nigerian', native: 'Nigerian', flag: '🇳🇬' },
  { id: 'no', name: 'Norwegian', native: 'Norsk', flag: '🇳🇴' },
  { id: 'om', name: 'Omani', native: 'عُماني', flag: '🇴🇲' },
  { id: 'pk', name: 'Pakistani', native: 'پاکستانی', flag: '🇵🇰' },
  { id: 'pe', name: 'Peruvian', native: 'Peruano', flag: '🇵🇪' },
  { id: 'ph', name: 'Filipino', native: 'Pilipino', flag: '🇵🇭' },
  { id: 'pl', name: 'Polish', native: 'Polski', flag: '🇵🇱' },
  { id: 'pt', name: 'Portuguese', native: 'Português', flag: '🇵🇹' },
  { id: 'qa', name: 'Qatari', native: 'قطري', flag: '🇶🇦' },
  { id: 'ro', name: 'Romanian', native: 'Român', flag: '🇷🇴' },
  { id: 'ru', name: 'Russian', native: 'Русский', flag: '🇷🇺' },
  { id: 'sa', name: 'Saudi', native: 'سعودي', flag: '🇸🇦' },
  { id: 'rs', name: 'Serbian', native: 'Srpski', flag: '🇷🇸' },
  { id: 'sg', name: 'Singaporean', native: 'Singaporean', flag: '🇸🇬' },
  { id: 'za', name: 'South African', native: 'South African', flag: '🇿🇦' },
  { id: 'es', name: 'Spanish', native: 'Español', flag: '🇪🇸' },
  { id: 'se', name: 'Swedish', native: 'Svensk', flag: '🇸🇪' },
  { id: 'ch', name: 'Swiss', native: 'Schweizer', flag: '🇨🇭' },
  { id: 'sy', name: 'Syrian', native: 'سوري', flag: '🇸🇾' },
  { id: 'tw', name: 'Taiwanese', native: '台灣人', flag: '🇹🇼' },
  { id: 'th', name: 'Thai', native: 'ไทย', flag: '🇹🇭' },
  { id: 'tn', name: 'Tunisian', native: 'تونسي', flag: '🇹🇳' },
  { id: 'tr', name: 'Turkish', native: 'Türk', flag: '🇹🇷' },
  { id: 'ua', name: 'Ukrainian', native: 'Українець', flag: '🇺🇦' },
  { id: 'ae', name: 'Emirati', native: 'إماراتي', flag: '🇦🇪' },
  { id: 'gb', name: 'British', native: 'British', flag: '🇬🇧' },
  { id: 'us', name: 'American', native: 'American', flag: '🇺🇸' },
  { id: 'uy', name: 'Uruguayan', native: 'Uruguayo', flag: '🇺🇾' },
  { id: 'uz', name: 'Uzbek', native: "O'zbek", flag: '🇺🇿' },
  { id: 'vn', name: 'Vietnamese', native: 'Việt Nam', flag: '🇻🇳' },
  { id: 'ye', name: 'Yemeni', native: 'يمني', flag: '🇾🇪' },
];

// ─── Language options (saved as display name per §8.4) ────────────────────────

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { locale: 'en', name: 'English' },
  { locale: 'ar', name: 'Arabic' },
  { locale: 'zh', name: 'Chinese (Simplified)' },
  { locale: 'fr', name: 'French' },
  { locale: 'de', name: 'German' },
  { locale: 'hi', name: 'Hindi' },
  { locale: 'id', name: 'Indonesian' },
  { locale: 'it', name: 'Italian' },
  { locale: 'ja', name: 'Japanese' },
  { locale: 'ko', name: 'Korean' },
  { locale: 'ms', name: 'Malay' },
  { locale: 'pl', name: 'Polish' },
  { locale: 'pt', name: 'Portuguese' },
  { locale: 'ro', name: 'Romanian' },
  { locale: 'ru', name: 'Russian' },
  { locale: 'es', name: 'Spanish' },
  { locale: 'sv', name: 'Swedish' },
  { locale: 'th', name: 'Thai' },
  { locale: 'tr', name: 'Turkish' },
  { locale: 'uk', name: 'Ukrainian' },
  { locale: 'vi', name: 'Vietnamese' },
];

// ─── Learning goal options (ids match LearningGoalId) ────────────────────────

export const LEARNING_GOAL_ITEMS: LearningGoalOption[] = [
  {
    id: 'everyday_conversation',
    text: 'Speak naturally in conversations',
    icon: '🗣️',
  },
  {
    id: 'business_english',
    text: 'Sound professional at work',
    icon: '💼',
  },
  {
    id: 'travel_english',
    text: 'Travel confidently',
    icon: '🛫',
  },
  {
    id: 'job_interview',
    text: 'Prepare for interviews',
    icon: '📖',
  },
  {
    id: 'academic_english',
    text: 'Improve academic English',
    icon: '🎓',
  },
  {
    id: 'pronunciation',
    text: 'Perfect my pronunciation',
    icon: '🎤',
  },
];

// ─── Lesson preference options ─────────────────────────────────────────────────

export const ENGLISH_ACCENTS: { id: string; label: string }[] = [
  { id: 'british', label: 'British' },
  { id: 'american', label: 'American' },
  { id: 'australian', label: 'Australian' },
  { id: 'canadian', label: 'Canadian' },
];

export const VOICE_TONES: { id: string; label: string }[] = [
  { id: 'friendly', label: 'Friendly' },
  { id: 'professional', label: 'Professional' },
  { id: 'warm', label: 'Warm' },
  { id: 'neutral', label: 'Neutral' },
];

export const SPEAKING_SPEEDS: { id: string; label: string }[] = [
  { id: 'slow', label: 'Slow' },
  { id: 'normal', label: 'Normal' },
  { id: 'fast', label: 'Fast' },
];
