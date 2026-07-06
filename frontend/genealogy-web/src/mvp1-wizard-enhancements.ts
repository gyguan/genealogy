// MVP1 wizard enhancements previously moved React-managed DOM nodes with MutationObserver.
// That can crash the page during review submission or step refresh.
// Keep this module as a safe no-op because main.tsx still imports it.
export {};
