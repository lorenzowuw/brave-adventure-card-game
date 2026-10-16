# 战斗实现文档

## 关键文件

| 文件 | 职责 |
|---|---|
| `src/systems/BattleSystem.ts` | 伤害、回复、护甲、敌人意图、状态效果 |
| `src/systems/RunManager.ts` | 进入战斗、出牌、结束回合、结算 |
| `src/components/BattleView.tsx` | 战斗展示和用户操作 |
| `src/components/CardComponent.tsx` | 卡牌展示 |

## 必须保持纯度的函数

| 函数 | 要求 |
|---|---|
| calculateDamage | 不修改入参 |
| calculateHeal | 不修改入参 |
| calculateArmor | 不修改入参 |
| tickStatusEffects | 返回新数组 |
| executeBattleAction | 返回 newState，不修改旧 state |

## 需要注意的 mutation 风险

- 敌人 buff 不要直接修改 `enemy.currentHp`。
- 状态效果叠加不要直接 push 到入参数组。
- 手牌/牌库/弃牌堆移动必须创建新数组。

## 出牌实现步骤

1. 找到 hand 中的 card。
2. 检查费用。
3. 调用 BattleSystem 结算效果。
4. 从 hand 移除 card。
5. 加入 discard 或 exhausted。
6. 更新 enemy/player。
7. 检查胜利。
8. 返回新 RunState。

## 结束回合实现步骤

1. 敌人执行当前意图。
2. 检查玩家死亡。
3. tick 状态效果。
4. turnNumber +1。
5. playerArmor 清零。
6. playerEnergy 回满。
7. 抽牌到基础手牌数。
8. 更新敌人下一意图。

## 验收

- [ ] 同一操作不会污染旧 state。
- [ ] 出牌后 UI 和数据一致。
- [ ] 结束回合后意图更新。
- [ ] 死亡/胜利边界正确。
