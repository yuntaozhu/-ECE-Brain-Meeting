# ADR 016 — Wave P′：Push-to-Ask 试播对话链

## 背景

试播 Option C「…还是家长口碑？」后，会场答「家长口碑」无巡检、无口播。根因：`choiceInvite` 过窄；「A、B，还是 C」抽不出选项；试播未切入 `HA_ASK` / 未开链。

## 决策

1. `offerExtract.cjs`：扩 invite + 还是切分；`choiceRewrite` 映射业务追问。
2. `dialogueThread`：试播开链（≥2 选项）；STOP 关链；选题续期。
3. `host:speak` 成功后 `openFromOffer` + `setMode(HA_ASK)` + 广播。
4. `shouldImmediatePatrolForUi`：链活跃或咨询中，选题短答免唤醒立刻巡检。

## 验收

`npm run smoke:wave-p`  
实机：试播 C → 说「家长口碑」→ 立刻巡检并口播。
