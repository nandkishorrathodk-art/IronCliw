import CoreLocation
import Foundation
import IronCliwKit
import UIKit

typealias IronCliwCameraSnapResult = (format: String, base64: String, width: Int, height: Int)
typealias IronCliwCameraClipResult = (format: String, base64: String, durationMs: Int, hasAudio: Bool)

protocol CameraServicing: Sendable {
    func listDevices() async -> [CameraController.CameraDeviceInfo]
    func snap(params: IronCliwCameraSnapParams) async throws -> IronCliwCameraSnapResult
    func clip(params: IronCliwCameraClipParams) async throws -> IronCliwCameraClipResult
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
    func ensureAuthorization(mode: IronCliwLocationMode) async -> CLAuthorizationStatus
    func currentLocation(
        params: IronCliwLocationGetParams,
        desiredAccuracy: IronCliwLocationAccuracy,
        maxAgeMs: Int?,
        timeoutMs: Int?) async throws -> CLLocation
    func startLocationUpdates(
        desiredAccuracy: IronCliwLocationAccuracy,
        significantChangesOnly: Bool) -> AsyncStream<CLLocation>
    func stopLocationUpdates()
    func startMonitoringSignificantLocationChanges(onUpdate: @escaping @Sendable (CLLocation) -> Void)
    func stopMonitoringSignificantLocationChanges()
}

@MainActor
protocol DeviceStatusServicing: Sendable {
    func status() async throws -> IronCliwDeviceStatusPayload
    func info() -> IronCliwDeviceInfoPayload
}

protocol PhotosServicing: Sendable {
    func latest(params: IronCliwPhotosLatestParams) async throws -> IronCliwPhotosLatestPayload
}

protocol ContactsServicing: Sendable {
    func search(params: IronCliwContactsSearchParams) async throws -> IronCliwContactsSearchPayload
    func add(params: IronCliwContactsAddParams) async throws -> IronCliwContactsAddPayload
}

protocol CalendarServicing: Sendable {
    func events(params: IronCliwCalendarEventsParams) async throws -> IronCliwCalendarEventsPayload
    func add(params: IronCliwCalendarAddParams) async throws -> IronCliwCalendarAddPayload
}

protocol RemindersServicing: Sendable {
    func list(params: IronCliwRemindersListParams) async throws -> IronCliwRemindersListPayload
    func add(params: IronCliwRemindersAddParams) async throws -> IronCliwRemindersAddPayload
}

protocol MotionServicing: Sendable {
    func activities(params: IronCliwMotionActivityParams) async throws -> IronCliwMotionActivityPayload
    func pedometer(params: IronCliwPedometerParams) async throws -> IronCliwPedometerPayload
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
        params: IronCliwWatchNotifyParams) async throws -> WatchNotificationSendResult
}

extension CameraController: CameraServicing {}
extension ScreenRecordService: ScreenRecordingServicing {}
extension LocationService: LocationServicing {}
