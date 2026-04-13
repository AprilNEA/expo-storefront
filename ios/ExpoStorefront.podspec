Pod::Spec.new do |s|
  s.name           = "ExpoStorefront"
  s.version        = "0.1.0"
  s.summary        = "Read the user's App Store storefront via StoreKit 2"
  s.description    = "Expo module exposing StoreKit 2's Storefront.current and Storefront.updates so JS can read the Apple ID billing region (ISO 3166-1 alpha-3) and react to region changes."
  s.homepage       = "https://github.com/acceleai/expo-storefront"
  s.license        = { type: "MIT", file: "../LICENSE" }
  s.author         = "AcceleAI"
  s.platform       = :ios, "15.1"
  s.source         = { git: "https://github.com/acceleai/expo-storefront.git", tag: "v#{s.version}" }
  s.static_framework = true

  s.dependency "ExpoModulesCore"

  s.pod_target_xcconfig = {
    "DEFINES_MODULE" => "YES",
    "SWIFT_COMPILATION_MODE" => "wholemodule"
  }

  s.source_files = "**/*.{h,m,mm,swift}"
  s.swift_version = "5.9"

  s.frameworks = "StoreKit"
end
