# 测试策略

## 目标

先覆盖最容易坏的规则函数，再补核心 E2E。

## 测试分层

| 层级 | 工具 | 优先级 |
|---|---|---|
| TypeScript 构建 | `npm run build` | 必须 |
| 单元测试 | Vitest 或等价工具 | P0/P1 |
| 组件测试 | 可选 | P2 |
| E2E | Playwright | P1/P2 |
| 手动验收 | checklist | 每次任务 |

## P0 单测目标

| 函数 | 测试点 |
|---|---|
| calculateDamage | 稀有度倍率、暴击边界、最小伤害 |
| calculateHeal | 回复倍率 |
| calculateArmor | 护甲倍率 |
| getEnemyIntent | 意图循环 |
| tickStatusEffects | 持续伤害、回合减少 |

## P1 流程测试目标

- 选择角色。
- 进入战斗。
- 打出攻击牌。
- 结束回合。
- 击败敌人。
- 进入商店/事件/休息。
- 击败 Boss。
- 刷新后存档保留。

## 手动测试模板

```markdown
任务：
环境：
步骤：
1.
2.
3.
预期：
实际：
结论：通过/失败
```

## 验收

- [ ] 每个规则 bug 至少补一个单测。
- [ ] P1 后有一条核心 E2E。
- [ ] 每次发版前跑 build。
