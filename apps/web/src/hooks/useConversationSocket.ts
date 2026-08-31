import { useEffect } from "react";
import type { RestaurantMessage } from "@findeat/types";
import { io } from "socket.io-client";
import { API_URL, getAccessToken } from "../lib/api";
import { SOCKET_CLIENT_METADATA } from "../lib/socketMetadata";

type ConversationSocketOptions = {
  conversationId: string | null;
  userId: string;
  onConnected: () => void;
  onMessage: (message: RestaurantMessage) => void;
};

export function useConversationSocket({
  conversationId,
  userId,
  onConnected,
  onMessage,
}: ConversationSocketOptions) {
  useEffect(() => {
    if (!conversationId || !userId) return;
    const token = getAccessToken();
    if (!token) return;

    const socket = io(API_URL, {
      auth: { token, trackPresence: false, ...SOCKET_CLIENT_METADATA },
    });

    socket.on("connect", () => {
      socket.emit("join_conversation", { conversationId });
      onConnected();
    });
    socket.on("receive_message", onMessage);

    return () => {
      socket.disconnect();
    };
  }, [conversationId, onConnected, onMessage, userId]);
}
