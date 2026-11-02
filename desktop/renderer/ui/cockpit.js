/**
 * 驾驶舱壳：会前抽屉、右栏 Tabs、听会态 class（纯 UI）。
 */
import { $, S } from "../state.js";

export function setPreflightOpen(open) {
  const drawer = $("preflightDrawer");
  const badge = $("preflightSummaryBadge");
  if (!drawer) return;
  if (open) {
    drawer.classList.remove("collapsed");
    document.body.classList.remove("drawer-collapsed");
    if (badge) {
      badge.textContent = S.listening ? "听会中 · 可改设备" : "展开中";
    }
  } else {
    drawer.classList.add("collapsed");
    document.body.classList.add("drawer-collapsed");
    if (badge) {
      badge.textContent = S.listening ? "运行中" : "已收起";
    }
  }
}

export function isPreflightOpen() {
  return !$("preflightDrawer")?.classList.contains("collapsed");
}

export function togglePreflight() {
  setPreflightOpen(!isPreflightOpen());
}

export function setListeningUi(on) {
  document.body.classList.toggle("is-listening", Boolean(on));
}

export function selectAidTab(tab) {
  const name = tab || "aid";
  document.querySelectorAll("[data-aid-tab]").forEach((b) => {
    b.classList.toggle("active", b.getAttribute("data-aid-tab") === name);
  });
  document.querySelectorAll("[data-aid-pane]").forEach((pane) => {
    pane.classList.toggle("active", pane.getAttribute("data-aid-pane") === name);
  });
}

export function bindCockpitShell() {
  $("togglePreflightBtn")?.addEventListener("click", () => togglePreflight());

  document.querySelectorAll("[data-aid-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectAidTab(btn.getAttribute("data-aid-tab"));
    });
  });

  $("winStealthProtect")?.addEventListener("change", (e) => {
    const on = Boolean(e.target?.checked);
    void window.bridge?.setStealthProtect?.(on);
  });

  void window.bridge?.getStealthProtect?.().then((r) => {
    if (r?.ok && $("winStealthProtect")) {
      $("winStealthProtect").checked = Boolean(r.on);
    }
  });

  // 手动话术回车试播
  $("manualText")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      $("forceSpeak")?.click();
    }
  });

  setPreflightOpen(true);
  setListeningUi(false);
}
