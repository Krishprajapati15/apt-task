"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { io } from "socket.io-client";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export function useWebSocket({
  onOrderCreated,
  onOrderUpdated,
  onOrderDeleted,
  onStatsUpdate,
  onCustomMessage,
}) {
  const [connected, setConnected] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [error, setError] = useState(null);

  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const pingIntervalRef = useRef(null);

  // Initialize WebSocket connection
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    console.log("🔌 Connecting to WebSocket server...");

    const socket = io(BACKEND_URL, {
      transports: ["websocket", "polling"],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      maxReconnectionAttempts: 10,
    });

    socketRef.current = socket;

    // Connection established
    socket.on("connect", () => {
      console.log("✅ Connected to WebSocket server");
      setConnected(true);
      setReconnectAttempts(0);
      setError(null);
      setLastUpdate(new Date());

      // Start ping interval to maintain connection
      startPingInterval(socket);
    });

    // Connection acknowledgment
    socket.on("connection-ack", (data) => {
      console.log("🎉 Connection acknowledged:", data);
      setConnectionInfo(data);
    });

    // Disconnection
    socket.on("disconnect", (reason) => {
      console.log("❌ Disconnected from WebSocket server:", reason);
      setConnected(false);
      setConnectionInfo(null);
      clearPingInterval();

      if (reason !== "io client disconnect") {
        setError(`Connection lost: ${reason}`);
      }
    });

    // Reconnection attempt
    socket.on("reconnect_attempt", (attemptNumber) => {
      console.log(`🔄 Reconnection attempt ${attemptNumber}`);
      setReconnectAttempts(attemptNumber);
    });

    // Reconnection success
    socket.on("reconnect", (attemptNumber) => {
      console.log(`✅ Reconnected after ${attemptNumber} attempts`);
      setConnected(true);
      setReconnectAttempts(0);
      setError(null);
      setLastUpdate(new Date());
    });

    // Connection error
    socket.on("connect_error", (error) => {
      console.error("❌ Connection error:", error);
      setError(`Connection error: ${error.message}`);
    });

    // Order events
    socket.on("order-created", (payload) => {
      console.log("📦 Order created:", payload);
      setLastUpdate(new Date());
      if (onOrderCreated) {
        onOrderCreated(payload);
      }
    });

    socket.on("order-updated", (payload) => {
      console.log("📝 Order updated:", payload);
      setLastUpdate(new Date());
      if (onOrderUpdated) {
        onOrderUpdated(payload);
      }
    });

    socket.on("order-deleted", (payload) => {
      console.log("🗑️ Order deleted:", payload);
      setLastUpdate(new Date());
      if (onOrderDeleted) {
        onOrderDeleted(payload);
      }
    });

    // Statistics updates
    socket.on("order-stats", (stats) => {
      console.log("📊 Stats updated:", stats);
      setLastUpdate(new Date());
      if (onStatsUpdate) {
        onStatsUpdate(stats);
      }
    });

    // Client count updates
    socket.on("client-count-update", (data) => {
      console.log("👥 Client count updated:", data);
      setConnectionInfo((prev) => ({
        ...prev,
        connectedClients: data.connected_clients,
      }));
    });

    // Service notifications
    socket.on("service-error", (data) => {
      console.warn("⚠️ Service error:", data);
      setError(`Service ${data.service}: ${data.message}`);
    });

    // Order delivered special notification
    socket.on("order-delivered", (data) => {
      console.log("🎉 Order delivered:", data);
      if (onCustomMessage) {
        onCustomMessage("order-delivered", data);
      }
    });

    // Pong response
    socket.on("pong", (data) => {
      console.log("🏓 Pong received:", data);
    });

    // Generic error handler
    socket.on("error", (error) => {
      console.error("❌ Socket error:", error);
      setError(`Socket error: ${error}`);
    });

    return socket;
  }, [
    onOrderCreated,
    onOrderUpdated,
    onOrderDeleted,
    onStatsUpdate,
    onCustomMessage,
  ]);

  // Start ping interval to maintain connection
  const startPingInterval = (socket) => {
    clearPingInterval();

    pingIntervalRef.current = setInterval(() => {
      if (socket && socket.connected) {
        socket.emit("ping", (response) => {
          console.log("🏓 Ping response:", response);
        });
      }
    }, 30000); // Ping every 30 seconds
  };

  // Clear ping interval
  const clearPingInterval = () => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  };

  // Manual reconnect function
  const reconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    // Clear any existing reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    // Connect after a short delay
    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, 1000);
  }, [connect]);

  // Subscribe to specific order updates
  const subscribeToOrder = useCallback((orderId) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("subscribe-order", orderId);
    }
  }, []);

  // Unsubscribe from order updates
  const unsubscribeFromOrder = useCallback((orderId) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("unsubscribe-order", orderId);
    }
  }, []);

  // Request current stats
  const requestStats = useCallback(() => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("request-stats");
    }
  }, []);

  // Send custom message
  const sendMessage = useCallback((event, data) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  // Initialize connection on mount
  useEffect(() => {
    const socket = connect();

    return () => {
      console.log("🔌 Cleaning up WebSocket connection");

      clearPingInterval();

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
      }

      socketRef.current = null;
    };
  }, [connect]);

  // Visibility change handler - reconnect when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !connected) {
        console.log("👁️ Tab became visible, attempting to reconnect...");
        reconnect();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [connected, reconnect]);

  // Online/offline event handlers
  useEffect(() => {
    const handleOnline = () => {
      console.log("🌐 Network connection restored, attempting to reconnect...");
      if (!connected) {
        reconnect();
      }
    };

    const handleOffline = () => {
      console.log("🌐 Network connection lost");
      setError("Network connection lost");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [connected, reconnect]);

  // Heartbeat check - disconnect if no updates for too long
  useEffect(() => {
    if (!connected || !lastUpdate) return;

    const heartbeatTimeout = setTimeout(() => {
      const now = new Date();
      const timeSinceLastUpdate = now - new Date(lastUpdate);

      // If no updates for 5 minutes and we're supposed to be connected
      if (timeSinceLastUpdate > 5 * 60 * 1000) {
        console.warn(
          "⚠️ No updates received for 5 minutes, checking connection..."
        );

        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.emit("ping", (response) => {
            if (!response) {
              console.log("🔄 Ping failed, reconnecting...");
              reconnect();
            }
          });
        }
      }
    }, 5 * 60 * 1000 + 1000); // 5 minutes + 1 second

    return () => clearTimeout(heartbeatTimeout);
  }, [connected, lastUpdate, reconnect]);

  return {
    connected,
    connectionInfo,
    lastUpdate,
    reconnectAttempts,
    error,
    reconnect,
    subscribeToOrder,
    unsubscribeFromOrder,
    requestStats,
    sendMessage,
    socket: socketRef.current,
  };
}
