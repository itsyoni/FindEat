import { useEffect } from "react";
import type { RestaurantMessage } from "@findeat/types";
import { io } from "socket.io-client";
import { API_URL, getAccessToken } from "../lib/api";
import { SOCKET_CLIENT_METADATA } from "../lib/socketMetadata";

type InboxSocketOptions = {
  conversationIds: string[];
  userId?: string;
  onConnected: () => void;
  onMessage: (message: RestaurantMessage) => void;
};

export function useInboxSocket({
  conversationIds,
  userId,
  onConnected,
  onMessage,
}: InboxSocketOptions) {
  const conversationKey = [...conversationIds].sort().join(",");

  useEffect(() => {
    if (!userId) return;
    const token = getAccessToken();
    if (!token) return;

    const socket = io(API_URL, {
      auth: { token, trackPresence: false, ...SOCKET_CLIENT_METADATA },
    });

    socket.on("connect", () => {
      for (const conversationId of conversationKey.split(",").filter(Boolean)) {
        socket.emit("join_conversation", { conversationId });
      }
      onConnected();
    });
    socket.on("receive_message", onMessage);

    return () => {
      socket.disconnect();
    };
  }, [conversationKey, onConnected, onMessage, userId]);
}
