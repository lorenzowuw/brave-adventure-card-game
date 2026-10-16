# 《勇者大冒险》Asset Request

> 给 `game-art-gen` 使用。按 P0 → P1 → P2 拆分，不提前批量做远期资产。
> 规则：纯几何/UI 框/按钮优先代码绘制；AI 只生成风格稿、角色/敌人/背景/复杂图标。

## 资产目录建议

```text
assets/
  raw/                 # AI 原始输出，必须保留并提交
  characters/          # 角色定稿/动作
  enemies/             # 敌人/Boss
  backgrounds/         # 区域背景
  icons/               # 技能/节点/状态图标
  ui/                  # 仅复杂 UI 装饰，不放纯按钮
```

## 通用 Prompt 约束

```text
flat cartoon stick figure game asset, clean black line art, simple readable silhouette,
white or transparent background, 2D web game style, adventure notebook mood,
no text, no watermark, no realistic face, no copyrighted character, no complex rendering
```

## P0 资产：核心战斗原型

| Asset ID | 名称 | 用途 | 生成模式 | Prompt 关键词 | 技术规格 | Milestone |
|---|---|---|---|---|---|---|
| char_ironwall_design | 铁壁守卫风格稿 | 角色选择/战斗占位 | 文生图 | wide-shouldered stick figure knight, square shield, heavy armor outlines, calm defensive pose, steel blue accent | 1024x1024, 白底或透明 | P0 |
| char_shadowblade_design | 影刃刺客风格稿 | 角色选择/战斗占位 | 文生图 | slim hooded stick figure rogue, short cloak, dual daggers, low agile pose, dark purple accent | 1024x1024, 白底或透明 | P0 |
| char_lifesage_design | 生命贤者风格稿 | 角色选择/战斗占位 | 文生图 | tall gentle stick figure healer, long robe, staff with gem, soft expression, green accent | 1024x1024, 白底或透明 | P0 |
| enemy_forest_imp | 森林小怪 | 首个普通敌人 | 文生图 | creepy small stick figure forest monster, twig horns, leaf claws, jagged lines, dark green accent | 512x512, 透明优先 | P0 |
| enemy_tree_king_design | 树精之王风格稿 | 首个 Boss | 文生图 | large stick figure tree king monster, branch crown, root arms, ancient forest boss, misty green accent | 1024x1024, 白底或透明 | P0 |
| bg_battle_paper | 战斗底纹 | 战斗背景 | 文生图/代码复刻 | parchment adventure notebook background, subtle hand-drawn border, light beige, no text, no characters | 1920x1080, jpg/png | P0 |

### P0 建议先代码绘制，不 AI 生成

| 资产 | 原因 | 实现方式 |
|---|---|---|
| 卡牌底框 | 纯几何 + 稀有度边框 | CSS/SVG |
| HP/能量/护甲条 | 纯 UI | CSS |
| 费用图标 | 可用字符或 SVG | CSS/SVG |
| 普通按钮 | 纯 UI | CSS |
| 伤害数字 | 文字动画 | CSS |

## P1 资产：完整一局 MVP

| Asset ID | 名称 | 用途 | 生成模式 | Prompt 关键词 | 技术规格 | Milestone |
|---|---|---|---|---|---|---|
| bg_forest_map | 迷雾森林地图背景 | 地图界面 | 文生图 | minimal misty fantasy forest background, adventure notebook illustration, light parchment colors, no characters, no UI | 1920x1080 | P1 |
| icon_node_battle | 战斗节点图标 | 地图节点 | 代码绘制优先 | crossed simple swords doodle icon, black line, small readable | SVG 64x64 | P1 |
| icon_node_shop | 商店节点图标 | 地图节点 | 代码绘制优先 | small merchant tent doodle icon, black line, gold accent | SVG 64x64 | P1 |
| icon_node_event | 事件节点图标 | 地图节点 | 代码绘制优先 | question mark parchment doodle icon | SVG 64x64 | P1 |
| icon_node_rest | 休息节点图标 | 地图节点 | 代码绘制优先 | campfire doodle icon, warm accent | SVG 64x64 | P1 |
| icon_node_boss | Boss 节点图标 | 地图节点 | 代码绘制优先 | simple crown monster doodle icon, red accent | SVG 64x64 | P1 |
| vfx_attack_slash | 攻击划线特效 | 出牌反馈 | 文生图/代码绘制 | white slash arc on pure black background, high contrast, simple 2D game vfx, no character | 4帧横排, 黑底转 alpha | P1 |
| vfx_heal_spark | 回复闪光特效 | 回复反馈 | 文生图/代码绘制 | soft green healing sparkles on pure black background, simple 2D game vfx | 4帧横排, 黑底转 alpha | P1 |
| vfx_armor_flash | 护甲闪光特效 | 护甲反馈 | 代码绘制优先 | blue shield flash line art | CSS/SVG | P1 |

