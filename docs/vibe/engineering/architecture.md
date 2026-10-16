# 工程架构文档

## 当前技术栈

- React
- TypeScript
- Vite
- JSON/CSV 数据配置
- localStorage 存档

## 架构原则

- UI 组件只展示状态和触发事件。
- 系统层负责规则计算。
- 配置文件承载游戏内容。
- 高频数值放 `src/data/balance/*.csv` 或 constants。
- 状态更新保持不可变。

## 目录职责

| 目录/文件 | 职责 |
|---|---|
| `src/App.tsx` | 顶层状态机和屏幕路由 |
| `src/components/*` | 展示组件 |
| `src/systems/*` | 游戏规则和流程系统 |
| `src/types/game.ts` | 类型定义 |
| `src/data/*.json` | 内容配置 |
| `src/data/balance/*.csv` | 高频调参表 |
| `src/utils/DataLoader.ts` | 数据加载与查询 |
| `src/styles.css` | UI 样式和动效 |

## 推荐状态流

```text
用户操作
→ App handler
→ systems 纯函数/半纯函数
→ 返回新 RunState/AppState
→ React 重新渲染
```

## 不建议

- 不把战斗规则写进组件。
- 不在 UI 里硬编码卡牌数值。
- 不在多个文件重复定义同一数值。
- 不为了未来功能提前引入 Redux/Zustand。

## 拆分时机

| 现象 | 动作 |
|---|---|
| `App.tsx` handler 超过 50 行 | 抽到 `RunManager` |
| 同类查询出现 3 次 | 放到 `DataLoader` |
| 同一数值出现 2 个来源 | 合并到配置 |
| 组件混入规则计算 | 移回 system |
