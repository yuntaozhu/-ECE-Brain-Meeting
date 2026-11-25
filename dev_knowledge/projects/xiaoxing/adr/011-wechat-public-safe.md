# ADR-011：微信公网就绪（安全模式 + 跟进）

## 背景

明文 `/wechat` 骨架不足以上公网：缺 AES 安全模式、去重、缺口闭环与部署自检。

## 决策

1. `wechatCrypto.cjs`：EncodingAESKey 加解密；配置齐全即安全模式。  
2. `handleWechatHttp` 统一 GET/POST；`MsgId` 去重。  
3. `gap`/`refuse` → `followup`（`wechat_fragment`）。  
4. `/healthz` 暴露非敏感就绪态；文档 `docs/wechat-public.md`。

## 后果

- 公网必须关 `WECHAT_SKIP_VERIFY`。  
- 冒烟：`npm run smoke:wechat`。
