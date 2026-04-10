import "../../lib/server-only-guard.ts";
import { requireServerEnv } from "../../env/server.ts";

type RetailCrmResponseBase = {
  success: boolean;
};

export type RetailCrmSite = {
  code: string;
  name: string;
  defaultForCrm?: boolean;
};

export type RetailCrmReferenceValue = {
  code: string;
  defaultForApi?: boolean;
  active?: boolean;
};

export type RetailCrmOrderSummary = {
  id: number;
  externalId: string;
  number?: string;
  site?: string;
};

export type RetailCrmCodeValue = {
  code?: string;
  value: string;
};

export type RetailCrmOrderSource = {
  code?: string;
  source?: string;
};

export type RetailCrmOrderItem = {
  id: number;
  externalId?: string;
  externalIds?: RetailCrmCodeValue[];
  quantity: number;
  initialPrice?: number;
  productName?: string;
  offer?: {
    externalId?: string;
    displayName?: string;
    name?: string;
  };
};

export type RetailCrmOrder = RetailCrmOrderSummary & {
  status?: string;
  orderType?: string;
  orderMethod?: string;
  totalSumm?: number;
  currency?: string;
  createdAt?: string;
  statusUpdatedAt?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  delivery?: {
    address?: {
      text?: string;
      city?: string;
    };
  };
  source?: RetailCrmOrderSource;
  items?: RetailCrmOrderItem[];
};

export type RetailCrmCreateOrderPayload = Readonly<{
  externalId: string;
  number: string;
  createdAt: string;
  countryIso: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  customerComment?: string;
  managerComment?: string;
  orderType?: string;
  orderMethod?: string;
  delivery?: {
    address: {
      text: string;
      city?: string;
    };
  };
  source?: RetailCrmOrderSource;
  items: Array<{
    externalId: string;
    productName: string;
    quantity: number;
    initialPrice: number;
  }>;
}>;

export type RetailCrmEditOrderPayload = Readonly<{
  delivery?: {
    address?: {
      text?: string;
      city?: string;
    };
  };
  source?: RetailCrmOrderSource;
}>;

type RetailCrmListSitesResponse = RetailCrmResponseBase & {
  sites?: RetailCrmSite[] | Record<string, RetailCrmSite>;
};

type RetailCrmListOrdersResponse = RetailCrmResponseBase & {
  orders?: RetailCrmOrder[];
};

type RetailCrmListOrderTypesResponse = RetailCrmResponseBase & {
  orderTypes?: RetailCrmReferenceValue[] | Record<string, RetailCrmReferenceValue>;
};

type RetailCrmListOrderMethodsResponse = RetailCrmResponseBase & {
  orderMethods?: RetailCrmReferenceValue[] | Record<string, RetailCrmReferenceValue>;
};

type RetailCrmCreateOrderResponse = RetailCrmResponseBase & {
  id?: number;
};

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function getRetailCrmApiBaseUrl(): string {
  const env = requireServerEnv(["retailCrmBaseUrl", "retailCrmApiKey"]);
  const baseUrl = trimTrailingSlash(env.retailCrmBaseUrl!);

  if (/\/api\/v\d+$/u.test(baseUrl)) {
    return baseUrl;
  }

  return `${baseUrl}/api/v5`;
}

function getRetailCrmApiKey(): string {
  const env = requireServerEnv(["retailCrmBaseUrl", "retailCrmApiKey"]);

  return env.retailCrmApiKey!;
}

function buildRequestUrl(pathname: string, query?: URLSearchParams): URL {
  const url = new URL(`${getRetailCrmApiBaseUrl()}${pathname}`);

  url.searchParams.set("apiKey", getRetailCrmApiKey());

  if (query) {
    for (const [key, value] of query.entries()) {
      url.searchParams.append(key, value);
    }
  }

  return url;
}

async function readJsonResponse<T extends RetailCrmResponseBase>(
  pathname: string,
  response: Response
): Promise<T> {
  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      `RetailCRM request failed for ${pathname}: ${response.status} ${response.statusText} ${responseText}`
    );
  }

  const payload = responseText.length > 0 ? (JSON.parse(responseText) as T) : ({ success: true } as T);

  if (!payload.success) {
    throw new Error(`RetailCRM returned an unsuccessful response for ${pathname}: ${responseText}`);
  }

  return payload;
}

