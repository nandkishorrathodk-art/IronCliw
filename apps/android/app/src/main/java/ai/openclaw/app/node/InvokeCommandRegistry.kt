package ai.ironcliw.app.node

import ai.ironcliw.app.protocol.IronCliwCalendarCommand
import ai.ironcliw.app.protocol.IronCliwCanvasA2UICommand
import ai.ironcliw.app.protocol.IronCliwCanvasCommand
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

data class NodeRuntimeFlags(
  val cameraEnabled: Boolean,
  val locationEnabled: Boolean,
  val smsAvailable: Boolean,
  val voiceWakeEnabled: Boolean,
  val motionActivityAvailable: Boolean,
  val motionPedometerAvailable: Boolean,
  val debugBuild: Boolean,
)

enum class InvokeCommandAvailability {
  Always,
  CameraEnabled,
  LocationEnabled,
  SmsAvailable,
  MotionActivityAvailable,
  MotionPedometerAvailable,
  DebugBuild,
}

enum class NodeCapabilityAvailability {
  Always,
  CameraEnabled,
  LocationEnabled,
  SmsAvailable,
  VoiceWakeEnabled,
  MotionAvailable,
}

data class NodeCapabilitySpec(
  val name: String,
  val availability: NodeCapabilityAvailability = NodeCapabilityAvailability.Always,
)

data class InvokeCommandSpec(
  val name: String,
  val requiresForeground: Boolean = false,
  val availability: InvokeCommandAvailability = InvokeCommandAvailability.Always,
)

object InvokeCommandRegistry {
  val capabilityManifest: List<NodeCapabilitySpec> =
    listOf(
      NodeCapabilitySpec(name = IronCliwCapability.Canvas.rawValue),
      NodeCapabilitySpec(name = IronCliwCapability.Device.rawValue),
      NodeCapabilitySpec(name = IronCliwCapability.Notifications.rawValue),
      NodeCapabilitySpec(name = IronCliwCapability.System.rawValue),
      NodeCapabilitySpec(
        name = IronCliwCapability.Camera.rawValue,
        availability = NodeCapabilityAvailability.CameraEnabled,
      ),
      NodeCapabilitySpec(
        name = IronCliwCapability.Sms.rawValue,
        availability = NodeCapabilityAvailability.SmsAvailable,
      ),
      NodeCapabilitySpec(
        name = IronCliwCapability.VoiceWake.rawValue,
        availability = NodeCapabilityAvailability.VoiceWakeEnabled,
      ),
      NodeCapabilitySpec(
        name = IronCliwCapability.Location.rawValue,
        availability = NodeCapabilityAvailability.LocationEnabled,
      ),
      NodeCapabilitySpec(name = IronCliwCapability.Photos.rawValue),
      NodeCapabilitySpec(name = IronCliwCapability.Contacts.rawValue),
      NodeCapabilitySpec(name = IronCliwCapability.Calendar.rawValue),
      NodeCapabilitySpec(
        name = IronCliwCapability.Motion.rawValue,
        availability = NodeCapabilityAvailability.MotionAvailable,
      ),
    )

