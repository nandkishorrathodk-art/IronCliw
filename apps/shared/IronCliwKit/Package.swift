// swift-tools-version: 6.2

import PackageDescription

let package = Package(
    name: "IronCliwKit",
    platforms: [
        .iOS(.v18),
        .macOS(.v15),
    ],
    products: [
        .library(name: "IronCliwProtocol", targets: ["IronCliwProtocol"]),
        .library(name: "IronCliwKit", targets: ["IronCliwKit"]),
        .library(name: "IronCliwChatUI", targets: ["IronCliwChatUI"]),
    ],
    dependencies: [
        .package(url: "https://github.com/steipete/ElevenLabsKit", exact: "0.1.0"),
        .package(url: "https://github.com/gonzalezreal/textual", exact: "0.3.1"),
    ],
    targets: [
        .target(
            name: "IronCliwProtocol",
            path: "Sources/IronCliwProtocol",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .target(
            name: "IronCliwKit",
            dependencies: [
                "IronCliwProtocol",
                .product(name: "ElevenLabsKit", package: "ElevenLabsKit"),
            ],
            path: "Sources/IronCliwKit",
            resources: [
                .process("Resources"),
            ],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .target(
            name: "IronCliwChatUI",
            dependencies: [
                "IronCliwKit",
                .product(
                    name: "Textual",
                    package: "textual",
                    condition: .when(platforms: [.macOS, .iOS])),
            ],
            path: "Sources/IronCliwChatUI",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .testTarget(
            name: "IronCliwKitTests",
            dependencies: ["IronCliwKit", "IronCliwChatUI"],
            path: "Tests/IronCliwKitTests",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
                .enableExperimentalFeature("SwiftTesting"),
            ]),
    ])
