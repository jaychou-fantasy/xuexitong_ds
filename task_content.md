# xuexitong_ds 工作进度记录

> 最后更新: 2026-05-15 — 删除答案对比 + 填空判断提取修复

---

## 阶段 0 — 工程基础设施 ✅

- [x] `package.json` — React 18, TypeScript 5, Webpack 5, TailwindCSS 3, Tesseract.js 5
- [x] `tsconfig.json` — strict, ES2022, 路径别名 5 个
- [x] `webpack.config.js` — 多入口, raw-loader + postcss-loader
- [x] `manifest.json` — V3, permissions + host_permissions
- [x] `src/background/index.ts` + `src/content/index.ts` — 骨架

## 阶段 0.8 — DOM 侦察 ✅

- [x] 已提交作业查看页 完整 DOM
- [x] 作答页 DOM（radio/checkbox/input, 选项乱序, qtype 代码）
- [x] 无 iframe, 无跨域限制

## 阶段 1 — 浮窗 UI + DOM 提取 ✅

- [x] Shadow DOM 隔离, Tailwind CSS 注入
- [x] 可拖拽浮窗, 最小化/展开, 暗色模式
- [x] `platforms/chaoxing/` — detector + extractor + constants
- [x] 选项按显示标签排序 (A/B/C/D), 处理乱序
- [x] 题型识别 (typename → colorShallow → qtype fallback)
- [x] 图片检测 (hasImage + imageUrls)

## 阶段 2 — AI 集成 ✅

- [x] `storage/settings.ts` — chrome.storage.local 封装
- [x] `providers/deepseek.ts` — DeepSeek API (batch 请求)
- [x] `providers/prompt.ts` — System + User prompt 模板
- [x] `SettingsPanel.tsx` — API Key 输入 + Flash/Pro 切换
- [x] `AnswerCard.tsx` — 置信度颜色编码 + 详细分析
- [x] token 用量 + 预估费用显示
- [x] 图片题 OCR 提醒 + 低置信度警示

## 阶段 3 — OCR 支持 ✅

- [x] `ocr/tesseract.ts` — Tesseract.js 封装, chi_sim 中文
- [x] 批量模式复用 worker, 重试 2 次, 超时 20s
- [x] 提取后自动触发 OCR
- [x] `OCRProgress.tsx` — 进度条
- [x] 图片过滤 (跳过 < 20px 图标)

## 阶段 4 — 多模型支持 ✅

- [x] Provider 抽象: DeepSeek / OpenAI / Gemini
- [x] `providers/gemini.ts` — Gemini generateContent API
- [x] DeepSeekProvider 通用化 (OpenAI 兼容格式)
- [x] `SettingsPanel.tsx` — Provider 下拉切换
- [x] 费用按币种显示 (¥ / $)

## 阶段 5 — 优化打磨 ✅

- [x] 逐条展开动画 (60ms/题, 视觉流式)
- [x] ~~AI vs 页面答案对比~~ (已删除)
- [x] 已选选项蓝色高亮 + "已选"标签
- [x] 请求重试 (3 次, 指数退避 1s/2s/4s)
- [x] requestId 防竞态 (快速连点不重叠)

---

## 当前文件树 (20 个源文件)

```
src/
├── background/index.ts
├── content/
│   ├── index.ts
│   └── floating-panel/
│       ├── index.ts              # Shadow DOM + React 挂载
│       ├── App.tsx               # 主组件 (全部流程)
│       ├── components/
│       │   ├── AnswerCard.tsx     # AI 答案推荐 + OCR 提醒
│       │   ├── ExtractButton.tsx  # 操作按钮 (提取/AI/OCR/设置)
│       │   ├── OCRProgress.tsx    # OCR 进度条
│       │   ├── PanelHeader.tsx    # 标题栏 (拖拽/暗色/最小化)
│       │   ├── QuestionCard.tsx   # 单题 + 已选高亮
│       │   ├── QuestionList.tsx   # 题目列表
│       │   └── SettingsPanel.tsx  # Provider + API Key + 模型设置
│       └── styles/
│           └── app.shadow.css     # Shadow DOM Tailwind
├── ocr/
│   └── tesseract.ts              # Tesseract.js 封装
├── platforms/chaoxing/
│   ├── constants.ts              # CSS 选择器 + 类型映射
│   ├── detector.ts               # 页面检测
│   └── extractor.ts              # DOM → Question[] + 图片查找 + 答案读取
├── providers/
│   ├── deepseek.ts               # DeepSeek/OpenAI (OpenAI 兼容)
│   ├── gemini.ts                 # Gemini API
│   └── prompt.ts                 # Prompt 模板
├── shared/types.ts               # 全部类型定义
└── storage/settings.ts           # chrome.storage 封装 + 多 provider
```

