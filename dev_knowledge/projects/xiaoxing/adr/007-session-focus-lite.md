# ADR-007：Session Focus 轻量槽

## 背景

会场 ASR 拆句、催答「请回答」、回想「我刚刚问了什么」若无写槽，会丢问或误进 FAQ。大智 R10 过重，小星先裁剪最小可用。

## 决策

1. `schema/session-focus.json` + `lib/meeting/focus.cjs`：受理即写 `commitFocusAsk`。  
2. Others 建议卡可 soft-commit；Me 咨询写槽并 `markFocusAnswered`。  
3. `urge` / `recall` 口令；武装后短句 `focusGlueMs` 粘合上一问。  
4. 无槽催答 → `focus_gap` 坦诚句，禁止空 skip。  
5. 摘要增加「Focus 槽」；开/散会清槽。

## 后果

- 不引入 desktop memory/patrol；通用经验可后升 shared。  
- 冒烟：`npm run smoke:focus`。
