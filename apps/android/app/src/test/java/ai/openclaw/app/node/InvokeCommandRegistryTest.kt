package ai.ironcliw.app.node

import ai.ironcliw.app.protocol.IronCliwCalendarCommand
import ai.ironcliw.app.protocol.IronCliwCameraCommand
import ai.ironcliw.app.protocol.IronCliwCapability
import ai.ironcliw.app.protocol.IronCliwContactsCommand
import ai.ironcliw.app.protocol.IronCliwDeviceCommand
import ai.ironcliw.app.protocol.IronCliwLocationCommand
import ai.ironcliw.app.protocol.IronCliwMotionCommand
import ai.ironcliw.app.protocol.IronCliwNotificationsCommand
import ai.ironcliw.app.protocol.IronCliwPhotosCommand
import ai.ironcliw.app.protocol.IronCliwSmsCommand
import ai.ironcliw.app.protocol.IronCliwSystemCommand
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class InvokeCommandRegistryTest {
  private val coreCapabilities =
    setOf(
      IronCliwCapability.Canvas.rawValue,
      IronCliwCapability.Device.rawValue,
      IronCliwCapability.Notifications.rawValue,
      IronCliwCapability.System.rawValue,
      IronCliwCapability.Photos.rawValue,
      IronCliwCapability.Contacts.rawValue,
      IronCliwCapability.Calendar.rawValue,
    )

  private val optionalCapabilities =
    setOf(
      IronCliwCapability.Camera.rawValue,
      IronCliwCapability.Location.rawValue,
      IronCliwCapability.Sms.rawValue,
      IronCliwCapability.VoiceWake.rawValue,
      IronCliwCapability.Motion.rawValue,
    )

  private val coreCommands =
    setOf(
      IronCliwDeviceCommand.Status.rawValue,
      IronCliwDeviceCommand.Info.rawValue,
      IronCliwDeviceCommand.Permissions.rawValue,
      IronCliwDeviceCommand.Health.rawValue,
      IronCliwNotificationsCommand.List.rawValue,
      IronCliwNotificationsCommand.Actions.rawValue,
      IronCliwSystemCommand.Notify.rawValue,
      IronCliwPhotosCommand.Latest.rawValue,
      IronCliwContactsCommand.Search.rawValue,
      IronCliwContactsCommand.Add.rawValue,
      IronCliwCalendarCommand.Events.rawValue,
      IronCliwCalendarCommand.Add.rawValue,
    )

  private val optionalCommands =
    setOf(
      IronCliwCameraCommand.Snap.rawValue,
      IronCliwCameraCommand.Clip.rawValue,
      IronCliwCameraCommand.List.rawValue,
      IronCliwLocationCommand.Get.rawValue,
      IronCliwMotionCommand.Activity.rawValue,
      IronCliwMotionCommand.Pedometer.rawValue,
      IronCliwSmsCommand.Send.rawValue,
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

    assertTrue(commands.contains(IronCliwMotionCommand.Activity.rawValue))
    assertFalse(commands.contains(IronCliwMotionCommand.Pedometer.rawValue))
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
