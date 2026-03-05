import Foundation

public enum IronCliwRemindersCommand: String, Codable, Sendable {
    case list = "reminders.list"
    case add = "reminders.add"
}

public enum IronCliwReminderStatusFilter: String, Codable, Sendable {
    case incomplete
    case completed
    case all
}

public struct IronCliwRemindersListParams: Codable, Sendable, Equatable {
    public var status: IronCliwReminderStatusFilter?
    public var limit: Int?

    public init(status: IronCliwReminderStatusFilter? = nil, limit: Int? = nil) {
        self.status = status
        self.limit = limit
    }
}

public struct IronCliwRemindersAddParams: Codable, Sendable, Equatable {
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

public struct IronCliwReminderPayload: Codable, Sendable, Equatable {
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

public struct IronCliwRemindersListPayload: Codable, Sendable, Equatable {
    public var reminders: [IronCliwReminderPayload]

    public init(reminders: [IronCliwReminderPayload]) {
        self.reminders = reminders
    }
}

public struct IronCliwRemindersAddPayload: Codable, Sendable, Equatable {
    public var reminder: IronCliwReminderPayload

    public init(reminder: IronCliwReminderPayload) {
        self.reminder = reminder
    }
}
