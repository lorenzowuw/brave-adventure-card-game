import type { RarityColor, SkillCard } from '../types/game';
import { skillData } from './DataLoader';

const allSkills = skillData as SkillCard[];
const upgradedIds = new Set(allSkills.map(skill => skill.upgradeTo).filter(Boolean));
const chainRootByCardId = new Map<string, SkillCard>();

for (const skill of allSkills) {
  if (upgradedIds.has(skill.id)) continue;
  for (const chainCard of buildUpgradeChain(skill)) {
    chainRootByCardId.set(chainCard.id, skill);
  }
}
const CARD_NAME_SUFFIXES = [
  '普通', '优秀', '精进', '稀有', '卓越', '精良', '史诗', '传说', '神话',
  'Common', 'Uncommon', 'Superior', 'Rare', 'Epic', 'Legendary', 'Mythic',
];

const RARITY_NAME_ZH: Record<RarityColor, string> = {
  white: '普通',
  green: '稀有',
  blue: '精良',
  purple: '史诗',
  orange: '传说',
  red: '神话',
};

const RARITY_NAME_EN: Record<RarityColor, string> = {
  white: 'Common',
  green: 'Uncommon',
  blue: 'Rare',
  purple: 'Epic',
  orange: 'Legendary',
  red: 'Mythic',
};

function getCardRoot(card: SkillCard): SkillCard {
  return chainRootByCardId.get(card.id) ?? card;
}

export function buildUpgradeChain(root: SkillCard): SkillCard[] {
  const result: SkillCard[] = [];
  const seen = new Set<string>();
  let current: SkillCard | undefined = root;
  while (current && !seen.has(current.id)) {
    result.push(current);
    seen.add(current.id);
    current = current.upgradeTo ? allSkills.find(skill => skill.id === current!.upgradeTo) : undefined;
  }
  return result;
}

function stripCardRaritySuffix(name: string): string {
  return CARD_NAME_SUFFIXES.reduce((baseName, suffix) => {
    return baseName.endsWith(`·${suffix}`) ? baseName.slice(0, -suffix.length - 1) : baseName;
  }, name);
}

export function getUnifiedCardDisplayName(card: SkillCard, lang: string): string {
  const root = getCardRoot(card);
  const rootName = lang === 'en' && root.name_en ? root.name_en : root.name;
  const rarityName = lang === 'en' ? RARITY_NAME_EN[card.rarity] : RARITY_NAME_ZH[card.rarity];
  return `${stripCardRaritySuffix(rootName)}·${rarityName}`;
}

export function isDamageSkill(card: SkillCard): boolean {
  return Boolean(card.effect.damage || card.effect.damageToAll || card.effect.radianceBurst);
}
