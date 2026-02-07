import "@testing-library/jest-dom";

// Polyfill getAnimations for JSDOM to prevent ScrollArea errors
if (!Element.prototype.getAnimations) {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  Element.prototype.getAnimations = () => [];
}
