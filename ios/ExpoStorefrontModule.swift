import ExpoModulesCore
import StoreKit

public class ExpoStorefrontModule: Module {
    private var updatesTask: Task<Void, Never>?

    public func definition() -> ModuleDefinition {
        Name("ExpoStorefront")

        Events("onChange")

        // Returns the user's current App Store storefront, or `nil` if the
        // device isn't signed into the App Store. `countryCode` is ISO
        // 3166-1 alpha-3 (e.g. "USA", "CHN") — note this is NOT the same
        // format as `Locale.region` (alpha-2).
        AsyncFunction("getCurrentStorefront") { () async -> [String: String]? in
            guard let sf = await Storefront.current else { return nil }
            return ["countryCode": sf.countryCode, "id": sf.id]
        }

        // `Storefront.updates` only emits when the storefront actually
        // changes (user switches Apple ID region). Start observing on the
        // first JS listener to avoid leaving a Task running when nobody
        // cares.
        OnStartObserving {
            self.updatesTask?.cancel()
            self.updatesTask = Task { [weak self] in
                for await sf in Storefront.updates {
                    guard let self else { return }
                    self.sendEvent("onChange", [
                        "countryCode": sf.countryCode,
                        "id": sf.id,
                    ])
                }
            }
        }

        OnStopObserving {
            self.updatesTask?.cancel()
            self.updatesTask = nil
        }

        OnDestroy {
            self.updatesTask?.cancel()
            self.updatesTask = nil
        }
    }
}
