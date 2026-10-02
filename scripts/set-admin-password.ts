/**
 * Change the admin password stored in config.json.
 *
 * Usage:
 *   bun scripts/set-admin-password.ts <new-password>   (min 8 chars)
 */
import fs from "fs"
import path from "path"
import { randomBytes, scryptSync } from "crypto"

const password = process.argv[2]

if (!password || password.length < 8) {
  console.error("خطا: رمز عبور باید حداقل ۸ کاراکتر باشد.")
  console.error("استفاده: bun scripts/set-admin-password.ts <رمز-جدید>")
  process.exit(1)
}

const configPath = path.join(process.cwd(), "config.json")

try {
  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"))
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, 64)
  config.admin = config.admin ?? {}
  config.admin.passwordHash = `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8")
  console.log("✅ رمز عبور مدیر با موفقیت به‌روزرسانی شد.")
} catch (err) {
  console.error("خطا در به‌روزرسانی config.json:", err)
  process.exit(1)
}
