import { spawn } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const children = [];

function start(name, args) {
  const child = spawn("cmd.exe", ["/d", "/s", "/c", `${npmCommand} ${args.join(" ")}`], {
    stdio: "inherit",
    shell: false,
  });

  children.push(child);

  child.on("exit", (code, signal) => {
    if (signal || code) {
      shutdown(typeof code === "number" ? code : 1);
      return;
    }
  });
}

function shutdown(exitCode = 0) {
  while (children.length) {
    const child = children.pop();
    if (child && !child.killed) {
      child.kill();
    }
  }

  process.exit(exitCode);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

start("api", ["run", "dev:api"]);
start("web", ["run", "dev:web"]);
