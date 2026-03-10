export type SupportedLanguage =
  | "en"
  | "zh-CN"
  | "zh-TW"
  | "pt-BR"
  | "de"
  | "fr"
  | "es"
  | "ja"
  | "ko"
  | "ar"
  | "hi"
  | "ru";

export type PluralRule = "one" | "two" | "few" | "many" | "other";

export interface LanguageMetadata {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  rtl: boolean;
  fallback: SupportedLanguage;
  pluralRules: PluralRule;
  numberFormat: {
    currency: string;
    decimalSeparator: string;
    thousandsSeparator: string;
  };
}

export const LANGUAGE_METADATA: Record<SupportedLanguage, LanguageMetadata> = {
  en: {
    code: "en",
    name: "English",
    nativeName: "English",
    rtl: false,
    fallback: "en",
    pluralRules: "one",
    numberFormat: { currency: "USD", decimalSeparator: ".", thousandsSeparator: "," },
  },
  "zh-CN": {
    code: "zh-CN",
    name: "Chinese (Simplified)",
    nativeName: "中文（简体）",
    rtl: false,
    fallback: "en",
    pluralRules: "other",
    numberFormat: { currency: "CNY", decimalSeparator: ".", thousandsSeparator: "," },
  },
  "zh-TW": {
    code: "zh-TW",
    name: "Chinese (Traditional)",
    nativeName: "中文（繁體）",
    rtl: false,
    fallback: "zh-CN",
    pluralRules: "other",
    numberFormat: { currency: "TWD", decimalSeparator: ".", thousandsSeparator: "," },
  },
  "pt-BR": {
    code: "pt-BR",
    name: "Portuguese (Brazil)",
    nativeName: "Português (Brasil)",
    rtl: false,
    fallback: "en",
    pluralRules: "one",
    numberFormat: { currency: "BRL", decimalSeparator: ",", thousandsSeparator: "." },
  },
  de: {
    code: "de",
    name: "German",
    nativeName: "Deutsch",
    rtl: false,
    fallback: "en",
    pluralRules: "one",
    numberFormat: { currency: "EUR", decimalSeparator: ",", thousandsSeparator: "." },
  },
  fr: {
    code: "fr",
    name: "French",
    nativeName: "Français",
    rtl: false,
    fallback: "en",
    pluralRules: "one",
    numberFormat: { currency: "EUR", decimalSeparator: ",", thousandsSeparator: " " },
  },
  es: {
    code: "es",
    name: "Spanish",
    nativeName: "Español",
    rtl: false,
    fallback: "en",
    pluralRules: "one",
    numberFormat: { currency: "EUR", decimalSeparator: ",", thousandsSeparator: "." },
  },
  ja: {
    code: "ja",
    name: "Japanese",
    nativeName: "日本語",
    rtl: false,
    fallback: "en",
    pluralRules: "other",
    numberFormat: { currency: "JPY", decimalSeparator: ".", thousandsSeparator: "," },
  },
  ko: {
    code: "ko",
    name: "Korean",
    nativeName: "한국어",
    rtl: false,
    fallback: "en",
    pluralRules: "other",
    numberFormat: { currency: "KRW", decimalSeparator: ".", thousandsSeparator: "," },
  },
  ar: {
    code: "ar",
    name: "Arabic",
    nativeName: "العربية",
    rtl: true,
    fallback: "en",
    pluralRules: "many",
    numberFormat: { currency: "SAR", decimalSeparator: ".", thousandsSeparator: "," },
  },
  hi: {
    code: "hi",
    name: "Hindi",
    nativeName: "हिन्दी",
    rtl: false,
    fallback: "en",
    pluralRules: "one",
    numberFormat: { currency: "INR", decimalSeparator: ".", thousandsSeparator: "," },
  },
  ru: {
    code: "ru",
    name: "Russian",
    nativeName: "Русский",
    rtl: false,
    fallback: "en",
    pluralRules: "many",
    numberFormat: { currency: "RUB", decimalSeparator: ",", thousandsSeparator: " " },
  },
};

