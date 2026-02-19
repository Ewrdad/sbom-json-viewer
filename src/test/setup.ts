import "@testing-library/jest-dom";

// Polyfill getAnimations for JSDOM to prevent ScrollArea errors
if (!Element.prototype.getAnimations) {
   
  Element.prototype.getAnimations = () => [];
}
