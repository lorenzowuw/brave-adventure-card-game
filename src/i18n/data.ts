/**
 * 游戏数据本地化工具
 * 数据文件中的条目可以包含 name_en / description_en 等英文字段，
 * 此工具根据当前语言自动选择合适的内容。
 */

import { useTranslation } from './context';

interface HasName {
  name: string;
  name_en?: string;
}
interface HasDesc extends HasName {
  description: string;
  description_en?: string;
}
interface HasTitle {
  title: string;
  title_en?: string;
}
interface HasFlavor {
  flavorText?: string;
  flavorText_en?: string;
}
interface HasLabel {
  label: string;
  label_en?: string;
}

export function localName(item: HasName, lang: string): string {
  return lang === 'en' && item.name_en ? item.name_en : item.name;
}

export function localDesc(item: HasDesc, lang: string): string {
  return lang === 'en' && item.description_en ? item.description_en : item.description;
}

export function localTitle(item: HasTitle, lang: string): string {
  return lang === 'en' && item.title_en ? item.title_en : item.title;
}

function containsCjk(text: string): boolean {
  return /[\u3400-\u9fff]/.test(text);
}

export function localFlavor(item: HasFlavor, lang: string): string {
  if (lang === 'en' && item.flavorText_en && !containsCjk(item.flavorText_en)) return item.flavorText_en;
  return item.flavorText ?? '';
}

export function localLabel(item: HasLabel, lang: string): string {
  return lang === 'en' && item.label_en ? item.label_en : item.label;
}

/** 对数组中的每个元素应用 localName */
export function localNames<T extends HasName>(items: T[], lang: string): T[] {
  return items.map(item => ({ ...item, name: localName(item, lang) }));
}

/** React Hook 版本 */
export function useLocalize() {
  const { lang } = useTranslation();
  return {
    lang,
    n: (item: HasName) => localName(item, lang),
    d: (item: HasDesc) => localDesc(item, lang),
    t: (item: HasTitle) => localTitle(item, lang),
    f: (item: HasFlavor) => localFlavor(item, lang),
    l: (item: HasLabel) => localLabel(item, lang),
  };
}
