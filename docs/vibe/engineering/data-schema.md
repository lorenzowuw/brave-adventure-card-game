# 数据 Schema 文档

## 目标

明确每类 JSON/CSV 的职责和字段，保证内容扩展不改代码。

## characters.json

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | CharacterClass | 是 | 唯一 ID |
| name | string | 是 | 中文名 |
| title | string | 是 | 称号 |
| role | RoleTag[] | 是 | 定位标签 |
| baseHp | number | 是 | 基础生命 |
| baseEnergy | number | 是 | 基础能量 |
| description | string | 是 | 描述 |
| passiveName | string | 是 | 被动名 |
| passiveDescription | string | 是 | 被动说明 |
| unlockCondition | starter/boss1/boss2/boss3 | 是 | 解锁条件 |
| mainColor | string | 是 | 主题色 |

## skills.json

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | string | 是 | 卡牌 ID |
| name | string | 是 | 名称 |
| tier | number | 是 | 升级阶数 |
| rarity | RarityColor | 是 | 稀有度 |
| cost | number | 是 | 费用 |
| type | SkillType | 是 | 类型 |
| effect | SkillEffect | 是 | 效果对象 |
| description | string | 是 | UI 描述 |
| upgradeTo | string/null | 是 | 下一级 |
| characterBind | CharacterClass | 是 | 绑定角色 |
| flavorText | string | 否 | 风味文本 |

## enemies.json

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | string | 是 | 敌人 ID |
| name | string | 是 | 名称 |
| tier | normal/elite/boss | 是 | 阶层 |
| hp | number | 是 | 生命 |
| energy | number | 是 | 能量/行动力 |
| description | string | 是 | 描述 |
| intents | EnemyIntent[] | 是 | 意图循环 |
| rewards | object | 是 | 奖励 |
| area | AreaId | 是 | 区域 |

## maps.json

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | string | 是 | 地图 ID |
| areaId | AreaId | 是 | 区域 |
| layers | MapLayer[] | 是 | 层级 |
| boss | MapNode | 是 | Boss 节点 |

## events.json

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | string | 是 | 事件 ID |
| title | string | 是 | 标题 |
| description | string | 是 | 描述 |
| choices | EventChoice[] | 是 | 选项 |
| areaId | AreaId | 是 | 区域 |

## 数据校验任务

- [ ] 所有 ID 唯一。
- [ ] 所有引用 ID 存在。
- [ ] 所有数值非负。
- [ ] 所有枚举值合法。
- [ ] 所有升级链无循环。
