import Foundation

public enum IronCliwChatTransportEvent: Sendable {
    case health(ok: Bool)
    case tick
    case chat(IronCliwChatEventPayload)
    case agent(IronCliwAgentEventPayload)
    case seqGap
}

public protocol IronCliwChatTransport: Sendable {
    func requestHistory(sessionKey: String) async throws -> IronCliwChatHistoryPayload
    func sendMessage(
        sessionKey: String,
        message: String,
        thinking: String,
        idempotencyKey: String,
        attachments: [IronCliwChatAttachmentPayload]) async throws -> IronCliwChatSendResponse

    func abortRun(sessionKey: String, runId: String) async throws
    func listSessions(limit: Int?) async throws -> IronCliwChatSessionsListResponse

    func requestHealth(timeoutMs: Int) async throws -> Bool
    func events() -> AsyncStream<IronCliwChatTransportEvent>

    func setActiveSessionKey(_ sessionKey: String) async throws
}

extension IronCliwChatTransport {
    public func setActiveSessionKey(_: String) async throws {}

    public func abortRun(sessionKey _: String, runId _: String) async throws {
        throw NSError(
            domain: "IronCliwChatTransport",
            code: 0,
            userInfo: [NSLocalizedDescriptionKey: "chat.abort not supported by this transport"])
    }

    public func listSessions(limit _: Int?) async throws -> IronCliwChatSessionsListResponse {
        throw NSError(
            domain: "IronCliwChatTransport",
            code: 0,
            userInfo: [NSLocalizedDescriptionKey: "sessions.list not supported by this transport"])
    }
}
