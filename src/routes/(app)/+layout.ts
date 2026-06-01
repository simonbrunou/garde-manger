export const ssr = true;
// Frugal by design: the authenticated app ships no client JS. Every surface works
// with plain HTML — POST forms, link-based segmented control, native <details>
// switcher. HIG touches that need JS (swipe-to-reveal, large-title scroll-collapse,
// view transitions) are optional progressive enhancements layered on these
// working fallbacks; pages that genuinely need JS opt in locally (account, scan).
export const csr = false;
