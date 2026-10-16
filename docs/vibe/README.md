# 《勇者大冒险》Vibe 工作文档索引

> 来源：`game_design_plan.md` / `docs/vibe/game_design_plan.md`
>
> 目标：把完整设计方案拆成可执行、可验收、可交给 AI/人工逐项推进的工作文档。

## 0. 总览文档

| 文档 | 用途 |
|---|---|
| `design/game-brief.md` | MVP 核心循环、范围边界、首个可玩目标 |
| `design/systems-index.md` | 系统总览：Foundation/Core/Feature/Presentation/Meta |
| `production/milestone.md` | P0/P1/P2/P3/P4 阶段目标 |
| `design/KICKOFF.md` | 工程启动入口 |
| `tasks/TASK_BREAKDOWN.md` | 全量细粒度任务池 |
| `tasks/TEAM_ASSIGNMENT.md` | 双人任务分工、文件所有权和并行路线 |
| `production/ACCEPTANCE_CHECKLIST.md` | 总体验收清单 |

## 1. 策划专题文档

| 文档 | 用途 |
|---|---|
| `design/systems/character-system.md` | 角色、定位、解锁、成长入口 |
| `design/systems/card-skill-system.md` | 卡牌、稀有度、效果、升级链 |
| `design/systems/battle-system.md` | 战斗流程、回合、敌人意图、胜负 |
| `design/systems/map-node-system.md` | 树形地图、节点类型、有限预览 |
| `design/systems/event-system.md` | 事件选择题、选项效果、区域事件池 |
| `design/systems/shop-economy-system.md` | 金币来源、消费、商店、删卡 |
| `design/systems/progression-unlock-system.md` | 局内成长、全局解锁、存档字段 |
| `design/systems/blessing-combo-risk-system.md` | 祝福、元素共鸣、风险系统 |

## 2. 美术专题文档

| 文档 | 用途 |
|---|---|
| `design/ART_DIRECTION.md` | 总体美术方向 |
| `design/ASSET_REQUEST.md` | 总资产请求清单 |
| `art/character-art-plan.md` | 角色火柴人资产计划 |
| `art/enemy-boss-art-plan.md` | 敌人和 Boss 资产计划 |
| `art/ui-art-plan.md` | UI 资产分流与样式规范 |
| `art/vfx-animation-plan.md` | VFX 和动画计划 |
| `art/background-area-art-plan.md` | 区域背景计划 |
| `art/generation-workflow.md` | AI 生成、后处理、入库流程 |
| `art/prompt-library.md` | 可复用 Prompt 模板库 |

## 3. 工程专题文档

| 文档 | 用途 |
|---|---|
| `engineering/architecture.md` | 当前 React/TS 架构和职责边界 |
| `engineering/data-schema.md` | JSON/CSV 字段定义和校验点 |
| `engineering/state-machine.md` | 顶层 screen/phase 状态机 |
| `engineering/combat-implementation.md` | 战斗实现细节和 mutation 风险 |
| `engineering/ui-implementation.md` | UI 组件职责和展示规则 |
| `engineering/save-system.md` | localStorage 存档 schema 与读写时机 |
| `engineering/testing-strategy.md` | 单测、E2E、手动验收策略 |
| `engineering/risk-register.md` | 工程风险登记和预防措施 |

## 4. 阶段任务与双人分工

| 文档 | 用途 |
|---|---|
| `tasks/TEAM_ASSIGNMENT.md` | 双人分工总表：成员 A/成员 B、文件所有权、并行路线 |
| `tasks/phases/P0-core-combat.md` | P0 核心战斗原型任务，已标注负责人 |
| `tasks/phases/P1-full-run.md` | P1 完整一局 MVP 任务，已标注负责人 |
| `tasks/phases/P2-content-upgrade.md` | P2 内容扩充和升级链任务，已标注负责人 |
| `tasks/phases/P3-differentiation.md` | P3 差异化系统任务，已标注负责人 |

## 推荐推进顺序

1. 先读 `tasks/TEAM_ASSIGNMENT.md`，确认两个人的职责边界。
2. 先读 `design/game-brief.md`，确认 MVP 边界。
3. 执行 `tasks/phases/P0-core-combat.md`，按负责人并行推进。
4. 每完成一个任务，对照 `production/ACCEPTANCE_CHECKLIST.md`。
5. 涉及玩法规则时读对应 `design/systems/*.md`。
6. 涉及代码结构时读对应 `engineering/*.md`。
7. 涉及资产时读 `art/generation-workflow.md` 和对应美术专题。
8. P0 稳定后再进入 `tasks/phases/P1-full-run.md`。

## 当前项目判断

- 项目类型：Web/H5 卡牌 roguelike，React + TypeScript + Vite。
- game-vibe 类型：偏 **A 纯程序化**，地图、战斗、奖励、事件均由数据驱动生成；UI 使用 React 组件承载固定布局。
- 主要风险：已有原型代码存在，但需要把“能跑”整理为“可持续扩展、可验收、可调数值”的工作流。

## 双人协作规则

- 成员 A 优先负责系统逻辑：`src/systems/*`、`src/types/game.ts`、存档、奖励、战斗、解锁。
- 成员 B 优先负责表现和内容：`src/components/*`、`src/styles.css`、内容配置、美术、验收。
- 同一时间尽量不要同时改同一个文件。
- 跨边界任务先由主责人完成最小闭环，再由协作人接 UI/内容/验收。

## 文档维护规则

- 总览文档只放方向和入口。
- 细节写入专题文档，避免一个文件过长。
- 如果实现改变了设计，先更新对应专题文档，再改任务文档。
- 已废弃设计不要留在任务文档里，移到备注或直接删除。
