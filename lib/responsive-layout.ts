export const SMALL_PHONE_MAX_WIDTH = 360;

export function isSmallPhoneViewport(width: number) {
  return Number.isFinite(width) && width > 0 && width <= SMALL_PHONE_MAX_WIDTH;
}
