const mongoose = require("mongoose");
const Order = require("../models/Order");
const EmailService = require("./emailService");

class ChangeStreamService {
  constructor(webSocketService) {
    this.webSocketService = webSocketService;
    this.emailService = new EmailService();
    this.changeStream = null;
    this.isRunning = false;
    this.retryCount = 0;
    this.maxRetries = 5;
    this.retryDelay = 5000;
  }

  async start() {
    try {
      if (mongoose.connection.readyState !== 1) {
        console.log("⏳ Waiting for MongoDB connection...");
        await new Promise((resolve) => {
          mongoose.connection.once("connected", resolve);
        });
      }

      await this.startChangeStream();
      this.isRunning = true;
      console.log("🔄 Change stream service started successfully");
    } catch (error) {
      console.error("❌ Failed to start change stream service:", error);
      await this.handleError(error);
    }
  }

  async startChangeStream() {
    try {
      const options = {
        fullDocument: "updateLookup",
        fullDocumentBeforeChange: "whenAvailable",
      };

      this.changeStream = Order.collection.watch([], options);

      console.log("👁️ Watching for changes in orders collection...");

      this.changeStream.on("change", async (change) => {
        try {
          await this.handleChange(change);
        } catch (error) {
          console.error("❌ Error handling change event:", error);
        }
      });

      this.changeStream.on("error", async (error) => {
        console.error("❌ Change stream error:", error);
        await this.handleError(error);
      });

      this.changeStream.on("close", () => {
        console.log("📴 Change stream closed");
        this.isRunning = false;
      });

      this.retryCount = 0;
    } catch (error) {
      console.error("❌ Error creating change stream:", error);
      throw error;
    }
  }

  async handleChange(change) {
    const {
      operationType,
      fullDocument,
      fullDocumentBeforeChange,
      documentKey,
    } = change;

    console.log(
      `🔄 Change detected: ${operationType} on order ${documentKey._id}`
    );

    try {
      switch (operationType) {
        case "insert":
          await this.handleInsert(fullDocument);
          break;

        case "update":
          await this.handleUpdate(fullDocument, fullDocumentBeforeChange);
          break;

        case "delete":
          await this.handleDelete(documentKey, fullDocumentBeforeChange);
          break;

        case "replace":
          await this.handleReplace(fullDocument, fullDocumentBeforeChange);
          break;

        default:
          console.log(`ℹ️ Unhandled operation type: ${operationType}`);
      }

      await this.webSocketService.broadcastStats();
    } catch (error) {
      console.error(`❌ Error processing ${operationType} change:`, error);
    }
  }

  async handleInsert(document) {
    console.log(
      `✅ Order created: ${document._id} for ${document.customer_name}`
    );

    this.webSocketService.broadcastOrderCreated(document);

    if (document.email) {
      try {
        await this.emailService.sendOrderCreatedEmail(document);
      } catch (error) {
        console.error("❌ Failed to send order created email:", error);
      }
    }
  }

  async handleUpdate(document, previousDocument) {
    if (!document) {
      console.warn("⚠️ Update event received but no document provided");
      return;
    }

    console.log(
      `📝 Order updated: ${document._id} - Status: ${document.status}`
    );

    const statusChanged =
      previousDocument && previousDocument.status !== document.status;

    this.webSocketService.broadcastOrderUpdated(document, previousDocument);

    if (statusChanged && document.email) {
      try {
        await this.emailService.sendStatusChangeEmail(
          document,
          previousDocument.status,
          document.status
        );
      } catch (error) {
        console.error("❌ Failed to send status change email:", error);
      }
    }

    if (statusChanged) {
      console.log(
        `📊 Status changed: ${document._id} from '${previousDocument.status}' to '${document.status}'`
      );

      if (document.status === "delivered") {
        this.webSocketService.broadcastCustomMessage("order-delivered", {
          orderId: document._id,
          customer_name: document.customer_name,
          product_name: document.product_name,
        });
      }
    }
  }

  async handleDelete(documentKey, previousDocument) {
    const orderId = documentKey._id;
    console.log(`🗑️ Order deleted: ${orderId}`);

    const deletedOrderInfo = previousDocument || {
      _id: orderId,
      customer_name: "Unknown",
      product_name: "Unknown",
      status: "deleted",
    };

    this.webSocketService.broadcastOrderDeleted(deletedOrderInfo);

    if (previousDocument && previousDocument.email) {
      try {
        await this.emailService.sendOrderCancelledEmail(previousDocument);
      } catch (error) {
        console.error("❌ Failed to send order cancelled email:", error);
      }
    }
  }

  async handleReplace(document, previousDocument) {
    console.log(`🔄 Order replaced: ${document._id}`);

    await this.handleUpdate(document, previousDocument);
  }

  async handleError(error) {
    console.error("💥 Change stream error:", error.message);

    if (this.changeStream) {
      try {
        await this.changeStream.close();
      } catch (closeError) {
        console.error("❌ Error closing change stream:", closeError);
      }
      this.changeStream = null;
    }

    this.isRunning = false;

    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      const delay = this.retryDelay * Math.pow(2, this.retryCount - 1);

      console.log(
        `🔄 Retrying change stream in ${delay / 1000}s (attempt ${
          this.retryCount
        }/${this.maxRetries})`
      );

      setTimeout(async () => {
        try {
          await this.startChangeStream();
          this.isRunning = true;
          console.log("✅ Change stream reconnected successfully");
        } catch (retryError) {
          console.error("❌ Retry failed:", retryError);
          await this.handleError(retryError);
        }
      }, delay);
    } else {
      console.error(
        `💀 Max retries (${this.maxRetries}) exceeded. Change stream service stopped.`
      );

      this.webSocketService.broadcastCustomMessage("service-error", {
        service: "change-stream",
        status: "stopped",
        message: "Real-time updates temporarily unavailable",
      });
    }
  }

  async stop() {
    console.log("🛑 Stopping change stream service...");

    this.isRunning = false;

    if (this.changeStream) {
      try {
        await this.changeStream.close();
        console.log("✅ Change stream closed successfully");
      } catch (error) {
        console.error("❌ Error closing change stream:", error);
      }
      this.changeStream = null;
    }
  }

  getStatus() {
    return {
      is_running: this.isRunning,
      retry_count: this.retryCount,
      max_retries: this.maxRetries,
      has_change_stream: !!this.changeStream,
      mongodb_connection:
        mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    };
  }

  resetRetryCount() {
    this.retryCount = 0;
    console.log("🔄 Retry count reset to 0");
  }

  async restart() {
    console.log("🔄 Manually restarting change stream service...");
    await this.stop();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await this.start();
  }
}

module.exports = ChangeStreamService;
