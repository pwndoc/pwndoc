#!/usr/bin/env python3
"""Generate the OrcaRouter Cyber Inference GUI evidence bundle.

Serves the real built Quasar SPA and drives it with Playwright. API responses are
fixtures (dedicated test data) so the run is deterministic and never needs a live
credential; the model selector is still populated through the component's real
`getOrcaModels` call to the app's backend route.

Outputs (all relative to --out, default ./orca-evidence):
  manifest.json
  auth-methods.png
  text-model-dropdown.png
"""

import argparse
import base64
import hashlib
import json
import os
import subprocess
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

from playwright.sync_api import sync_playwright

MASKED_SECRET = "•" * 16
CATALOG_SOURCE = "https://api.orcarouter.ai/v1/models?capability=chat"

# Dedicated test data: a snapshot of chat-capable ids returned by the live catalog on
# 2026-10-24, plus non-text records that must be filtered out of the text selector.
FIXTURE_CATALOG = [
    {"id": "orcarouter/auto", "name": "OrcaRouter Auto", "context_length": None,
     "architecture": {"input_modalities": []},
     "supported_endpoint_types": ["openai", "openai-response", "anthropic", "gemini"]},
    {"id": "orcarouter/fusion", "name": "OrcaRouter Fusion", "context_length": 1000000,
     "architecture": {"input_modalities": []},
     "supported_endpoint_types": ["openai", "openai-response", "anthropic", "gemini"]},
    {"id": "orcarouter/fusion-flash", "name": "OrcaRouter Fusion Flash", "context_length": 262144,
     "architecture": {"input_modalities": []},
     "supported_endpoint_types": ["openai", "openai-response", "anthropic", "gemini"]},
    {"id": "orca/orcacyber-ultra-1.0", "name": "Orca: OrcaCyber Ultra 1.0", "context_length": 1048576,
     "architecture": {"input_modalities": ["text"]}, "supported_endpoint_types": ["openai"]},
    {"id": "orca/orcacyber-zero-1.5", "name": "Orca: OrcaCyber Zero 1.5", "context_length": 1000000,
     "architecture": {"input_modalities": ["text"]}, "supported_endpoint_types": ["openai"]},
    {"id": "orca/orcacyber-zero-1.0", "name": "Orca: OrcaCyber Zero 1.0", "context_length": 1000000,
     "architecture": {"input_modalities": ["text"]}, "supported_endpoint_types": ["openai"]},
    {"id": "deepseek/deepseek-v4-pro", "name": "DeepSeek: DeepSeek V4 Pro", "context_length": 1048576,
     "architecture": {"input_modalities": ["text"]},
     "supported_endpoint_types": ["openai", "openai-response"]},
    {"id": "deepseek/deepseek-v4-flash-vision-exp", "name": "DeepSeek: DeepSeek V4 Flash Vision (Exp)",
     "context_length": 1048576, "architecture": {"input_modalities": ["text", "image"]},
     "supported_endpoint_types": ["openai", "openai-response", "anthropic"]},
    {"id": "deepseek/deepseek-v4.1-flash", "name": "DeepSeek: DeepSeek V4.1 Flash",
     "context_length": 1048576, "architecture": {"input_modalities": ["text", "image"]},
     "supported_endpoint_types": ["openai", "openai-response", "anthropic"]},
    # Dedicated non-text records: must never appear in the chat selector.
    {"id": "embeddings/text-embedding", "name": "Text Embedding",
     "supported_endpoint_types": ["embedding"]},
    {"id": "images/image-generator", "name": "Image Generator",
     "supported_endpoint_types": ["image-generation"]},
    {"id": "video/video-generator", "name": "Video Generator",
     "supported_endpoint_types": ["openai-video"]},
]

CHAT_MODEL_IDS = [m["id"] for m in FIXTURE_CATALOG if any(
    e in ("openai", "anthropic", "gemini", "openai-response")
    for e in m.get("supported_endpoint_types", []))]


