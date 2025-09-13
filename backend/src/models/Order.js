const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    customer_name: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true,
      minlength: [2, "Customer name must be at least 2 characters long"],
      maxlength: [100, "Customer name cannot exceed 100 characters"],
    },

    product_name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      minlength: [2, "Product name must be at least 2 characters long"],
      maxlength: [200, "Product name cannot exceed 200 characters"],
    },

    status: {
      type: String,
      required: [true, "Order status is required"],
      enum: {
        values: ["pending", "shipped", "delivered"],
        message: "Status must be either pending, shipped, or delivered",
      },
      default: "pending",
    },

    quantity: {
      type: Number,
      default: 1,
      min: [1, "Quantity must be at least 1"],
      max: [1000, "Quantity cannot exceed 1000"],
    },

    price: {
      type: Number,
      min: [0, "Price cannot be negative"],
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: function (v) {
          return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: "Please enter a valid email address",
      },
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes cannot exceed 500 characters"],
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

OrderSchema.index({ status: 1 });
OrderSchema.index({ customer_name: 1 });
OrderSchema.index({ created_at: -1 });
OrderSchema.index({ updated_at: -1 });

OrderSchema.virtual("age_in_days").get(function () {
  return Math.floor((Date.now() - this.created_at) / (1000 * 60 * 60 * 24));
});

OrderSchema.pre("save", function (next) {
  if (this.isNew) {
    console.log(`📝 Creating new order for ${this.customer_name}`);
  } else if (this.isModified()) {
    console.log(`📝 Updating order ${this._id} for ${this.customer_name}`);
  }
  next();
});

OrderSchema.statics.findByStatus = function (status) {
  return this.find({ status });
};

OrderSchema.statics.findByCustomer = function (customerName) {
  return this.find({
    customer_name: new RegExp(customerName, "i"),
  });
};

OrderSchema.methods.updateStatus = function (newStatus) {
  this.status = newStatus;
  return this.save();
};

OrderSchema.methods.isDelivered = function () {
  return this.status === "delivered";
};

OrderSchema.methods.isPending = function () {
  return this.status === "pending";
};

OrderSchema.methods.isShipped = function () {
  return this.status === "shipped";
};

const Order = mongoose.model("Order", OrderSchema);

module.exports = Order;
