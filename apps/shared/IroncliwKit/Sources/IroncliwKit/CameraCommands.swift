import Foundation

public enum IroncliwCameraCommand: String, Codable, Sendable {
    case list = "camera.list"
    case snap = "camera.snap"
    case clip = "camera.clip"
}

public enum IroncliwCameraFacing: String, Codable, Sendable {
    case back
    case front
}

public enum IroncliwCameraImageFormat: String, Codable, Sendable {
    case jpg
    case jpeg
}

public enum IroncliwCameraVideoFormat: String, Codable, Sendable {
    case mp4
}

public struct IroncliwCameraSnapParams: Codable, Sendable, Equatable {
    public var facing: IroncliwCameraFacing?
    public var maxWidth: Int?
    public var quality: Double?
    public var format: IroncliwCameraImageFormat?
    public var deviceId: String?
    public var delayMs: Int?

    public init(
        facing: IroncliwCameraFacing? = nil,
        maxWidth: Int? = nil,
        quality: Double? = nil,
        format: IroncliwCameraImageFormat? = nil,
        deviceId: String? = nil,
        delayMs: Int? = nil)
    {
        self.facing = facing
        self.maxWidth = maxWidth
        self.quality = quality
        self.format = format
        self.deviceId = deviceId
        self.delayMs = delayMs
    }
}

public struct IroncliwCameraClipParams: Codable, Sendable, Equatable {
    public var facing: IroncliwCameraFacing?
    public var durationMs: Int?
    public var includeAudio: Bool?
    public var format: IroncliwCameraVideoFormat?
    public var deviceId: String?

    public init(
        facing: IroncliwCameraFacing? = nil,
        durationMs: Int? = nil,
        includeAudio: Bool? = nil,
        format: IroncliwCameraVideoFormat? = nil,
        deviceId: String? = nil)
    {
        self.facing = facing
        self.durationMs = durationMs
        self.includeAudio = includeAudio
        self.format = format
        self.deviceId = deviceId
    }
}

