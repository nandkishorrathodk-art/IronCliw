package ai.Ironcliw.android.protocol

import org.junit.Assert.assertEquals
import org.junit.Test

class IroncliwProtocolConstantsTest {
  @Test
  fun canvasCommandsUseStableStrings() {
    assertEquals("canvas.present", IroncliwCanvasCommand.Present.rawValue)
    assertEquals("canvas.hide", IroncliwCanvasCommand.Hide.rawValue)
    assertEquals("canvas.navigate", IroncliwCanvasCommand.Navigate.rawValue)
    assertEquals("canvas.eval", IroncliwCanvasCommand.Eval.rawValue)
    assertEquals("canvas.snapshot", IroncliwCanvasCommand.Snapshot.rawValue)
  }

  @Test
  fun a2uiCommandsUseStableStrings() {
    assertEquals("canvas.a2ui.push", IroncliwCanvasA2UICommand.Push.rawValue)
    assertEquals("canvas.a2ui.pushJSONL", IroncliwCanvasA2UICommand.PushJSONL.rawValue)
    assertEquals("canvas.a2ui.reset", IroncliwCanvasA2UICommand.Reset.rawValue)
  }

  @Test
  fun capabilitiesUseStableStrings() {
    assertEquals("canvas", IroncliwCapability.Canvas.rawValue)
    assertEquals("camera", IroncliwCapability.Camera.rawValue)
    assertEquals("screen", IroncliwCapability.Screen.rawValue)
    assertEquals("voiceWake", IroncliwCapability.VoiceWake.rawValue)
    assertEquals("location", IroncliwCapability.Location.rawValue)
    assertEquals("sms", IroncliwCapability.Sms.rawValue)
    assertEquals("device", IroncliwCapability.Device.rawValue)
    assertEquals("notifications", IroncliwCapability.Notifications.rawValue)
    assertEquals("system", IroncliwCapability.System.rawValue)
    assertEquals("appUpdate", IroncliwCapability.AppUpdate.rawValue)
    assertEquals("photos", IroncliwCapability.Photos.rawValue)
    assertEquals("contacts", IroncliwCapability.Contacts.rawValue)
    assertEquals("calendar", IroncliwCapability.Calendar.rawValue)
    assertEquals("motion", IroncliwCapability.Motion.rawValue)
  }

  @Test
  fun cameraCommandsUseStableStrings() {
    assertEquals("camera.list", IroncliwCameraCommand.List.rawValue)
    assertEquals("camera.snap", IroncliwCameraCommand.Snap.rawValue)
    assertEquals("camera.clip", IroncliwCameraCommand.Clip.rawValue)
  }

  @Test
  fun screenCommandsUseStableStrings() {
    assertEquals("screen.record", IroncliwScreenCommand.Record.rawValue)
  }

  @Test
  fun notificationsCommandsUseStableStrings() {
    assertEquals("notifications.list", IroncliwNotificationsCommand.List.rawValue)
    assertEquals("notifications.actions", IroncliwNotificationsCommand.Actions.rawValue)
  }

  @Test
  fun deviceCommandsUseStableStrings() {
    assertEquals("device.status", IroncliwDeviceCommand.Status.rawValue)
    assertEquals("device.info", IroncliwDeviceCommand.Info.rawValue)
    assertEquals("device.permissions", IroncliwDeviceCommand.Permissions.rawValue)
    assertEquals("device.health", IroncliwDeviceCommand.Health.rawValue)
  }

  @Test
  fun systemCommandsUseStableStrings() {
    assertEquals("system.notify", IroncliwSystemCommand.Notify.rawValue)
  }

  @Test
  fun photosCommandsUseStableStrings() {
    assertEquals("photos.latest", IroncliwPhotosCommand.Latest.rawValue)
  }

  @Test
  fun contactsCommandsUseStableStrings() {
    assertEquals("contacts.search", IroncliwContactsCommand.Search.rawValue)
    assertEquals("contacts.add", IroncliwContactsCommand.Add.rawValue)
  }

  @Test
  fun calendarCommandsUseStableStrings() {
    assertEquals("calendar.events", IroncliwCalendarCommand.Events.rawValue)
    assertEquals("calendar.add", IroncliwCalendarCommand.Add.rawValue)
  }

  @Test
  fun motionCommandsUseStableStrings() {
    assertEquals("motion.activity", IroncliwMotionCommand.Activity.rawValue)
    assertEquals("motion.pedometer", IroncliwMotionCommand.Pedometer.rawValue)
  }
}

