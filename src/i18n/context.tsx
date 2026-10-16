/**
 * 《勇者大冒险》- 多语言上下文
 * 提供语言切换、翻译查找功能
 */
import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import zh from './zh';
import en from './en';

export type Lang = 'zh' | 'en';

const TRANSLATIONS: Record<Lang, Record<string, string>> = { zh, en };
const STORAGE_KEY = 'card-quest-lang';

function getInitialLang(): Lang {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'zh') return stored;
  } catch { /* ignore */ }
  return 'zh';
}

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  /** 翻译单个 key，支持 {placeholder} 替换 */
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LangContext = createContext<LangContextValue>(null!);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getInitialLang);

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
    try { window.localStorage.setItem(STORAGE_KEY, newLang); } catch { /* ignore */ }
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === 'zh' ? 'en' : 'zh');
  }, [lang, setLang]);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const dict = TRANSLATIONS[lang] ?? zh;
    let text = dict[key] ?? zh[key as keyof typeof zh] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.split(`{${k}}`).join(String(v));
      }
    }
    return text;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, toggleLang, t }), [lang, setLang, toggleLang, t]);

  return (
    <LangContext.Provider value={value}>
      {children}
    </LangContext.Provider>
  );
}

export function useTranslation(): LangContextValue {
  return useContext(LangContext);
}
