import CoreLocation
import Foundation
import IroncliwKit
import UIKit

typealias IroncliwCameraSnapResult = (format: String, base64: String, width: Int, height: Int)
typealias IroncliwCameraClipResult = (format: String, base64: String, durationMs: Int, hasAudio: Bool)

protocol CameraServicing: Sendable {
    func listDevices() async -> [CameraController.CameraDeviceInfo]
    func snap(params: IroncliwCameraSnapParams) async throws -> IroncliwCameraSnapResult
    func clip(params: IroncliwCameraClipParams) async throws -> IroncliwCameraClipResult
}

protocol ScreenRecordingServicing: Sendable {
    func record(
        screenIndex: Int?,
        durationMs: Int?,
        fps: Double?,
        includeAudio: Bool?,
        outPath: String?) async throws -> String
}

@MainActor
protocol LocationServicing: Sendable {
    func authorizationStatus() -> CLAuthorizationStatus
    func accuracyAuthorization() -> CLAccuracyAuthorization
    func ensureAuthorization(mode: IroncliwLocationMode) async -> CLAuthorizationStatus
    func currentLocation(
        params: IroncliwLocationGetParams,
        desiredAccuracy: IroncliwLocationAccuracy,
        maxAgeMs: Int?,
        timeoutMs: Int?) async throws -> CLLocation
    func startLocationUpdates(
        desiredAccuracy: IroncliwLocationAccuracy,
        significantChangesOnly: Bool) -> AsyncStream<CLLocation>
    func stopLocationUpdates()
    func startMonitoringSignificantLocationChanges(onUpdate: @escaping @Sendable (CLLocation) -> Void)
    func stopMonitoringSignificantLocationChanges()
}

@MainActor
protocol DeviceStatusServicing: Sendable {
    func status() async throws -> IroncliwDeviceStatusPayload
    func info() -> IroncliwDeviceInfoPayload
}

protocol PhotosServicing: Sendable {
    func latest(params: IroncliwPhotosLatestParams) async throws -> IroncliwPhotosLatestPayload
}

protocol ContactsServicing: Sendable {
    func search(params: IroncliwContactsSearchParams) async throws -> IroncliwContactsSearchPayload
    func add(params: IroncliwContactsAddParams) async throws -> IroncliwContactsAddPayload
}

protocol CalendarServicing: Sendable {
    func events(params: IroncliwCalendarEventsParams) async throws -> IroncliwCalendarEventsPayload
    func add(params: IroncliwCalendarAddParams) async throws -> IroncliwCalendarAddPayload
}

protocol RemindersServicing: Sendable {
    func list(params: IroncliwRemindersListParams) async throws -> IroncliwRemindersListPayload
    func add(params: IroncliwRemindersAddParams) async throws -> IroncliwRemindersAddPayload
}

protocol MotionServicing: Sendable {
    func activities(params: IroncliwMotionActivityParams) async throws -> IroncliwMotionActivityPayload
    func pedometer(params: IroncliwPedometerParams) async throws -> IroncliwPedometerPayload
}

struct WatchMessagingStatus: Sendable, Equatable {
    var supported: Bool
    var paired: Bool
    var appInstalled: Bool
    var reachable: Bool
    var activationState: String
}

struct WatchQuickReplyEvent: Sendable, Equatable {
    var replyId: String
    var promptId: String
    var actionId: String
    var actionLabel: String?
    var sessionKey: String?
    var note: String?
    var sentAtMs: Int?
    var transport: String
}

struct WatchNotificationSendResult: Sendable, Equatable {
    var deliveredImmediately: Bool
    var queuedForDelivery: Bool
    var transport: String
}

protocol WatchMessagingServicing: AnyObject, Sendable {
    func status() async -> WatchMessagingStatus
    func setReplyHandler(_ handler: (@Sendable (WatchQuickReplyEvent) -> Void)?)
    func sendNotification(
        id: String,
        params: IroncliwWatchNotifyParams) async throws -> WatchNotificationSendResult
}

extension CameraController: CameraServicing {}
extension ScreenRecordService: ScreenRecordingServicing {}
extension LocationService: LocationServicing {}

