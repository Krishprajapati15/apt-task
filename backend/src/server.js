const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
require("dotenv").config();

const connectDB = require("./config/database");
const orderRoutes = require("./routes/orders");
const errorHandler = require("./middleware/errorHandler");
const WebSocketService = require("./services/websocketService");
const ChangeStreamService = require("./services/changeStreamService");

const app = express();
const server = http.createServer(app);

const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

const io = socketIo(server, {
  cors: corsOptions,
  transports: ["websocket", "polling"],
});

app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(cors(corsOptions));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

app.use("/api/orders", orderRoutes);

app.use(errorHandler);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  });
});

let webSocketService;
let changeStreamService;

const startServer = async () => {
  try {
    await connectDB();
    console.log("📦 Database connected successfully");

    webSocketService = new WebSocketService(io);
    console.log("🔌 WebSocket service initialized");

    if (process.env.NODE_ENV === "production") {
      changeStreamService = new ChangeStreamService(webSocketService);
      await changeStreamService.start();
      console.log("🔄 Change stream service started");
    } else {
      console.log("⚠️ Change stream service disabled in development");
    }

    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(
        `🌐 CORS enabled for: ${
          process.env.FRONTEND_URL || "http://localhost:3000"
        }`
      );
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

process.on("SIGINT", async () => {
  console.log("\n🔄 Graceful shutdown initiated...");

  if (changeStreamService) {
    await changeStreamService.stop();
    console.log("✅ Change stream service stopped");
  }

  if (webSocketService) {
    webSocketService.close();
    console.log("✅ WebSocket service closed");
  }

  server.close(() => {
    console.log("✅ HTTP server closed");
    process.exit(0);
  });
});

process.on("SIGTERM", async () => {
  console.log("🔄 SIGTERM received, shutting down gracefully...");

  if (changeStreamService) {
    await changeStreamService.stop();
  }

  if (webSocketService) {
    webSocketService.close();
  }

  server.close(() => {
    process.exit(0);
  });
});

process.on("uncaughtException", (error) => {
  console.error("💥 Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

startServer();