  val all: List<InvokeCommandSpec> =
    listOf(
      InvokeCommandSpec(
        name = IronCliwCanvasCommand.Present.rawValue,
        requiresForeground = true,
      ),
      InvokeCommandSpec(
        name = IronCliwCanvasCommand.Hide.rawValue,
        requiresForeground = true,
      ),
      InvokeCommandSpec(
        name = IronCliwCanvasCommand.Navigate.rawValue,
        requiresForeground = true,
      ),
      InvokeCommandSpec(
        name = IronCliwCanvasCommand.Eval.rawValue,
        requiresForeground = true,
      ),
      InvokeCommandSpec(
        name = IronCliwCanvasCommand.Snapshot.rawValue,
        requiresForeground = true,
      ),
      InvokeCommandSpec(
        name = IronCliwCanvasA2UICommand.Push.rawValue,
        requiresForeground = true,
      ),
      InvokeCommandSpec(
        name = IronCliwCanvasA2UICommand.PushJSONL.rawValue,
        requiresForeground = true,
      ),
      InvokeCommandSpec(
        name = IronCliwCanvasA2UICommand.Reset.rawValue,
        requiresForeground = true,
      ),
      InvokeCommandSpec(
        name = IronCliwSystemCommand.Notify.rawValue,
      ),
      InvokeCommandSpec(
        name = IronCliwCameraCommand.List.rawValue,
        requiresForeground = true,
        availability = InvokeCommandAvailability.CameraEnabled,
      ),
      InvokeCommandSpec(
        name = IronCliwCameraCommand.Snap.rawValue,
        requiresForeground = true,
        availability = InvokeCommandAvailability.CameraEnabled,
      ),
      InvokeCommandSpec(
        name = IronCliwCameraCommand.Clip.rawValue,
        requiresForeground = true,
        availability = InvokeCommandAvailability.CameraEnabled,
      ),
      InvokeCommandSpec(
        name = IronCliwLocationCommand.Get.rawValue,
        availability = InvokeCommandAvailability.LocationEnabled,
      ),
      InvokeCommandSpec(
        name = IronCliwDeviceCommand.Status.rawValue,
      ),
      InvokeCommandSpec(
        name = IronCliwDeviceCommand.Info.rawValue,
      ),
      InvokeCommandSpec(
        name = IronCliwDeviceCommand.Permissions.rawValue,
      ),
      InvokeCommandSpec(
        name = IronCliwDeviceCommand.Health.rawValue,
      ),
      InvokeCommandSpec(
        name = IronCliwNotificationsCommand.List.rawValue,
      ),
      InvokeCommandSpec(
        name = IronCliwNotificationsCommand.Actions.rawValue,
      ),
      InvokeCommandSpec(
        name = IronCliwPhotosCommand.Latest.rawValue,
      ),
      InvokeCommandSpec(
        name = IronCliwContactsCommand.Search.rawValue,
      ),
      InvokeCommandSpec(
        name = IronCliwContactsCommand.Add.rawValue,
      ),
      InvokeCommandSpec(
        name = IronCliwCalendarCommand.Events.rawValue,
      ),
      InvokeCommandSpec(
        name = IronCliwCalendarCommand.Add.rawValue,
      ),
      InvokeCommandSpec(
        name = IronCliwMotionCommand.Activity.rawValue,
        availability = InvokeCommandAvailability.MotionActivityAvailable,
      ),
      InvokeCommandSpec(
        name = IronCliwMotionCommand.Pedometer.rawValue,
        availability = InvokeCommandAvailability.MotionPedometerAvailable,
      ),
      InvokeCommandSpec(
        name = IronCliwSmsCommand.Send.rawValue,
        availability = InvokeCommandAvailability.SmsAvailable,
      ),
      InvokeCommandSpec(
        name = "debug.logs",
        availability = InvokeCommandAvailability.DebugBuild,
      ),
      InvokeCommandSpec(
        name = "debug.ed25519",
        availability = InvokeCommandAvailability.DebugBuild,
      ),
    )

  private val byNameInternal: Map<String, InvokeCommandSpec> = all.associateBy { it.name }

  fun find(command: String): InvokeCommandSpec? = byNameInternal[command]

  fun advertisedCapabilities(flags: NodeRuntimeFlags): List<String> {
    return capabilityManifest
      .filter { spec ->
        when (spec.availability) {
          NodeCapabilityAvailability.Always -> true
          NodeCapabilityAvailability.CameraEnabled -> flags.cameraEnabled
          NodeCapabilityAvailability.LocationEnabled -> flags.locationEnabled
          NodeCapabilityAvailability.SmsAvailable -> flags.smsAvailable
          NodeCapabilityAvailability.VoiceWakeEnabled -> flags.voiceWakeEnabled
          NodeCapabilityAvailability.MotionAvailable -> flags.motionActivityAvailable || flags.motionPedometerAvailable
        }
      }
      .map { it.name }
  }

  fun advertisedCommands(flags: NodeRuntimeFlags): List<String> {
    return all
      .filter { spec ->
        when (spec.availability) {
          InvokeCommandAvailability.Always -> true
          InvokeCommandAvailability.CameraEnabled -> flags.cameraEnabled
          InvokeCommandAvailability.LocationEnabled -> flags.locationEnabled
          InvokeCommandAvailability.SmsAvailable -> flags.smsAvailable
          InvokeCommandAvailability.MotionActivityAvailable -> flags.motionActivityAvailable
          InvokeCommandAvailability.MotionPedometerAvailable -> flags.motionPedometerAvailable
          InvokeCommandAvailability.DebugBuild -> flags.debugBuild
        }
      }
      .map { it.name }
  }
}
