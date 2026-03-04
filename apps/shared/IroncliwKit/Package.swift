// swift-tools-version: 6.2

import PackageDescription

let package = Package(
    name: "IroncliwKit",
    platforms: [
        .iOS(.v18),
        .macOS(.v15),
    ],
    products: [
        .library(name: "IroncliwProtocol", targets: ["IroncliwProtocol"]),
        .library(name: "IroncliwKit", targets: ["IroncliwKit"]),
        .library(name: "IroncliwChatUI", targets: ["IroncliwChatUI"]),
    ],
    dependencies: [
        .package(url: "https://github.com/steipete/ElevenLabsKit", exact: "0.1.0"),
        .package(url: "https://github.com/gonzalezreal/textual", exact: "0.3.1"),
    ],
    targets: [
        .target(
            name: "IroncliwProtocol",
            path: "Sources/IroncliwProtocol",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .target(
            name: "IroncliwKit",
            dependencies: [
                "IroncliwProtocol",
                .product(name: "ElevenLabsKit", package: "ElevenLabsKit"),
            ],
            path: "Sources/IroncliwKit",
            resources: [
                .process("Resources"),
            ],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .target(
            name: "IroncliwChatUI",
            dependencies: [
                "IroncliwKit",
                .product(
                    name: "Textual",
                    package: "textual",
                    condition: .when(platforms: [.macOS, .iOS])),
            ],
            path: "Sources/IroncliwChatUI",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .testTarget(
            name: "IroncliwKitTests",
            dependencies: ["IroncliwKit", "IroncliwChatUI"],
            path: "Tests/IroncliwKitTests",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
                .enableExperimentalFeature("SwiftTesting"),
            ]),
    ])