function selectDefaultReferenceValue(values: RetailCrmReferenceValue[] | undefined): string | undefined {
  if (!values || values.length === 0) {
    return undefined;
  }

  const activeValues = values.filter((value) => value.active !== false);
  const defaultValue = activeValues.find((value) => value.defaultForApi);

  if (defaultValue) {
    return defaultValue.code;
  }

  if (activeValues.length === 1) {
    return activeValues[0].code;
  }

  return undefined;
}

function toValueArray<T>(value: T[] | Record<string, T> | undefined): T[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  return Object.values(value);
}

export async function listRetailCrmSites(): Promise<RetailCrmSite[]> {
  const response = await fetch(buildRequestUrl("/reference/sites"), {
    headers: {
      Accept: "application/json"
    },
    cache: "no-store"
  });

  const payload = await readJsonResponse<RetailCrmListSitesResponse>("/reference/sites", response);

  return toValueArray(payload.sites);
}

export async function resolveDefaultRetailCrmSiteCode(): Promise<string | undefined> {
  const sites = await listRetailCrmSites();
  const defaultSite = sites.find((site) => site.defaultForCrm);

  if (defaultSite) {
    return defaultSite.code;
  }

  if (sites.length === 1) {
    return sites[0].code;
  }

  return undefined;
}

export async function resolveDefaultRetailCrmOrderType(): Promise<string | undefined> {
  const response = await fetch(buildRequestUrl("/reference/order-types"), {
    headers: {
      Accept: "application/json"
    },
    cache: "no-store"
  });

  const payload = await readJsonResponse<RetailCrmListOrderTypesResponse>(
    "/reference/order-types",
    response
  );

  return selectDefaultReferenceValue(toValueArray(payload.orderTypes));
}

export async function resolveDefaultRetailCrmOrderMethod(): Promise<string | undefined> {
  const response = await fetch(buildRequestUrl("/reference/order-methods"), {
    headers: {
      Accept: "application/json"
    },
    cache: "no-store"
  });

  const payload = await readJsonResponse<RetailCrmListOrderMethodsResponse>(
    "/reference/order-methods",
    response
  );

  return selectDefaultReferenceValue(toValueArray(payload.orderMethods));
}

export async function listRetailCrmOrdersByExternalIds(
  externalIds: string[]
): Promise<Map<string, RetailCrmOrder>> {
  const matches = new Map<string, RetailCrmOrder>();

  for (let index = 0; index < externalIds.length; index += 100) {
    const query = new URLSearchParams();
    const chunk = externalIds.slice(index, index + 100);

    query.set("limit", "100");

    for (const externalId of chunk) {
      query.append("filter[externalIds][]", externalId);
    }

    const response = await fetch(buildRequestUrl("/orders", query), {
      headers: {
        Accept: "application/json"
      },
      cache: "no-store"
    });

    const payload = await readJsonResponse<RetailCrmListOrdersResponse>("/orders", response);

    for (const order of payload.orders ?? []) {
      matches.set(order.externalId, order);
    }
  }

  return matches;
}

export async function createRetailCrmOrder(
  site: string,
  order: RetailCrmCreateOrderPayload
): Promise<number> {
  const body = new URLSearchParams();

  body.set("site", site);
  body.set("order", JSON.stringify(order));
  body.set("apiKey", getRetailCrmApiKey());

  const response = await fetch(`${getRetailCrmApiBaseUrl()}/orders/create`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
    },
    body,
    cache: "no-store"
  });

  const payload = await readJsonResponse<RetailCrmCreateOrderResponse>("/orders/create", response);

  if (typeof payload.id !== "number") {
    throw new Error("RetailCRM did not return an order ID for /orders/create.");
  }

  return payload.id;
}

export async function updateRetailCrmOrderByExternalId(
  site: string,
  externalId: string,
  order: RetailCrmEditOrderPayload
): Promise<number> {
  const body = new URLSearchParams();

  body.set("site", site);
  body.set("by", "externalId");
  body.set("order", JSON.stringify(order));
  body.set("apiKey", getRetailCrmApiKey());

  const response = await fetch(
    `${getRetailCrmApiBaseUrl()}/orders/${encodeURIComponent(externalId)}/edit`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
      },
      body,
      cache: "no-store"
    }
  );

  const payload = await readJsonResponse<RetailCrmCreateOrderResponse>(
    `/orders/${externalId}/edit`,
    response
  );

  if (typeof payload.id !== "number") {
    throw new Error(`RetailCRM did not return an order ID for /orders/${externalId}/edit.`);
  }

  return payload.id;
}
