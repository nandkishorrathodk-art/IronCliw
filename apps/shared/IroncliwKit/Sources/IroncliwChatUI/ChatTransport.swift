import Foundation

public enum IroncliwChatTransportEvent: Sendable {
    case health(ok: Bool)
    case tick
    case chat(IroncliwChatEventPayload)
    case agent(IroncliwAgentEventPayload)
    case seqGap
}

public protocol IroncliwChatTransport: Sendable {
    func requestHistory(sessionKey: String) async throws -> IroncliwChatHistoryPayload
    func sendMessage(
        sessionKey: String,
        message: String,
        thinking: String,
        idempotencyKey: String,
        attachments: [IroncliwChatAttachmentPayload]) async throws -> IroncliwChatSendResponse

    func abortRun(sessionKey: String, runId: String) async throws
    func listSessions(limit: Int?) async throws -> IroncliwChatSessionsListResponse

    func requestHealth(timeoutMs: Int) async throws -> Bool
    func events() -> AsyncStream<IroncliwChatTransportEvent>

    func setActiveSessionKey(_ sessionKey: String) async throws
}

extension IroncliwChatTransport {
    public func setActiveSessionKey(_: String) async throws {}

    public func abortRun(sessionKey _: String, runId _: String) async throws {
        throw NSError(
            domain: "IroncliwChatTransport",
            code: 0,
            userInfo: [NSLocalizedDescriptionKey: "chat.abort not supported by this transport"])
    }

    public func listSessions(limit _: Int?) async throws -> IroncliwChatSessionsListResponse {
        throw NSError(
            domain: "IroncliwChatTransport",
            code: 0,
            userInfo: [NSLocalizedDescriptionKey: "sessions.list not supported by this transport"])
    }
}

