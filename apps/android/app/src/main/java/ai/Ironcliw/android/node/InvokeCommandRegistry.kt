package ai.Ironcliw.android.node

import ai.Ironcliw.android.protocol.IroncliwCalendarCommand
import ai.Ironcliw.android.protocol.IroncliwCanvasA2UICommand
import ai.Ironcliw.android.protocol.IroncliwCanvasCommand
import ai.Ironcliw.android.protocol.IroncliwCameraCommand
import ai.Ironcliw.android.protocol.IroncliwCapability
import ai.Ironcliw.android.protocol.IroncliwContactsCommand
import ai.Ironcliw.android.protocol.IroncliwDeviceCommand
import ai.Ironcliw.android.protocol.IroncliwLocationCommand
import ai.Ironcliw.android.protocol.IroncliwMotionCommand
import ai.Ironcliw.android.protocol.IroncliwNotificationsCommand
import ai.Ironcliw.android.protocol.IroncliwPhotosCommand
import ai.Ironcliw.android.protocol.IroncliwScreenCommand
import ai.Ironcliw.android.protocol.IroncliwSmsCommand
import ai.Ironcliw.android.protocol.IroncliwSystemCommand

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
      NodeCapabilitySpec(name = IroncliwCapability.Canvas.rawValue),
      NodeCapabilitySpec(name = IroncliwCapability.Screen.rawValue),
      NodeCapabilitySpec(name = IroncliwCapability.Device.rawValue),
      NodeCapabilitySpec(name = IroncliwCapability.Notifications.rawValue),
      NodeCapabilitySpec(name = IroncliwCapability.System.rawValue),
      NodeCapabilitySpec(name = IroncliwCapability.AppUpdate.rawValue),
      NodeCapabilitySpec(
        name = IroncliwCapability.Camera.rawValue,
        availability = NodeCapabilityAvailability.CameraEnabled,
      ),
      NodeCapabilitySpec(
        name = IroncliwCapability.Sms.rawValue,
        availability = NodeCapabilityAvailability.SmsAvailable,
      ),
      NodeCapabilitySpec(
        name = IroncliwCapability.VoiceWake.rawValue,
        availability = NodeCapabilityAvailability.VoiceWakeEnabled,
      ),
      NodeCapabilitySpec(
        name = IroncliwCapability.Location.rawValue,
        availability = NodeCapabilityAvailability.LocationEnabled,
      ),
      NodeCapabilitySpec(name = IroncliwCapability.Photos.rawValue),
      NodeCapabilitySpec(name = IroncliwCapability.Contacts.rawValue),
      NodeCapabilitySpec(name = IroncliwCapability.Calendar.rawValue),
      NodeCapabilitySpec(
        name = IroncliwCapability.Motion.rawValue,
        availability = NodeCapabilityAvailability.MotionAvailable,
      ),
    )

  val all: List<InvokeCommandSpec> =
    listOf(
      InvokeCommandSpec(
        name = IroncliwCanvasCommand.Present.rawValue,
        requiresForeground = true,
      ),
      InvokeCommandSpec(
        name = IroncliwCanvasCommand.Hide.rawValue,
        requiresForeground = true,
      ),
      InvokeCommandSpec(
        name = IroncliwCanvasCommand.Navigate.rawValue,
        requiresForeground = true,
      ),
      InvokeCommandSpec(
        name = IroncliwCanvasCommand.Eval.rawValue,
        requiresForeground = true,
      ),
      InvokeCommandSpec(
        name = IroncliwCanvasCommand.Snapshot.rawValue,
        requiresForeground = true,
      ),
      InvokeCommandSpec(
        name = IroncliwCanvasA2UICommand.Push.rawValue,
        requiresForeground = true,
      ),
      InvokeCommandSpec(
        name = IroncliwCanvasA2UICommand.PushJSONL.rawValue,
        requiresForeground = true,
      ),
      InvokeCommandSpec(
        name = IroncliwCanvasA2UICommand.Reset.rawValue,
        requiresForeground = true,
      ),
      InvokeCommandSpec(
        name = IroncliwScreenCommand.Record.rawValue,
        requiresForeground = true,
      ),
      InvokeCommandSpec(
        name = IroncliwSystemCommand.Notify.rawValue,
      ),
      InvokeCommandSpec(
        name = IroncliwCameraCommand.List.rawValue,
        requiresForeground = true,
        availability = InvokeCommandAvailability.CameraEnabled,
      ),
      InvokeCommandSpec(
        name = IroncliwCameraCommand.Snap.rawValue,
        requiresForeground = true,
        availability = InvokeCommandAvailability.CameraEnabled,
      ),
      InvokeCommandSpec(
        name = IroncliwCameraCommand.Clip.rawValue,
        requiresForeground = true,
        availability = InvokeCommandAvailability.CameraEnabled,
      ),
      InvokeCommandSpec(
        name = IroncliwLocationCommand.Get.rawValue,
        availability = InvokeCommandAvailability.LocationEnabled,
      ),
      InvokeCommandSpec(
        name = IroncliwDeviceCommand.Status.rawValue,
      ),
      InvokeCommandSpec(
        name = IroncliwDeviceCommand.Info.rawValue,
      ),
      InvokeCommandSpec(
        name = IroncliwDeviceCommand.Permissions.rawValue,
      ),
      InvokeCommandSpec(
        name = IroncliwDeviceCommand.Health.rawValue,
      ),
      InvokeCommandSpec(
        name = IroncliwNotificationsCommand.List.rawValue,
      ),
      InvokeCommandSpec(
        name = IroncliwNotificationsCommand.Actions.rawValue,
      ),
      InvokeCommandSpec(
        name = IroncliwPhotosCommand.Latest.rawValue,
      ),
      InvokeCommandSpec(
        name = IroncliwContactsCommand.Search.rawValue,
      ),
      InvokeCommandSpec(
        name = IroncliwContactsCommand.Add.rawValue,
      ),
      InvokeCommandSpec(
        name = IroncliwCalendarCommand.Events.rawValue,
      ),
      InvokeCommandSpec(
        name = IroncliwCalendarCommand.Add.rawValue,
      ),
      InvokeCommandSpec(
        name = IroncliwMotionCommand.Activity.rawValue,
        availability = InvokeCommandAvailability.MotionActivityAvailable,
      ),
      InvokeCommandSpec(
        name = IroncliwMotionCommand.Pedometer.rawValue,
        availability = InvokeCommandAvailability.MotionPedometerAvailable,
      ),
      InvokeCommandSpec(
        name = IroncliwSmsCommand.Send.rawValue,
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
      InvokeCommandSpec(name = "app.update"),
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

