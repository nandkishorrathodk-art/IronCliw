import Foundation

public enum IronCliwCameraCommand: String, Codable, Sendable {
    case list = "camera.list"
    case snap = "camera.snap"
    case clip = "camera.clip"
}

public enum IronCliwCameraFacing: String, Codable, Sendable {
    case back
    case front
}

public enum IronCliwCameraImageFormat: String, Codable, Sendable {
    case jpg
    case jpeg
}

public enum IronCliwCameraVideoFormat: String, Codable, Sendable {
    case mp4
}

public struct IronCliwCameraSnapParams: Codable, Sendable, Equatable {
    public var facing: IronCliwCameraFacing?
    public var maxWidth: Int?
    public var quality: Double?
    public var format: IronCliwCameraImageFormat?
    public var deviceId: String?
    public var delayMs: Int?

    public init(
        facing: IronCliwCameraFacing? = nil,
        maxWidth: Int? = nil,
        quality: Double? = nil,
        format: IronCliwCameraImageFormat? = nil,
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

public struct IronCliwCameraClipParams: Codable, Sendable, Equatable {
    public var facing: IronCliwCameraFacing?
    public var durationMs: Int?
    public var includeAudio: Bool?
    public var format: IronCliwCameraVideoFormat?
    public var deviceId: String?

    public init(
        facing: IronCliwCameraFacing? = nil,
        durationMs: Int? = nil,
        includeAudio: Bool? = nil,
        format: IronCliwCameraVideoFormat? = nil,
        deviceId: String? = nil)
    {
        self.facing = facing
        self.durationMs = durationMs
        self.includeAudio = includeAudio
        self.format = format
        self.deviceId = deviceId
    }
}
