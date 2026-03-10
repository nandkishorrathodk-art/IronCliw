package ai.ironcliw.app.protocol

import org.junit.Assert.assertEquals
import org.junit.Test

class IronCliwProtocolConstantsTest {
  @Test
  fun canvasCommandsUseStableStrings() {
    assertEquals("canvas.present", IronCliwCanvasCommand.Present.rawValue)
    assertEquals("canvas.hide", IronCliwCanvasCommand.Hide.rawValue)
    assertEquals("canvas.navigate", IronCliwCanvasCommand.Navigate.rawValue)
    assertEquals("canvas.eval", IronCliwCanvasCommand.Eval.rawValue)
    assertEquals("canvas.snapshot", IronCliwCanvasCommand.Snapshot.rawValue)
  }

  @Test
  fun a2uiCommandsUseStableStrings() {
    assertEquals("canvas.a2ui.push", IronCliwCanvasA2UICommand.Push.rawValue)
    assertEquals("canvas.a2ui.pushJSONL", IronCliwCanvasA2UICommand.PushJSONL.rawValue)
    assertEquals("canvas.a2ui.reset", IronCliwCanvasA2UICommand.Reset.rawValue)
  }

  @Test
  fun capabilitiesUseStableStrings() {
    assertEquals("canvas", IronCliwCapability.Canvas.rawValue)
    assertEquals("camera", IronCliwCapability.Camera.rawValue)
    assertEquals("voiceWake", IronCliwCapability.VoiceWake.rawValue)
    assertEquals("location", IronCliwCapability.Location.rawValue)
    assertEquals("sms", IronCliwCapability.Sms.rawValue)
    assertEquals("device", IronCliwCapability.Device.rawValue)
    assertEquals("notifications", IronCliwCapability.Notifications.rawValue)
    assertEquals("system", IronCliwCapability.System.rawValue)
    assertEquals("photos", IronCliwCapability.Photos.rawValue)
    assertEquals("contacts", IronCliwCapability.Contacts.rawValue)
    assertEquals("calendar", IronCliwCapability.Calendar.rawValue)
    assertEquals("motion", IronCliwCapability.Motion.rawValue)
  }

  @Test
  fun cameraCommandsUseStableStrings() {
    assertEquals("camera.list", IronCliwCameraCommand.List.rawValue)
    assertEquals("camera.snap", IronCliwCameraCommand.Snap.rawValue)
    assertEquals("camera.clip", IronCliwCameraCommand.Clip.rawValue)
  }

  @Test
  fun notificationsCommandsUseStableStrings() {
    assertEquals("notifications.list", IronCliwNotificationsCommand.List.rawValue)
    assertEquals("notifications.actions", IronCliwNotificationsCommand.Actions.rawValue)
  }

  @Test
  fun deviceCommandsUseStableStrings() {
    assertEquals("device.status", IronCliwDeviceCommand.Status.rawValue)
    assertEquals("device.info", IronCliwDeviceCommand.Info.rawValue)
    assertEquals("device.permissions", IronCliwDeviceCommand.Permissions.rawValue)
    assertEquals("device.health", IronCliwDeviceCommand.Health.rawValue)
  }

  @Test
  fun systemCommandsUseStableStrings() {
    assertEquals("system.notify", IronCliwSystemCommand.Notify.rawValue)
  }

  @Test
  fun photosCommandsUseStableStrings() {
    assertEquals("photos.latest", IronCliwPhotosCommand.Latest.rawValue)
  }

  @Test
  fun contactsCommandsUseStableStrings() {
    assertEquals("contacts.search", IronCliwContactsCommand.Search.rawValue)
    assertEquals("contacts.add", IronCliwContactsCommand.Add.rawValue)
  }

  @Test
  fun calendarCommandsUseStableStrings() {
    assertEquals("calendar.events", IronCliwCalendarCommand.Events.rawValue)
    assertEquals("calendar.add", IronCliwCalendarCommand.Add.rawValue)
  }

  @Test
  fun motionCommandsUseStableStrings() {
    assertEquals("motion.activity", IronCliwMotionCommand.Activity.rawValue)
    assertEquals("motion.pedometer", IronCliwMotionCommand.Pedometer.rawValue)
  }
}
