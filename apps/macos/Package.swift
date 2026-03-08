// swift-tools-version: 6.2
// Package manifest for the IronCliw macOS companion (menu bar app + IPC library).

import PackageDescription

let package = Package(
    name: "IronCliw",
    platforms: [
        .macOS(.v15),
    ],
    products: [
        .library(name: "IronCliwIPC", targets: ["IronCliwIPC"]),
        .library(name: "IronCliwDiscovery", targets: ["IronCliwDiscovery"]),
        .executable(name: "IronCliw", targets: ["IronCliw"]),
        .executable(name: "IronCliw-mac", targets: ["IronCliwMacCLI"]),
    ],
    dependencies: [
        .package(url: "https://github.com/orchetect/MenuBarExtraAccess", exact: "1.2.2"),
        .package(url: "https://github.com/swiftlang/swift-subprocess.git", from: "0.1.0"),
        .package(url: "https://github.com/apple/swift-log.git", from: "1.8.0"),
        .package(url: "https://github.com/sparkle-project/Sparkle", from: "2.8.1"),
        .package(url: "https://github.com/steipete/Peekaboo.git", branch: "main"),
        .package(path: "../shared/IronCliwKit"),
        .package(path: "../../Swabble"),
    ],
    targets: [
        .target(
            name: "IronCliwIPC",
            dependencies: [],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .target(
            name: "IronCliwDiscovery",
            dependencies: [
                .product(name: "IronCliwKit", package: "IronCliwKit"),
            ],
            path: "Sources/IronCliwDiscovery",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .executableTarget(
            name: "IronCliw",
            dependencies: [
                "IronCliwIPC",
                "IronCliwDiscovery",
                .product(name: "IronCliwKit", package: "IronCliwKit"),
                .product(name: "IronCliwChatUI", package: "IronCliwKit"),
                .product(name: "IronCliwProtocol", package: "IronCliwKit"),
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
                .copy("Resources/IronCliw.icns"),
                .copy("Resources/DeviceModels"),
            ],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .executableTarget(
            name: "IronCliwMacCLI",
            dependencies: [
                "IronCliwDiscovery",
                .product(name: "IronCliwKit", package: "IronCliwKit"),
                .product(name: "IronCliwProtocol", package: "IronCliwKit"),
            ],
            path: "Sources/IronCliwMacCLI",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .testTarget(
            name: "IronCliwIPCTests",
            dependencies: [
                "IronCliwIPC",
                "IronCliw",
                "IronCliwDiscovery",
                .product(name: "IronCliwProtocol", package: "IronCliwKit"),
                .product(name: "SwabbleKit", package: "swabble"),
            ],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
                .enableExperimentalFeature("SwiftTesting"),
            ]),
    ])
