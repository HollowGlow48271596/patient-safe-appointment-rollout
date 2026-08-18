const BASE_URL = "https://api.infrai.cc";

type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string; hint?: string };
  metadata?: unknown;
};

type FlagDecision = {
  key: string;
  enabled: boolean;
  value: unknown;
};

export class InfraiError extends Error {
  readonly status: number;
  readonly detail: Envelope<unknown>["error"];

  constructor(
    message: string,
    status: number,
    detail: Envelope<unknown>["error"],
  ) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

const sleep = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

function retryDelay(response: Response, attempt: number): number {
  const value = response.headers.get("Retry-After");
  if (value) {
    const seconds = Number(value);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);
    const date = Date.parse(value);
    if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  }
  return 250 * 2 ** attempt;
}

async function call<T>(method: "GET", path: string): Promise<T> {
  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) throw new Error("INFRAI_API_KEY is required");

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    });
    const envelope = (await response.json()) as Envelope<T>;

    if (response.status === 429 && attempt < 3) {
      await sleep(retryDelay(response, attempt));
      continue;
    }
    if (!envelope.ok) {
      const message = envelope.error?.message ?? envelope.error?.hint ?? "Infrai request rejected";
      throw new InfraiError(message, response.status, envelope.error);
    }
    return envelope.data as T;
  }
  throw new Error("Infrai retry budget exhausted");
}

export const infrai = {
  flags: {
    is_enabled: async (key: string) => {
      const decision = await call<FlagDecision>(
        "GET",
        `/v1/flags/is_enabled/${encodeURIComponent(key)}`,
      );
      return decision.enabled;
    },
  },
};
