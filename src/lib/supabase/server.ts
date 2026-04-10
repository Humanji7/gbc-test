import "../server-only-guard.ts";
import { requireServerEnv } from "../../env/server.ts";

type QueryValue = string | number | boolean | null | undefined;

export type SupabaseServerConfig = Readonly<{
  url: string;
  restUrl: string;
  serviceRoleKey: string;
}>;

export type SupabaseRestQuery = Record<string, QueryValue>;

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function getSupabaseServerConfig(): SupabaseServerConfig {
  const env = requireServerEnv(["supabaseUrl", "supabaseServiceRoleKey"]);
  const url = trimTrailingSlash(env.supabaseUrl!);

  return {
    url,
    restUrl: `${url}/rest/v1`,
    serviceRoleKey: env.supabaseServiceRoleKey!
  };
}

export function buildSupabaseRestUrl(table: string, query: SupabaseRestQuery = {}): string {
  const { restUrl } = getSupabaseServerConfig();
  const url = new URL(`${restUrl}/${table}`);

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

export async function supabaseAdminFetch<T>(
  table: string,
  options: Readonly<{
    method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
    query?: SupabaseRestQuery;
    body?: unknown;
    headers?: HeadersInit;
  }> = {}
): Promise<T> {
  const { serviceRoleKey } = getSupabaseServerConfig();
  const response = await fetch(buildSupabaseRestUrl(table, options.query), {
    method: options.method ?? "GET",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...options.headers
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store"
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `Supabase admin request failed for ${table}: ${response.status} ${response.statusText} ${message}`
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const responseText = await response.text();

  if (responseText.length === 0) {
    return undefined as T;
  }

  return JSON.parse(responseText) as T;
}
