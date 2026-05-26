export const databaseConfig = {
  log:
    process.env.NODE_ENV === "development"
      ? (["query", "info", "warn", "error"] as const)
      : (["error"] as const),
};
