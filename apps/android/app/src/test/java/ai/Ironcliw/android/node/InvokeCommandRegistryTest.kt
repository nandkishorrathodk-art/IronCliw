package ai.Ironcliw.android.node

import ai.Ironcliw.android.protocol.IroncliwCalendarCommand
import ai.Ironcliw.android.protocol.IroncliwCameraCommand
import ai.Ironcliw.android.protocol.IroncliwCapability
import ai.Ironcliw.android.protocol.IroncliwContactsCommand
import ai.Ironcliw.android.protocol.IroncliwDeviceCommand
import ai.Ironcliw.android.protocol.IroncliwLocationCommand
import ai.Ironcliw.android.protocol.IroncliwMotionCommand
import ai.Ironcliw.android.protocol.IroncliwNotificationsCommand
import ai.Ironcliw.android.protocol.IroncliwPhotosCommand
import ai.Ironcliw.android.protocol.IroncliwSmsCommand
import ai.Ironcliw.android.protocol.IroncliwSystemCommand
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class InvokeCommandRegistryTest {
  private val coreCapabilities =
    setOf(
      IroncliwCapability.Canvas.rawValue,
      IroncliwCapability.Screen.rawValue,
      IroncliwCapability.Device.rawValue,
      IroncliwCapability.Notifications.rawValue,
      IroncliwCapability.System.rawValue,
      IroncliwCapability.AppUpdate.rawValue,
      IroncliwCapability.Photos.rawValue,
      IroncliwCapability.Contacts.rawValue,
      IroncliwCapability.Calendar.rawValue,
    )

  private val optionalCapabilities =
    setOf(
      IroncliwCapability.Camera.rawValue,
      IroncliwCapability.Location.rawValue,
      IroncliwCapability.Sms.rawValue,
      IroncliwCapability.VoiceWake.rawValue,
      IroncliwCapability.Motion.rawValue,
    )

  private val coreCommands =
    setOf(
      IroncliwDeviceCommand.Status.rawValue,
      IroncliwDeviceCommand.Info.rawValue,
      IroncliwDeviceCommand.Permissions.rawValue,
      IroncliwDeviceCommand.Health.rawValue,
      IroncliwNotificationsCommand.List.rawValue,
      IroncliwNotificationsCommand.Actions.rawValue,
      IroncliwSystemCommand.Notify.rawValue,
      IroncliwPhotosCommand.Latest.rawValue,
      IroncliwContactsCommand.Search.rawValue,
      IroncliwContactsCommand.Add.rawValue,
      IroncliwCalendarCommand.Events.rawValue,
      IroncliwCalendarCommand.Add.rawValue,
      "app.update",
    )

  private val optionalCommands =
    setOf(
      IroncliwCameraCommand.Snap.rawValue,
      IroncliwCameraCommand.Clip.rawValue,
      IroncliwCameraCommand.List.rawValue,
      IroncliwLocationCommand.Get.rawValue,
      IroncliwMotionCommand.Activity.rawValue,
      IroncliwMotionCommand.Pedometer.rawValue,
      IroncliwSmsCommand.Send.rawValue,
    )

  private val debugCommands = setOf("debug.logs", "debug.ed25519")

  @Test
  fun advertisedCapabilities_respectsFeatureAvailability() {
    val capabilities = InvokeCommandRegistry.advertisedCapabilities(defaultFlags())

    assertContainsAll(capabilities, coreCapabilities)
    assertMissingAll(capabilities, optionalCapabilities)
  }

  @Test
  fun advertisedCapabilities_includesFeatureCapabilitiesWhenEnabled() {
    val capabilities =
      InvokeCommandRegistry.advertisedCapabilities(
        defaultFlags(
          cameraEnabled = true,
          locationEnabled = true,
          smsAvailable = true,
          voiceWakeEnabled = true,
          motionActivityAvailable = true,
          motionPedometerAvailable = true,
        ),
      )

    assertContainsAll(capabilities, coreCapabilities + optionalCapabilities)
  }

  @Test
  fun advertisedCommands_respectsFeatureAvailability() {
    val commands = InvokeCommandRegistry.advertisedCommands(defaultFlags())

    assertContainsAll(commands, coreCommands)
    assertMissingAll(commands, optionalCommands + debugCommands)
  }

  @Test
  fun advertisedCommands_includesFeatureCommandsWhenEnabled() {
    val commands =
      InvokeCommandRegistry.advertisedCommands(
        defaultFlags(
          cameraEnabled = true,
          locationEnabled = true,
          smsAvailable = true,
          motionActivityAvailable = true,
          motionPedometerAvailable = true,
          debugBuild = true,
        ),
      )

    assertContainsAll(commands, coreCommands + optionalCommands + debugCommands)
  }

  @Test
  fun advertisedCommands_onlyIncludesSupportedMotionCommands() {
    val commands =
      InvokeCommandRegistry.advertisedCommands(
        NodeRuntimeFlags(
          cameraEnabled = false,
          locationEnabled = false,
          smsAvailable = false,
          voiceWakeEnabled = false,
          motionActivityAvailable = true,
          motionPedometerAvailable = false,
          debugBuild = false,
        ),
      )

    assertTrue(commands.contains(IroncliwMotionCommand.Activity.rawValue))
    assertFalse(commands.contains(IroncliwMotionCommand.Pedometer.rawValue))
  }

  private fun defaultFlags(
    cameraEnabled: Boolean = false,
    locationEnabled: Boolean = false,
    smsAvailable: Boolean = false,
    voiceWakeEnabled: Boolean = false,
    motionActivityAvailable: Boolean = false,
    motionPedometerAvailable: Boolean = false,
    debugBuild: Boolean = false,
  ): NodeRuntimeFlags =
    NodeRuntimeFlags(
      cameraEnabled = cameraEnabled,
      locationEnabled = locationEnabled,
      smsAvailable = smsAvailable,
      voiceWakeEnabled = voiceWakeEnabled,
      motionActivityAvailable = motionActivityAvailable,
      motionPedometerAvailable = motionPedometerAvailable,
      debugBuild = debugBuild,
    )

  private fun assertContainsAll(actual: List<String>, expected: Set<String>) {
    expected.forEach { value -> assertTrue(actual.contains(value)) }
  }

  private fun assertMissingAll(actual: List<String>, forbidden: Set<String>) {
    forbidden.forEach { value -> assertFalse(actual.contains(value)) }
  }
}

