import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import {
  applyCepAddress,
  CepServiceUnavailableError,
  clearCepCache,
  isAbortError,
  lookupCep,
} from "../src/utils/cep.ts";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("lookupCep", () => {
  beforeEach(() => {
    clearCepCache();
  });

  it("returns null without network calls for incomplete or all-zero CEPs", async () => {
    let calls = 0;
    const fakeFetch: typeof fetch = async () => {
      calls += 1;
      return jsonResponse({});
    };

    assert.equal(await lookupCep("39400-00", { fetchImpl: fakeFetch }), null);
    assert.equal(await lookupCep("00000-000", { fetchImpl: fakeFetch }), null);
    assert.equal(calls, 0);
  });

  it("resolves street-level CEP via ViaCEP and caches subsequent lookups", async () => {
    const urls: string[] = [];
    const fakeFetch: typeof fetch = async (input) => {
      urls.push(String(input));
      return jsonResponse({
        cep: "39408-007",
        logradouro: "Av. Professora Aida Mainartina Paraíso",
        complemento: "lado ímpar",
        bairro: "Ibituruna",
        localidade: "Montes Claros",
        uf: "mg",
      });
    };

    const first = await lookupCep("39.408-007", { fetchImpl: fakeFetch });
    assert.deepEqual(first, {
      cep: "39408007",
      logradouro: "Av. Professora Aida Mainartina Paraíso",
      bairro: "Ibituruna",
      cidade: "Montes Claros",
      uf: "MG",
    });
    assert.equal(urls.length, 1);
    assert.equal(urls[0], "https://viacep.com.br/ws/39408007/json/");

    const second = await lookupCep("39408007", { fetchImpl: fakeFetch });
    assert.deepEqual(second, first);
    assert.equal(urls.length, 1);
  });

  it("supports general city-level CEPs with empty street and neighborhood", async () => {
    const fakeFetch: typeof fetch = async () =>
      jsonResponse({
        cep: "39400-000",
        logradouro: "",
        bairro: "",
        localidade: "Montes Claros",
        uf: "MG",
      });

    const address = await lookupCep("39400-000", { fetchImpl: fakeFetch });
    assert.deepEqual(address, {
      cep: "39400000",
      logradouro: "",
      bairro: "",
      cidade: "Montes Claros",
      uf: "MG",
    });
  });

  it("falls back to BrasilAPI when ViaCEP fails or lacks a newly allocated CEP", async () => {
    const urls: string[] = [];
    const fakeFetch: typeof fetch = async (input) => {
      const url = String(input);
      urls.push(url);
      if (url.includes("viacep.com.br")) {
        return jsonResponse({ erro: "true" }, 200);
      }
      return jsonResponse({
        cep: "01001000",
        state: "SP",
        city: "São Paulo",
        neighborhood: "Sé",
        street: "Praça da Sé",
      });
    };

    const address = await lookupCep("01001-000", { fetchImpl: fakeFetch });
    assert.deepEqual(address, {
      cep: "01001000",
      logradouro: "Praça da Sé",
      bairro: "Sé",
      cidade: "São Paulo",
      uf: "SP",
    });
    assert.equal(urls.length, 2);
  });

  it("returns null when both ViaCEP and BrasilAPI report CEP not found", async () => {
    const fakeFetch: typeof fetch = async (input) => {
      if (String(input).includes("viacep.com.br")) {
        return jsonResponse({ erro: true }, 200);
      }
      return jsonResponse({ message: "CEP NAO ENCONTRADO" }, 404);
    };

    const result = await lookupCep("99999-999", { fetchImpl: fakeFetch });
    assert.equal(result, null);
  });

  it("throws CepServiceUnavailableError when all providers fail with network errors", async () => {
    const fakeFetch: typeof fetch = async () => {
      throw new TypeError("Failed to fetch");
    };

    await assert.rejects(
      () => lookupCep("39408-007", { fetchImpl: fakeFetch }),
      (err: unknown) => err instanceof CepServiceUnavailableError
    );
  });

  it("propagates AbortError when caller aborts the signal", async () => {
    const controller = new AbortController();
    const fakeFetch: typeof fetch = async (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
        controller.abort();
      });

    await assert.rejects(
      () => lookupCep("39408-007", { signal: controller.signal, fetchImpl: fakeFetch }),
      (err: unknown) => isAbortError(err)
    );
  });
});

describe("applyCepAddress", () => {
  it("auto-fills street, neighborhood, city, and UF while preserving numero and complemento", () => {
    const initial = {
      cep: "39408-007",
      logradouro: "",
      numero: "415",
      complemento: "Casa A",
      bairro: "",
      cidade: "",
      uf: "SP",
    };

    const { next, nextAutoFilled, updated } = applyCepAddress(
      initial,
      {
        cep: "39408007",
        logradouro: "Av. Professora Aida Mainartina Paraíso",
        bairro: "Ibituruna",
        cidade: "Montes Claros",
        uf: "MG",
      },
      { logradouro: "", bairro: "" }
    );

    assert.equal(updated, true);
    assert.deepEqual(next, {
      cep: "39408-007",
      logradouro: "Av. Professora Aida Mainartina Paraíso",
      numero: "415",
      complemento: "Casa A",
      bairro: "Ibituruna",
      cidade: "Montes Claros",
      uf: "MG",
    });
    assert.deepEqual(nextAutoFilled, {
      logradouro: "Av. Professora Aida Mainartina Paraíso",
      bairro: "Ibituruna",
    });
  });

  it("clears stale auto-filled street/bairro when switching to a city-only CEP, while keeping manual entries", () => {
    // 1. Stale auto-filled values get cleared
    const afterStreetCep = {
      cep: "39560-000",
      logradouro: "Av. Professora Aida Mainartina Paraíso",
      numero: "10",
      bairro: "Ibituruna",
      cidade: "Montes Claros",
      uf: "MG",
    };

    const switched = applyCepAddress(
      afterStreetCep,
      {
        cep: "39560000",
        logradouro: "",
        bairro: "",
        cidade: "Salinas",
        uf: "MG",
      },
      {
        logradouro: "Av. Professora Aida Mainartina Paraíso",
        bairro: "Ibituruna",
      }
    );

    assert.equal(switched.next.logradouro, "");
    assert.equal(switched.next.bairro, "");
    assert.equal(switched.next.cidade, "Salinas");

    // 2. User-typed street/bairro are preserved on a city-only CEP
    const manualForm = {
      cep: "39400-000",
      logradouro: "Estrada da Serra",
      numero: "Km 8",
      bairro: "Zona Rural",
      cidade: "",
      uf: "SP",
    };

    const preserved = applyCepAddress(
      manualForm,
      {
        cep: "39400000",
        logradouro: "",
        bairro: "",
        cidade: "Montes Claros",
        uf: "MG",
      },
      { logradouro: "", bairro: "" }
    );

    assert.equal(preserved.next.logradouro, "Estrada da Serra");
    assert.equal(preserved.next.bairro, "Zona Rural");
    assert.equal(preserved.next.cidade, "Montes Claros");
    assert.equal(preserved.next.uf, "MG");
  });

  it("ignores stale responses if the user already changed the CEP digits", () => {
    const current = {
      cep: "39408-00",
      logradouro: "",
      bairro: "",
      cidade: "",
      uf: "MG",
    };

    const res = applyCepAddress(
      current,
      {
        cep: "39408007",
        logradouro: "Av. X",
        bairro: "Ibituruna",
        cidade: "Montes Claros",
        uf: "MG",
      },
      { logradouro: "", bairro: "" }
    );

    assert.equal(res.updated, false);
    assert.equal(res.next, current);
  });
});
