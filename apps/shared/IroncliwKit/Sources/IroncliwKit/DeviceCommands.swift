import Foundation

public enum IroncliwDeviceCommand: String, Codable, Sendable {
    case status = "device.status"
    case info = "device.info"
}

public enum IroncliwBatteryState: String, Codable, Sendable {
    case unknown
    case unplugged
    case charging
    case full
}

public enum IroncliwThermalState: String, Codable, Sendable {
    case nominal
    case fair
    case serious
    case critical
}

public enum IroncliwNetworkPathStatus: String, Codable, Sendable {
    case satisfied
    case unsatisfied
    case requiresConnection
}

public enum IroncliwNetworkInterfaceType: String, Codable, Sendable {
    case wifi
    case cellular
    case wired
    case other
}

public struct IroncliwBatteryStatusPayload: Codable, Sendable, Equatable {
    public var level: Double?
    public var state: IroncliwBatteryState
    public var lowPowerModeEnabled: Bool

    public init(level: Double?, state: IroncliwBatteryState, lowPowerModeEnabled: Bool) {
        self.level = level
        self.state = state
        self.lowPowerModeEnabled = lowPowerModeEnabled
    }
}

public struct IroncliwThermalStatusPayload: Codable, Sendable, Equatable {
    public var state: IroncliwThermalState

    public init(state: IroncliwThermalState) {
        self.state = state
    }
}

public struct IroncliwStorageStatusPayload: Codable, Sendable, Equatable {
    public var totalBytes: Int64
    public var freeBytes: Int64
    public var usedBytes: Int64

    public init(totalBytes: Int64, freeBytes: Int64, usedBytes: Int64) {
        self.totalBytes = totalBytes
        self.freeBytes = freeBytes
        self.usedBytes = usedBytes
    }
}

public struct IroncliwNetworkStatusPayload: Codable, Sendable, Equatable {
    public var status: IroncliwNetworkPathStatus
    public var isExpensive: Bool
    public var isConstrained: Bool
    public var interfaces: [IroncliwNetworkInterfaceType]

    public init(
        status: IroncliwNetworkPathStatus,
        isExpensive: Bool,
        isConstrained: Bool,
        interfaces: [IroncliwNetworkInterfaceType])
    {
        self.status = status
        self.isExpensive = isExpensive
        self.isConstrained = isConstrained
        self.interfaces = interfaces
    }
}

public struct IroncliwDeviceStatusPayload: Codable, Sendable, Equatable {
    public var battery: IroncliwBatteryStatusPayload
    public var thermal: IroncliwThermalStatusPayload
    public var storage: IroncliwStorageStatusPayload
    public var network: IroncliwNetworkStatusPayload
    public var uptimeSeconds: Double

    public init(
        battery: IroncliwBatteryStatusPayload,
        thermal: IroncliwThermalStatusPayload,
        storage: IroncliwStorageStatusPayload,
        network: IroncliwNetworkStatusPayload,
        uptimeSeconds: Double)
    {
        self.battery = battery
        self.thermal = thermal
        self.storage = storage
        self.network = network
        self.uptimeSeconds = uptimeSeconds
    }
}

public struct IroncliwDeviceInfoPayload: Codable, Sendable, Equatable {
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

