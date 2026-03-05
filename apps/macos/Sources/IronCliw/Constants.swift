import Foundation

// Stable identifier used for both the macOS LaunchAgent label and Nix-managed defaults suite.
// nix-IronCliw writes app defaults into this suite to survive app bundle identifier churn.
let launchdLabel = "ai.IronCliw.mac"
let gatewayLaunchdLabel = "ai.IronCliw.gateway"
let onboardingVersionKey = "IronCliw.onboardingVersion"
let onboardingSeenKey = "IronCliw.onboardingSeen"
let currentOnboardingVersion = 7
let pauseDefaultsKey = "IronCliw.pauseEnabled"
let iconAnimationsEnabledKey = "IronCliw.iconAnimationsEnabled"
let swabbleEnabledKey = "IronCliw.swabbleEnabled"
let swabbleTriggersKey = "IronCliw.swabbleTriggers"
let voiceWakeTriggerChimeKey = "IronCliw.voiceWakeTriggerChime"
let voiceWakeSendChimeKey = "IronCliw.voiceWakeSendChime"
let showDockIconKey = "IronCliw.showDockIcon"
let defaultVoiceWakeTriggers = ["IronCliw"]
let voiceWakeMaxWords = 32
let voiceWakeMaxWordLength = 64
let voiceWakeMicKey = "IronCliw.voiceWakeMicID"
let voiceWakeMicNameKey = "IronCliw.voiceWakeMicName"
let voiceWakeLocaleKey = "IronCliw.voiceWakeLocaleID"
let voiceWakeAdditionalLocalesKey = "IronCliw.voiceWakeAdditionalLocaleIDs"
let voicePushToTalkEnabledKey = "IronCliw.voicePushToTalkEnabled"
let talkEnabledKey = "IronCliw.talkEnabled"
let iconOverrideKey = "IronCliw.iconOverride"
let connectionModeKey = "IronCliw.connectionMode"
let remoteTargetKey = "IronCliw.remoteTarget"
let remoteIdentityKey = "IronCliw.remoteIdentity"
let remoteProjectRootKey = "IronCliw.remoteProjectRoot"
let remoteCliPathKey = "IronCliw.remoteCliPath"
let canvasEnabledKey = "IronCliw.canvasEnabled"
let cameraEnabledKey = "IronCliw.cameraEnabled"
let systemRunPolicyKey = "IronCliw.systemRunPolicy"
let systemRunAllowlistKey = "IronCliw.systemRunAllowlist"
let systemRunEnabledKey = "IronCliw.systemRunEnabled"
let locationModeKey = "IronCliw.locationMode"
let locationPreciseKey = "IronCliw.locationPreciseEnabled"
let peekabooBridgeEnabledKey = "IronCliw.peekabooBridgeEnabled"
let deepLinkKeyKey = "IronCliw.deepLinkKey"
let modelCatalogPathKey = "IronCliw.modelCatalogPath"
let modelCatalogReloadKey = "IronCliw.modelCatalogReload"
let cliInstallPromptedVersionKey = "IronCliw.cliInstallPromptedVersion"
let heartbeatsEnabledKey = "IronCliw.heartbeatsEnabled"
let debugPaneEnabledKey = "IronCliw.debugPaneEnabled"
let debugFileLogEnabledKey = "IronCliw.debug.fileLogEnabled"
let appLogLevelKey = "IronCliw.debug.appLogLevel"
let voiceWakeSupported: Bool = ProcessInfo.processInfo.operatingSystemVersion.majorVersion >= 26
