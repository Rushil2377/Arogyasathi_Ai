// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { spawn, execSync } from "child_process";
import path from "path";
import fs from "fs";

function pythonBackendPlugin() {
  let childProcess: any = null;

  const killProcess = () => {
    if (childProcess) {
      console.log("[Backend AutoRun] Stopping Python server process tree...");
      if (process.platform === "win32") {
        try {
          execSync(`taskkill /pid ${childProcess.pid} /T /F`, { stdio: "ignore" });
        } catch (e) {
          // ignore error if process already exited
        }
      } else {
        try {
          childProcess.kill();
        } catch (e) {
          // ignore
        }
      }
      childProcess = null;
    }
  };

  return {
    name: "python-backend-plugin",
    configureServer(server: any) {
      // 1. If there is already a child process running, let's kill it first
      killProcess();

      // 2. Free up port 8000 before starting the backend
      try {
        if (process.platform === "win32") {
          const output = execSync('netstat -ano | findstr :8000', { encoding: "utf8" });
          const lines = output.split('\n');
          for (const line of lines) {
            if (line.includes("LISTENING")) {
              const tokens = line.trim().split(/\s+/);
              const pid = tokens[tokens.length - 1];
              if (pid && !isNaN(Number(pid)) && Number(pid) > 0) {
                console.log(`[Backend AutoRun] Port 8000 is in use by PID ${pid}. Killing it to free up the port...`);
                execSync(`taskkill /pid ${pid} /F /T`, { stdio: "ignore" });
              }
            }
          }
        } else {
          const pid = execSync('lsof -t -i:8000', { encoding: "utf8" }).trim();
          if (pid) {
            console.log(`[Backend AutoRun] Port 8000 is in use by PID ${pid}. Killing it to free up the port...`);
            execSync(`kill -9 ${pid}`, { stdio: "ignore" });
          }
        }
      } catch (e) {
        // findstr / lsof return non-zero if no process is using port 8000, which is normal and expected
      }

      // 3. Locate Python executable
      const userProfile = process.env.USERPROFILE || "";
      const localAppData = process.env.LOCALAPPDATA || "";
      
      const possiblePythonPaths = [
        path.join(userProfile, "AppData/Local/Programs/Python/Python312/python.exe"),
        path.join(localAppData, "Programs/Python/Python312/python.exe"),
        "python",
      ];

      let pythonPath = "python";
      for (const p of possiblePythonPaths) {
        if (p === "python" || fs.existsSync(p)) {
          pythonPath = p;
          if (p !== "python") break;
        }
      }

      console.log(`[Backend AutoRun] Using Python path: ${pythonPath}`);
      
      const modelDir = path.resolve(process.cwd(), "model");
      childProcess = spawn(pythonPath, ["app.py"], {
        cwd: modelDir,
        stdio: "inherit",
      });

      childProcess.on("error", (err: any) => {
        console.error("[Backend AutoRun] Failed to start Python server:", err);
      });

      server.httpServer?.on("close", () => {
        killProcess();
      });

      process.on("exit", () => {
        killProcess();
      });

      process.on("SIGINT", () => {
        killProcess();
        process.exit();
      });
      
      process.on("SIGTERM", () => {
        killProcess();
        process.exit();
      });
    },
  };
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [pythonBackendPlugin()],
  },
});
