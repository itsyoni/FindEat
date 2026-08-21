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
    <div className="messages-page [width:min(1280px,100%)] [margin:auto] [padding:38px_42px_32px] max-[900px]:[padding:24px_18px_18px] max-[650px]:[padding-top:18px] max-[600px]:[padding:16px_12px_12px]">
      <div className="page-heading [display:flex] [align-items:flex-end] [justify-content:space-between] [gap:24px] [margin-bottom:30px] [&_.eyebrow]:[margin-top:0] [&_h2]:[margin-bottom:8px] [&_h2]:[font-size:36px] [&_h2]:[letter-spacing:-0.035em] [&_p]:[margin-bottom:0] [.performance-page_&_select]:[min-width:130px] [.performance-page_&_select]:[padding:10px_12px] [.performance-page_&_select]:[border:1px_solid_var(--line)] [.performance-page_&_select]:[border-radius:11px] [.performance-page_&_select]:[background:var(--surface)] [.performance-page_&_select]:[color:var(--ink)] [.pro-page>&]:[margin-bottom:12px] max-[800px]:[align-items:flex-start] max-[800px]:[flex-direction:column] max-[800px]:[gap:14px] max-[800px]:[margin-bottom:22px] max-[800px]:[&_h2]:[font-size:clamp(28px,_8vw,_34px)] max-[800px]:[&_h2]:[line-height:1.08] max-[800px]:[&_p]:[max-width:68ch] max-[800px]:[&_p]:[line-height:1.5] max-[800px]:[&>div]:[min-width:0] [.restaurant-badges-page_&]:[display:flex] [.restaurant-badges-page_&]:[align-items:flex-start] [.restaurant-badges-page_&]:[justify-content:space-between] [.restaurant-badges-page_&]:[gap:24px] [.restaurant-badges-page_&]:[margin-bottom:28px] max-[700px]:[.restaurant-badges-page_&]:[flex-direction:column] messages-heading [flex:0_0_auto] [align-items:flex-end] [margin-bottom:22px] max-[900px]:[margin-bottom:16px] max-[650px]:[margin-bottom:12px] max-[650px]:[&_.eyebrow]:[display:none] max-[650px]:[&_.muted]:[display:none] max-[650px]:[&_h2]:[margin:0] max-[650px]:[&_h2]:[font-size:28px] max-[600px]:[&_h2]:[font-size:25px]">
        <div>
          <p className="eyebrow [color:var(--accent)] [font-size:12px] [font-weight:800] [letter-spacing:0.12em] [margin:20px_0_8px] [.error-page-copy_&]:[margin:0_0_14px] [.error-page-copy>p:not(&)]:[max-width:570px] [.error-page-copy>p:not(&)]:[margin-bottom:0] [.error-page-copy>p:not(&)]:[color:var(--muted)] [.error-page-copy>p:not(&)]:[font-size:clamp(16px,_2vw,_19px)] [.error-page-copy>p:not(&)]:[line-height:1.65] max-[760px]:[.error-page-copy>p:not(&)]:[margin-inline:auto] [.legal-hero_&]:[margin-top:0] [.legal-hero>p:not(&):not(.legal-effective)]:[color:#625d56] [.legal-hero>p:not(&):not(.legal-effective)]:[font-size:16px] [.legal-hero>p:not(&):not(.legal-effective)]:[line-height:1.75] [.deletion-hero_&]:[margin-top:0] [.admin-monitor-card-heading_&]:[margin:0_0_5px] [.premium-title_&]:[margin-bottom:8px] max-[650px]:[.messages-heading_&]:[display:none] dark:[.legal-hero>p:not(&):not(.legal-effective)]:[color:#bcb5ac] [.restaurant-badges-page_&]:[color:#ff7255] [.restaurant-badges-page_&]:[font-size:12px] [.restaurant-badges-page_&]:[font-weight:800] [.restaurant-badges-page_&]:[letter-spacing:0.14em] [.restaurant-badges-page_&]:[text-transform:uppercase]">CUSTOMER MESSAGES</p>
          <h2>Inbox</h2>
          <p className="muted [.login-card>&]:[line-height:1.55] [color:var(--muted)] max-[650px]:[.messages-heading_&]:[display:none] max-[800px]:[.support-admin-content_.support-heading_&]:[display:none]">
            Reply as {restaurant.name}. These are the same conversations
            customers see in the app.
          </p>
        </div>
        <span className="message-count [padding:8px_12px] [border-radius:20px] [background:#fff0ea] [color:#bf4629] [font-size:12px] [font-weight:800] [background:var(--accent-soft)] [color:var(--accent-dark)]">
          {conversations.reduce(
            (total, conversation) => total + conversation.unreadCount,
            0,
          )}{" "}
          unread
        </span>
      </div>
      <div className="messages-workspace [--messages-header-height:68px] [display:grid] [flex:1_1_auto] [grid-template-columns:330px_minmax(0,1fr)] [height:auto] [min-height:0] [overflow:hidden] [border:1px_solid_var(--line)] [border-radius:22px] [background:var(--surface)] [box-shadow:0_12px_40px_#2f211408] max-[900px]:[grid-template-columns:280px_minmax(0,1fr)] max-[650px]:[grid-template-columns:1fr] max-[650px]:[grid-template-rows:minmax(120px,34%)_minmax(0,66%)] max-[600px]:[grid-template-rows:minmax(116px,31%)_minmax(0,69%)] max-[600px]:[border-radius:17px]">
        <aside className="conversation-list sticky top-0 flex h-screen flex-col border-r border-line bg-surface px-4.5 py-6.25 max-[800px]:static max-[800px]:h-auto max-[800px]:p-3.5 [position:static] [top:auto] [width:auto] [height:auto] [min-height:0] [padding:0] [overflow-y:auto] [border:0] [border-right:1px_solid_var(--line)] [background:var(--surface-subtle)] [&>button]:[position:relative] [&>button]:[display:grid] [&>button]:[grid-template-columns:44px_minmax(0,1fr)_auto] [&>button]:[align-items:center] [&>button]:[gap:11px] [&>button]:[width:100%] [&>button]:[min-height:78px] [&>button]:[padding:13px_14px] [&>button]:[border:0] [&>button]:[border-bottom:1px_solid_var(--line)] [&>button]:[background:transparent] [&>button]:[color:var(--ink)] [&>button]:[text-align:left] [&>button:hover]:[background:var(--surface)] [&>button.selected]:[background:var(--surface)] [&>button.selected:before]:[content:''] [&>button.selected:before]:[position:absolute] [&>button.selected:before]:[left:0] [&>button.selected:before]:[top:13px] [&>button.selected:before]:[bottom:13px] [&>button.selected:before]:[width:3px] [&>button.selected:before]:[border-radius:5px] [&>button.selected:before]:[background:var(--accent)] [&_img]:[display:grid] [&_img]:[place-items:center] [&_img]:[width:44px] [&_img]:[height:44px] [&_img]:[border-radius:50%] [&_img]:[object-fit:cover] [&_img]:[background:#e9e2da] [&_img]:[font-weight:900] [&_button>div]:[min-width:0] [&_button_strong]:[display:block] [&_button_strong]:[overflow:hidden] [&_button_strong]:[margin:0] [&_button_strong]:[text-overflow:ellipsis] [&_button_strong]:[white-space:nowrap] [&_button_p]:[display:block] [&_button_p]:[overflow:hidden] [&_button_p]:[margin:0] [&_button_p]:[text-overflow:ellipsis] [&_button_p]:[white-space:nowrap] [&_button_strong]:[font-size:13px] [&_button_p]:[margin-top:5px] [&_button_p]:[color:var(--muted)] [&_button_p]:[font-size:11px] [&_button>small]:[align-self:start] [&_button>small]:[margin-top:5px] [&_button>small]:[color:#999] [&_button>small]:[font-size:9px] [&_button>b]:[position:absolute] [&_button>b]:[right:14px] [&_button>b]:[bottom:12px] [&_button>b]:[display:grid] [&_button>b]:[place-items:center] [&_button>b]:[min-width:19px] [&_button>b]:[height:19px] [&_button>b]:[padding:0_5px] [&_button>b]:[border-radius:20px] [&_button>b]:[background:var(--accent)] [&_button>b]:[color:#FAF9F6] [&_button>b]:[font-size:9px] max-[650px]:[max-height:none] max-[650px]:[border-right:0] max-[650px]:[border-bottom:1px_solid_var(--line)] dark:[&>button:hover]:[background:var(--surface-hover)] dark:[&>button.selected]:[background:var(--surface-hover)] [&_img]:[background:var(--avatar-surface)] max-[600px]:[&>button]:[min-height:68px] max-[600px]:[&>button]:[padding:10px_12px]">
          <div className="conversation-list-title [position:sticky] [top:0] [z-index:1] [display:flex] [align-items:center] [justify-content:space-between] [height:var(--messages-header-height)] [min-height:var(--messages-header-height)] [padding:0_18px] [border-bottom:1px_solid_var(--line)] [background:#faf9f7f2] [backdrop-filter:blur(10px)] [&_span]:[display:grid] [&_span]:[place-items:center] [&_span]:[min-width:24px] [&_span]:[height:24px] [&_span]:[padding:0_6px] [&_span]:[border-radius:20px] [&_span]:[background:#ece9e4] [&_span]:[color:var(--muted)] [&_span]:[font-size:10px] [&_span]:[font-weight:900] dark:[background:#211f1cf2] [&_span]:[background:var(--neutral-chip)] [&_span]:[color:var(--neutral-chip-text)] [background:var(--glass-surface)] max-[600px]:[height:52px] max-[600px]:[min-height:52px]">
            <strong>Conversations</strong>
            <span>{conversations.length}</span>
          </div>
          {conversations.length === 0 ? (
            <div className="conversation-empty [display:grid] [place-items:center] [padding:65px_25px] [color:var(--muted)] [text-align:center] [&>span]:[font-size:30px] [&_strong]:[margin-top:12px] [&_strong]:[color:var(--ink)] [&_p]:[margin:6px_0_0] [&_p]:[font-size:12px]">
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
                    <span className="conversation-avatar [display:grid] [place-items:center] [width:44px] [height:44px] [border-radius:50%] [object-fit:cover] [background:#e9e2da] [font-weight:900] [background:var(--avatar-surface)]">
                      {(customer?.username || "?")
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  )}
                  <div>
                    <strong>
                      {customer?.username || "Customer"}
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
        <section className="conversation-panel [display:grid] [grid-template-rows:auto_minmax(0,1fr)_auto] [min-width:0] [min-height:0] [background:#f7f5f1] max-[650px]:[height:auto] max-[650px]:[min-height:0] [background:var(--chat-surface)]">
          {!selectedConversation ? (
            <div className="select-conversation [display:grid] [place-items:center] [height:100%] [color:var(--muted)] [text-align:center] [align-content:center] [padding:30px] [&>span]:[font-size:38px] [&_h3]:[margin:13px_0_6px] [&_h3]:[color:var(--ink)] [&_p]:[margin:0]">
              <ChatCircleDotsIcon size={34} weight="duotone" aria-hidden="true" />
              <h3>Select a conversation</h3>
              <p>Choose a customer message to read and reply.</p>
            </div>
          ) : (
            <>
              <header className="conversation-header flex h-19 items-center justify-between border-b border-line bg-surface px-10.5 [&>div]:flex [&>div]:items-center [&>div]:gap-2.5 max-[800px]:px-5 [height:var(--messages-header-height)] [min-height:var(--messages-header-height)] [padding:0_20px] [border-bottom:1px_solid_var(--line)] [background:var(--surface)] [&>div]:[display:flex] [&>div]:[align-items:center] [&>div]:[gap:11px] [&_img]:[display:grid] [&_img]:[place-items:center] [&_img]:[width:38px] [&_img]:[height:38px] [&_img]:[border-radius:50%] [&_img]:[object-fit:cover] [&_img]:[background:#e9e2da] [&_img]:[font-weight:900] [&>div>span]:[display:grid] [&>div>span]:[place-items:center] [&>div>span]:[width:38px] [&>div>span]:[height:38px] [&>div>span]:[border-radius:50%] [&>div>span]:[object-fit:cover] [&>div>span]:[background:#e9e2da] [&>div>span]:[font-weight:900] [&_strong]:[display:block] [&_small]:[display:block] [&_small]:[margin-top:2px] [&_small]:[color:var(--muted)] [&_small]:[font-size:10px] [&_img]:[background:var(--avatar-surface)] [&>div>span]:[background:var(--avatar-surface)] max-[600px]:[height:56px] max-[600px]:[min-height:56px] max-[600px]:[padding:0_13px]">
                <div>
                  {selectedConversation.customer?.avatarUrl ? (
                    <img src={selectedConversation.customer.avatarUrl} alt="" />
                  ) : (
                    <span>
                      {(
                        selectedConversation.customer?.username ||
                        "?"
                      )
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  )}
                  <div>
                    <strong>
                      {selectedConversation.customer?.username || "Customer"}
                    </strong>
                  </div>
                </div>
                <span className="replying-as [padding:6px_9px] [border-radius:9px] [background:#eaf5ef] [color:var(--green)] [font-size:10px] [font-weight:800] max-[650px]:[display:none]">
                  Replying as {restaurant.name}
                </span>
              </header>
              <div className="message-thread [min-height:0] [padding:22px] [overflow-y:auto] [background:radial-gradient(circle_at_20%_10%,#fff8f2,transparent_35%),#f7f5f1] [background:radial-gradient(circle_at_20%_10%,var(--chat-glow),transparent_35%),var(--chat-surface)] max-[600px]:[padding:14px_12px]" ref={messagesRef}>
                {loading ? (
                  <div className="thread-state [display:grid] [place-items:center] [height:100%] [color:var(--muted)] [text-align:center]">Loading messages…</div>
                ) : messages.length === 0 ? (
                  <div className="thread-state [display:grid] [place-items:center] [height:100%] [color:var(--muted)] [text-align:center]">
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
                        className={`message-row [display:flex] [margin-bottom:10px] [&.restaurant-message]:[justify-content:flex-end] ${fromRestaurant ? "restaurant-message" : "customer-message"}`}
                        key={message.id}
                      >
                        <div className="message-bubble [max-width:min(72%,560px)] [padding:10px_13px_7px] [border:1px_solid_var(--line)] [border-radius:15px_15px_15px_4px] [background:var(--surface)] [box-shadow:0_3px_12px_#2f211408] [.restaurant-message_&]:[border-color:#242424] [.restaurant-message_&]:[border-radius:15px_15px_4px_15px] [.restaurant-message_&]:[background:var(--ink)] [.restaurant-message_&]:[color:#FAF9F6] [&_p]:[margin:0] [&_p]:[white-space:pre-wrap] [&_p]:[line-height:1.4] [&_small]:[display:block] [&_small]:[margin-top:5px] [&_small]:[color:#999] [&_small]:[font-size:9px] [&_small]:[text-align:right] [.restaurant-message_&_small]:[color:#aaa] max-[650px]:[max-width:86%] dark:[.restaurant-message_&]:[color:#171717] dark:[.restaurant-message_&]:[border-color:var(--ink)] max-[600px]:[max-width:90%]">
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
              <form className="message-composer [padding:13px_16px_10px] [border-top:1px_solid_var(--line)] [background:var(--surface)] [&>div]:[display:grid] [&>div]:[grid-template-columns:minmax(0,1fr)_auto] [&>div]:[align-items:end] [&>div]:[gap:9px] [&_textarea]:[max-height:110px] [&_textarea]:[min-height:44px] [&_textarea]:[resize:none] [&_button]:[min-height:44px] [&>small]:[display:block] [&>small]:[margin-top:6px] [&>small]:[color:#999] [&>small]:[font-size:9px] max-[600px]:[padding:10px_10px_calc(8px_+_env(safe-area-inset-bottom))] max-[600px]:[&>div]:[grid-template-columns:minmax(0,1fr)] max-[600px]:[&_button]:[width:100%] max-[600px]:[&>small]:[display:none]" onSubmit={sendMessage}>
                {error && <p className="composer-error [margin:0_0_8px] [color:#b32727] [font-size:11px]">{error}</p>}
                <div>
                  <textarea
                    aria-label="Message"
                    placeholder={`Message ${selectedConversation.customer?.username || "customer"}…`}
                    rows={1}
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    onKeyDown={handleComposerKeyDown}
                  />
                  <button
                    className="primary [.login-card_&]:[min-height:49px] [.login-card_&]:[margin-top:2px] [.login-card_&]:[background:var(--accent)] [.login-card_&]:[color:#faf9f6] [.login-card_&]:[box-shadow:0_10px_24px_color-mix(in_srgb,_var(--accent)_25%,_transparent)] [.login-card_&]:[transition:background-color_0.16s_ease,_box-shadow_0.16s_ease,_transform_0.16s_ease] [.login-card_&:hover:not(:disabled)]:[background:color-mix(in_srgb,_var(--accent)_88%,_#9c2e19)] [.login-card_&:hover:not(:disabled)]:[box-shadow:0_13px_28px_color-mix(in_srgb,_var(--accent)_31%,_transparent)] [.login-card_&:hover:not(:disabled)]:[transform:translateY(-1px)] [.login-card_&:active:not(:disabled)]:[transform:translateY(0)] [.login-card_&:disabled]:[cursor:not-allowed] [border:0] [border-radius:12px] [padding:12px_17px] [font-weight:800] [background:var(--ink)] [color:#faf9f6] [&:hover]:[background:#333] [&:disabled]:[opacity:0.55] [.error-page-actions_&]:[background:var(--accent)] [.error-page-actions_&]:[color:#171717] [.error-page-actions_&]:[box-shadow:0_12px_30px_color-mix(in_srgb,_var(--accent)_25%,_transparent)] [.error-page-actions_&:hover]:[background:color-mix(in_srgb,_var(--accent)_88%,_var(--ink))] [.error-page-actions_&:hover]:[transform:translateY(-1px)] [&.compact]:[padding:9px_13px] [&.compact]:[font-size:12px] [&.compact]:[white-space:nowrap] [.owner-support-form_&]:[width:100%] dark:[color:#171717] dark:[&:hover]:[background:color-mix(in_srgb,_var(--ink)_82%,_var(--accent))]"
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
