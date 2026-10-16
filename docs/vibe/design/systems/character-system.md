# 角色系统设计

## 目标

让玩家每局从已解锁角色中选择 1 名开始冒险，并通过 Boss 解锁形成长期目标。

## MVP 范围

### P0
- 3 个初始角色：铁壁守卫、影刃刺客、生命贤者。
- 每个角色有：名称、称号、定位、HP、能量、被动、主题色、初始技能。
- 角色选择后创建局内状态。

### P1
- 6 个初始角色展示完整，但可先只平衡 3 个。
- 全局存档记录已解锁角色。
- Boss1 胜利后解锁第一批角色。

### P2+
- Boss2/Boss3 解锁更多角色。
- 隐藏角色。
- 角色图鉴。

## 角色字段

| 字段 | 说明 | 来源 |
|---|---|---|
| id | 程序 ID | `characters.json` |
| name | 中文名 | `characters.json` |
| title | 称号/定位短句 | `characters.json` |
| role | 定位标签 | `characters.json` |
| baseHp | 基础生命 | `characters.json` |
| baseEnergy | 基础能量 | `characters.json` |
| passiveName | 被动名 | `characters.json` |
| passiveDescription | 被动说明 | `characters.json` |
| unlockCondition | 解锁条件 | `characters.json` |
| mainColor | 主题色 | `characters.json` |

## 初始角色

| 角色 | 定位 | 玩法关键词 | P0/P1 |
|---|---|---|---|
| 铁壁守卫 | 坦克/反制 | 护甲、挨打抽牌 | P0 |
| 影刃刺客 | 爆发 | 首张攻击加成、低防高能量 | P0 |
| 生命贤者 | 续航 | 回复、稳定容错 | P0 |
| 太极武僧 | 技巧反击 | 多段、反击、暴击 | P1/P2 |
| 游侠商人 | 经济速攻 | 金币转伤害 | P1/P2 |
| 圣光战士 | 残血爆发 | 低血翻倍、消耗全部能量 | P1/P2 |

## 解锁角色

| 解锁条件 | 角色 | 玩法关键词 |
|---|---|---|
| Boss1 | 财富商人 | 资源转换 |
| Boss1 | 亡灵祭司 | 击杀收益/亡语 |
| Boss1 | 破甲战士 | 真实伤害/破甲 |
| Boss2 | 元素法师 | AOE/控制 |
| Boss2 | 全能贤者 | 均衡 |
| Boss2 | 格斗大师 | Combo |
| Boss3 | 冰霜祭司 | 群体回复 |
| Boss3 | 荆棘守卫 | 反伤 |

## 验收

- [ ] 初始存档至少解锁 P0 角色。
- [ ] 选择角色后 HP/能量正确进入战斗。
- [ ] 未解锁角色不可选择。
- [ ] Boss 胜利能改变解锁状态。
