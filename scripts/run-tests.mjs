import { spawn } from "node:child_process";

const tasks = [
  {
    name: "unit",
    command: "npm",
    args: ["run", "test:unit"],
  },
  {
    name: "e2e:core",
    command: "npm",
    args: ["run", "test:e2e:core"],
  },
  {
    name: "e2e:features",
    command: "npm",
    args: ["run", "test:e2e:features"],
  },
  {
    name: "e2e:audit",
    command: "npm",
    args: ["run", "test:e2e:audit"],
  },
  {
    name: "e2e:perf",
    command: "npm",
    args: ["run", "test:e2e:perf"],
  },
  {
    name: "perf",
    command: "npm",
    args: ["run", "test:perf"],
  },
];

const runTask = (task) =>
  new Promise((resolve) => {
    process.stdout.write(`Starting ${task.name} tests...\n`);
    const child = spawn(task.command, task.args, {
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("close", (code, signal) => {
      if (code === 0) {
        process.stdout.write(`✓ ${task.name} tests passed\n`);
      } else {
        process.stdout.write(`✗ ${task.name} tests failed (exit code: ${code})\n`);
      }
      resolve({
        name: task.name,
        command: `${task.command} ${task.args.join(" ")}`,
        code,
        signal,
        stdout,
        stderr,
      });
    });

    child.on("error", (error) => {
      process.stdout.write(`! ${task.name} tests error: ${error?.message ?? error}\n`);
      stderr += `${error?.message ?? error}\n`;
    });

    task.child = child;
  });

const handleExit = (signal) => {
  for (const task of tasks) {
    if (task.child && !task.child.killed) {
      task.child.kill(signal);
    }
  }
  process.exit(1);
};

process.on("SIGINT", () => handleExit("SIGINT"));
process.on("SIGTERM", () => handleExit("SIGTERM"));

const results = [];
for (const task of tasks) {
  const result = await runTask(task);
  results.push(result);
}

let hasFailures = false;

for (const result of results) {
  if (result.code === 0 && !result.signal) continue;
  hasFailures = true;
  process.stdout.write(
    `\n--- ${result.name.toUpperCase()} FAILED (${result.command}) ---\n`,
  );
  if (result.stdout.trim()) {
    process.stdout.write(`${result.stdout.trim()}\n`);
  }
  if (result.stderr.trim()) {
    process.stdout.write(`${result.stderr.trim()}\n`);
  }
}

process.exit(hasFailures ? 1 : 0);