def b64url(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def fake_jwt(permissions):
    header = b64url(json.dumps({"alg": "none", "typ": "JWT"}).encode())
    payload = b64url(json.dumps({
        "id": "orca-evidence-admin",
        "username": "orca-evidence",
        "roles": ["admin"],
        "firstname": "Evidence",
        "lastname": "Admin",
        "permissions": permissions,
        "exp": 9999999999,
    }).encode())
    return f"{header}.{payload}.signature"


PUBLIC_SETTINGS = {
    "report": {"enabled": True, "public": {}, "private": {}},
    "reviews": {"enabled": False, "public": {}, "private": {}},
    "ai": {
        "public": {
            "enabled": True,
            "defaultProvider": "orcarouter",
            "allowedProviders": ["orcarouter"],
            "providerModels": {"orcarouter": "orcarouter/auto"},
            "qaChecks": {},
            "globalPrompts": [],
            "redactionGuidelines": {"content": ""},
            "qaInstructions": {"content": ""},
        }
    },
}

ALL_PROVIDERS = ["openai", "anthropic", "deepseek", "ollama", "bedrock", "orcarouter"]

PRIVATE_SETTINGS = {
    "openaiApiKey": "", "openaiApiKeyConfigured": False,
    "openaiBaseUrl": "https://api.openai.com/v1", "openaiModel": "gpt-5.4-mini",
    "anthropicApiKey": "", "anthropicApiKeyConfigured": False,
    "anthropicBaseUrl": "https://api.anthropic.com/v1", "anthropicModel": "claude-opus-4-8",
    "anthropicVersion": "2023-06-01",
    "deepseekApiKey": "", "deepseekApiKeyConfigured": False,
    "deepseekBaseUrl": "https://api.deepseek.com/v1", "deepseekModel": "deepseek-v4-flash",
    "ollamaApiKey": "", "ollamaApiKeyConfigured": False,
    "ollamaBaseUrl": "http://localhost:11434/v1", "ollamaModel": "llama3.1",
    "bedrockApiKey": "", "bedrockApiKeyConfigured": False,
    "bedrockAccessKeyId": "", "bedrockAccessKeyIdConfigured": False,
    "bedrockSecretAccessKey": "", "bedrockSecretAccessKeyConfigured": False,
    "bedrockSessionToken": "", "bedrockSessionTokenConfigured": False,
    "bedrockRegion": "us-east-1", "bedrockModel": "global.anthropic.claude-opus-4-8",
    "orcarouterApiKey": "", "orcarouterApiKeyConfigured": True,
    "orcarouterBaseUrl": "https://api.orcarouter.ai/v1",
    "orcarouterModel": "orcarouter/auto",
}

FULL_SETTINGS = {
    "report": {
        "enabled": True,
        "public": {"enableSpellCheck": False},
        "private": {
            "imageBorder": False,
            "imageBorderColor": "#000000",
            "languageToolUrl": "",
            "languageToolApiKey": "",
            "languageToolApiKeyConfigured": False,
            "languageToolUsername": "",
        },
    },
    "reviews": {"enabled": False, "public": {"mandatoryReview": False, "minReviewers": 1},
                "private": {"removeApprovalsUponUpdate": False}},
    "ai": {"public": PUBLIC_SETTINGS["ai"]["public"], "private": PRIVATE_SETTINGS},
}


class SpaHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, directory=None, **kwargs):
        super().__init__(*args, directory=directory, **kwargs)

    def do_GET(self):
        path = self.translate_path(self.path)
        if not os.path.exists(path) or os.path.isdir(path):
            self.path = "/index.html"
        return super().do_GET()

    def log_message(self, *args):
        pass


def route_api(route):
    url = route.request.url
    path = url.split("?")[0]
    if path.endswith("/api/users/refreshtoken"):
        return route.fulfill(status=200, content_type="application/json", body=json.dumps(
            {"status": "ok", "datas": {"token": fake_jwt(["settings:read", "settings:update"])}}))
    if path.endswith("/api/settings/public"):
        return route.fulfill(status=200, content_type="application/json", body=json.dumps(
            {"status": "ok", "datas": PUBLIC_SETTINGS}))
    if path.endswith("/api/settings"):
        return route.fulfill(status=200, content_type="application/json", body=json.dumps(
            {"status": "ok", "datas": FULL_SETTINGS}))
    if path.endswith("/api/ai/providers/orcarouter/models"):
        body = route.request.post_data or ""
        if "https://" not in body and "http://" not in body:
            return route.fulfill(status=422, content_type="application/json", body=json.dumps(
                {"status": "error", "datas": "OrcaRouter base URL missing from request"}))
        return route.fulfill(status=200, content_type="application/json", body=json.dumps({
            "status": "ok",
            "datas": {"models": [
                {"id": m["id"], "name": m.get("name") or m["id"],
                 "contextLength": m.get("context_length"),
                 "inputModalities": m.get("architecture", {}).get("input_modalities", []),
                 "supportedEndpointTypes": m.get("supported_endpoint_types", []),
                 "reasoningEfforts": m.get("reasoning_efforts", [])}
                for m in FIXTURE_CATALOG
                if any(e in ("openai", "anthropic", "gemini", "openai-response")
                       for e in m.get("supported_endpoint_types", []))
            ], "source": "live", "degraded": False, "catalogModelCount": len(CHAT_MODEL_IDS)},
        }))
    if path.endswith("/api/backups/status"):
        return route.fulfill(status=200, content_type="application/json", body=json.dumps(
            {"status": "ok", "datas": {"operation": "idle", "state": "idle"}}))
    if "/api/backups" in path:
        return route.fulfill(status=200, content_type="application/json", body=json.dumps(
            {"status": "ok", "datas": []}))
    return route.fulfill(status=200, content_type="application/json", body=json.dumps(
        {"status": "ok", "datas": {}}))


