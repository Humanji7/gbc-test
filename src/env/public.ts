const publicEnvShape = {
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "GBEMPIRE Test Project",
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
} as const;

export type PublicEnv = typeof publicEnvShape;

export function getPublicEnv(): PublicEnv {
  return publicEnvShape;
}
