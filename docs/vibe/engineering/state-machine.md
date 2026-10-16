# 状态机文档

## 顶层 Screen

```text
select
→ exploration
→ combat
→ reward
→ exploration
→ event/shop/rest
→ exploration
→ victory/defeat
```

## Screen 定义

| Screen | 含义 | 允许操作 |
|---|---|---|
| select | 角色选择 | 选择已解锁角色 |
| exploration | 地图探索 | 点击当前层节点 |
| combat | 战斗 | 出牌、结束回合 |
| reward | 奖励选择 | 选卡/金币/跳过 |
| event | 事件 | 选择事件选项 |
| shop | 商店 | 买卡/删卡/离开 |
| rest | 休息 | 回血/选祝福/离开 |
| victory | 通关 | 重开/返回选择 |
| defeat | 失败 | 重开/返回选择 |

## 状态转换

| From | Action | To |
|---|---|---|
| select | selectCharacter | exploration |
| exploration | enter battle node | combat |
| exploration | enter event node | event |
| exploration | enter shop node | shop |
| exploration | enter rest node | rest |
| combat | enemy defeated | reward/exploration |
| combat | player dead | defeat |
| reward | choose reward | exploration |
| event | choose option | exploration |
| shop | leave shop | exploration |
| rest | leave rest | exploration |
| combat | boss defeated | victory |

## 状态边界规则

- 非 combat 不允许出牌。
- 非 event 不允许选择事件选项。
- 非 shop 不允许购买。
- 非 rest 不允许选择祝福。
- victory/defeat 只能重开或回到选择。

## 验收

- [ ] 非法 screen 操作不会改变状态。
- [ ] 每个 screen 都有明确返回路径。
- [ ] 胜利/失败后不能继续当前 run 操作。
