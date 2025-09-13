"use client";

import { useState } from "react";
import { createOrder } from "../services/api";

export default function OrderForm({ onSubmit }) {
  const [formData, setFormData] = useState({
    customer_name: "",
    product_name: "",
    status: "pending",
    quantity: 1,
    price: "",
    email: "",
    notes: "",
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? parseFloat(value) || "" : value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.customer_name.trim()) {
      newErrors.customer_name = "Customer name is required";
    } else if (formData.customer_name.length < 2) {
      newErrors.customer_name = "Customer name must be at least 2 characters";
    } else if (formData.customer_name.length > 100) {
      newErrors.customer_name = "Customer name cannot exceed 100 characters";
    }

    if (!formData.product_name.trim()) {
      newErrors.product_name = "Product name is required";
    } else if (formData.product_name.length < 2) {
      newErrors.product_name = "Product name must be at least 2 characters";
    } else if (formData.product_name.length > 200) {
      newErrors.product_name = "Product name cannot exceed 200 characters";
    }

    // Quantity validation
    if (formData.quantity < 1) {
      newErrors.quantity = "Quantity must be at least 1";
    } else if (formData.quantity > 1000) {
      newErrors.quantity = "Quantity cannot exceed 1000";
    }

    // Price validation
    if (formData.price && formData.price < 0) {
      newErrors.price = "Price cannot be negative";
    }

    // Email validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Notes validation
    if (formData.notes && formData.notes.length > 500) {
      newErrors.notes = "Notes cannot exceed 500 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});
    setSuccessMessage("");

    try {
      // Clean the form data
      const cleanedData = {
        ...formData,
        customer_name: formData.customer_name.trim(),
        product_name: formData.product_name.trim(),
        email: formData.email.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        price: formData.price || undefined,
      };

      const response = await createOrder(cleanedData);

      if (response.success) {
        setSuccessMessage(
          "Order created successfully! You should see it appear in the list."
        );

        // Reset form
        setFormData({
          customer_name: "",
          product_name: "",
          status: "pending",
          quantity: 1,
          price: "",
          email: "",
          notes: "",
        });

        // Call parent callback
        if (onSubmit) {
          onSubmit(response.data);
        }

        // Auto-clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(""), 5000);
      } else {
        // Handle validation errors from server
        if (response.errors) {
          const serverErrors = {};
          response.errors.forEach((error) => {
            if (error.field) {
              serverErrors[error.field] = error.message;
            }
          });
          setErrors(serverErrors);
        } else {
          setErrors({ general: response.message || "Failed to create order" });
        }
      }
    } catch (error) {
      console.error("Error creating order:", error);
      setErrors({
        general:
          "Network error occurred. Please check your connection and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      customer_name: "",
      product_name: "",
      status: "pending",
      quantity: 1,
      price: "",
      email: "",
      notes: "",
    });
    setErrors({});
    setSuccessMessage("");
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return "⏳";
      case "shipped":
        return "🚚";
      case "delivered":
        return "✅";
      default:
        return "📦";
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 mb-8 text-white shadow-xl">
        <div className="flex items-center mb-4">
          <div className="bg-white/20 rounded-full p-3 mr-4">
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 2L3 7v11a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V7l-7-5z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-2">Create New Order</h1>
            <p className="text-blue-100 text-lg">
              Fill out the form below to create a new order with real-time
              updates
            </p>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-8 p-6 bg-green-50 border-l-4 border-green-400 rounded-r-xl shadow-lg animate-pulse">
          <div className="flex items-center">
            <div className="bg-green-100 rounded-full p-2 mr-4">
              <svg
                className="w-6 h-6 text-green-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-800">Success!</h3>
              <p className="text-green-700">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* General Error Message */}
      {errors.general && (
        <div className="mb-8 p-6 bg-red-50 border-l-4 border-red-400 rounded-r-xl shadow-lg">
          <div className="flex items-center">
            <div className="bg-red-100 rounded-full p-2 mr-4">
              <svg
                className="w-6 h-6 text-red-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-800">Error</h3>
              <p className="text-red-700">{errors.general}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Form */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Customer Information Section */}
            <div className="space-y-6">
              <div className="border-b border-gray-200 pb-4">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <span className="bg-blue-100 text-blue-600 rounded-full p-2 mr-3">
                    👤
                  </span>
                  Customer Information
                </h2>
              </div>

              {/* Customer Name */}
              <div className="space-y-2">
                <label
                  htmlFor="customer_name"
                  className="block text-sm font-medium text-gray-700"
                >
                  Customer Name *
                </label>
                <input
                  type="text"
                  id="customer_name"
                  name="customer_name"
                  value={formData.customer_name}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.customer_name
                      ? "border-red-300 bg-red-50 focus:ring-red-500"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                  placeholder="Enter customer full name"
                  maxLength="100"
                />
                {errors.customer_name && (
                  <p className="text-red-500 text-sm flex items-center">
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {errors.customer_name}
                  </p>
                )}
              </div>

              {/* Customer Email */}
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700"
                >
                  Customer Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-xl pl-11 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.email
                        ? "border-red-300 bg-red-50 focus:ring-red-500"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                    placeholder="customer@example.com"
                  />
                  <div className="absolute left-3 top-3.5">
                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                      />
                    </svg>
                  </div>
                </div>
                {errors.email && (
                  <p className="text-red-500 text-sm flex items-center">
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {errors.email}
                  </p>
                )}
                <p className="text-xs text-gray-500 flex items-center">
                  <span className="mr-1">📧</span>
                  Optional: Email notifications will be sent for status updates
                </p>
              </div>
            </div>

            {/* Product Information Section */}
            <div className="space-y-6">
              <div className="border-b border-gray-200 pb-4">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <span className="bg-purple-100 text-purple-600 rounded-full p-2 mr-3">
                    📦
                  </span>
                  Product Information
                </h2>
              </div>

              {/* Product Name */}
              <div className="space-y-2">
                <label
                  htmlFor="product_name"
                  className="block text-sm font-medium text-gray-700"
                >
                  Product Name *
                </label>
                <input
                  type="text"
                  id="product_name"
                  name="product_name"
                  value={formData.product_name}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.product_name
                      ? "border-red-300 bg-red-50 focus:ring-red-500"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                  placeholder="Enter product name"
                  maxLength="200"
                />
                {errors.product_name && (
                  <p className="text-red-500 text-sm flex items-center">
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {errors.product_name}
                  </p>
                )}
              </div>

              {/* Status and Quantity Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label
                    htmlFor="status"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 cursor-pointer hover:border-gray-400"
                  >
                    <option value="pending">
                      {getStatusIcon("pending")} Pending
                    </option>
                    <option value="shipped">
                      {getStatusIcon("shipped")} Shipped
                    </option>
                    <option value="delivered">
                      {getStatusIcon("delivered")} Delivered
                    </option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="quantity"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Quantity
                  </label>
                  <input
                    type="number"
                    id="quantity"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.quantity
                        ? "border-red-300 bg-red-50 focus:ring-red-500"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                    placeholder="1"
                    min="1"
                    max="1000"
                  />
                  {errors.quantity && (
                    <p className="text-red-500 text-sm flex items-center">
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {errors.quantity}
                    </p>
                  )}
                </div>
              </div>

              {/* Price */}
              <div className="space-y-2">
                <label
                  htmlFor="price"
                  className="block text-sm font-medium text-gray-700"
                >
                  Price
                </label>
                <div className="relative">
                  <input
                    type="number"
                    id="price"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-xl pl-11 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.price
                        ? "border-red-300 bg-red-50 focus:ring-red-500"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                  <div className="absolute left-3 top-3.5">
                    <span className="text-gray-500 font-medium">₹</span>
                  </div>
                </div>
                {errors.price && (
                  <p className="text-red-500 text-sm flex items-center">
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {errors.price}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Notes Section */}
          <div className="mt-8 space-y-2">
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-gray-700"
            >
              Additional Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 border rounded-xl resize-none transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.notes
                  ? "border-red-300 bg-red-50 focus:ring-red-500"
                  : "border-gray-300 hover:border-gray-400"
              }`}
              placeholder="Optional: Add any additional notes about the order..."
              maxLength="500"
              rows="4"
            />
            {errors.notes && (
              <p className="text-red-500 text-sm flex items-center">
                <svg
                  className="w-4 h-4 mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {errors.notes}
              </p>
            )}
            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-500">
                📝 Optional: Add special instructions, delivery preferences,
                etc.
              </p>
              <span
                className={`text-xs ${
                  formData.notes.length > 400 ? "text-red-500" : "text-gray-500"
                }`}
              >
                {formData.notes.length}/500
              </span>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center space-x-4">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                    Creating Order...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    Create Order
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleReset}
                disabled={loading}
                className="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Reset Form
              </button>
            </div>

            <div className="text-sm text-gray-500 text-center sm:text-right">
              <p>🚀 Orders are saved in real-time</p>
              <p>📱 All clients will see updates instantly</p>
            </div>
          </div>
        </form>
      </div>

      {/* Help Section */}
      <div className="mt-8 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-6 shadow-lg">
        <div className="flex items-start">
          <div className="bg-indigo-100 rounded-full p-3 mr-4 flex-shrink-0">
            <svg
              className="w-6 h-6 text-indigo-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-indigo-800 mb-3">
              💡 Pro Tips
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-indigo-700">
              <div className="flex items-center">
                <span className="w-2 h-2 bg-indigo-400 rounded-full mr-2"></span>
                Orders appear in real-time across all devices
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-indigo-400 rounded-full mr-2"></span>
                Email notifications for status changes
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-indigo-400 rounded-full mr-2"></span>
                Use quantity and price for better tracking
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-indigo-400 rounded-full mr-2"></span>
                Notes help with special instructions
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
