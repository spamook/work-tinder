import { createContext, useContext, useEffect, useState, useRef } from "react";
import type { ReactNode } from "react";
import { Client } from "@stomp/stompjs";
import { useAuth } from "./AuthContext";

interface WebSocketContextType {
  client: Client | null;
  isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(
  undefined,
);

export const WebSocketProvider = ({ children }: { children: ReactNode }) => {
  const { userId, authorized, token } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    // Only connect if authorized and have userId and token
    if (!authorized || !userId || !token) {
      if (clientRef.current) {
        clientRef.current.deactivate();
        clientRef.current = null;
        setClient(null);
        setIsConnected(false);
      }
      return;
    }

    if (clientRef.current) {
      // Already active
      return;
    }

    const newClient = new Client({
      brokerURL: "ws://localhost:8080/ws",
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnectDelay: 1000,
      onConnect: () => {
        setIsConnected(true);
      },
      onDisconnect: () => {
        setIsConnected(false);
      },
      onStompError: (frame) => {
        console.error("Broker reported error: " + frame.headers["message"]);
        console.error("Additional details: " + frame.body);
      },
    });

    newClient.activate();
    clientRef.current = newClient;
    setClient(newClient);

    return () => {
      // Cleanup on unmount or if deps change (logout)
      if (clientRef.current) {
        clientRef.current.deactivate();
        clientRef.current = null;
        setClient(null);
        setIsConnected(false);
      }
    };
  }, [authorized, userId, token]);

  return (
    <WebSocketContext.Provider value={{ client, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
};
