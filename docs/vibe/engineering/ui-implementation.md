# UI 实现文档

## 目标

让 UI 组件保持薄层，只做展示和交互派发，不承载游戏规则。

## 组件职责

| 组件 | 输入 | 输出 |
|---|---|---|
| CharacterSelect | unlocks, characters | onSelect(character) |
| MapView | run, availableNodes | onEnterNode(index) |
| BattleView | combat, message | onPlayCard(id), onEndTurn() |
| CardComponent | card, disabled | onClick(card.id) |
| EventView | event | onChoose(choiceId) |
| ShopView | items, gold | onBuy(id), onDeleteCard(), onLeave() |
| RestView | blessings, hp | onHeal(), onChooseBlessing(id), onLeave() |
| ResultScreen | result, unlocks | onRestart() |

## UI 规则

- 组件不计算伤害。
- 组件不决定奖励。
- 组件不直接写 localStorage。
- 组件可以做 disabled 判断，但最终系统层仍要校验。
- 文本从配置或状态读取。

## 视觉反馈优先级

### P0
- 能量不足卡牌禁用。
- 当前可点击节点高亮。
- 敌人意图清楚。
- 胜负界面明确。

### P1
- 出牌飞行动画。
- 伤害数字。
- 护甲/回血闪烁。
- 地图下一层灰化。

## 可访问性基础

- 按钮有文本。
- 颜色不是唯一信息来源，稀有度可同时显示文字。
- 小屏幕下手牌可横向滚动。

## 验收

- [ ] UI 不包含硬编码玩法数值。
- [ ] 所有按钮都有禁用态。
- [ ] 主要操作有反馈消息。
- [ ] 低分辨率下核心信息不遮挡。
