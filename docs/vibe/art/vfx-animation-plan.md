# VFX 与动画计划

## 目标

用短促、清晰、低成本的动效强化操作反馈。

## 动效原则

- 0.3-0.8 秒完成。
- 不阻塞玩家操作太久。
- 优先 CSS 动画。
- VFX sheet 只用于代码难画的光效。

## P0 动效

| 动效 | 实现方式 | 验收 |
|---|---|---|
| 卡牌 hover | CSS transform | 鼠标移入放大 |
| 出牌反馈 | CSS translate/scale | 卡牌飞向目标 |
| 伤害数字 | CSS float up | 红色数字上浮 |
| 受击抖动 | CSS keyframes | 目标短抖 |
| 护甲闪烁 | CSS/SVG | 护盾短闪 |

## P1 VFX

| VFX | 生成方式 | 背景处理 | Asset ID |
|---|---|---|---|
| 攻击划线 | AI 或 SVG | 黑底亮度转 alpha | vfx_attack_slash |
| 回复闪光 | AI 或 CSS | 黑底亮度转 alpha | vfx_heal_spark |
| 护甲闪光 | CSS/SVG | 不需要 AI | vfx_armor_flash |

## Sprite Sheet 规范

- 攻击：4 帧横排。
- 回复/施法：4 帧横排。
- idle：4 帧循环。
- hit：2 帧即可。
- 所有帧基线一致。

## 验收

- [ ] 伤害/回血/护甲反馈颜色不同。
- [ ] 动画结束后状态正确。
- [ ] 低性能设备也不卡顿。
