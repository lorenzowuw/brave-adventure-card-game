# 《勇者大冒险》工程启动清单

> 给 `game-vibe` 使用。当前项目已是 React + TypeScript + Vite 原型，不建议切换引擎。

## 1. 引擎与根结构建议

- 引擎/框架：React + TypeScript + Vite。
- 项目类型：程序化卡牌 roguelike，固定 UI + 数据驱动内容。
- 根状态机：`select → exploration → combat/event/shop/rest → victory/defeat`。
- 入口：`src/App.tsx`。

## 2. 场景/组件规划

当前 Web 项目中，“场景文件”对应 React 页面组件：

| 场景 | 组件 | 职责 |
|---|---|---|
| 角色选择 | `CharacterSelect` | 展示解锁角色、定位、被动、初始属性 |
| 地图探索 | `MapView` | 展示当前层、下一层预览、节点入口 |
| 战斗 | `BattleView` | 展示敌人、意图、玩家状态、手牌、操作 |
| 事件 | `EventView` | 展示事件描述和选项 |
| 商店 | `ShopView` | 展示商品、价格、购买/删卡 |
| 休息 | `RestView` | 展示回血和祝福选择 |
| 结算 | `ResultScreen` | 展示胜负、解锁、重开 |

## 3. 全局服务配置

| 服务 | 是否需要 | 原因 |
|---|---|---|
| 全局状态管理库 | 暂不需要 | 当前状态机集中在 `App.tsx` 可控；复杂后再拆 hook/reducer |
| 事件总线 | 可选 | 已有 `EventBus`，但 MVP 可以直接回调，避免过度使用 |
| 存档服务 | 需要 | localStorage 全局进度必须集中封装 |
| 数据加载服务 | 需要 | JSON/CSV 配置必须统一校验和读取 |
| 随机服务 | 建议 | 地图、奖励、商店、事件都用随机；后续 Daily Challenge 需要 seed |

## 4. 数据层规划

### JSON 配置

| 文件 | 内容 | 是否 MVP |
|---|---|---|
| `src/data/characters.json` | 角色基础属性、被动、解锁条件、主题色 | 是 |
| `src/data/skills.json` | 技能卡效果、稀有度、费用、升级链 | 是 |
| `src/data/enemies.json` | 敌人 HP、意图、奖励、区域 | 是 |
| `src/data/maps.json` | 地图层级、节点、Boss | 是 |
| `src/data/events.json` | 事件文本、选项、效果 | 是 |
| `src/data/blessings.json` | 祝福效果和持续时间 | P1 |
| `src/data/areas.json` | 区域主题、Boss 编号 | P1 |
| `src/data/equipment.json` | 遗物/装备 | P2+ |
| `src/data/combos.json` | 元素共鸣 | P3 |

### CSV/Balance

| 文件 | 内容 | 说明 |
|---|---|---|
| `src/data/balance/card_rarity.csv` | 稀有度倍率、价格倍率 | 高频调参 |
| `src/data/balance/level_up.csv` | 等级经验、HP/能量成长、槽位 | 高频调参 |
| `src/data/balance/enemy_tiers.csv` | 敌人阶层 HP/伤害/奖励系数 | 高频调参 |

## 5. M01 最小验收路径

1. 启动游戏。
2. 选择铁壁守卫/影刃刺客/生命贤者任一角色。
3. 进入森林地图。
4. 点击普通战斗节点。
5. 看到敌人名称、HP、意图。
6. 打出攻击/防御/回复牌。
7. 结束回合，敌人执行意图。
8. 击败敌人后返回地图。
9. 进入 Boss 节点并完成胜利/失败结算。
10. 刷新页面后全局胜场/解锁记录仍存在。

## 6. 工程约束

- UI 组件不拥有规则数值，只读取状态和配置。
- 系统函数尽量纯函数，返回新状态，不原地修改。
- 高频数值不要写在组件里。
- 新增卡牌/敌人/事件必须优先通过 JSON/CSV。
- 每个任务都要有手动验收步骤。
- 每次改 TS/TSX 后运行 `npm run build`。

## 7. 当前已存在代码入口

| 入口 | 用途 |
|---|---|
| `src/App.tsx` | 应用状态机和 UI 路由 |
| `src/types/game.ts` | 核心类型 |
| `src/systems/RunManager.ts` | 局内流程、地图、奖励、存档 |
| `src/systems/BattleSystem.ts` | 战斗计算、敌人意图、状态效果 |
| `src/utils/DataLoader.ts` | 数据读取 |
| `src/components/*` | 页面/场景组件 |
| `src/data/*` | 内容配置 |

## 8. 优先改造方向

1. 先确认现有 P0 闭环是否真实可玩。
2. 修复阻断 P0 的 bug。
3. 把 `App.tsx` 中明显属于系统逻辑的部分逐步迁回 `RunManager`，但只在必要时做。
4. 补齐数据校验和缺失配置。
5. 再做 P1 地图/商店/事件/休息完整闭环。
