import { useEffect, useState } from "react";
import {
  type EventSubscription,
  NativeModule,
  requireNativeModule,
} from "expo-modules-core";

export interface Storefront {
  /**
   * App Store country code as ISO 3166-1 alpha-3 (e.g. `"USA"`, `"CHN"`).
   * NOT alpha-2 — converting to/from `Locale.region` needs a mapping.
   */
  countryCode: string;
  /** Apple's internal storefront identifier. */
  id: string;
}

type StorefrontEvents = {
  onChange: (sf: Storefront) => void;
};

declare class ExpoStorefrontModule extends NativeModule<StorefrontEvents> {
  getCurrentStorefront(): Promise<Storefront | null>;
}

const Native = requireNativeModule<ExpoStorefrontModule>("ExpoStorefront");

/**
 * Returns the user's current App Store storefront (Apple ID billing region).
 * Resolves to `null` when the device isn't signed into the App Store.
 *
 * This is *not* the system locale or SIM region — a user can run an
 * English-language device on a Chinese Apple ID.
 */
export function getCurrentStorefront(): Promise<Storefront | null> {
  return Native.getCurrentStorefront();
}

/**
 * Subscribe to storefront changes. Fires when the user signs into a
 * different Apple ID region while the app is running.
 */
export function addStorefrontChangeListener(
  listener: (sf: Storefront) => void,
): EventSubscription {
  return Native.addListener("onChange", listener);
}

/**
 * React hook that returns the current storefront and re-renders when the
 * user switches Apple ID region. `null` until the first read resolves or
 * if the device isn't signed in.
 */
export function useStorefront(): Storefront | null {
  const [sf, setSf] = useState<Storefront | null>(null);

  useEffect(() => {
    let mounted = true;
    getCurrentStorefront().then((current) => {
      if (mounted) setSf(current);
    });
    const sub = addStorefrontChangeListener(setSf);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return sf;
}
