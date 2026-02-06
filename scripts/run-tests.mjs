import { spawn } from "node:child_process";

const tasks = [
  {
    name: "unit",
    command: "npm",
    args: ["run", "test:unit"],
  },
  {
    name: "e2e",
    command: "npm",
    args: ["run", "test:e2e"],
  },
  {
    name: "perf",
    command: "npm",
    args: ["run", "test:perf"],
  },
];

const runTask = (task) =>
  new Promise((resolve) => {
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

const results = await Promise.all(tasks.map((task) => runTask(task)));

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
