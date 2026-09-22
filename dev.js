// One command to run the whole project from the root folder:
//   npm start
//
// It (1) installs the server's packages the first time, (2) starts the API from
// server/, and (3) serves client/ at http://localhost:8080. Press Ctrl+C to stop both.
// No extra packages needed: this file only uses Node's built-in modules.

const { spawn, spawnSync } = require("child_process");
const fs = require("fs");
const http = require("http");
const path = require("path");

const ROOT = __dirname;
const SERVER_DIR = path.join(ROOT, "server");
const CLIENT_DIR = path.join(ROOT, "client");
const WEB_PORT = Number(process.env.WEB_PORT) || 8080;

// 1. Install server packages if this is the first run.
if (!fs.existsSync(path.join(SERVER_DIR, "node_modules"))) {
  console.log("First run: installing server packages...");
  const install = spawnSync("npm install", { cwd: SERVER_DIR, stdio: "inherit", shell: true });
  if (install.status !== 0) {
    console.error("npm install failed. Fix the error above and run npm start again.");
    process.exit(1);
  }
}

// 2. Make sure server/.env exists.
const envFile = path.join(SERVER_DIR, ".env");
if (!fs.existsSync(envFile)) {
  fs.copyFileSync(path.join(SERVER_DIR, ".env.example"), envFile);
  console.log("\nCreated server/.env from .env.example.");
  console.log("Open server/.env, paste your MongoDB Atlas connection string into MONGODB_URI, save, then run npm start again.\n");
  process.exit(1);
}

// 3. Start the API.
const api = spawn(process.execPath, ["server.js"], { cwd: SERVER_DIR, stdio: "inherit" });
api.on("exit", (code) => {
  console.log(`\nThe API stopped (exit code ${code}). Shutting down.`);
  shutdown(code || 1);
});

// 4. Serve the client/ folder (a tiny static file server).
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

const web = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  } catch {
    res.writeHead(400);
    return res.end("Bad request");
  }
  if (pathname.endsWith("/")) pathname += "index.html";

  const file = path.normalize(path.join(CLIENT_DIR, pathname));
  if (file !== CLIENT_DIR && !file.startsWith(CLIENT_DIR + path.sep)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Not found");
    }
    res.writeHead(200, {
      "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-store", // always show your latest edits while developing
    });
    res.end(data);
  });
});

web.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${WEB_PORT} is already in use. Close the other server, or run: set WEB_PORT=8081 && npm start`);
  } else {
    console.error("Web server error:", err.message);
  }
  shutdown(1);
});

web.listen(WEB_PORT, () => {
  console.log(`\nWebsite:  http://localhost:${WEB_PORT}`);
  console.log("API:      http://localhost:5000/api/businesses");
  console.log("Press Ctrl+C to stop both.\n");
});

// 5. Stop everything together.
let closing = false;
function shutdown(code) {
  if (closing) return;
  closing = true;
  if (api.exitCode === null) api.kill();
  web.close();
  setTimeout(() => process.exit(code), 100);
}
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
