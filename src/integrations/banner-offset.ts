/**
 * Banner Offset Calculation
 * 
 * Pure function extracted from notification-center.js adjustTopButtonsForBanner()
 * for testability. Computes the top offset for header controls based on banner visibility.
 * 
 * Feature: 034-ui-banner-optimizations
 */

/**
 * Calculate the top offset for header controls based on banner state.
 * When banner is visible: offset = max(bannerHeight + 8, 20)
 * When banner is hidden: offset = 20
 */
export function calculateHeaderOffset(bannerVisible: boolean, bannerHeight: number): number {
  if (bannerVisible && bannerHeight > 0) {
    return Math.max(bannerHeight + 8, 20);
  }
  return 20;
}
