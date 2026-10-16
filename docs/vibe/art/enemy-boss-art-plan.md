# 敌人与 Boss 美术计划

## 目标

敌人也采用火柴人/简笔怪物风格，但轮廓更尖锐、更暗，和玩家角色区分。

## 通用规范

- 玩家角色：干净、圆润、明亮。
- 普通敌人：尖锐、破碎、深色。
- Boss：体型更大，轮廓更复杂，但仍保持小尺寸可读。
- 区域主题色必须明显。

## P0 敌人

| 资产 | 用途 | 关键词 | Asset ID |
|---|---|---|---|
| 森林小怪 | 首个普通敌人 | twig horns, leaf claws, small creepy forest monster | enemy_forest_imp |
| 树精之王 | 首个 Boss | branch crown, root arms, ancient forest boss | enemy_tree_king_design |

## 区域敌人方向

| 区域 | 普通怪 | 精英怪 | Boss |
|---|---|---|---|
| 迷雾森林 | 树枝小怪、暗影兽 | 藤蔓守卫 | 树精之王 |
| 古城遗迹 | 石像兵、幽灵 | 符文机关 | 遗迹守灵 |
| 烈焰之地 | 火元素、岩浆兽 | 熔岩恶魔 | 炎魔领主 |
| 冰封神殿 | 雪怪、冰元素 | 冰晶骑士 | 冰霜巨龙 |
| 混沌深渊 | 黑雾怪、裂隙兽 | 暗影领主 | 混沌之主 |

## Boss 设计原则

- 占画面面积大于普通敌人 1.5-2 倍。
- 至少 2 个标志性特征。
- 第一眼能看出所属区域。
- 不写实恐怖，保持轻奇幻。

## Prompt 模板

```text
A flat cartoon stick figure monster boss, <area theme>, <2-3 key features>,
clean jagged black line art, simple readable silhouette, dark tone with <area color> accent,
full body, white or transparent background, no text, no watermark,
adventure notebook fantasy web game style
```

## 验收

- [ ] 普通怪和 Boss 尺寸/威胁感不同。
- [ ] 128px 下能看出区域主题。
- [ ] 不和玩家角色混淆。
