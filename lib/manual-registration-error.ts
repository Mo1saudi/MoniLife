export type ManualRegistrationErrorKind = "ip_limit" | "conflict" | "migration" | "server_update" | "service" | "validation" | "unknown";

type ErrorLike = { data?: { code?: unknown }; message?: unknown };

function readError(error: unknown) {
  if (!error || typeof error !== "object") return { code: "", message: "" };
  const candidate = error as ErrorLike;
  const data = candidate.data && typeof candidate.data === "object" ? candidate.data : undefined;
  return {
    code: typeof data?.code === "string" ? data.code : "",
    message: typeof candidate.message === "string" ? candidate.message : "",
  };
}

/** Converts server/provider registration failures into stable UI-safe categories. */
export function classifyManualRegistrationError(error: unknown): ManualRegistrationErrorKind {
  const { code, message } = readError(error);
  const value = `${code} ${message}`;
  if (code === "FORBIDDEN" || /أكثر من حسابين|same network|same IP|registration limit/i.test(value)) return "ip_limit";
  if (code === "CONFLICT" || /already registered|already exists|duplicate|email_exists|مسجل/i.test(value)) return "conflict";
  if (/birthDate|birth date|date of birth/i.test(value)) return "server_update";
  if (/age.?column|migration|unable to store the profile|profile.*supabase|profiles.*column/i.test(value)) return "migration";
  if (code === "INTERNAL_SERVER_ERROR" || /temporarily|unavailable|service|supabase account|supabase server credentials|credentials are required|network|timeout|fetch failed|connection/i.test(value)) return "service";
  if (code === "BAD_REQUEST" || /invalid|required|must be|email|phone|age|pin|field|بيانات|حقل|العمر|الهاتف|البريد/i.test(value)) return "validation";
  return "unknown";
}
