import Foundation

// Stable identifier used for both the macOS LaunchAgent label and Nix-managed defaults suite.
// nix-ironcliw writes app defaults into this suite to survive app bundle identifier churn.
let launchdLabel = "ai.ironcliw.mac"
let gatewayLaunchdLabel = "ai.ironcliw.gateway"
let onboardingVersionKey = "ironcliw.onboardingVersion"
let onboardingSeenKey = "ironcliw.onboardingSeen"
let currentOnboardingVersion = 7
let pauseDefaultsKey = "ironcliw.pauseEnabled"
let iconAnimationsEnabledKey = "ironcliw.iconAnimationsEnabled"
let swabbleEnabledKey = "ironcliw.swabbleEnabled"
let swabbleTriggersKey = "ironcliw.swabbleTriggers"
let voiceWakeTriggerChimeKey = "ironcliw.voiceWakeTriggerChime"
let voiceWakeSendChimeKey = "ironcliw.voiceWakeSendChime"
let showDockIconKey = "ironcliw.showDockIcon"
let defaultVoiceWakeTriggers = ["ironcliw"]
let voiceWakeMaxWords = 32
let voiceWakeMaxWordLength = 64
let voiceWakeMicKey = "ironcliw.voiceWakeMicID"
let voiceWakeMicNameKey = "ironcliw.voiceWakeMicName"
let voiceWakeLocaleKey = "ironcliw.voiceWakeLocaleID"
let voiceWakeAdditionalLocalesKey = "ironcliw.voiceWakeAdditionalLocaleIDs"
let voicePushToTalkEnabledKey = "ironcliw.voicePushToTalkEnabled"
let talkEnabledKey = "ironcliw.talkEnabled"
let iconOverrideKey = "ironcliw.iconOverride"
let connectionModeKey = "ironcliw.connectionMode"
let remoteTargetKey = "ironcliw.remoteTarget"
let remoteIdentityKey = "ironcliw.remoteIdentity"
let remoteProjectRootKey = "ironcliw.remoteProjectRoot"
let remoteCliPathKey = "ironcliw.remoteCliPath"
let canvasEnabledKey = "ironcliw.canvasEnabled"
let cameraEnabledKey = "ironcliw.cameraEnabled"
let systemRunPolicyKey = "ironcliw.systemRunPolicy"
let systemRunAllowlistKey = "ironcliw.systemRunAllowlist"
let systemRunEnabledKey = "ironcliw.systemRunEnabled"
let locationModeKey = "ironcliw.locationMode"
let locationPreciseKey = "ironcliw.locationPreciseEnabled"
let peekabooBridgeEnabledKey = "ironcliw.peekabooBridgeEnabled"
let deepLinkKeyKey = "ironcliw.deepLinkKey"
let modelCatalogPathKey = "ironcliw.modelCatalogPath"
let modelCatalogReloadKey = "ironcliw.modelCatalogReload"
let cliInstallPromptedVersionKey = "ironcliw.cliInstallPromptedVersion"
let heartbeatsEnabledKey = "ironcliw.heartbeatsEnabled"
let debugPaneEnabledKey = "ironcliw.debugPaneEnabled"
let debugFileLogEnabledKey = "ironcliw.debug.fileLogEnabled"
let appLogLevelKey = "ironcliw.debug.appLogLevel"
let voiceWakeSupported: Bool = ProcessInfo.processInfo.operatingSystemVersion.majorVersion >= 26
