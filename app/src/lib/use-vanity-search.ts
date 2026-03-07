"use client";

import { useCallback, useRef, useState } from "react";
import { LAUNCH_FACTORY_PROGRAM_ID } from "@bondit/sdk";

// ── Types ──────────────────────────────────────────────────────────────────

export interface VanitySearchResult {
  idempotencyKey: string;
  launchIdHex: string;
  mintAddress: string;
  totalAttempts: number;
  duration: number;
  attemptsPerSecond: number;
}

export type VanityStatus = "idle" | "searching" | "found" | "error";

export interface VanityProgress {
  totalAttempts: number;
  elapsed: number;
  rate: number;
}

interface WorkerFoundMsg {
  type: "found";
  key: string;
  address: string;
  launchIdHex: string;
  attempts: number;
}

interface WorkerProgressMsg {
  type: "progress";
  attempts: number;
}

type WorkerMsg = WorkerFoundMsg | WorkerProgressMsg;

// ── Hook ───────────────────────────────────────────────────────────────────

export function useVanitySearch() {
  const [status, setStatus] = useState<VanityStatus>("idle");
  const [progress, setProgress] = useState<VanityProgress>({ totalAttempts: 0, elapsed: 0, rate: 0 });
  const [result, setResult] = useState<VanitySearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const workersRef = useRef<Worker[]>([]);
  const workerAttemptsRef = useRef<Map<number, number>>(new Map());
  const startTimeRef = useRef<number>(0);
  const foundRef = useRef(false);

  const cleanup = useCallback(() => {
    for (const w of workersRef.current) {
      w.terminate();
    }
    workersRef.current = [];
    workerAttemptsRef.current.clear();
    foundRef.current = false;
  }, []);

  const search = useCallback(
    (suffix = "LoL", target: "mint" | "launch" = "mint"): Promise<VanitySearchResult | null> => {
      cleanup();

      setStatus("searching");
      setResult(null);
      setError(null);
      setProgress({ totalAttempts: 0, elapsed: 0, rate: 0 });

      const seedString = target === "mint" ? "token_mint" : "launch_state";
      const programIdBase58 = LAUNCH_FACTORY_PROGRAM_ID.toBase58();
      const numWorkers = Math.max(1, (navigator.hardwareConcurrency || 4) - 1);

      startTimeRef.current = Date.now();

      return new Promise<VanitySearchResult | null>((resolve) => {
        for (let i = 0; i < numWorkers; i++) {
          const worker = new Worker(new URL("./vanity-worker.ts", import.meta.url));

          worker.onmessage = (event: MessageEvent<WorkerMsg>) => {
            const msg = event.data;

            if (msg.type === "progress") {
              workerAttemptsRef.current.set(i, msg.attempts);
              const total = Array.from(workerAttemptsRef.current.values()).reduce((a, b) => a + b, 0);
              const elapsed = (Date.now() - startTimeRef.current) / 1000;
              const rate = Math.round(total / Math.max(elapsed, 0.1));
              setProgress({ totalAttempts: total, elapsed, rate });
            }

            if (msg.type === "found" && !foundRef.current) {
              foundRef.current = true;
              workerAttemptsRef.current.set(i, msg.attempts);
              const totalAttempts = Array.from(workerAttemptsRef.current.values()).reduce((a, b) => a + b, 0);
              const duration = (Date.now() - startTimeRef.current) / 1000;
              const attemptsPerSecond = Math.round(totalAttempts / Math.max(duration, 0.1));

              const vanityResult: VanitySearchResult = {
                idempotencyKey: msg.key,
                launchIdHex: msg.launchIdHex,
                mintAddress: msg.address,
                totalAttempts,
                duration,
                attemptsPerSecond,
              };

              cleanup();
              setResult(vanityResult);
              setStatus("found");
              resolve(vanityResult);
            }
          };

          worker.onerror = (err) => {
            if (!foundRef.current) {
              cleanup();
              setError(err.message || "Vanity worker crashed");
              setStatus("error");
              resolve(null);
            }
          };

          worker.postMessage({
            suffix,
            programIdBase58,
            seedString,
            workerId: i,
          });

          workersRef.current.push(worker);
        }
      });
    },
    [cleanup],
  );

  const cancel = useCallback(() => {
    cleanup();
    setStatus("idle");
  }, [cleanup]);

  return { status, progress, result, error, search, cancel };
}
