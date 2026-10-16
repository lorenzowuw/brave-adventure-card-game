# 角色美术计划

## 目标

用统一火柴人底模 + 强识别特征，低成本覆盖角色选择、战斗占位和后续动画。

## 统一规范

- 2-4 头身比例。
- 黑色/深灰线稿。
- 白色或浅色身体。
- 每角色 1-2 个主题色。
- 不画复杂五官。
- 通过道具、姿态、轮廓识别角色。

## P0 角色

| 角色 | 必须识别特征 | 主题色 | 首图姿态 | 资产 ID |
|---|---|---|---|---|
| 铁壁守卫 | 方形大盾、宽肩、盔甲线 | 钢蓝 | 防御站姿 | char_ironwall_design |
| 影刃刺客 | 兜帽、斗篷、双匕首 | 暗紫 | 低身突进 | char_shadowblade_design |
| 生命贤者 | 长袍、法杖、宝石 | 绿色 | 举杖治疗 | char_lifesage_design |

## P1/P2 角色

| 角色 | 必须识别特征 | 主题色 | 优先级 |
|---|---|---|---|
| 太极武僧 | 束发、练功服、单腿起手 | 墨黑/金 | P2 |
| 游侠商人 | 钱袋、商人帽、弓/账本 | 金黄 | P2 |
| 圣光战士 | 长剑、光纹、板甲 | 金白 | P2 |
| 财富商人 | 大钱袋、算盘、微胖 | 金色 | P2 |
| 亡灵祭司 | 黑袍、棺材、幽蓝光 | 幽蓝 | P2 |
| 破甲战士 | 大锤、伤疤、重甲 | 赤红 | P2 |

## 每个角色资产阶段

### Layer 0：风格稿
- 单张全身图。
- 用于确认识别特征。
- 不直接进游戏也可以。

### Layer 1：游戏立绘
- 透明背景。
- 正面或 3/4 角度。
- 适合角色选择卡片。

### Layer 2：战斗动作
- idle 4 帧。
- attack/cast 4 帧。
- hit 2-4 帧。
- 统一基线和尺寸。

## Prompt 模板

```text
A flat cartoon stick figure fantasy adventurer, <role and props>,
clean black line art, simple readable silhouette, <theme color> accent,
full body, white background, no text, no watermark, no realistic face,
adventure notebook web game style
```

## 验收

- [ ] 128px 下能认出角色。
- [ ] P0 三角色体型/道具明显不同。
- [ ] 主题色不冲突。
- [ ] 没有文字、水印、版权形象。
