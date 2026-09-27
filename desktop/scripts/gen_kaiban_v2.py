# -*- coding: utf-8 -*-
from pathlib import Path
out = Path(__file__).resolve().parents[1] / "lib" / "kaiban.cjs"
# content loaded from sibling fragment to keep this runner small
frag = Path(__file__).with_name("kaiban_v2_body.cjs")
if frag.exists():
    out.write_text(frag.read_text(encoding="utf-8"), encoding="utf-8")
    print("wrote", out, out.stat().st_size)
else:
    print("missing body", frag)
