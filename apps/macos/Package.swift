// swift-tools-version: 6.2
// Package manifest for the Ironcliw macOS companion (menu bar app + IPC library).

import PackageDescription

let package = Package(
    name: "Ironcliw",
    platforms: [
        .macOS(.v15),
    ],
    products: [
        .library(name: "IroncliwIPC", targets: ["IroncliwIPC"]),
        .library(name: "IroncliwDiscovery", targets: ["IroncliwDiscovery"]),
        .executable(name: "Ironcliw", targets: ["Ironcliw"]),
        .executable(name: "Ironcliw-mac", targets: ["IroncliwMacCLI"]),
    ],
    dependencies: [
        .package(url: "https://github.com/orchetect/MenuBarExtraAccess", exact: "1.2.2"),
        .package(url: "https://github.com/swiftlang/swift-subprocess.git", from: "0.1.0"),
        .package(url: "https://github.com/apple/swift-log.git", from: "1.8.0"),
        .package(url: "https://github.com/sparkle-project/Sparkle", from: "2.8.1"),
        .package(url: "https://github.com/steipete/Peekaboo.git", branch: "main"),
        .package(path: "../shared/IroncliwKit"),
        .package(path: "../../Swabble"),
    ],
    targets: [
        .target(
            name: "IroncliwIPC",
            dependencies: [],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .target(
            name: "IroncliwDiscovery",
            dependencies: [
                .product(name: "IroncliwKit", package: "IroncliwKit"),
            ],
            path: "Sources/IroncliwDiscovery",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .executableTarget(
            name: "Ironcliw",
            dependencies: [
                "IroncliwIPC",
                "IroncliwDiscovery",
                .product(name: "IroncliwKit", package: "IroncliwKit"),
                .product(name: "IroncliwChatUI", package: "IroncliwKit"),
                .product(name: "IroncliwProtocol", package: "IroncliwKit"),
                .product(name: "SwabbleKit", package: "swabble"),
                .product(name: "MenuBarExtraAccess", package: "MenuBarExtraAccess"),
                .product(name: "Subprocess", package: "swift-subprocess"),
                .product(name: "Logging", package: "swift-log"),
                .product(name: "Sparkle", package: "Sparkle"),
                .product(name: "PeekabooBridge", package: "Peekaboo"),
                .product(name: "PeekabooAutomationKit", package: "Peekaboo"),
            ],
            exclude: [
                "Resources/Info.plist",
            ],
            resources: [
                .copy("Resources/Ironcliw.icns"),
                .copy("Resources/DeviceModels"),
            ],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .executableTarget(
            name: "IroncliwMacCLI",
            dependencies: [
                "IroncliwDiscovery",
                .product(name: "IroncliwKit", package: "IroncliwKit"),
                .product(name: "IroncliwProtocol", package: "IroncliwKit"),
            ],
            path: "Sources/IroncliwMacCLI",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .testTarget(
            name: "IroncliwIPCTests",
            dependencies: [
                "IroncliwIPC",
                "Ironcliw",
                "IroncliwDiscovery",
                .product(name: "IroncliwProtocol", package: "IroncliwKit"),
                .product(name: "SwabbleKit", package: "swabble"),
            ],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
                .enableExperimentalFeature("SwiftTesting"),
            ]),
    ])

