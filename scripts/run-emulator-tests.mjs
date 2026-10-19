import { spawn } from "node:child_process";
import { createWriteStream, mkdirSync } from "node:fs";
import { constants } from "node:os";

const logDirectory = "test-artifacts/emulators";
mkdirSync(logDirectory, { recursive: true });
const stages = [
  [
    "firestore-rules",
    process.execPath,
    ["--import", "tsx", "--test", "tests/firestore.test.ts"],
  ],
  [
    "function-transactions",
    process.execPath,
    ["--test", "functions/test/integration.test.js"],
  ],
  [
    "browser-commerce",
    process.execPath,
    [
      "node_modules/@playwright/test/cli.js",
      "test",
      "--config",
      "playwright.integration.config.ts",
    ],
  ],
];
for (const [name, command, args] of stages) {
  if (process.argv.includes("--browser-only") && name !== "browser-commerce")
    continue;
  const path = `${logDirectory}/${name}.log`;
  console.log(`\nRunning emulator stage: ${name} (log: ${path})`);
  const log = createWriteStream(path);
  const exitCode = await new Promise((resolve) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    child.stdout.on("data", (chunk) => {
      process.stdout.write(chunk);
      log.write(chunk);
    });
    child.stderr.on("data", (chunk) => {
      process.stderr.write(chunk);
      log.write(chunk);
    });
    child.on("error", (error) => {
      console.error(error.message);
      log.write(`${error.stack}\n`);
    });
    child.on("close", (code, signal) =>
      resolve(code ?? 128 + (constants.signals[signal] || 0)),
    );
  });
  await new Promise((resolve) => log.end(resolve));
  if (exitCode !== 0) {
    console.error(
      `FAILED emulator stage: ${name} (exit ${exitCode}). See ${path} and the first failing assertion above.`,
    );
    process.exit(exitCode);
  }
  console.log(`PASSED emulator stage: ${name}`);
}
