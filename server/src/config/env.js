import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const envPath = path.join(__dirname, "..", "..", ".env");
export const envLoadResult = dotenv.config({ path: envPath });

if (envLoadResult.error) {
  console.warn(`[env] Failed to load environment file: ${envPath}`);
  console.warn(`[env] ${envLoadResult.error.message}`);
} else {
  console.info(`[env] Loaded environment file: ${envPath}`);
}
