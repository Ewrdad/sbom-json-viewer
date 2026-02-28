import { spawn } from "node:child_process";

/**
 * @description List of test tasks to be executed by the test runner.
 * Each task contains a name, the base command, and its arguments.
 */
const tasks = [
  {
    name: "unit",
    command: "npm",
    args: ["run", "test:unit"],
  },
  {
    name: "e2e:dashboard",
    command: "npm",
    args: ["run", "test:e2e:dashboard"],
  },
  {
    name: "e2e:vulnerabilities",
    command: "npm",
    args: ["run", "test:e2e:vulnerabilities"],
  },
  {
    name: "e2e:explorer",
    command: "npm",
    args: ["run", "test:e2e:explorer"],
  },
  {
    name: "e2e:multi",
    command: "npm",
    args: ["run", "test:e2e:multi"],
  },
  {
    name: "e2e:system",
    command: "npm",
    args: ["run", "test:e2e:system"],
  },
  {
    name: "perf",
    command: "npm",
    args: ["run", "test:perf"],
  },
];

/**
 * @description Spawns a child process to run a specific test task and streams output to the parent process.
 * @param {Object} task The task object containing name, command, and args.
 * @returns {Promise<Object>} A promise that resolves with the execution result (code, signal, name).
 * @example
 * const result = await runTask({ name: "unit", command: "npm", args: ["run", "test:unit"] });
 */
const runTask = (task) =>
  new Promise((resolve) => {
    process.stdout.write(`\n>>> STARTING: ${task.name.toUpperCase()} tests...\n`);
    const child = spawn(task.command, task.args, {
      stdio: "inherit",
      env: { ...process.env, FORCE_COLOR: "1" },
    });

    child.on("close", (code, signal) => {
      if (code === 0) {
        process.stdout.write(`\n✓ SUCCESS: ${task.name.toUpperCase()} tests passed\n`);
      } else {
        process.stdout.write(
          `\n✗ FAILURE: ${task.name.toUpperCase()} tests failed (exit code: ${code}${signal ? `, signal: ${signal}` : ""})\n`,
        );
      }
      resolve({
        name: task.name,
        code,
        signal,
      });
    });

    child.on("error", (error) => {
      process.stdout.write(
        `\n! ERROR: ${task.name.toUpperCase()} tests failed to start: ${error?.message ?? error}\n`,
      );
      resolve({
        name: task.name,
        code: 1,
        error,
      });
    });

    task.child = child;
  });

/**
 * @description Handles process termination signals by killing all active child test processes.
 * @param {string} signal The signal received (e.g., SIGINT, SIGTERM).
 * @example
 * process.on("SIGINT", () => handleExit("SIGINT"));
 */
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
let hasFailures = false;

// Sequential execution loop
for (const task of tasks) {
  const result = await runTask(task);
  results.push(result);
  if (result.code !== 0 || result.signal) {
    hasFailures = true;
    process.stdout.write("\nStopping further tests due to failure.\n");
    break;
  }
}

process.stdout.write("\n--- TEST SUMMARY ---\n");
for (const result of results) {
  const status = result.code === 0 && !result.signal ? "✓ PASS" : "✗ FAIL";
  process.stdout.write(`${status} - ${result.name.toUpperCase()}\n`);
}

process.exit(hasFailures ? 1 : 0);
