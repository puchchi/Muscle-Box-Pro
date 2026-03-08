import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { supabase } from "./supabase";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch (_error) {
      body = null;
    }

    let message = res.statusText || "Request failed";
    if (
      body &&
      typeof body === "object" &&
      "message" in body &&
      typeof (body as { message?: unknown }).message === "string"
    ) {
      message = (body as { message: string }).message;
    }

    const error = new Error(message) as Error & {
      status: number;
      body: unknown;
    };
    error.status = res.status;
    error.body = body;
    throw error;
  }
}

export type ApiRequestError = Error & {
  status?: number;
  body?: unknown;
};

export async function invokeEdgeFunction(
  functionName: string,
  data?: unknown,
): Promise<{ data: unknown; error: unknown }> {
  const { data: responseData, error } = await supabase.functions.invoke(
    functionName,
    {
      body: data ? JSON.stringify(data) : undefined,
      headers: { "Content-Type": "application/json" },
    },
  );
  return { data: responseData, error };
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  const headers: Record<string, string> = data
    ? { "Content-Type": "application/json" }
    : {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const url = queryKey.join("/") as string;
    const res = await fetch(url, { headers });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
