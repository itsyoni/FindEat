import Intents
import UserNotifications

final class NotificationService: UNNotificationServiceExtension {
    private var contentHandler: ((UNNotificationContent) -> Void)?
    private var bestAttemptContent: UNMutableNotificationContent?

    override func didReceive(
        _ request: UNNotificationRequest,
        withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
    ) {
        self.contentHandler = contentHandler
        guard let content = request.content.mutableCopy() as? UNMutableNotificationContent else {
            contentHandler(request.content)
            return
        }
        bestAttemptContent = content

        let data = notificationData(from: request.content.userInfo)
        let isMessage = (data["type"] as? String) == "MESSAGE"
        let imageURL = notificationImageURL(
            from: request.content.userInfo,
            data: data
        )

        guard let imageURL else {
            if isMessage {
                deliverCommunicationNotification(content, data: data, avatarData: nil)
            } else {
                contentHandler(content)
            }
            return
        }

        URLSession.shared.downloadTask(with: imageURL) { temporaryURL, response, _ in
            guard let temporaryURL else {
                if isMessage {
                    self.deliverCommunicationNotification(content, data: data, avatarData: nil)
                } else {
                    contentHandler(content)
                }
                return
            }

            if isMessage {
                let avatarData = try? Data(contentsOf: temporaryURL)
                self.deliverCommunicationNotification(
                    content,
                    data: data,
                    avatarData: avatarData
                )
                return
            }

            let fileExtension = self.fileExtension(
                for: response?.mimeType,
                fallback: imageURL.pathExtension
            )
            let destinationURL = URL(fileURLWithPath: NSTemporaryDirectory())
                .appendingPathComponent(UUID().uuidString)
                .appendingPathExtension(fileExtension)

            do {
                try FileManager.default.moveItem(at: temporaryURL, to: destinationURL)
                content.attachments = [
                    try UNNotificationAttachment(
                        identifier: "actor-profile-picture",
                        url: destinationURL,
                        options: nil
                    )
                ]
            } catch {
                // Deliver the original notification if its remote image cannot
                // be downloaded or decoded within the extension time limit.
            }
            contentHandler(content)
        }.resume()
    }

    override func serviceExtensionTimeWillExpire() {
        if let contentHandler, let bestAttemptContent {
            contentHandler(bestAttemptContent)
        }
    }

    private func deliverCommunicationNotification(
        _ content: UNMutableNotificationContent,
        data: [String: Any],
        avatarData: Data?
    ) {
        let senderName =
            (data["senderName"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines)
            ?? content.title
        let senderIdentifier =
            (data["actorId"] as? String)
            ?? senderName
        let recipientIdentifier =
            (data["recipientId"] as? String)
            ?? "current-user"

        let senderHandle = INPersonHandle(value: senderIdentifier, type: .unknown)
        let senderImage = avatarData.map { INImage(imageData: $0) }
        let sender = INPerson(
            personHandle: senderHandle,
            nameComponents: nil,
            displayName: senderName,
            image: senderImage,
            contactIdentifier: nil,
            customIdentifier: senderIdentifier,
            isMe: false,
            suggestionType: .none
        )
        let recipient = INPerson(
            personHandle: INPersonHandle(value: recipientIdentifier, type: .unknown),
            nameComponents: nil,
            displayName: nil,
            image: nil,
            contactIdentifier: nil,
            customIdentifier: recipientIdentifier,
            isMe: true,
            suggestionType: .none
        )
        let intent = INSendMessageIntent(
            recipients: [recipient],
            outgoingMessageType: .outgoingMessageText,
            content: content.body,
            speakableGroupName: nil,
            conversationIdentifier: data["conversationId"] as? String,
            serviceName: "FindEat",
            sender: sender,
            attachments: nil
        )
        if let senderImage {
            intent.setImage(senderImage, forParameterNamed: \INSendMessageIntent.sender)
        }

        let interaction = INInteraction(intent: intent, response: nil)
        interaction.direction = .incoming
        interaction.donate { _ in
            do {
                let updatedContent = try content.updating(from: intent)
                self.contentHandler?(updatedContent)
            } catch {
                self.contentHandler?(content)
            }
        }
    }

    private func notificationData(from userInfo: [AnyHashable: Any]) -> [String: Any] {
        if let data = userInfo["data"] as? [String: Any] {
            return data
        }
        if let body = userInfo["body"] as? [String: Any],
           let data = body["data"] as? [String: Any] {
            return data
        }
        return userInfo.reduce(into: [String: Any]()) { result, item in
            if let key = item.key as? String {
                result[key] = item.value
            }
        }
    }

    private func notificationImageURL(
        from userInfo: [AnyHashable: Any],
        data: [String: Any]
    ) -> URL? {
        let expoBody = userInfo["body"] as? [String: Any]
        let richContent =
            expoBody?["_richContent"] as? [String: Any]
            ?? userInfo["_richContent"] as? [String: Any]
            ?? userInfo["richContent"] as? [String: Any]
        let image =
            richContent?["image"] as? String
            ?? ((data["type"] as? String) == "MESSAGE"
                ? (data["senderAvatarUrl"] as? String
                    ?? data["actorAvatarUrl"] as? String)
                : nil)
        guard let image, let url = URL(string: image) else { return nil }
        return url
    }

    private func fileExtension(for mimeType: String?, fallback: String) -> String {
        switch mimeType?.lowercased() {
        case "image/png": return "png"
        case "image/gif": return "gif"
        case "image/webp": return "webp"
        default: return fallback.isEmpty ? "jpg" : fallback
        }
    }
}
