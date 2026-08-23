import "dotenv/config";

const token = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!token) throw new Error("Supabase key is unavailable.");
const payload = token.split(".")[1];
if (!payload) throw new Error("Configured Supabase key is not a JWT.");
const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { role?: string; ref?: string };
console.log(JSON.stringify({ role: claims.role ?? "unknown", ref: claims.ref ?? "unknown" }));
