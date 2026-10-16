# 美术生成工作流

## 目标

规定 AI 资产从需求到入库的全过程，避免生成后不可复用。

## 流程

```text
确认资产是否需要 AI
→ 写结构化 prompt
→ 生成 raw
→ 保存 raw
→ 去背/切图/压缩
→ 游戏内预览
→ 记录验收结论
```

## 是否使用 AI 决策

| 资产形态 | 决策 |
|---|---|
| 纯几何图形 | 不用 AI，代码画 |
| 纯色按钮/面板 | 不用 AI，CSS 画 |
| 动态稀有度边框 | 不用 AI，CSS/SVG |
| 角色/敌人识别稿 | 用 AI |
| 区域氛围背景 | 可用 AI |
| 特效光效 | 可用 AI 或 CSS |
| 文字 | 禁止 AI，代码渲染 |

## 文件命名

```text
assets/raw/{asset_id}_raw.png
assets/characters/{asset_id}.png
assets/enemies/{asset_id}.png
assets/backgrounds/{asset_id}.png
assets/icons/{asset_id}.svg
assets/vfx/{asset_id}.png
```

## 后处理规则

- 绿幕：`--chroma-key green`。
- 品红幕：`--chroma-key magenta`。
- 白底：`--chroma-key white` 或 rembg。
- 黑底 VFX：亮度转 alpha。
- 复杂半透明：考虑 gpt-image-1.5 原生透明。

## 入库检查

- [ ] raw 已保存。
- [ ] 成品尺寸正确。
- [ ] 透明背景正确。
- [ ] 小尺寸可读。
- [ ] 不含文字/水印/版权元素。
- [ ] 在真实 UI 中预览过。
