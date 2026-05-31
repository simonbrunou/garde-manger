// Client-side rendering is enabled so the HIG interactions hydrate: large-title
// scroll-collapse, swipe-to-reveal row actions, sheets/action-sheets, the iOS
// toggle, and push/pop view transitions. SSR still renders the first paint, and
// every interactive surface keeps a no-JS fallback (plain POST forms, link-based
// segmented control, native <details> switcher) so the app degrades gracefully.
export const csr = true;
