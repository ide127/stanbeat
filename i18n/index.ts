import { baseMessages, MessageKey } from './base';
import ko from './locales/ko.json';
import en from './locales/en.json';
import ja from './locales/ja.json';
import zhCN from './locales/zh-CN.json';
import zhTW from './locales/zh-TW.json';
import id from './locales/id.json';
import th from './locales/th.json';
import vi from './locales/vi.json';
import es from './locales/es.json';
import ptBR from './locales/pt-BR.json';
import fil from './locales/fil.json';
import ru from './locales/ru.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import tr from './locales/tr.json';
import ar from './locales/ar.json';
import ms from './locales/ms.json';
import hi from './locales/hi.json';
import it from './locales/it.json';
import pl from './locales/pl.json';

export const languageOptions = [
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'zh-CN', name: '简体中文', flag: '🇨🇳' },
  { code: 'zh-TW', name: '繁體中文', flag: '🇹🇼' },
  { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'th', name: 'ไทย', flag: '🇹🇭' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'pt-BR', name: 'Português (BR)', flag: '🇧🇷' },
  { code: 'fil', name: 'Filipino', flag: '🇵🇭' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'ms', name: 'Bahasa Melayu', flag: '🇲🇾' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pl', name: 'Polski', flag: '🇵🇱' },
] as const;

export type LanguageCode = (typeof languageOptions)[number]['code'];

type Messages = Record<MessageKey, string>;

const dictionaries: Record<LanguageCode, Messages> = {
  ko: ko as Messages,
  en: en as Messages,
  ja: ja as Messages,
  'zh-CN': zhCN as Messages,
  'zh-TW': zhTW as Messages,
  id: id as Messages,
  th: th as Messages,
  vi: vi as Messages,
  es: es as Messages,
  'pt-BR': ptBR as Messages,
  fil: fil as Messages,
  ru: ru as Messages,
  fr: fr as Messages,
  de: de as Messages,
  tr: tr as Messages,
  ar: ar as Messages,
  ms: ms as Messages,
  hi: hi as Messages,
  it: it as Messages,
  pl: pl as Messages,
};

export const t = (lang: LanguageCode, key: MessageKey, vars?: Record<string, string>) => {
  const table = dictionaries[lang] ?? dictionaries.ko;
  let value = table[key] ?? baseMessages[key];
  if (vars) {
    Object.entries(vars).forEach(([k, v]) => {
      value = value.replaceAll(`{${k}}`, v);
    });
  }
  return value;
};
