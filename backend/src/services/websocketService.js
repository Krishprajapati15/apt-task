class WebSocketService {
  constructor(io) {
    this.io = io;
    this.connectedClients = new Map();
    this.setupConnectionHandlers();
  }

  setupConnectionHandlers() {
    this.io.on("connection", (socket) => {
      const clientId = socket.id;
      const clientInfo = {
        id: clientId,
        connectedAt: new Date(),
        lastActivity: new Date(),
        userAgent: socket.handshake.headers["user-agent"],
        ip: socket.handshake.address,
      };

      this.connectedClients.set(clientId, clientInfo);

      console.log(
        `🔌 Client connected: ${clientId} (Total: ${this.connectedClients.size})`
      );

      socket.emit("connection-ack", {
        clientId,
        connectedAt: clientInfo.connectedAt,
        message: "Connected successfully to real-time order updates",
      });

      this.sendStatsToClient(socket);

      this.setupClientEventHandlers(socket);
      socket.on("disconnect", (reason) => {
        this.connectedClients.delete(clientId);
        console.log(
          `🔌 Client disconnected: ${clientId} - Reason: ${reason} (Total: ${this.connectedClients.size})`
        );

        this.broadcastClientCount();
      });

      socket.on("error", (error) => {
        console.error(`❌ Socket error for client ${clientId}:`, error);
      });

      this.broadcastClientCount();
    });
  }

  setupClientEventHandlers(socket) {
    socket.on("ping", (callback) => {
      const clientId = socket.id;
      const clientInfo = this.connectedClients.get(clientId);

      if (clientInfo) {
        clientInfo.lastActivity = new Date();
        this.connectedClients.set(clientId, clientInfo);
      }

      if (typeof callback === "function") {
        callback({
          pong: true,
          timestamp: new Date(),
          clientId: socket.id,
        });
      }
    });

    socket.on("request-stats", () => {
      this.sendStatsToClient(socket);
    });

    socket.on("subscribe-order", (orderId) => {
      if (orderId) {
        socket.join(`order-${orderId}`);
        socket.emit("subscription-ack", { orderId, subscribed: true });
        console.log(`📧 Client ${socket.id} subscribed to order ${orderId}`);
      }
    });

    socket.on("unsubscribe-order", (orderId) => {
      if (orderId) {
        socket.leave(`order-${orderId}`);
        socket.emit("subscription-ack", { orderId, subscribed: false });
        console.log(
          `📧 Client ${socket.id} unsubscribed from order ${orderId}`
        );
      }
    });

    socket.on("connection-info", (callback) => {
      const clientInfo = this.connectedClients.get(socket.id);
      if (typeof callback === "function") {
        callback({
          ...clientInfo,
          connectedClients: this.connectedClients.size,
        });
      }
    });
  }

  async sendStatsToClient(socket) {
    try {
      const Order = require("../models/Order");

      const [totalOrders, statusCounts] = await Promise.all([
        Order.countDocuments(),
        Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      ]);

      const stats = {
        total_orders: totalOrders,
        status_breakdown: statusCounts.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        timestamp: new Date(),
      };

      socket.emit("order-stats", stats);
    } catch (error) {
      console.error("❌ Error sending stats to client:", error);
    }
  }

  broadcastOrderCreated(order) {
    const payload = {
      type: "order-created",
      data: order,
      timestamp: new Date(),
    };

    this.io.emit("order-created", payload);
    console.log(
      `📢 Broadcasted order created: ${order._id} to ${this.connectedClients.size} clients`
    );

    this.io.to(`order-${order._id}`).emit("order-update", {
      ...payload,
      type: "order-created",
    });
  }

  broadcastOrderUpdated(order, previousData = null) {
    const payload = {
      type: "order-updated",
      data: order,
      previous_data: previousData,
      timestamp: new Date(),
    };

    this.io.emit("order-updated", payload);
    console.log(
      `📢 Broadcasted order updated: ${order._id} to ${this.connectedClients.size} clients`
    );

    this.io.to(`order-${order._id}`).emit("order-update", {
      ...payload,
      type: "order-updated",
    });
  }

  broadcastOrderDeleted(order) {
    const payload = {
      type: "order-deleted",
      data: order,
      timestamp: new Date(),
    };

    this.io.emit("order-deleted", payload);
    console.log(
      `📢 Broadcasted order deleted: ${order._id} to ${this.connectedClients.size} clients`
    );

    this.io.to(`order-${order._id}`).emit("order-update", {
      ...payload,
      type: "order-deleted",
    });
  }

  async broadcastStats() {
    try {
      const Order = require("../models/Order");

      const [totalOrders, statusCounts] = await Promise.all([
        Order.countDocuments(),
        Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      ]);

      const stats = {
        total_orders: totalOrders,
        status_breakdown: statusCounts.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        timestamp: new Date(),
      };

      this.io.emit("order-stats", stats);
      console.log(
        `📊 Broadcasted stats to ${this.connectedClients.size} clients`
      );
    } catch (error) {
      console.error("❌ Error broadcasting stats:", error);
    }
  }

  broadcastClientCount() {
    const payload = {
      connected_clients: this.connectedClients.size,
      timestamp: new Date(),
    };

    this.io.emit("client-count-update", payload);
  }

  getConnectionStats() {
    const now = new Date();
    const connections = Array.from(this.connectedClients.values());

    return {
      total_connections: connections.length,
      connections_by_time: connections.reduce((acc, client) => {
        const minutesConnected = Math.floor(
          (now - client.connectedAt) / (1000 * 60)
        );
        const bucket =
          minutesConnected < 5
            ? "< 5min"
            : minutesConnected < 30
            ? "5-30min"
            : minutesConnected < 60
            ? "30-60min"
            : "> 1hr";
        acc[bucket] = (acc[bucket] || 0) + 1;
        return acc;
      }, {}),
      active_connections: connections.filter(
        (client) => now - client.lastActivity < 300000
      ).length,
    };
  }

  broadcastCustomMessage(event, data) {
    this.io.emit(event, {
      ...data,
      timestamp: new Date(),
    });
    console.log(
      `📢 Broadcasted custom event '${event}' to ${this.connectedClients.size} clients`
    );
  }

  sendToClient(clientId, event, data) {
    const socket = this.io.sockets.sockets.get(clientId);
    if (socket) {
      socket.emit(event, {
        ...data,
        timestamp: new Date(),
      });
      console.log(`📤 Sent '${event}' to client ${clientId}`);
      return true;
    }
    return false;
  }

  close() {
    this.io.close();
    this.connectedClients.clear();
    console.log("✅ WebSocket service closed");
  }

  isHealthy() {
    return {
      status: "healthy",
      connected_clients: this.connectedClients.size,
      uptime: process.uptime(),
      memory_usage: process.memoryUsage(),
    };
  }
}

module.exports = WebSocketService;
