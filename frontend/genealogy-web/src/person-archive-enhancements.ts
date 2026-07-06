// Person archive enhancements used to mutate the React-managed detail drawer with innerHTML.
// That caused intermittent blank pages when React later reconciled or unmounted the drawer.
// Keep this module as a safe no-op because it is imported by main.tsx.
export {};
