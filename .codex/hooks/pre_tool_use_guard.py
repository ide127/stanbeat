#!/usr/bin/env python3
import json
import re
import sys


DENY_PATTERNS = [
    (re.compile(r"\bgit\s+reset\s+--hard\b"), "Blocked destructive git reset."),
    (re.compile(r"\bgit\s+clean\s+-f(d|x|fd|fx|fdx)\b"), "Blocked destructive git clean."),
    (re.compile(r"\bgit\s+checkout\s+--\s+\."), "Blocked destructive checkout reset."),
    (re.compile(r"\brm\s+-rf\s+/\b"), "Blocked dangerous rm -rf /."),
    (re.compile(r"\brm\s+-rf\s+~(?:/|\b)"), "Blocked dangerous rm -rf ~."),
    (re.compile(r"\bsudo\s+rm\s+-rf\s+/\b"), "Blocked dangerous sudo rm -rf /."),
]


def main():
    payload = json.load(sys.stdin)
    command = (
        payload.get("tool_input", {}).get("command")
        or payload.get("command")
        or ""
    )

    for pattern, reason in DENY_PATTERNS:
        if pattern.search(command):
            print(
                json.dumps(
                    {
                        "systemMessage": reason,
                        "hookSpecificOutput": {
                            "hookEventName": "PreToolUse",
                            "permissionDecision": "deny",
                            "permissionDecisionReason": reason,
                        },
                    }
                )
            )
            return


if __name__ == "__main__":
    main()
