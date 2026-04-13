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
import { localeManifest, type LanguageCode } from './manifest';

export type { LanguageCode } from './manifest';

export const languageOptions = localeManifest;
export type MessageKey = keyof typeof ko;
export type LocaleMessages = typeof ko;

type Messages = Record<MessageKey, string>;
type PartialMessages = Partial<Messages>;

const canonicalMessages = ko as Messages;
const englishFallback = en as PartialMessages;

const dictionaries: Record<LanguageCode, PartialMessages> = {
  ko: ko as PartialMessages,
  en: en as PartialMessages,
  ja: ja as PartialMessages,
  'zh-CN': zhCN as PartialMessages,
  'zh-TW': zhTW as PartialMessages,
  id: id as PartialMessages,
  th: th as PartialMessages,
  vi: vi as PartialMessages,
  es: es as PartialMessages,
  'pt-BR': ptBR as PartialMessages,
  fil: fil as PartialMessages,
  ru: ru as PartialMessages,
  fr: fr as PartialMessages,
  de: de as PartialMessages,
  tr: tr as PartialMessages,
  ar: ar as PartialMessages,
  ms: ms as PartialMessages,
  hi: hi as PartialMessages,
  it: it as PartialMessages,
  pl: pl as PartialMessages,
};

export const t = (lang: LanguageCode, key: MessageKey, vars?: Record<string, string>) => {
  const localeTable = dictionaries[lang] ?? dictionaries.en ?? dictionaries.ko;
  let value = localeTable[key] ?? englishFallback[key] ?? canonicalMessages[key];

  if (vars) {
    for (const [name, replacement] of Object.entries(vars)) {
      value = value.replaceAll(`{${name}}`, replacement);
    }
  }

  return value;
};
