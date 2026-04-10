import "../lib/server-only-guard.ts";

const serverEnvShape = {
  retailCrmBaseUrl: process.env.RETAILCRM_BASE_URL,
  retailCrmApiKey: process.env.RETAILCRM_API_KEY,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
  telegramChatId: process.env.TELEGRAM_CHAT_ID
} as const;

export type ServerEnv = typeof serverEnvShape;

type ServerEnvKey = keyof ServerEnv;

export function getServerEnv(): ServerEnv {
  return serverEnvShape;
}

export function requireServerEnv(keys: ServerEnvKey[]): ServerEnv {
  const missingKeys = keys.filter((key) => !serverEnvShape[key]);

  if (missingKeys.length > 0) {
    throw new Error(`Missing required server environment variables: ${missingKeys.join(", ")}`);
  }

  return serverEnvShape;
}
