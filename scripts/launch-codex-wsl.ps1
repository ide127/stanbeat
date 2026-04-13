[CmdletBinding()]
param(
    [string]$Distro = "Ubuntu"
)

$repoLinuxPath = "/mnt/c/Users/a7182/dev/stanbeat"
$script = @"
set -euo pipefail
export PATH="/home/gonglee/.local/bin:`$PATH"
cd "$repoLinuxPath"
exec codex
"@

$script | wsl -d $Distro -- bash -lc "tr -d '\r' | bash -s"