---

## 功能总览

| 功能 | 说明 |
|---|---|
| 题目提取 | 支持单选/多选/判断/填空/简答, 处理选项乱序 |
| AI 答题 | DeepSeek / OpenAI / Gemini 三选一, batch 请求 |
| OCR | Tesseract.js 中文识别, 自动触发 |
| ~~答案对比~~ | ~~AI 答案 vs 页面已选~~ (已删除) |
| 费用 | token 用量 + 预估费用显示 |
| 流式体验 | 逐条展开动画 |
| 稳定性 | 3 次重试 + 防竞态 + 超时处理 |
| 设置 | API Key + Provider + Flash/Pro 切换 |

## Bug 修复记录

### 2026-05-15 — 删除 AI 答案与已选答案对比

**原因:** 对比功能（绿勾一致/红叉冲突）容易误导用户 ，已删除。

**修复** (`App.tsx` + `AnswerCard.tsx`):
- `App.tsx`: 去掉 `getSelectedAnswer()` 调用和 `pageAnswer` 注入
- `AnswerCard.tsx`: 移除对比 UI 区块

---

### 2026-05-15 — 考试页填空题/判断题提取修复

**症状:** 考试页 (dowork) 填空题和判断题无法正确提取。填空题被识别为判断题，判断题被识别为填空题。

**根因:**
1. `QTYPE_MAP` 数字码映射写反：type=2 是填空题、type=3 是判断题，代码里反了
2. `extractType()` 只用了 `.colorShallow` 文本和 `qtype` 属性推断，考试页的可靠来源是 form 内的隐藏 `<input name="typeNameXXX">` 和 `<input name="typeXXX">`
3. 填空题没有 `role="radio"` 选项，是 UEditor 富文本输入框 + `.sub_que_div` 空位

**修复** (`constants.ts` + `extractor.ts`):
- `QTYPE_MAP`: `2→fill_blank`, `3→true_false`
- `extractType()`: 优先从 form 隐藏 input 读取类型（最可靠）
- `extractOptions()`: 填空题走 `extractFillBlankOptions()` 解析 `.sub_que_div` 空位
- `getSelectedAnswer()`: 判断/填空不再读 `#answerXXX`（那是正确答案不是用户选择），改为读 `.check_answer` span 和 UEditor iframe 内容
- `getAnswerTypeCode()`: 修复选择器，从 question 容器内查找

**症状:**
1. `OCR image X/Y failed: OCR 超时`（20s 超时）
2. `Cannot read properties of null (reading 'postMessage')`（Tesseract.js 内部报错）

**根因:** `withTimeout` 超时 reject 后，底层 `worker.recognize()` 仍在跑。后续 `worker.terminate()` 把 worker 杀了，超时那次 recognize 的 promise 最后 resolve/reject 时尝试对已销毁的 worker 调 `postMessage`，抛出不捕获的 TypeError。

**修复** (`src/ocr/tesseract.ts`):
- `recognizeImages`: 在传给 `withTimeout` 之前，对原始 recognize promise 加 `.catch(() => {})` 吞掉延迟 reject。超时后立即 terminate 旧 worker 并重建，后续图片不再复用卡住的 worker。
- `recognizeImage`: 同样对 `Tesseract.recognize()` 加 `.catch(() => {})` 防护。

---

## 待完成

- [ ] 考试页实战测试
- [x] 多选/判断/填空题的提取适配（页面结构待确认） — 判断/填空已修复, 多选结构类似单选待实战验证
- [ ] 简答题编辑器题型 (qtype 15/19)
