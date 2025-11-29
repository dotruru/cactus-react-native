export const SUPPORTED_LANGUAGES = {
  en: { name: 'English', whisperCode: 'en', nativeName: 'English' },
  es: { name: 'Spanish', whisperCode: 'es', nativeName: 'Español' },
  ru: { name: 'Russian', whisperCode: 'ru', nativeName: 'Русский' },
  zh: { name: 'Chinese', whisperCode: 'zh', nativeName: '中文' },
  pt: { name: 'Portuguese', whisperCode: 'pt', nativeName: 'Português' },
  pl: { name: 'Polish', whisperCode: 'pl', nativeName: 'Polski' },
  ko: { name: 'Korean', whisperCode: 'ko', nativeName: '한국어' },
  vi: { name: 'Vietnamese', whisperCode: 'vi', nativeName: 'Tiếng Việt' },
  tl: { name: 'Tagalog', whisperCode: 'tl', nativeName: 'Tagalog' },
} as const;

export type LanguageCode = keyof typeof SUPPORTED_LANGUAGES;

