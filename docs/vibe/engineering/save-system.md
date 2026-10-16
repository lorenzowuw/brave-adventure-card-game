# 存档系统实现文档

## 目标

使用 localStorage 保存全局进度，坏存档可恢复，不影响开局。

## 存档 Key

```text
card_quest_save_v1
```

## Schema

```ts
interface SaveData {
  version: 1;
  unlockedCharacters: CharacterClass[];
  unlockedBlessings: string[];
  maxLevel: number;
  achievements: string[];
  totalRuns: number;
  totalVictories: number;
}
```

## 初始存档

- unlockedCharacters: `['ironwall', 'shadowblade', 'lifesage']`
- unlockedBlessings: `[]`
- maxLevel: `1`
- achievements: `[]`
- totalRuns: `0`
- totalVictories: `0`

## 读档规则

1. localStorage 无数据 → 返回初始存档。
2. JSON parse 失败 → 返回初始存档。
3. version 不匹配 → 走 migration 或初始存档。
4. 字段缺失 → 用默认值补齐。
5. 非法角色 ID → 过滤。

## 写档时机

| 时机 | 动作 |
|---|---|
| 开始新局 | totalRuns +1 |
| Boss 胜利 | totalVictories +1，解锁角色 |
| 解锁祝福 | 写 unlockedBlessings |
| 重置存档 | 删除 key 或写初始存档 |

## 验收

- [ ] 刷新后胜利次数保留。
- [ ] 手动写坏 localStorage 不白屏。
- [ ] 重置存档后回到初始角色。
