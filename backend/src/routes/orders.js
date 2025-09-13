const express = require("express");
const { body, param, query, validationResult } = require("express-validator");
const Order = require("../models/Order");

const router = express.Router();

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation errors",
      errors: errors.array(),
    });
  }
  next();
};

const orderValidationRules = () => {
  return [
    body("customer_name")
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage("Customer name must be between 2 and 100 characters")
      .notEmpty()
      .withMessage("Customer name is required"),

    body("product_name")
      .trim()
      .isLength({ min: 2, max: 200 })
      .withMessage("Product name must be between 2 and 200 characters")
      .notEmpty()
      .withMessage("Product name is required"),

    body("status")
      .optional()
      .isIn(["pending", "shipped", "delivered"])
      .withMessage("Status must be pending, shipped, or delivered"),

    body("quantity")
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage("Quantity must be between 1 and 1000"),

    body("price")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Price must be a positive number"),

    body("email")
      .optional()
      .isEmail()
      .withMessage("Please provide a valid email address"),

    body("notes")
      .optional()
      .isLength({ max: 500 })
      .withMessage("Notes cannot exceed 500 characters"),
  ];
};

const updateValidationRules = () => {
  return [
    body("customer_name")
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage("Customer name must be between 2 and 100 characters"),

    body("product_name")
      .optional()
      .trim()
      .isLength({ min: 2, max: 200 })
      .withMessage("Product name must be between 2 and 200 characters"),

    body("status")
      .optional()
      .isIn(["pending", "shipped", "delivered"])
      .withMessage("Status must be pending, shipped, or delivered"),

    body("quantity")
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage("Quantity must be between 1 and 1000"),

    body("price")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Price must be a positive number"),

    body("email")
      .optional()
      .isEmail()
      .withMessage("Please provide a valid email address"),

    body("notes")
      .optional()
      .isLength({ max: 500 })
      .withMessage("Notes cannot exceed 500 characters"),
  ];
};

const idValidationRules = () => {
  return [param("id").isMongoId().withMessage("Invalid order ID format")];
};

router.get(
  "/",
  [
    query("status")
      .optional()
      .isIn(["pending", "shipped", "delivered"])
      .withMessage("Invalid status filter"),
    query("customer")
      .optional()
      .trim()
      .isLength({ min: 1 })
      .withMessage("Customer filter cannot be empty"),
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        status,
        customer,
        page = 1,
        limit = 20,
        sort = "-created_at",
      } = req.query;

      let query = {};
      if (status) query.status = status;
      if (customer) query.customer_name = new RegExp(customer, "i");

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [orders, total] = await Promise.all([
        Order.find(query).sort(sort).limit(parseInt(limit)).skip(skip).lean(),
        Order.countDocuments(query),
      ]);

      const totalPages = Math.ceil(total / parseInt(limit));

      res.status(200).json({
        success: true,
        data: orders,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_orders: total,
          per_page: parseInt(limit),
          has_next: parseInt(page) < totalPages,
          has_prev: parseInt(page) > 1,
        },
      });
    } catch (error) {
      console.error("❌ Error fetching orders:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch orders",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

router.get(
  "/:id",
  idValidationRules(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const order = await Order.findById(req.params.id);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      res.status(200).json({
        success: true,
        data: order,
      });
    } catch (error) {
      console.error("❌ Error fetching order:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch order",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

router.post(
  "/",
  orderValidationRules(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const order = new Order(req.body);
      await order.save();

      console.log(`✅ New order created: ${order._id}`);

      res.status(201).json({
        success: true,
        message: "Order created successfully",
        data: order,
      });
    } catch (error) {
      console.error("❌ Error creating order:", error);

      if (error.name === "ValidationError") {
        const errors = Object.values(error.errors).map((err) => ({
          field: err.path,
          message: err.message,
        }));

        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors,
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to create order",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

router.put(
  "/:id",
  [...idValidationRules(), ...updateValidationRules()],
  handleValidationErrors,
  async (req, res) => {
    try {
      const order = await Order.findByIdAndUpdate(
        req.params.id,
        { ...req.body, updated_at: new Date() },
        {
          new: true,
          runValidators: true,
          context: "query",
        }
      );

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      console.log(`✅ Order updated: ${order._id}`);

      res.status(200).json({
        success: true,
        message: "Order updated successfully",
        data: order,
      });
    } catch (error) {
      console.error("❌ Error updating order:", error);

      if (error.name === "ValidationError") {
        const errors = Object.values(error.errors).map((err) => ({
          field: err.path,
          message: err.message,
        }));

        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors,
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to update order",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

router.delete(
  "/:id",
  idValidationRules(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const order = await Order.findByIdAndDelete(req.params.id);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      console.log(`🗑️ Order deleted: ${req.params.id}`);

      res.status(200).json({
        success: true,
        message: "Order deleted successfully",
        data: order,
      });
    } catch (error) {
      console.error("❌ Error deleting order:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete order",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

router.get("/stats/overview", async (req, res) => {
  try {
    const [totalOrders, statusCounts, recentOrders] = await Promise.all([
      Order.countDocuments(),
      Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Order.find().sort({ created_at: -1 }).limit(5).lean(),
    ]);

    const stats = {
      total_orders: totalOrders,
      status_breakdown: statusCounts.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      recent_orders: recentOrders,
    };

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("❌ Error fetching stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order statistics",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

module.exports = router;
