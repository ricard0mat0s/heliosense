export interface CepAddress {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
}

export interface CepAddressFields {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
}

export interface AutoFilledFieldsSnapshot {
  logradouro: string;
  bairro: string;
}

export class CepServiceUnavailableError extends Error {
  constructor(message = "Serviço de consulta de CEP indisponível.") {
    super(message);
    this.name = "CepServiceUnavailableError";
  }
}

const VALID_UFS = new Set([
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO",
]);

const DEFAULT_TIMEOUT_MS = 5000;
const cepCache = new Map<string, CepAddress>();

export function clearCepCache(): void {
  cepCache.clear();
}

export function isAbortError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "name" in err &&
    (err as { name?: unknown }).name === "AbortError"
  );
}

export interface LookupCepOptions {
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

async function fetchProviderJson(
  url: string,
  externalSignal: AbortSignal | undefined,
  fetchImpl: typeof fetch,
  timeoutMs: number
): Promise<{ status: number; ok: boolean; data: unknown }> {
  if (externalSignal?.aborted) {
    throw new DOMException("Consulta de CEP cancelada.", "AbortError");
  }

  const controller = new AbortController();
  const onExternalAbort = () => controller.abort();
  externalSignal?.addEventListener("abort", onExternalAbort, { once: true });

  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    let data: unknown = null;
    const text = await response.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
    }

    return { status: response.status, ok: response.ok, data };
  } catch (err) {
    if (externalSignal?.aborted) {
      throw new DOMException("Consulta de CEP cancelada.", "AbortError");
    }
    throw new CepServiceUnavailableError(
      err instanceof Error ? err.message : "Falha de conexão ao consultar CEP."
    );
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener("abort", onExternalAbort);
  }
}

function parseViaCepPayload(digits: string, payload: unknown): {
  address: CepAddress | null;
  notFound: boolean;
} {
  if (!payload || typeof payload !== "object") {
    return { address: null, notFound: false };
  }
  const obj = payload as Record<string, unknown>;
  if (Boolean(obj.erro)) {
    return { address: null, notFound: true };
  }

  const cidade = typeof obj.localidade === "string" ? obj.localidade.trim() : "";
  const uf = typeof obj.uf === "string" ? obj.uf.trim().toUpperCase() : "";
  const logradouro = typeof obj.logradouro === "string" ? obj.logradouro.trim() : "";
  const bairro = typeof obj.bairro === "string" ? obj.bairro.trim() : "";

  if (!cidade || !VALID_UFS.has(uf)) {
    return { address: null, notFound: false };
  }

  return {
    address: { cep: digits, logradouro, bairro, cidade, uf },
    notFound: false,
  };
}

function parseBrasilApiPayload(digits: string, payload: unknown): CepAddress | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const obj = payload as Record<string, unknown>;
  const cidade = typeof obj.city === "string" ? obj.city.trim() : "";
  const uf = typeof obj.state === "string" ? obj.state.trim().toUpperCase() : "";
  const logradouro = typeof obj.street === "string" ? obj.street.trim() : "";
  const bairro = typeof obj.neighborhood === "string" ? obj.neighborhood.trim() : "";

  if (!cidade || !VALID_UFS.has(uf)) {
    return null;
  }

  return { cep: digits, logradouro, bairro, cidade, uf };
}

/**
 * Looks up a Brazilian 8-digit CEP using ViaCEP as primary provider and BrasilAPI as fallback.
 * Returns `CepAddress` when found, `null` when the CEP does not exist, or throws:
 * - `DOMException(..., "AbortError")` when aborted via `options.signal`
 * - `CepServiceUnavailableError` when all lookup providers are unreachable
 */
export async function lookupCep(
  rawCep: string,
  options: LookupCepOptions = {}
): Promise<CepAddress | null> {
  const digits = rawCep.replace(/\D/g, "");
  if (digits.length !== 8 || digits === "00000000") {
    return null;
  }

  if (options.signal?.aborted) {
    throw new DOMException("Consulta de CEP cancelada.", "AbortError");
  }

  const cached = cepCache.get(digits);
  if (cached) {
    return cached;
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  let viacepReportedNotFound = false;

  try {
    const viaRes = await fetchProviderJson(
      `https://viacep.com.br/ws/${digits}/json/`,
      options.signal,
      fetchImpl,
      timeoutMs
    );

    if (viaRes.ok) {
      const parsed = parseViaCepPayload(digits, viaRes.data);
      if (parsed.address) {
        cepCache.set(digits, parsed.address);
        return parsed.address;
      }
      if (parsed.notFound) {
        viacepReportedNotFound = true;
      }
    } else if (viaRes.status === 400 || viaRes.status === 404) {
      viacepReportedNotFound = true;
    }
  } catch (err) {
    if (isAbortError(err)) {
      throw err;
    }
    // Primary provider failed; fall through to BrasilAPI
  }

  try {
    const brRes = await fetchProviderJson(
      `https://brasilapi.com.br/api/cep/v1/${digits}`,
      options.signal,
      fetchImpl,
      timeoutMs
    );

    if (brRes.ok) {
      const address = parseBrasilApiPayload(digits, brRes.data);
      if (address) {
        cepCache.set(digits, address);
        return address;
      }
    }

    if (brRes.status === 404 || brRes.status === 400 || viacepReportedNotFound) {
      return null;
    }

    throw new CepServiceUnavailableError();
  } catch (err) {
    if (isAbortError(err)) {
      throw err;
    }
    if (viacepReportedNotFound) {
      return null;
    }
    throw err instanceof CepServiceUnavailableError ? err : new CepServiceUnavailableError();
  }
}

/**
 * Pure state reducer that merges a resolved `CepAddress` into form fields:
 * - Never touches `numero` or `complemento`
 * - Preserves manually entered `logradouro` / `bairro` when a city-level CEP returns empty street/neighborhood
 * - Clears stale auto-filled `logradouro` / `bairro` when switching from a street CEP to a city-level CEP
 */
export function applyCepAddress<T extends CepAddressFields>(
  current: T,
  address: CepAddress,
  lastAutoFilled: AutoFilledFieldsSnapshot
): { next: T; nextAutoFilled: AutoFilledFieldsSnapshot; updated: boolean } {
  const currentDigits = current.cep.replace(/\D/g, "");
  if (currentDigits !== address.cep) {
    return { next: current, nextAutoFilled: lastAutoFilled, updated: false };
  }

  const nextLogradouro =
    address.logradouro ||
    (current.logradouro === lastAutoFilled.logradouro ? "" : current.logradouro);
  const nextBairro =
    address.bairro ||
    (current.bairro === lastAutoFilled.bairro ? "" : current.bairro);

  const nextAutoFilled: AutoFilledFieldsSnapshot = {
    logradouro: address.logradouro,
    bairro: address.bairro,
  };

  return {
    next: {
      ...current,
      logradouro: nextLogradouro,
      bairro: nextBairro,
      cidade: address.cidade || current.cidade,
      uf: address.uf || current.uf,
    },
    nextAutoFilled,
    updated: true,
  };
}
