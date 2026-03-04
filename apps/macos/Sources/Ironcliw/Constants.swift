import Foundation

// Stable identifier used for both the macOS LaunchAgent label and Nix-managed defaults suite.
// nix-Ironcliw writes app defaults into this suite to survive app bundle identifier churn.
let launchdLabel = "ai.Ironcliw.mac"
let gatewayLaunchdLabel = "ai.Ironcliw.gateway"
let onboardingVersionKey = "Ironcliw.onboardingVersion"
let onboardingSeenKey = "Ironcliw.onboardingSeen"
let currentOnboardingVersion = 7
let pauseDefaultsKey = "Ironcliw.pauseEnabled"
let iconAnimationsEnabledKey = "Ironcliw.iconAnimationsEnabled"
let swabbleEnabledKey = "Ironcliw.swabbleEnabled"
let swabbleTriggersKey = "Ironcliw.swabbleTriggers"
let voiceWakeTriggerChimeKey = "Ironcliw.voiceWakeTriggerChime"
let voiceWakeSendChimeKey = "Ironcliw.voiceWakeSendChime"
let showDockIconKey = "Ironcliw.showDockIcon"
let defaultVoiceWakeTriggers = ["Ironcliw"]
let voiceWakeMaxWords = 32
let voiceWakeMaxWordLength = 64
let voiceWakeMicKey = "Ironcliw.voiceWakeMicID"
let voiceWakeMicNameKey = "Ironcliw.voiceWakeMicName"
let voiceWakeLocaleKey = "Ironcliw.voiceWakeLocaleID"
let voiceWakeAdditionalLocalesKey = "Ironcliw.voiceWakeAdditionalLocaleIDs"
let voicePushToTalkEnabledKey = "Ironcliw.voicePushToTalkEnabled"
let talkEnabledKey = "Ironcliw.talkEnabled"
let iconOverrideKey = "Ironcliw.iconOverride"
let connectionModeKey = "Ironcliw.connectionMode"
let remoteTargetKey = "Ironcliw.remoteTarget"
let remoteIdentityKey = "Ironcliw.remoteIdentity"
let remoteProjectRootKey = "Ironcliw.remoteProjectRoot"
let remoteCliPathKey = "Ironcliw.remoteCliPath"
let canvasEnabledKey = "Ironcliw.canvasEnabled"
let cameraEnabledKey = "Ironcliw.cameraEnabled"
let systemRunPolicyKey = "Ironcliw.systemRunPolicy"
let systemRunAllowlistKey = "Ironcliw.systemRunAllowlist"
let systemRunEnabledKey = "Ironcliw.systemRunEnabled"
let locationModeKey = "Ironcliw.locationMode"
let locationPreciseKey = "Ironcliw.locationPreciseEnabled"
let peekabooBridgeEnabledKey = "Ironcliw.peekabooBridgeEnabled"
let deepLinkKeyKey = "Ironcliw.deepLinkKey"
let modelCatalogPathKey = "Ironcliw.modelCatalogPath"
let modelCatalogReloadKey = "Ironcliw.modelCatalogReload"
let cliInstallPromptedVersionKey = "Ironcliw.cliInstallPromptedVersion"
let heartbeatsEnabledKey = "Ironcliw.heartbeatsEnabled"
let debugPaneEnabledKey = "Ironcliw.debugPaneEnabled"
let debugFileLogEnabledKey = "Ironcliw.debug.fileLogEnabled"
let appLogLevelKey = "Ironcliw.debug.appLogLevel"
let voiceWakeSupported: Bool = ProcessInfo.processInfo.operatingSystemVersion.majorVersion >= 26

