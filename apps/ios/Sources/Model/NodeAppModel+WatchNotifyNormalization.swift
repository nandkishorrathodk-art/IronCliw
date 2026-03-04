import Foundation
import IroncliwKit

extension NodeAppModel {
    static func normalizeWatchNotifyParams(_ params: IroncliwWatchNotifyParams) -> IroncliwWatchNotifyParams {
        var normalized = params
        normalized.title = params.title.trimmingCharacters(in: .whitespacesAndNewlines)
        normalized.body = params.body.trimmingCharacters(in: .whitespacesAndNewlines)
        normalized.promptId = self.trimmedOrNil(params.promptId)
        normalized.sessionKey = self.trimmedOrNil(params.sessionKey)
        normalized.kind = self.trimmedOrNil(params.kind)
        normalized.details = self.trimmedOrNil(params.details)
        normalized.priority = self.normalizedWatchPriority(params.priority, risk: params.risk)
        normalized.risk = self.normalizedWatchRisk(params.risk, priority: normalized.priority)

        let normalizedActions = self.normalizeWatchActions(
            params.actions,
            kind: normalized.kind,
            promptId: normalized.promptId)
        normalized.actions = normalizedActions.isEmpty ? nil : normalizedActions
        return normalized
    }

    static func normalizeWatchActions(
        _ actions: [IroncliwWatchAction]?,
        kind: String?,
        promptId: String?) -> [IroncliwWatchAction]
    {
        let provided = (actions ?? []).compactMap { action -> IroncliwWatchAction? in
            let id = action.id.trimmingCharacters(in: .whitespacesAndNewlines)
            let label = action.label.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !id.isEmpty, !label.isEmpty else { return nil }
            return IroncliwWatchAction(
                id: id,
                label: label,
                style: self.trimmedOrNil(action.style))
        }
        if !provided.isEmpty {
            return Array(provided.prefix(4))
        }

        // Only auto-insert quick actions when this is a prompt/decision flow.
        guard promptId?.isEmpty == false else {
            return []
        }

        let normalizedKind = kind?.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() ?? ""
        if normalizedKind.contains("approval") || normalizedKind.contains("approve") {
            return [
                IroncliwWatchAction(id: "approve", label: "Approve"),
                IroncliwWatchAction(id: "decline", label: "Decline", style: "destructive"),
                IroncliwWatchAction(id: "open_phone", label: "Open iPhone"),
                IroncliwWatchAction(id: "escalate", label: "Escalate"),
            ]
        }

        return [
            IroncliwWatchAction(id: "done", label: "Done"),
            IroncliwWatchAction(id: "snooze_10m", label: "Snooze 10m"),
            IroncliwWatchAction(id: "open_phone", label: "Open iPhone"),
            IroncliwWatchAction(id: "escalate", label: "Escalate"),
        ]
    }

    static func normalizedWatchRisk(
        _ risk: IroncliwWatchRisk?,
        priority: IroncliwNotificationPriority?) -> IroncliwWatchRisk?
    {
        if let risk { return risk }
        switch priority {
        case .passive:
            return .low
        case .active:
            return .medium
        case .timeSensitive:
            return .high
        case nil:
            return nil
        }
    }

    static func normalizedWatchPriority(
        _ priority: IroncliwNotificationPriority?,
        risk: IroncliwWatchRisk?) -> IroncliwNotificationPriority?
    {
        if let priority { return priority }
        switch risk {
        case .low:
            return .passive
        case .medium:
            return .active
        case .high:
            return .timeSensitive
        case nil:
            return nil
        }
    }

    static func trimmedOrNil(_ value: String?) -> String? {
        let trimmed = value?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return trimmed.isEmpty ? nil : trimmed
    }
}

