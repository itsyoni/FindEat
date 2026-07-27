import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { ChatCircleDotsIcon } from "@phosphor-icons/react/dist/csr/ChatCircleDots";
import type {
  BusinessAccount,
  ManagedRestaurant,
  RestaurantConversation,
  RestaurantMessage,
} from "@findeat/types";
import { useConversationSocket } from "../hooks/useConversationSocket";
import { fetchRestaurantMessages, sendRestaurantReply } from "../lib/api";

type MessagesPageProps = {
  restaurant: ManagedRestaurant;
  account: BusinessAccount;
  conversations: RestaurantConversation[];
  reloadConversations: (restaurantId: string) => Promise<void>;
};

export function MessagesPage({
  restaurant,
  account,
  conversations,
  reloadConversations,
}: MessagesPageProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    conversations[0]?.id ?? null,
  );
  const [messages, setMessages] = useState<RestaurantMessage[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const messagesRef = useRef<HTMLDivElement>(null);
  const selectedConversation = conversations.find(
    (conversation) => conversation.id === selectedId,
  );

  useEffect(() => {
    if (
      selectedId &&
      conversations.some((conversation) => conversation.id === selectedId)
    )
      return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedId(conversations[0]?.id ?? null);
  }, [conversations, selectedId]);

  const loadMessages = useCallback(
    async (
      conversationId: string,
      showLoading = true,
      refresh = false,
    ) => {
      if (showLoading) setLoading(true);
      try {
        setMessages(
          await fetchRestaurantMessages(
            restaurant.id,
            conversationId,
            refresh,
          ),
        );
        setError("");
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Could not load messages",
        );
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [restaurant.id],
  );

  const handleLiveMessage = useCallback(
    (incoming: RestaurantMessage) => {
      setMessages((current) => {
        if (current.some((message) => message.id === incoming.id)) {
          return current;
        }

        const pendingIndex = current.findIndex(
          (message) =>
            message.id.startsWith("pending-") &&
            message.content === incoming.content &&
            incoming.sentAsRestaurantId === restaurant.id,
        );
        if (pendingIndex === -1) return [...current, incoming];

        const next = [...current];
        next[pendingIndex] = incoming;
        return next;
      });
      void reloadConversations(restaurant.id);
    },
    [reloadConversations, restaurant.id],
  );

  const refreshConnectedConversation = useCallback(() => {
    if (!selectedId) return;
    void loadMessages(selectedId, false, true);
    void reloadConversations(restaurant.id);
  }, [loadMessages, reloadConversations, restaurant.id, selectedId]);

  useConversationSocket({
    conversationId: selectedId,
    userId: account.id,
    onConnected: refreshConnectedConversation,
    onMessage: handleLiveMessage,
  });

  useEffect(() => {
    if (!selectedId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessages([]);
      return;
    }
    void loadMessages(selectedId).then(() =>
      reloadConversations(restaurant.id),
    );
    const interval = window.setInterval(() => {
      void loadMessages(selectedId, false, true);
      void reloadConversations(restaurant.id);
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [loadMessages, reloadConversations, restaurant.id, selectedId]);

  useEffect(() => {
    const element = messagesRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages]);

  async function sendMessage(event?: FormEvent) {
    event?.preventDefault();
    const trimmed = content.trim();
    if (!selectedId || !trimmed || sending) return;

    const pendingId = `pending-${Date.now()}`;
    const pendingMessage: RestaurantMessage = {
      id: pendingId,
      type: "TEXT",
      content: trimmed,
      createdAt: new Date().toISOString(),
      senderId: account.id,
      sender: account,
      sentAsRestaurantId: restaurant.id,
      sentAsRestaurant: restaurant,
    };
    setMessages((current) => [...current, pendingMessage]);
    setContent("");
    setSending(true);
    setError("");
    try {
      const sentMessage = await sendRestaurantReply(
        restaurant.id,
        selectedId,
        trimmed,
      );
      setMessages((current) =>
        current.map((message) =>
          message.id === pendingId ? sentMessage : message,
        ),
      );
      await reloadConversations(restaurant.id);
    } catch (nextError) {
      setMessages((current) =>
        current.filter((message) => message.id !== pendingId),
      );
      setContent(trimmed);
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Could not send message",
      );
    } finally {
      setSending(false);
    }
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    void sendMessage();
  }

  return (
    <div className="messages-page">
      <div className="page-heading messages-heading">
        <div>
          <p className="eyebrow">CUSTOMER MESSAGES</p>
          <h2>Inbox</h2>
          <p className="muted">
            Reply as {restaurant.name}. These are the same conversations
            customers see in the app.
          </p>
        </div>
        <span className="message-count">
          {conversations.reduce(
            (total, conversation) => total + conversation.unreadCount,
            0,
          )}{" "}
          unread
        </span>
      </div>
      <div className="messages-workspace">
        <aside className="conversation-list">
          <div className="conversation-list-title">
            <strong>Conversations</strong>
            <span>{conversations.length}</span>
          </div>
          {conversations.length === 0 ? (
            <div className="conversation-empty">
              <ChatCircleDotsIcon size={30} weight="duotone" aria-hidden="true" />
              <strong>No messages yet</strong>
              <p>Customer conversations will appear here.</p>
            </div>
          ) : (
            conversations.map((conversation) => {
              const customer = conversation.customer;
              return (
                <button
                  className={selectedId === conversation.id ? "selected" : ""}
                  key={conversation.id}
                  onClick={() => setSelectedId(conversation.id)}
                >
                  {customer?.avatarUrl ? (
                    <img src={customer.avatarUrl} alt="" />
                  ) : (
                    <span className="conversation-avatar">
                      {(customer?.displayName || customer?.username || "?")
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  )}
                  <div>
                    <strong>
                      {customer?.displayName ||
                        customer?.username ||
                        "Customer"}
                    </strong>
                    <p>{conversation.lastMessage || "New conversation"}</p>
                  </div>
                  <small>
                    {conversation.lastMessageAt
                      ? new Intl.DateTimeFormat(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(new Date(conversation.lastMessageAt))
                      : ""}
                  </small>
                  {conversation.unreadCount > 0 && (
                    <b>{conversation.unreadCount}</b>
                  )}
                </button>
              );
            })
          )}
        </aside>
        <section className="conversation-panel">
          {!selectedConversation ? (
            <div className="select-conversation">
              <ChatCircleDotsIcon size={34} weight="duotone" aria-hidden="true" />
              <h3>Select a conversation</h3>
              <p>Choose a customer message to read and reply.</p>
            </div>
          ) : (
            <>
              <header className="conversation-header">
                <div>
                  {selectedConversation.customer?.avatarUrl ? (
                    <img src={selectedConversation.customer.avatarUrl} alt="" />
                  ) : (
                    <span>
                      {(
                        selectedConversation.customer?.displayName ||
                        selectedConversation.customer?.username ||
                        "?"
                      )
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  )}
                  <div>
                    <strong>
                      {selectedConversation.customer?.displayName ||
                        selectedConversation.customer?.username ||
                        "Customer"}
                    </strong>
                    <small>
                      @{selectedConversation.customer?.username || "customer"}
                    </small>
                  </div>
                </div>
                <span className="replying-as">
                  Replying as {restaurant.name}
                </span>
              </header>
              <div className="message-thread" ref={messagesRef}>
                {loading ? (
                  <div className="thread-state">Loading messages…</div>
                ) : messages.length === 0 ? (
                  <div className="thread-state">
                    No messages in this conversation.
                  </div>
                ) : (
                  messages.map((message) => {
                    const fromRestaurant =
                      message.sentAsRestaurantId === restaurant.id ||
                      message.senderId === account.id ||
                      message.id.startsWith("pending-");
                    return (
                      <div
                        className={`message-row ${fromRestaurant ? "restaurant-message" : "customer-message"}`}
                        key={message.id}
                      >
                        <div className="message-bubble">
                          <p>
                            {message.type === "TEXT"
                              ? message.content
                              : message.type === "IMAGE"
                                ? "Photo"
                                : "Shared item"}
                          </p>
                          <small>
                            {new Intl.DateTimeFormat(undefined, {
                              hour: "2-digit",
                              minute: "2-digit",
                            }).format(new Date(message.createdAt))}
                            {message.id.startsWith("pending-")
                              ? " · Sending…"
                              : ""}
                          </small>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <form className="message-composer" onSubmit={sendMessage}>
                {error && <p className="composer-error">{error}</p>}
                <div>
                  <textarea
                    aria-label="Message"
                    placeholder={`Message ${selectedConversation.customer?.displayName || selectedConversation.customer?.username || "customer"}…`}
                    rows={1}
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    onKeyDown={handleComposerKeyDown}
                  />
                  <button
                    className="primary"
                    disabled={!content.trim() || sending}
                  >
                    {sending ? "Sending…" : "Send"}
                  </button>
                </div>
                <small>
                  Press Enter to send · Shift + Enter for a new line
                </small>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
