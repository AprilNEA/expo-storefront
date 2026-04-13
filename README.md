# expo-storefront

Read the user's App Store storefront (Apple ID billing region) via StoreKit 2 from Expo / React Native.

This is **not** the same as the device locale (`expo-localization`), SIM country, or GPS location — a user can run an English-language device on a Chinese Apple ID. For App Store pricing, content gating, and region-specific IAP, you want the storefront.

- iOS only (uses [`Storefront`](https://developer.apple.com/documentation/storekit/storefront) from StoreKit 2)
- iOS 15.1+
- Country code is **ISO 3166-1 alpha-3** (`"USA"`, `"CHN"`, `"JPN"`) — not alpha-2

## Install

```sh
npx expo install expo-storefront
```

Requires Expo SDK 50+ (uses the `NativeModule` subclass pattern).

## Usage

```tsx
import {
  useStorefront,
  getCurrentStorefront,
  addStorefrontChangeListener,
} from "expo-storefront";

// Hook — three explicit states instead of null-vs-real ambiguity
function PriceTag() {
  const state = useStorefront();
  switch (state.status) {
    case "loading":
      return <ActivityIndicator />;
    case "unavailable":
      return <Text>Sign in to the App Store to see pricing.</Text>;
    case "ready":
      return <Text>Billing region: {state.storefront.countryCode}</Text>;
  }
}

// One-shot read
const sf = await getCurrentStorefront();
console.log(sf?.countryCode, sf?.id);

// Subscribe manually
const sub = addStorefrontChangeListener((sf) => {
  console.log("switched to", sf.countryCode);
});
sub.remove();
```

## API

### `getCurrentStorefront(): Promise<Storefront | null>`

Returns the current storefront or `null` when the device isn't signed into the App Store, or when the native payload fails ISO 3166-1 alpha-3 validation. Backed by [`Storefront.current`](https://developer.apple.com/documentation/storekit/storefront/current).

### `addStorefrontChangeListener(listener): EventSubscription`

Fires when the user switches Apple ID region while the app is running. Backed by [`Storefront.updates`](https://developer.apple.com/documentation/storekit/storefront/updates). Payloads that fail validation are dropped silently; the listener never receives them.

### `useStorefront(): StorefrontState`

React hook returning a three-state discriminated union. Backed by `useSyncExternalStore` — the native listener and initial fetch are registered once at module scope, lazily on first hook call, and shared by all consumers. A `switch` on `state.status` gives you exhaustive handling.

```ts
type StorefrontState =
  | { status: "loading" }      // initial fetch hasn't resolved yet
  | { status: "unavailable" }  // not signed in, validation failed, or fetch rejected
  | { status: "ready"; storefront: Storefront };
```

### `Storefront`

```ts
import type { Alpha3Code } from "iso-3166-1-ts";

interface Storefront {
  countryCode: Alpha3Code; // string-literal union of all 249 alpha-3 codes
  id: string;              // Apple's internal ID
}
```

`countryCode` is a literal union type from [`iso-3166-1-ts`](https://www.npmjs.com/package/iso-3166-1-ts), so `"USA"` is accepted and typos like `"US"` or `"USAAA"` fail at compile time.

## Gotchas

- **Simulator:** typically returns the device's inferred region. Only TestFlight / production gives you the real Apple ID billing region.
- **macOS Catalyst / Designed for iPad on Mac:** returns the Mac App Store region.
- **Alpha-3 vs alpha-2:** if you need to cross-reference with `Locale.region` or CLDR data, convert between formats. A small lookup table is usually simpler than pulling in a library.
- **Not signed in:** `getCurrentStorefront()` resolves to `null`; `useStorefront()` surfaces `{ status: "unavailable" }`. Handle this case in your UI.

## License

MIT © AprilNEA
