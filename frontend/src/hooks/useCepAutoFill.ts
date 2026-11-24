import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  applyCepAddress,
  isAbortError,
  lookupCep,
  type AutoFilledFieldsSnapshot,
  type CepAddressFields,
} from "../utils/cep";
import { maskCep, onlyDigits } from "../utils/format";

export type CepLookupStatus = "idle" | "loading" | "found" | "partial" | "not_found" | "error";

export interface UseCepAutoFillResult {
  cepStatus: CepLookupStatus;
  cepMessage: string | null;
  cepTouched: boolean;
  handleCepChange: (rawValue: string) => void;
  handleCepBlur: () => void;
  resetCepLookup: () => void;
}

const EMPTY_SNAPSHOT: AutoFilledFieldsSnapshot = {
  logradouro: "",
  bairro: "",
};

export function useCepAutoFill<T extends CepAddressFields>(
  setForm: Dispatch<SetStateAction<T>>
): UseCepAutoFillResult {
  const [cepStatus, setCepStatus] = useState<CepLookupStatus>("idle");
  const [cepMessage, setCepMessage] = useState<string | null>(null);
  const [cepTouched, setCepTouched] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const lastQueriedDigitsRef = useRef<string | null>(null);
  const lastAutoFilledRef = useRef<AutoFilledFieldsSnapshot>(EMPTY_SNAPSHOT);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const resetCepLookup = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    lastQueriedDigitsRef.current = null;
    lastAutoFilledRef.current = EMPTY_SNAPSHOT;
    setCepStatus("idle");
    setCepMessage(null);
    setCepTouched(false);
  }, []);

  const handleCepChange = useCallback(
    (rawValue: string) => {
      const masked = maskCep(rawValue);
      const digits = onlyDigits(masked);

      setForm((prev) => ({ ...prev, cep: masked }));

      if (digits.length < 8) {
        abortRef.current?.abort();
        abortRef.current = null;
        lastQueriedDigitsRef.current = null;
        setCepStatus("idle");
        setCepMessage(null);
        return;
      }

      if (digits === lastQueriedDigitsRef.current) {
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      lastQueriedDigitsRef.current = digits;

      setCepStatus("loading");
      setCepMessage(null);

      void lookupCep(digits, { signal: controller.signal })
        .then((address) => {
          if (controller.signal.aborted) return;

          if (!address) {
            setCepStatus("not_found");
            setCepMessage("CEP não encontrado. Preencha o endereço manualmente.");
            return;
          }

          const snapshot = lastAutoFilledRef.current;
          lastAutoFilledRef.current = {
            logradouro: address.logradouro,
            bairro: address.bairro,
          };

          setForm((prev) => applyCepAddress(prev, address, snapshot).next);

          if (!address.logradouro || !address.bairro) {
            setCepStatus("partial");
            setCepMessage("CEP geral da cidade — informe logradouro e bairro.");
          } else {
            setCepStatus("found");
            setCepMessage(null);
          }
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted || isAbortError(err)) return;
          lastQueriedDigitsRef.current = null;
          setCepStatus("error");
          setCepMessage("Não foi possível consultar o CEP. Preencha manualmente.");
        });
    },
    [setForm]
  );

  const handleCepBlur = useCallback(() => {
    setCepTouched(true);
  }, []);

  return {
    cepStatus,
    cepMessage,
    cepTouched,
    handleCepChange,
    handleCepBlur,
    resetCepLookup,
  };
}