## P2 资产：角色扩充与升级链

| Asset ID | 名称 | 用途 | 生成模式 | Prompt 关键词 | 技术规格 | Milestone |
|---|---|---|---|---|---|---|
| char_taichimonk_design | 太极武僧 | 角色扩充 | 文生图 | athletic stick figure martial monk, tied long hair, loose training clothes, one-leg tai chi stance, black and gold accent | 1024x1024 | P2 |
| char_rangermerchant_design | 游侠商人 | 角色扩充 | 文生图 | cheerful stick figure merchant ranger, money pouch, small hat, bow or ledger, gold accent | 1024x1024 | P2 |
| char_holylight_design | 圣光战士 | 角色扩充 | 文生图 | upright stick figure holy knight, long sword, glowing armor lines, gold white accent | 1024x1024 | P2 |
| char_wealthmerchant_design | 财富商人 | Boss1 解锁角色 | 文生图 | chubby stick figure wealthy merchant, large money bag, abacus, confident pose, gold accent | 1024x1024 | P2 |
| char_undeadpriest_design | 亡灵祭司 | Boss1 解锁角色 | 文生图 | dark robed stick figure necromancer priest, small coffin prop, ghostly blue glow | 1024x1024 | P2 |
| char_armorbreaker_design | 破甲战士 | Boss1 解锁角色 | 文生图 | rugged stick figure warrior, giant hammer, cracked armor, scar line, red accent | 1024x1024 | P2 |
| icon_skill_upgrade | 技能祭坛图标 | 地图节点 | 文生图/代码绘制 | simple altar flame doodle icon, magical upgrade, no text | SVG/PNG 128x128 | P2 |
| icon_burn_altar | 焚卡炉图标 | 地图节点 | 文生图/代码绘制 | card burning furnace doodle icon, fantasy, no text | SVG/PNG 128x128 | P2 |

## 角色 Sprite Sheet 生成模板

用于后续从风格稿生成动作帧。

```text
Use case: game-character-sprite
Asset type: character
Primary request: <角色名> <动作> animation sprite sheet

Subject:
  Species/role: fantasy stick figure adventurer
  Key colors: <角色主题色>
  Equipment/props: <盾牌/匕首/法杖/长剑等>

Animation:
  Frames: 4
  Layout: horizontal-strip
  Action: idle | attack | cast | hit
  Loopable: yes/no

Sprite layout:
  Character fills: 70-80% of frame
  Baseline: aligned feet
  Facing: right

Style/medium: flat-cartoon
Composition/framing: full-body
Background: green-chroma
Constraints:
  - clean black line art
  - simple readable silhouette
  - consistent proportions across frames
Avoid:
  - text
  - detailed face
  - realistic human anatomy
  - copyrighted character resemblance
```

## 生成后处理要求

1. 原图保存到 `assets/raw/{asset_id}_raw.png`。
2. 若为白底/绿幕/品红幕，使用 `slice-sheet.py` 或等价脚本去背。
3. 若为 VFX 黑底，使用亮度转 alpha，不用 chroma-key black。
4. 进入游戏前先缩小到目标显示尺寸验证可读性。
5. 不满意时优先调整识别特征，不追求精细画质。
