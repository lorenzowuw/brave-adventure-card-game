# 背景与区域美术计划

## 目标

用轻量背景建立区域氛围，但不干扰 UI 和卡牌可读性。

## 通用背景规则

- 低对比度。
- 不放文字。
- 不放关键交互元素。
- 中央区域保持干净。
- 边缘可有手绘装饰。

## P0 背景

| 资产 | 用途 | 关键词 | Asset ID |
|---|---|---|---|
| 战斗羊皮纸底纹 | 战斗界面 | parchment, notebook, subtle border | bg_battle_paper |

## P1 区域背景

| 区域 | 色彩 | 关键词 | Asset ID |
|---|---|---|---|
| 迷雾森林 | 浅绿/灰绿 | misty forest, ancient trees, notebook illustration | bg_forest_map |
| 古城遗迹 | 灰黄/石色 | ruined city, cracked stone, faded symbols | bg_ruins_map |
| 烈焰之地 | 暗红/橙 | lava land, volcano glow, minimal | bg_flame_map |
| 冰封神殿 | 冰蓝/白 | frozen temple, snow mist, crystal | bg_frost_map |
| 混沌深渊 | 黑紫 | chaos rift, abstract void, low contrast | bg_chaos_map |

## Prompt 模板

```text
A minimal 2D fantasy game background, <area theme>, adventure notebook illustration,
light parchment palette, subtle hand-drawn border, low contrast center area,
no characters, no UI, no text, readable for card game interface
```

## 验收

- [ ] 背景不影响文字和卡牌阅读。
- [ ] 5 秒内能看出区域主题。
- [ ] 文件大小适合 Web。