def sha256_file(path):
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 16), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dist", default=os.path.join("frontend", "dist", "spa"))
    parser.add_argument("--out", default="orca-evidence")
    parser.add_argument("--chromium", default="/usr/bin/chromium")
    parser.add_argument("--width", type=int, default=1280)
    parser.add_argument("--height", type=int, default=900)
    parser.add_argument("--skip-build", action="store_true", help="fail instead of building the SPA when the dist bundle is missing")
    args = parser.parse_args()

    dist = os.path.abspath(args.dist)
    out = os.path.abspath(args.out)
    if not os.path.isfile(os.path.join(dist, "index.html")):
        if args.skip_build:
            raise SystemExit(f"Built SPA not found at {dist}/index.html")
        print("Built SPA not found; running `npm run build` in frontend/", flush=True)
        subprocess.run(["npm", "run", "build"], cwd=os.path.abspath("frontend"), check=True)
    if not os.path.isfile(os.path.join(dist, "index.html")):
        raise SystemExit(f"Built SPA not found at {dist}/index.html")

    os.makedirs(out, exist_ok=True)
    for name in ("auth-methods.png", "text-model-dropdown.png", "manifest.json"):
        target = os.path.join(out, name)
        if os.path.exists(target):
            os.remove(target)

    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(SpaHandler, directory=dist))
    port = server.server_address[1]
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base_url = f"http://127.0.0.1:{port}"

    manifest = {
        "provider": {"id": "orcarouter", "label": "OrcaRouter Cyber Inference", "auth_methods": ["api_key"]},
        "automation": {
            "framework": "playwright",
            "passed": False,
            "catalog_source": CATALOG_SOURCE,
            "catalog_snapshot": "2026-10-24",
            "catalog_model_count": len(CHAT_MODEL_IDS),
            "image_model_count": 0,
            "script": "scripts/orca-ui-evidence.py",
            "browser": "chromium",
        },
        "artifacts": [],
    }

    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(
                executable_path=args.chromium,
                args=["--no-sandbox", "--disable-dev-shm-usage"],
            )
            page = browser.new_page(viewport={"width": args.width, "height": args.height})
            page.route("**/api/**", route_api)
            page.goto(f"{base_url}/settings", wait_until="networkidle")

            page.locator('.q-tab', has_text="OrcaRouter Cyber Inference").first.click()
            panel = page.locator('[data-test="orcarouter-panel"]')
            panel.wait_for(state="visible", timeout=20000)
            page.locator('[data-test="orcarouter-catalog-status"]').wait_for(state="visible", timeout=20000)

            api_key_input = page.locator(
                'input[data-test="orcarouter-api-key"], [data-test="orcarouter-api-key"] input').first
            model_select = page.locator('[data-test="orcarouter-model-select"]')
            panel.scroll_into_view_if_needed()
            page.wait_for_timeout(400)

            api_key_value = api_key_input.input_value()
            api_key_type = api_key_input.get_attribute("type")
            controls_enabled = (
                model_select.get_attribute("aria-disabled") != "true"
                and api_key_input.is_editable()
            )
            auth_assertions = {
                "api_key_visible": page.locator('[data-test="orcarouter-api-key"]').is_visible(),
                "secret_masked": api_key_type == "password" and api_key_value == MASKED_SECRET,
                "controls_enabled": bool(controls_enabled),
            }
            if not all(auth_assertions.values()):
                raise SystemExit(f"auth assertions failed: {auth_assertions}")

            auth_path = os.path.join(out, "auth-methods.png")
            page.screenshot(path=auth_path)

            model_select.click()
            page.locator(".orcarouter-model-menu").wait_for(state="visible", timeout=10000)
            # Wait for the Quasar menu transition to settle: the screenshot has to show a
            # fully opaque panel, not a mid-fade frame.
            page.wait_for_function("""() => {
                const menu = document.querySelector('.orcarouter-model-menu');
                if (!menu) return false;
                let el = menu;
                let opacity = 1;
                while (el) {
                    opacity *= parseFloat(getComputedStyle(el).opacity || '1');
                    el = el.parentElement;
                }
                return opacity >= 0.99;
            }""", timeout=5000)
            page.wait_for_timeout(150)

            menu = page.locator(".orcarouter-model-menu")
            metrics = page.evaluate("""() => {
                const menu = document.querySelector('.orcarouter-model-menu');
                const triggerEl = document.querySelector('[data-test="orcarouter-model-select"]');
                const trigger = (triggerEl && triggerEl.closest('.q-field')) || triggerEl;
                const style = getComputedStyle(menu);
                let effectiveOpacity = 1;
                for (let el = menu; el; el = el.parentElement) {
                    effectiveOpacity *= parseFloat(getComputedStyle(el).opacity || '1');
                }
                const itemIds = [...menu.querySelectorAll('.q-item')]
                    .map((item) => (item.innerText || '').trim())
                    .filter(Boolean);
                return {
                    dropdown_open: !!menu && menu.getBoundingClientRect().height > 0,
                    item_count: itemIds.length,
                    menu_opacity: effectiveOpacity,
                    opaque_background: (() => {
                        const bg = style.backgroundColor || '';
                        const m = bg.match(/rgba?\\(([^)]+)\\)/);
                        if (!m) return false;
                        const parts = m[1].split(',').map((v) => parseFloat(v));
                        return parts.length < 4 || parts[3] >= 0.99;
                    })(),
                    visible_border: parseFloat(style.borderTopWidth || '0') >= 1,
                    trigger_panel_right_delta: Math.abs(
                        trigger.getBoundingClientRect().right - menu.getBoundingClientRect().right),
                    text: menu.innerText,
                };
            }""")
            metrics["trigger_panel_right_delta"] = round(metrics["trigger_panel_right_delta"], 2)

            if metrics["item_count"] != len(CHAT_MODEL_IDS):
                raise SystemExit(
                    f"dropdown rendered {metrics['item_count']} options, expected {len(CHAT_MODEL_IDS)}")

            for model_id in CHAT_MODEL_IDS:
                if model_id not in metrics["text"]:
                    raise SystemExit(f"dropdown missing expected model {model_id}")
            for excluded in ("images/image-generator", "video/video-generator", "embeddings/text-embedding"):
                if excluded in metrics["text"]:
                    raise SystemExit(f"dropdown leaked non-text model {excluded}")
            if metrics["trigger_panel_right_delta"] > 2:
                raise SystemExit(f"dropdown is misaligned: {metrics['trigger_panel_right_delta']}px")
            if not (metrics["dropdown_open"] and metrics["opaque_background"]
                    and metrics["menu_opacity"] >= 0.99 and metrics["visible_border"]):
                raise SystemExit(f"dropdown assertions failed: {metrics}")

            dropdown_path = os.path.join(out, "text-model-dropdown.png")
            page.screenshot(path=dropdown_path)
            browser.close()

        for kind, path, assertions in (
            ("auth-methods", auth_path, auth_assertions),
            ("text-model-dropdown", dropdown_path, {
                "dropdown_open": metrics["dropdown_open"],
                "item_count": metrics["item_count"],
                "opaque_background": metrics["opaque_background"],
                "menu_opacity": metrics["menu_opacity"],
                "visible_border": metrics["visible_border"],
                "trigger_panel_right_delta": metrics["trigger_panel_right_delta"],
            }),
        ):
            manifest["artifacts"].append({
                "kind": kind,
                "path": os.path.basename(path),
                "sha256": sha256_file(path),
                "width": args.width,
                "height": args.height,
                "ui": assertions,
            })

        manifest["automation"]["passed"] = True
        with open(os.path.join(out, "manifest.json"), "w", encoding="utf-8") as handle:
            json.dump(manifest, handle, indent=2)
            handle.write("\n")
        print(json.dumps({"passed": True, "screenshots": [a["kind"] for a in manifest["artifacts"]]}))
    finally:
        server.shutdown()


if __name__ == "__main__":
    main()
