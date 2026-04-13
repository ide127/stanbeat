#!/usr/bin/env python3
import json
import os
import subprocess
import sys
from pathlib import Path


VERIFY_HINT_MARKERS = [
    "verify",
    "verified",
    "test",
    "tested",
    "build",
    "expect",
    "playwright",
    "console error",
    "console errors",
    "npm run",
    "pnpm",
    "yarn",
]


def load_json(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def is_dirty(cwd: Path) -> bool:
    result = subprocess.run(
        ["git", "status", "--porcelain"],
        cwd=str(cwd),
        capture_output=True,
        text=True,
        check=False,
    )
    return bool(result.stdout.strip())


def suggested_command(cwd: Path) -> str:
    if os.environ.get("WSL_DISTRO_NAME") and str(cwd).startswith("/mnt/"):
        return "use native Windows for `npm run verify:harness`, or use a dedicated WSL copy with Linux `npm ci` before verifying"

    package_json = cwd / "package.json"
    package = load_json(package_json) if package_json.exists() else None
    scripts = package.get("scripts", {}) if isinstance(package, dict) else {}

    if "verify:harness" in scripts:
        return "npm run verify:harness"
    if "check:quality" in scripts:
        return "npm run check:quality"
    if "build" in scripts:
        return "npm run build"
    if "test" in scripts:
        return "npm test"
    return "run the relevant verification commands"


def already_mentions_verification(message: str | None) -> bool:
    if not message:
        return False
    text = message.lower()
    return any(marker in text for marker in VERIFY_HINT_MARKERS)


def main():
    payload = json.load(sys.stdin)
    if payload.get("stop_hook_active"):
        return

    cwd = Path(payload.get("cwd") or ".").resolve()
    if not (cwd / ".git").exists() and not (cwd / ".git").parent.exists():
        pass

    try:
        dirty = is_dirty(cwd)
    except Exception:
        dirty = False

    if not dirty:
        return

    if already_mentions_verification(payload.get("last_assistant_message")):
        return

    reason = (
        "Before finishing this turn, run the verification loop and fix any failures. "
        f"Start with: {suggested_command(cwd)}. "
        "If the task changes user-visible behavior, include runtime or browser verification as evidence."
    )
    print(json.dumps({"decision": "block", "reason": reason}))


if __name__ == "__main__":
    main()
