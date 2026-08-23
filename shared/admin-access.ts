export const OMNI_ADMIN_EMAIL = "mohamedseo2002@gmail.com";

export function isAuthorizedOmniAdmin(email: string | null | undefined) {
  return email?.trim().toLowerCase() === OMNI_ADMIN_EMAIL;
}
