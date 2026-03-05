import Foundation

public enum IronCliwDeviceCommand: String, Codable, Sendable {
    case status = "device.status"
    case info = "device.info"
}

public enum IronCliwBatteryState: String, Codable, Sendable {
    case unknown
    case unplugged
    case charging
    case full
}

public enum IronCliwThermalState: String, Codable, Sendable {
    case nominal
    case fair
    case serious
    case critical
}

public enum IronCliwNetworkPathStatus: String, Codable, Sendable {
    case satisfied
    case unsatisfied
    case requiresConnection
}

public enum IronCliwNetworkInterfaceType: String, Codable, Sendable {
    case wifi
    case cellular
    case wired
    case other
}

public struct IronCliwBatteryStatusPayload: Codable, Sendable, Equatable {
    public var level: Double?
    public var state: IronCliwBatteryState
    public var lowPowerModeEnabled: Bool

    public init(level: Double?, state: IronCliwBatteryState, lowPowerModeEnabled: Bool) {
        self.level = level
        self.state = state
        self.lowPowerModeEnabled = lowPowerModeEnabled
    }
}

public struct IronCliwThermalStatusPayload: Codable, Sendable, Equatable {
    public var state: IronCliwThermalState

    public init(state: IronCliwThermalState) {
        self.state = state
    }
}

public struct IronCliwStorageStatusPayload: Codable, Sendable, Equatable {
    public var totalBytes: Int64
    public var freeBytes: Int64
    public var usedBytes: Int64

    public init(totalBytes: Int64, freeBytes: Int64, usedBytes: Int64) {
        self.totalBytes = totalBytes
        self.freeBytes = freeBytes
        self.usedBytes = usedBytes
    }
}

public struct IronCliwNetworkStatusPayload: Codable, Sendable, Equatable {
    public var status: IronCliwNetworkPathStatus
    public var isExpensive: Bool
    public var isConstrained: Bool
    public var interfaces: [IronCliwNetworkInterfaceType]

    public init(
        status: IronCliwNetworkPathStatus,
        isExpensive: Bool,
        isConstrained: Bool,
        interfaces: [IronCliwNetworkInterfaceType])
    {
        self.status = status
        self.isExpensive = isExpensive
        self.isConstrained = isConstrained
        self.interfaces = interfaces
    }
}

public struct IronCliwDeviceStatusPayload: Codable, Sendable, Equatable {
    public var battery: IronCliwBatteryStatusPayload
    public var thermal: IronCliwThermalStatusPayload
    public var storage: IronCliwStorageStatusPayload
    public var network: IronCliwNetworkStatusPayload
    public var uptimeSeconds: Double

    public init(
        battery: IronCliwBatteryStatusPayload,
        thermal: IronCliwThermalStatusPayload,
        storage: IronCliwStorageStatusPayload,
        network: IronCliwNetworkStatusPayload,
        uptimeSeconds: Double)
    {
        self.battery = battery
        self.thermal = thermal
        self.storage = storage
        self.network = network
        self.uptimeSeconds = uptimeSeconds
    }
}

public struct IronCliwDeviceInfoPayload: Codable, Sendable, Equatable {
    public var deviceName: String
    public var modelIdentifier: String
    public var systemName: String
    public var systemVersion: String
    public var appVersion: String
    public var appBuild: String
    public var locale: String

    public init(
        deviceName: String,
        modelIdentifier: String,
        systemName: String,
        systemVersion: String,
        appVersion: String,
        appBuild: String,
        locale: String)
    {
        self.deviceName = deviceName
        self.modelIdentifier = modelIdentifier
        self.systemName = systemName
        self.systemVersion = systemVersion
        self.appVersion = appVersion
        self.appBuild = appBuild
        self.locale = locale
    }
}
