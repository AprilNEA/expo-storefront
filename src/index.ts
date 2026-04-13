import { useSyncExternalStore } from "react";
import {
  type EventSubscription,
  NativeModule,
  requireNativeModule,
} from "expo-modules-core";
import { type Alpha3Code, isAlpha3Code } from "iso-3166-1-ts";

export interface Storefront {
  /** ISO 3166-1 alpha-3 country code, e.g. `"USA"`, `"CHN"`, `"JPN"`. */
  countryCode: Alpha3Code;
  /** Apple's internal storefront identifier. */
  id: string;
}

export type StorefrontState =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "ready"; storefront: Storefront };

type NativeStorefront = { countryCode: string; id: string };

type StorefrontEvents = {
  onChange: (raw: NativeStorefront) => void;
};

const CHANGE_EVENT = "onChange" as const satisfies keyof StorefrontEvents;

declare class ExpoStorefrontModule extends NativeModule<StorefrontEvents> {
  getCurrentStorefront(): Promise<NativeStorefront | null>;
}

const Native = requireNativeModule<ExpoStorefrontModule>("ExpoStorefront");

/**
 * Validate the native payload at the JS boundary. StoreKit should always
 * hand us a valid alpha-3 code, but the `string` type from the native
 * bridge is untrusted — a future iOS change or a non-standard Storefront
 * (e.g. simulator edge cases) could send something unexpected.
 */
function parseStorefront(raw: NativeStorefront | null): Storefront | null {
  if (!raw) return null;
  if (!isAlpha3Code(raw.countryCode)) return null;
  return { countryCode: raw.countryCode, id: raw.id };
}

/**
 * Returns the user's current App Store storefront (Apple ID billing region).
 * Resolves to `null` when the device isn't signed into the App Store or
 * when the native payload fails validation.
 *
 * This is *not* the system locale or SIM region — a user can run an
 * English-language device on a Chinese Apple ID.
 */
export function getCurrentStorefront(): Promise<Storefront | null> {
  return Native.getCurrentStorefront().then((raw) => parseStorefront(raw));
}

/**
 * Subscribe to storefront changes. Fires when the user signs into a
 * different Apple ID region while the app is running. Payloads that
 * fail validation are dropped silently.
 */
export function addStorefrontChangeListener(
  listener: (sf: Storefront) => void,
): EventSubscription {
  return Native.addListener(CHANGE_EVENT, (raw) => {
    const sf = parseStorefront(raw);
    if (sf) {
      listener(sf);
    }
  });
}

// ---------------------------------------------------------------------------
// External store — powers `useStorefront` via `useSyncExternalStore`.
// ---------------------------------------------------------------------------

let snapshot: StorefrontState = { status: "loading" };
const snapshotListeners = new Set<() => void>();
let subscribed = false;

function setSnapshot(next: StorefrontState): void {
  snapshot = next;
  snapshotListeners.forEach((l) => {
    l();
  });
}

/**
 * Register the native listener first, then kick off the initial fetch.
 * This ordering matters: if the storefront changes between the fetch
 * being issued and its result arriving, the live event will already
 * have landed in the snapshot and the stale fetch result is dropped.
 */
function ensureSubscription(): void {
  if (subscribed) return;
  subscribed = true;

  Native.addListener(CHANGE_EVENT, (raw) => {
    const sf = parseStorefront(raw);
    if (sf) {
      setSnapshot({ status: "ready", storefront: sf });
    }
  });

  Native.getCurrentStorefront()
    .then((raw) => {
      if (snapshot.status !== "loading") return;
      const sf = parseStorefront(raw);
      setSnapshot(
        sf ? { status: "ready", storefront: sf } : { status: "unavailable" },
      );
    })
    .catch(() => {
      if (snapshot.status !== "loading") return;
      setSnapshot({ status: "unavailable" });
    });
}

function subscribe(onChange: () => void): () => void {
  snapshotListeners.add(onChange);
  ensureSubscription();
  return () => {
    snapshotListeners.delete(onChange);
  };
}

function getSnapshot(): StorefrontState {
  return snapshot;
}

/**
 * React hook returning a three-state discriminated union:
 *
 * - `{ status: "loading" }` — initial fetch hasn't resolved yet.
 * - `{ status: "unavailable" }` — device isn't signed into the App Store,
 *   the native payload failed validation, or the fetch rejected.
 * - `{ status: "ready"; storefront }` — we have a valid storefront.
 *
 * Callers can `switch (state.status)` for exhaustive handling. The
 * underlying subscription is module-level and lazy: the native listener
 * and initial fetch fire on the first hook call and are shared by all
 * consumers thereafter.
 */
export function useStorefront(): StorefrontState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
