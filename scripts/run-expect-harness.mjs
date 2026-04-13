import { mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";

const cwd = process.cwd();
const outDir = path.join(cwd, ".expect", "last-harness");
const daemonScript = path.join(
  cwd,
  "node_modules",
  "expect-cli",
  "dist",
  "browser-daemon.js"
);

const url = process.argv[2] ?? "http://localhost:3000";
const waitUntil = process.argv[3] ?? "load";
const headed = process.argv.includes("--headed");

const steps = [
  ["snapshot", "screenshot", { mode: "snapshot" }],
  ["console-errors", "console_logs", { type: "error" }],
  ["network-requests", "network_requests", {}],
  ["accessibility-audit", "accessibility_audit", { selector: "#root" }],
  ["performance-metrics", "performance_metrics", {}],
];

function logStep(step) {
  process.stdout.write(`\n[expect-harness] ${step}\n`);
}

async function saveStep(step, payload) {
  const filePath = path.join(outDir, `${step}.json`);
  await writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
}

function extractText(payload) {
  const content = Array.isArray(payload?.content) ? payload.content : [];
  return content
    .filter((item) => item?.type === "text" && typeof item.text === "string")
    .map((item) => item.text)
    .join("\n")
    .trim();
}

function validateStep(stepName, payload) {
  if (stepName === "console-errors") {
    const messages = Array.isArray(payload?.messages) ? payload.messages : [];
    if (messages.length > 0) {
      const joined = messages
        .map((message) => {
          const text =
            typeof message?.text === "string" ? message.text : JSON.stringify(message);
          return `- ${text}`;
        })
        .join("\n");
      throw new Error(`Expect found browser console errors:\n${joined}`);
    }
  }
}

async function callTool(port, tool, body = {}) {
  const response = await fetch(`http://127.0.0.1:${port}/${tool}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(async () => {
    const text = await response.text();
    return { error: text };
  });

  if (!response.ok) {
    throw new Error(
      `Expect tool '${tool}' failed (${response.status}): ${JSON.stringify(payload)}`
    );
  }

  return payload;
}

async function startDaemon() {
  if (!existsSync(daemonScript)) {
    throw new Error(
      `Expect daemon not found at ${daemonScript}. Run 'npm install' first.`
    );
  }

  return await new Promise((resolve, reject) => {
    const daemon = spawn(process.execPath, [daemonScript], {
      cwd,
      stdio: ["ignore", "ignore", "pipe"],
      detached: false,
    });

    let settled = false;
    let stderrBuffer = "";

    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      daemon.kill("SIGTERM");
      reject(
        new Error(
          `Expect daemon did not report a port within timeout.\n${stderrBuffer.trim()}`
        )
      );
    }, 15000);

    daemon.stderr.setEncoding("utf8");
    daemon.stderr.on("data", (chunk) => {
      stderrBuffer += chunk;
      const match = stderrBuffer.match(
        /expect daemon listening on 127\.0\.0\.1:(\d+)/i
      );
      if (match && !settled) {
        settled = true;
        clearTimeout(timeout);
        resolve({
          daemon,
          port: Number(match[1]),
          getStderr: () => stderrBuffer,
        });
      }
    });

    daemon.on("error", (error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      reject(error);
    });

    daemon.on("exit", (code, signal) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      reject(
        new Error(
          `Expect daemon exited before startup. code=${code ?? "null"} signal=${signal ?? "null"}\n${stderrBuffer.trim()}`
        )
      );
    });
  });
}

async function cleanupArtifacts() {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
}

async function main() {
  await cleanupArtifacts();

  let daemonProcess;
  let daemonPort;
  let daemonStderr = "";
  let failed = false;

  try {
    const daemonHandle = await startDaemon();
    daemonProcess = daemonHandle.daemon;
    daemonPort = daemonHandle.port;
    daemonStderr = daemonHandle.getStderr();

    logStep("open");
    const openPayload = await callTool(daemonPort, "open", {
      url,
      waitUntil,
      headed,
    });
    await saveStep("open", openPayload);
    const openText = extractText(openPayload);
    if (openText) {
      process.stdout.write(`${openText}\n`);
    }

    for (const [stepName, tool, body] of steps) {
      logStep(stepName);
      const payload = await callTool(daemonPort, tool, body);
      await saveStep(stepName, payload);
      const text = extractText(payload);
      if (text) {
        process.stdout.write(`${text}\n`);
      }
      validateStep(stepName, payload);
    }
  } catch (error) {
    failed = true;
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    if (daemonStderr.trim()) {
      process.stderr.write(`${daemonStderr.trim()}\n`);
    }
  } finally {
    if (daemonPort) {
      try {
        logStep("close");
        const closePayload = await callTool(daemonPort, "close");
        await saveStep("close", closePayload);
        const closeText = extractText(closePayload);
        if (closeText) {
          process.stdout.write(`${closeText}\n`);
        }
      } catch (error) {
        failed = true;
        process.stderr.write(
          `${error instanceof Error ? error.message : String(error)}\n`
        );
      }
    }

    if (daemonProcess && !daemonProcess.killed) {
      daemonProcess.kill("SIGTERM");
    }
  }

  if (failed) {
    process.exit(1);
  }

  process.stdout.write(`\n[expect-harness] artifacts saved to ${outDir}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
