import Foundation

public enum IroncliwRemindersCommand: String, Codable, Sendable {
    case list = "reminders.list"
    case add = "reminders.add"
}

public enum IroncliwReminderStatusFilter: String, Codable, Sendable {
    case incomplete
    case completed
    case all
}

public struct IroncliwRemindersListParams: Codable, Sendable, Equatable {
    public var status: IroncliwReminderStatusFilter?
    public var limit: Int?

    public init(status: IroncliwReminderStatusFilter? = nil, limit: Int? = nil) {
        self.status = status
        self.limit = limit
    }
}

public struct IroncliwRemindersAddParams: Codable, Sendable, Equatable {
    public var title: String
    public var dueISO: String?
    public var notes: String?
    public var listId: String?
    public var listName: String?

    public init(
        title: String,
        dueISO: String? = nil,
        notes: String? = nil,
        listId: String? = nil,
        listName: String? = nil)
    {
        self.title = title
        self.dueISO = dueISO
        self.notes = notes
        self.listId = listId
        self.listName = listName
    }
}

public struct IroncliwReminderPayload: Codable, Sendable, Equatable {
    public var identifier: String
    public var title: String
    public var dueISO: String?
    public var completed: Bool
    public var listName: String?

    public init(
        identifier: String,
        title: String,
        dueISO: String? = nil,
        completed: Bool,
        listName: String? = nil)
    {
        self.identifier = identifier
        self.title = title
        self.dueISO = dueISO
        self.completed = completed
        self.listName = listName
    }
}

public struct IroncliwRemindersListPayload: Codable, Sendable, Equatable {
    public var reminders: [IroncliwReminderPayload]

    public init(reminders: [IroncliwReminderPayload]) {
        self.reminders = reminders
    }
}

public struct IroncliwRemindersAddPayload: Codable, Sendable, Equatable {
    public var reminder: IroncliwReminderPayload

    public init(reminder: IroncliwReminderPayload) {
        self.reminder = reminder
    }
}

