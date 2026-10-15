#!/usr/bin/env python3
"""本地 30s 校验：openspeech SAUC 握手（1.0 / 2.0 resourceId）。

用法（仓库根或 desktop 目录）:
  python desktop/scripts/asr_handshake_test.py

从根目录 .env / desktop/.env 读取 DOUBAO_ASR_API_KEY 或 DOUBAO_SPEECH_API_KEY。
"""
from __future__ import annotations

import base64
import os
import socket
import ssl
import uuid
from pathlib import Path

RESOURCES = [
    ("ASR-1.0-duration", "volc.bigasr.sauc.duration"),
    ("ASR-2.0-duration", "volc.seedasr.sauc.duration"),
]
HOST = "openspeech.bytedance.com"
PORT = 443
PATH = "/api/v3/sauc/bigmodel"


def load_dotenv_keys() -> dict[str, str]:
    out: dict[str, str] = {}
    roots = [
        Path(__file__).resolve().parents[2] / ".env",
        Path(__file__).resolve().parents[1] / ".env",
    ]
    for p in roots:
        if not p.is_file():
            continue
        for line in p.read_text(encoding="utf-8", errors="replace").splitlines():
            s = line.strip()
            if not s or s.startswith("#") or "=" not in s:
                continue
            k, v = s.split("=", 1)
            out[k.strip()] = v.strip().strip('"').strip("'")
    return out


def resolve_api_key() -> str:
    env = load_dotenv_keys()
    for k in (
        "DOUBAO_ASR_API_KEY",
        "DOUBAO_SPEECH_API_KEY",
        "DOUBAO_REALTIME_API_KEY",
    ):
        v = (os.environ.get(k) or env.get(k) or "").strip()
        if v:
            return v
    return ""


def try_one(
    api_key: str,
    label: str,
    rid: str,
    *,
    legacy: bool = False,
    app_id: str = "",
) -> None:
    key = base64.b64encode(os.urandom(16)).decode()
    req_id = str(uuid.uuid4())
    auth_headers = (
        f"X-Api-App-Key: {app_id}\r\n"
        f"X-Api-Access-Key: {api_key}\r\n"
        if legacy and app_id
        else f"X-Api-Key: {api_key}\r\n"
    )
    req = (
        f"GET {PATH} HTTP/1.1\r\n"
        f"Host: {HOST}\r\n"
        f"Upgrade: websocket\r\n"
        f"Connection: Upgrade\r\n"
        f"Sec-WebSocket-Key: {key}\r\n"
        f"Sec-WebSocket-Version: 13\r\n"
        f"{auth_headers}"
        f"X-Api-Resource-Id: {rid}\r\n"
        f"X-Api-Request-Id: {req_id}\r\n"
        f"X-Api-Sequence: -1\r\n"
        f"\r\n"
    )
    ctx = ssl.create_default_context()
    s = socket.create_connection((HOST, PORT), timeout=10)
    ss = ctx.wrap_socket(s, server_hostname=HOST)
    ss.sendall(req.encode())
    buf = b""
    while b"\r\n\r\n" not in buf:
        chunk = ss.recv(4096)
        if not chunk:
            break
        buf += chunk
        if len(buf) > 8192:
            break
    ss.close()
    head = buf.split(b"\r\n\r\n", 1)[0].decode("utf-8", errors="replace")
    first_line = head.split("\r\n", 1)[0]
    print(f"[{label}] {rid}\n  -> {first_line}")
    for line in head.split("\r\n")[1:]:
        if ":" in line:
            k, v = line.split(":", 1)
            if k.strip().lower() in ("x-tt-logid", "x-api-connect-id"):
                print(f"     {k.strip()}: {v.strip()}")
    body = buf[len(head) + 4 :]
    if body and not first_line.startswith("HTTP/1.1 101"):
        print(f"     body: {body[:300].decode('utf-8', errors='replace')}")
    print()


def resolve_app_id() -> str:
    env = load_dotenv_keys()
    for k in ("DOUBAO_SPEECH_APP_ID", "DOUBAO_APP_ID"):
        v = (os.environ.get(k) or env.get(k) or "").strip()
        if v:
            return v
    return ""


def main() -> None:
    api_key = resolve_api_key()
    if not api_key:
        print("missing DOUBAO_ASR_API_KEY / DOUBAO_SPEECH_API_KEY")
        raise SystemExit(2)
    app_id = resolve_app_id()
    print(f"API Key: {api_key[:8]}…{api_key[-4:]}  path={PATH}  appId={app_id or '(none)'}\n")
    modes = [("new-X-Api-Key", False)]
    if app_id:
        modes.append(("legacy-App+Access", True))
    for mode_label, legacy in modes:
        print(f"=== auth={mode_label} ===")
        for label, rid in RESOURCES:
            tag = f"{mode_label}/{label}"
            try:
                try_one(api_key, tag, rid, legacy=legacy, app_id=app_id)
            except Exception as e:
                print(f"[{tag}] {rid}  -> {type(e).__name__}: {e}\n")


if __name__ == "__main__":
    main()
