import { useEffect, useRef } from 'react';
import { useTranslation } from '../i18n';

interface Props {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}

const zhSections = [
  {
    title: '游戏目标',
    items: [
      '选择一名已解锁角色，从迷雾森林出发。',
      '沿地图节点前进，击败敌人、强化卡组，最终挑战区域 Boss。',
      '击败 Boss 后会记录通关进度，并逐步解锁更多角色。',
    ],
  },
  {
    title: '战斗操作',
    items: [
      '每场战斗会抽取手牌到手牌上限，点击卡牌即可打出。',
      '卡牌左上角是能量费用，能量不足时卡牌不可使用。',
      '攻击牌造成伤害，防御牌获得护甲，回复牌恢复生命。',
      '点击"结束回合"后敌人会按意图行动，然后进入下一回合。',
    ],
  },
  {
    title: '地图节点',
    items: [
      '战斗：遭遇普通敌人，胜利后获得经验、金币和卡牌奖励。',
      '精英：更强的战斗节点，风险更高、奖励更好。',
      '商店：花金币买卡或删除旧卡。',
      '事件：根据选项获得金币、生命变化或卡牌奖励。',
      '休息：恢复生命，并可以选择一个临时祝福。',
      'Boss：区域终点，击败后完成本次冒险。',
    ],
  },
  {
    title: '卡组成长',
    items: [
      '战斗奖励、事件和商店可以把新卡加入卡组。',
      '商店删卡可以精简卡组，让关键牌更容易抽到。',
      '稀有度越高的卡通常效果越强，但费用也可能更高。',
    ],
  },
  {
    title: '进度与失败',
    items: [
      '角色生命降到 0 时本局失败，可以重新选择角色再来一次。',
      '局内卡组、金币、祝福会随本局结束而重置。',
      '已解锁角色和通关次数会保存在浏览器本地。',
    ],
  },
];

const enSections = [
  {
    title: 'Game Objective',
    items: [
      'Choose an unlocked hero and set out from the Misty Forest.',
      'Advance through map nodes, defeat enemies, strengthen your deck, and challenge the area Boss.',
      'Defeating a Boss records progress and unlocks more heroes.',
    ],
  },
  {
    title: 'Combat',
    items: [
      'Each battle draws cards up to your hand limit. Click a card to play it.',
      'Top-left of a card shows its energy cost. Unable to use if energy is insufficient.',
      'Attack cards deal damage, Defense cards grant armor, Heal cards restore HP.',
      'Click "End Turn" for the enemy to act, then proceed to the next turn.',
    ],
  },
  {
    title: 'Map Nodes',
    items: [
      'Battle: Fight normal enemies for EXP, gold, and card rewards.',
      'Elite: Stronger enemies with higher risk and better rewards.',
      'Shop: Spend gold to buy cards or delete old ones.',
      'Event: Make choices that affect gold, HP, or cards.',
      'Rest: Restore HP and choose a temporary blessing.',
      'Boss: Area finale — defeat it to complete the run.',
    ],
  },
  {
    title: 'Deck Growth',
    items: [
      'Add new cards to your deck through battle rewards, events, and shops.',
      'Delete cards at the shop to slim your deck and draw key cards more often.',
      'Higher rarity cards are generally stronger but may cost more energy.',
    ],
  },
  {
    title: 'Progress & Failure',
    items: [
      'If your HP reaches 0, the run ends. You can restart with any hero.',
      'Deck, gold, and blessings reset at the end of each run.',
      'Unlocked heroes and clear records are saved locally in your browser.',
    ],
  },
];

export function GameManual({ open, onOpen, onClose }: Props) {
  const { t, lang } = useTranslation();
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const sections = lang === 'en' ? enSections : zhSections;

  useEffect(() => {
    if (!open) return undefined;

    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : openButtonRef.current;
    panelRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
      ).filter(element => !element.hasAttribute('disabled'));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, [onClose, open]);

  return (
    <>
      <button ref={openButtonRef} className="manual-open-btn top-tool-btn" onClick={onOpen} type="button">
        {t('btn.manual')}
      </button>

      {open && (
        <div className="manual-overlay" onClick={onClose} role="presentation">
          <div
            ref={panelRef}
            className="manual-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="manual-title"
            tabIndex={-1}
            onClick={event => event.stopPropagation()}
          >
            <header className="manual-header">
              <div>
                <h2 id="manual-title">{lang === 'en' ? 'Brave Adventure Manual' : '勇者大冒险说明书'}</h2>
                <p>{lang === 'en' ? 'Learn the basics, then advance node by node. Observe enemy intents and play wisely.' : '先看目标，再按节点推进；遇到敌人时观察意图、合理出牌。'}</p>
              </div>
              <button className="manual-close-btn" onClick={onClose} type="button" aria-label={lang === 'en' ? 'Close manual' : '关闭说明书'}>
                ×
              </button>
            </header>

            <div className="manual-content">
              {sections.map(section => (
                <section key={section.title} className="manual-section">
                  <h3>{section.title}</h3>
                  <ul>
                    {section.items.map(item => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
