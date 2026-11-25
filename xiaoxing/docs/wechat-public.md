# 小星 · 微信公众号公网接入

## 配置（`xiaoxing/.env`）

```env
XIAOXING_HOST=0.0.0.0
XIAOXING_PORT=3780
WECHAT_TOKEN=你在公众平台填的 Token
# 可选安全模式
WECHAT_APP_ID=wx........
WECHAT_AES_KEY=43位EncodingAESKey
# 本地调试可：WECHAT_SKIP_VERIFY=1（公网务必关掉）
# 缺口/拒答写入农服跟进（默认开）：WECHAT_FOLLOWUP_ON_GAP=1
```

## 隧道

任选其一把本机 3780 暴露为 HTTPS：

```bash
# cloudflared
cloudflared tunnel --url http://127.0.0.1:3780

# 或 ngrok
ngrok http 3780
```

公众平台「服务器配置」URL：

`https://<公网域>/wechat`

## 自检

```bash
npm run serve
curl http://127.0.0.1:3780/healthz
npm run smoke:wechat
```

`healthz.wechat` 会显示 token / safeMode / followup 是否就绪（不含密钥）。

## 行为

- 文本消息 → Ask（FAQ/Wiki2/拒答）
- `gap` / `refuse` → 自动建农服跟进任务（`kind=wechat_fragment`）
- 同 `MsgId` 5 分钟去重，避免微信重试双答
- 配置 AES Key + AppId 后自动走安全模式加解密
