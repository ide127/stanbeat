#!/usr/bin/env python3
import json
import os
import sys
from pathlib import Path


def load_json(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def repo_context(cwd: Path) -> str:
    lines: list[str] = []
    agents = cwd / ".codex" / "AGENTS.md"
    if agents.exists():
        lines.append(f"Repo rules are defined in {agents}.")

    package_json = cwd / "package.json"
    package = load_json(package_json) if package_json.exists() else None
    scripts = package.get("scripts", {}) if isinstance(package, dict) else {}

    interesting_scripts = [
        "check:quality",
        "verify:expect",
        "verify:harness",
        "build",
        "test",
    ]
    available = [name for name in interesting_scripts if name in scripts]
    if available:
        joined = ", ".join(available)
        lines.append(f"Useful verification scripts in this repo: {joined}.")

    repo_skills = cwd / ".agents" / "skills"
    if repo_skills.exists():
        lines.append(f"Repo-local skills are available under {repo_skills}.")

    if os.environ.get("WSL_DISTRO_NAME") and str(cwd).startswith("/mnt/"):
        lines.append(
            "You are running inside WSL against a mounted Windows repository. "
            "Hooks and Linux sandboxing are active, but final browser verification is usually more reliable from native Windows unless this repo has a dedicated WSL dependency install."
        )

    lines.append(
        "Use the harness-engineering workflow: define acceptance criteria, "
        "implement in vertical slices, run verification, fix failures, then report evidence."
    )
    lines.append(
        "For non-trivial work, prefer agent-skills such as using-agent-skills, "
        "spec-driven-development, planning-and-task-breakdown, "
        "incremental-implementation, test-driven-development, "
        "code-review-and-quality, and debugging-and-error-recovery."
    )
    return "\n".join(lines)


def main():
    payload = json.load(sys.stdin)
    cwd = Path(payload.get("cwd") or ".").resolve()
    output = {
        "hookSpecificOutput": {
            "hookEventName": "SessionStart",
            "additionalContext": repo_context(cwd),
        }
    }
    print(json.dumps(output))


if __name__ == "__main__":
    main()
