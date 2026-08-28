import { useEffect } from "react";
import type { AppNotification } from "@findeat/types";
import { io } from "socket.io-client";
import { API_URL, getAccessToken } from "../lib/api";

type RestaurantActivitySocketOptions = {
  restaurantId?: string;
  onConnected: () => void;
  onNotification: (notification: AppNotification) => void;
};

export function useRestaurantActivitySocket({
  restaurantId,
  onConnected,
  onNotification,
}: RestaurantActivitySocketOptions) {
  useEffect(() => {
    const token = getAccessToken();
    if (!restaurantId || !token) return;

    const socket = io(`${API_URL}/notifications`, {
      auth: { token, workspace: "business" },
    });

    socket.on("connect", onConnected);
    socket.on("notification", (notification: AppNotification) => {
      if (notification.restaurantId === restaurantId) {
        onNotification(notification);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [onConnected, onNotification, restaurantId]);
}
