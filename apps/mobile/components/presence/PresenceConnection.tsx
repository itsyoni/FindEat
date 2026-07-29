import { useAuth } from "@/contexts/AuthContext";
import { API_URL } from "@/lib/api";
import { useEffect } from "react";
import { AppState } from "react-native";
import type { Socket } from "socket.io-client";
import { io } from "socket.io-client";

export default function PresenceConnection() {
  const { token } = useAuth();

  useEffect(() => {
    if (!token) return;

    let socket: Socket | null = null;
    const connect = () => {
      if (socket?.connected) return;
      socket?.disconnect();
      socket = io(API_URL, {
        auth: { token, trackPresence: true },
      });
    };
    const disconnect = () => {
      socket?.disconnect();
      socket = null;
    };

    if (AppState.currentState === "active") connect();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") connect();
      else disconnect();
    });

    return () => {
      subscription.remove();
      disconnect();
    };
  }, [token]);

  return null;
}