export class I18nManager {
  private currentLanguage: SupportedLanguage = "en";
  private translations: Map<SupportedLanguage, Map<string, string>> = new Map();
  private listeners: Set<(lang: SupportedLanguage) => void> = new Set();

  constructor() {
    this.loadAllTranslations();
  }

  setLanguage(lang: SupportedLanguage): void {
    if (!LANGUAGE_METADATA[lang]) {
      console.warn(`Unsupported language: ${lang}`);
      return;
    }

    this.currentLanguage = lang;
    this.notifyListeners();
  }

  t(key: string, params?: Record<string, string | number>): string {
    const translation = this.getTranslation(key);

    if (!params) {
      return translation;
    }

    return translation.replace(/\{\{(\w+)\}\}/g, (match, param) => {
      const value = params[param];
      return value !== undefined ? String(value) : match;
    });
  }

  private getTranslation(key: string): string {
    const currentTranslations = this.translations.get(this.currentLanguage);
    if (currentTranslations?.has(key)) {
      return currentTranslations.get(key)!;
    }

    let fallback = LANGUAGE_METADATA[this.currentLanguage].fallback;
    while (fallback !== "en") {
      const fallbackTranslations = this.translations.get(fallback);
      if (fallbackTranslations?.has(key)) {
        return fallbackTranslations.get(key)!;
      }
      fallback = LANGUAGE_METADATA[fallback].fallback;
    }

    const enTranslations = this.translations.get("en");
    if (enTranslations?.has(key)) {
      return enTranslations.get(key)!;
    }

    return key;
  }

  formatDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
    return new Intl.DateTimeFormat(this.currentLanguage, {
      ...options,
      timeZone: options?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    }).format(date);
  }

  formatNumber(num: number, options?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat(this.currentLanguage, options).format(num);
  }

  formatCurrency(amount: number, currency?: string): string {
    const meta = LANGUAGE_METADATA[this.currentLanguage];
    return new Intl.NumberFormat(this.currentLanguage, {
      style: "currency",
      currency: currency || meta.numberFormat.currency,
    }).format(amount);
  }

  formatRelativeTime(value: number, unit: Intl.RelativeTimeFormatUnit): string {
    return new Intl.RelativeTimeFormat(this.currentLanguage, { numeric: "auto" }).format(
      value,
      unit,
    );
  }

  isRTL(): boolean {
    return LANGUAGE_METADATA[this.currentLanguage].rtl;
  }

  getCurrentLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  getLanguageMetadata(): LanguageMetadata {
    return LANGUAGE_METADATA[this.currentLanguage];
  }

  getSupportedLanguages(): LanguageMetadata[] {
    return Object.values(LANGUAGE_METADATA);
  }

  onLanguageChange(callback: (lang: SupportedLanguage) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    this.listeners.forEach((cb) => cb(this.currentLanguage));
  }

  private loadAllTranslations(): void {
    this.loadSkillTranslations();
  }

  private loadSkillTranslations(): void {}

  addTranslations(lang: SupportedLanguage, translations: Record<string, string>): void {
    if (!this.translations.has(lang)) {
      this.translations.set(lang, new Map());
    }

    const langMap = this.translations.get(lang)!;
    for (const [key, value] of Object.entries(translations)) {
      langMap.set(key, value);
    }
  }

  pluralize(count: number, singular: string, plural: string, few?: string, many?: string): string {
    const rules = LANGUAGE_METADATA[this.currentLanguage].pluralRules;

    switch (rules) {
      case "one":
        return count === 1 ? singular : plural;
      case "two":
        return count === 1 ? singular : count === 2 ? few || plural : plural;
      case "few": {
        if (count === 1) {
          return singular;
        }
        if (count >= 2 && count <= 4) {
          return few || plural;
        }
        return many || plural;
      }
      case "many": {
        const lastTwo = count % 100;
        if (lastTwo >= 11 && lastTwo <= 14) {
          return many || plural;
        }
        const lastOne = count % 10;
        if (lastOne === 1) {
          return singular;
        }
        if (lastOne >= 2 && lastOne <= 4) {
          return few || plural;
        }
        return many || plural;
      }
      default:
        return plural;
    }
  }
}

export const i18n = new I18nManager();
