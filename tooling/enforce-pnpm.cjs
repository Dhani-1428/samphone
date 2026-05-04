const fs = require("fs");
const path = require("path");

const root = process.cwd();
for (const name of ["package-lock.json", "yarn.lock"]) {
  try {
    fs.unlinkSync(path.join(root, name));
  } catch {
    // ignore missing / unreadable
  }
}

const ua = process.env.npm_config_user_agent || "";
if (!ua.includes("pnpm/")) {
  console.error(
    "This workspace uses pnpm. Install dependencies with: pnpm install",
  );
  process.exit(1);
}
