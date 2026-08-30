/** Public API endpoint used by native builds when no build-time endpoint exists. */
export const NATIVE_API_BASE_URL = "https://omnilife-lya7kxbz.manus.space";

export type ApiBaseUrlResolution = {
  apiBaseUrl?: string;
  platform: string;
  browserOrigin?: { protocol: string; hostname: string };
};

export function resolveApiBaseUrl({ apiBaseUrl, platform, browserOrigin }: ApiBaseUrlResolution): string {
  if (apiBaseUrl) return apiBaseUrl.replace(/\/$/, "");

  if (platform !== "web") return NATIVE_API_BASE_URL;

  if (browserOrigin) {
    const apiHostname = browserOrigin.hostname.replace(/^8081-/, "3000-");
    if (apiHostname !== browserOrigin.hostname) return `${browserOrigin.protocol}//${apiHostname}`;
  }

  return "";
}
