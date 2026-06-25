export function validateRuntimeConfiguration(env: NodeJS.ProcessEnv) {
  const isProduction = env.NODE_ENV === "production";
  const allowPreviewMode = env.ALLOW_PREVIEW_MODE === "true";

  if (!isProduction || allowPreviewMode) {
    return;
  }

  const missing = [
    "DATABASE_URL",
    "JWT_SECRET",
    "OAUTH_SERVER_URL",
    "VITE_APP_ID",
  ].filter(key => !env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required production environment variables: ${missing.join(
        ", "
      )}. Refusing to start in production without a real database/auth configuration.`
    );
  }
}
