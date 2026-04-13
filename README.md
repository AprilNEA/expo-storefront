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

// Hook — re-renders on region change
function PriceTag() {
  const sf = useStorefront();
  if (!sf) return null; // not signed into App Store
  return <Text>Billing region: {sf.countryCode}</Text>;
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

Returns the current storefront or `null` when the device isn't signed into the App Store. Backed by [`Storefront.current`](https://developer.apple.com/documentation/storekit/storefront/current).

### `addStorefrontChangeListener(listener): EventSubscription`

Fires when the user switches Apple ID region while the app is running. Backed by [`Storefront.updates`](https://developer.apple.com/documentation/storekit/storefront/updates). The listener is only attached while at least one JS subscriber exists.

### `useStorefront(): Storefront | null`

React hook combining the one-shot read and the change subscription.

### `Storefront`

```ts
interface Storefront {
  countryCode: string; // ISO 3166-1 alpha-3, e.g. "USA"
  id: string;          // Apple's internal ID
}
```

## Gotchas

- **Simulator:** typically returns the device's inferred region. Only TestFlight / production gives you the real Apple ID billing region.
- **macOS Catalyst / Designed for iPad on Mac:** returns the Mac App Store region.
- **Alpha-3 vs alpha-2:** if you need to cross-reference with `Locale.region` or CLDR data, convert between formats. A small lookup table is usually simpler than pulling in a library.
- **Not signed in:** `Storefront.current` resolves to `null`. Handle this case in your UI.

## License

MIT © AcceleAI
