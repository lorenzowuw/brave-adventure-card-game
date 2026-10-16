# 《勇者大冒险》Systems Index

> 系统分类使用 game-design 约定：Foundation / Core / Feature / Presentation / Meta。
> 第一版只列 MVP 和近端扩展所需系统。

## Foundation 系统

| 系统 | 一句话描述 | 上游依赖 | 主要数据承载 | MVP 必须 |
|---|---|---|---|---|
| 数据加载系统 | 加载角色、卡牌、敌人、地图、事件、祝福等配置 | 无 | `src/data/*.json`, `src/data/balance/*.csv`, `DataLoader` | 是 |
| 类型定义系统 | 统一运行时状态、配置、卡牌效果、敌人意图类型 | 无 | `src/types/game.ts` | 是 |
| 全局常量系统 | 承载手牌上限、初始金币、等级曲线等全局参数 | 类型定义 | `src/data/constants.json`, `src/data/balance/*.csv` | 是 |
| 存档系统 | 保存跨局解锁、胜场、成就等全局进度 | 类型定义 | localStorage | 是 |
| 事件总线系统 | 分发节点进入、战斗结束、奖励获得等事件 | 类型定义 | `EventBus` | 否，MVP 可直接回调 |

## Core 系统

| 系统 | 一句话描述 | 上游依赖 | 主要数据承载 | MVP 必须 |
|---|---|---|---|---|
| 运行状态机 | 管理 select/exploration/combat/event/shop/rest/victory/defeat 流转 | 类型定义、数据加载 | `RunState`, `AppState` | 是 |
| 角色选择系统 | 根据全局解锁展示可选角色并创建局内初始状态 | 存档、角色配置 | `characters.json` | 是 |
| 战斗系统 | 处理抽牌、能量、出牌、伤害、护甲、敌人行动 | 卡牌、敌人、常量 | `BattleSystem.ts`, `CombatState` | 是 |
| 卡牌效果解释器 | 把 JSON 卡牌效果转成运行时效果 | 战斗系统、技能配置 | `skills.json`, `SkillEffect` | 是 |
| 敌人意图系统 | 按回合显示并执行攻击/防御/buff/debuff/summon 意图 | 敌人配置、战斗系统 | `enemies.json` | 是 |
| 地图导航系统 | 展示树形层级，进入节点并推进层数 | 地图配置、运行状态机 | `maps.json` | 是 |
| 奖励结算系统 | 战斗后发放经验、金币、卡牌选择并推进地图 | 战斗、卡牌、角色成长 | 运行时状态 + 卡牌配置 | 是 |
| 角色等级系统 | 根据经验计算等级和 HP/能量成长 | 常量、角色配置 | `constants.json`, `level_up.csv` | 是 |

## Feature 系统

| 系统 | 一句话描述 | 上游依赖 | 主要数据承载 | MVP 必须 |
|---|---|---|---|---|
| 商店系统 | 买卡、删卡、消耗金币 | 卡牌、金币、运行状态 | `skills.json`, 价格规则 | 是，简版 |
| 事件系统 | 选择题节点，产生金币/回血/卡牌等奖惩 | 地图、运行状态 | `events.json` | 是，简版 |
| 休息系统 | 回复生命并可选祝福 | 祝福、运行状态 | `blessings.json` | 是，简版 |
| 祝福系统 | 战前或休息时选择临时/整局增益 | 战斗、休息 | `blessings.json` | 否，P1 |
| 卡牌升级系统 | 把已有卡替换为 `upgradeTo` 指向的新卡 | 卡牌配置、事件/等级 | `skills.json` | 否，P1 |
| 删卡/焚卡系统 | 永久移除局内卡组中的卡换取收益 | 卡组、商店/事件 | 运行时状态 | 否，P1 |
| Boss 解锁系统 | 击败不同 Boss 解锁角色/区域/祝福 | 存档、地图、敌人 | localStorage + 配置 | 是，简版 |
| 区域系统 | 管理森林/遗迹/烈焰/冰封/混沌主题和 Boss | 地图、敌人 | `areas.json`, `maps.json` | 否，MVP 只做森林 |
| 元素共鸣系统 | 特定角色/卡牌组合触发额外效果 | 战斗、卡牌、角色 | `combos.json` | 否，P2 |
| 风险系统 | 路线选择影响风险和奖励倍率 | 地图、奖励、敌人 | constants/config | 否，P3 |
| 图鉴/成就系统 | 记录遇到过的敌人、卡牌和里程碑 | 存档 | localStorage | 否，P2 |

## Presentation 系统

| 系统 | 一句话描述 | 上游依赖 | 主要数据承载 | MVP 必须 |
|---|---|---|---|---|
| 角色选择 UI | 显示角色定位、血量、能量、被动和解锁状态 | 角色选择、存档 | React 组件 + CSS | 是 |
| 地图 UI | 显示当前层、下一层预览、节点类型和 Boss 进度 | 地图导航 | React 组件 + CSS | 是 |
| 战斗 UI | 显示敌人、意图、玩家 HP/能量/护甲、手牌和操作按钮 | 战斗系统 | React 组件 + CSS | 是 |
| 卡牌 UI | 根据费用、稀有度、类型和效果渲染卡牌 | 卡牌配置 | React 组件 + CSS | 是 |
| 事件 UI | 显示事件描述和 2-3 个选择 | 事件系统 | React 组件 + CSS | 是 |
| 商店 UI | 显示商品、价格、购买和删卡入口 | 商店系统 | React 组件 + CSS | 是，简版 |
| 休息 UI | 显示回血和祝福选择 | 休息/祝福系统 | React 组件 + CSS | 是，简版 |
| 结算 UI | 显示胜利/失败、解锁和重新开始 | 存档、运行状态 | React 组件 + CSS | 是 |
| 火柴人渲染 | 用代码/SVG/Canvas 显示角色和敌人 | 美术方向 | CSS/SVG/Canvas | 是，简版 |
| 反馈动画 | 伤害数字、抖动、抽牌、出牌飞行动画 | 战斗 UI | CSS animation | 否，P1 |

## Meta 系统

| 系统 | 一句话描述 | 上游依赖 | 主要数据承载 | MVP 必须 |
|---|---|---|---|---|
| 内容生产规范 | 约束新增角色/卡牌/敌人/事件如何写配置 | 全部配置系统 | 工作文档 | 是 |
| 美术生产管线 | 约束哪些资产 AI 生成，哪些代码绘制 | ART_DIRECTION/ASSET_REQUEST | `assets/raw`, `assets/*` | 是 |
| 测试验收系统 | 为核心系统定义人工和自动验收 | 工程任务 | `ACCEPTANCE_CHECKLIST.md` | 是 |
| 数值调优流程 | 把高频调整数值收敛到 CSV/JSON | 数据系统 | `src/data/balance/*.csv` | 是 |

## 单一真相源规则

- 角色基础属性只放 `characters.json`。
- 卡牌费用、稀有度、效果只放 `skills.json` 或 `cards.json`，不在 UI 中重复定义。
- 敌人 HP、意图、奖励只放 `enemies.json`。
- 地图节点、层级、Boss 只放 `maps.json`。
- 等级曲线和全局基础参数只放 `constants.json` / `src/data/balance/*.csv`。
- UI 只负责展示和发起动作，不拥有规则数值。
