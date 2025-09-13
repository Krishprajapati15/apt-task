const API_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
const API_URL = `${API_BASE_URL}/api`;

// Generic API request function
async function apiRequest(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;

  const config = {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  };

  try {
    console.log(`📡 API Request: ${config.method || "GET"} ${url}`);

    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      console.error(`❌ API Error (${response.status}):`, data);
      return {
        success: false,
        message: data.message || `HTTP ${response.status}`,
        status: response.status,
        errors: data.errors,
        data: null,
      };
    }

    console.log(`✅ API Success:`, data);
    return {
      success: true,
      message: data.message || "Success",
      data: data.data || data,
      pagination: data.pagination,
      status: response.status,
    };
  } catch (error) {
    console.error("❌ API Network Error:", error);
    return {
      success: false,
      message: "Network error. Please check your connection.",
      error: error.message,
      data: null,
    };
  }
}

// Order API functions
export async function getOrders(params = {}) {
  const searchParams = new URLSearchParams();

  // Add query parameters
  Object.keys(params).forEach((key) => {
    if (params[key] !== undefined && params[key] !== "") {
      searchParams.append(key, params[key]);
    }
  });

  const queryString = searchParams.toString();
  const endpoint = `/orders${queryString ? `?${queryString}` : ""}`;

  return apiRequest(endpoint);
}

export async function getOrder(id) {
  if (!id) {
    return {
      success: false,
      message: "Order ID is required",
      data: null,
    };
  }

  return apiRequest(`/orders/${id}`);
}

export async function createOrder(orderData) {
  if (!orderData.customer_name || !orderData.product_name) {
    return {
      success: false,
      message: "Customer name and product name are required",
      data: null,
    };
  }

  return apiRequest("/orders", {
    method: "POST",
    body: JSON.stringify(orderData),
  });
}

export async function updateOrder(id, updateData) {
  if (!id) {
    return {
      success: false,
      message: "Order ID is required",
      data: null,
    };
  }

  return apiRequest(`/orders/${id}`, {
    method: "PUT",
    body: JSON.stringify(updateData),
  });
}

export async function deleteOrder(id) {
  if (!id) {
    return {
      success: false,
      message: "Order ID is required",
      data: null,
    };
  }

  return apiRequest(`/orders/${id}`, {
    method: "DELETE",
  });
}

// Statistics API functions
export async function getOrderStats() {
  return apiRequest("/orders/stats/overview");
}

// Utility functions for filtering and searching
export function buildOrderFilters(filters = {}) {
  const params = {};

  if (filters.status && filters.status !== "all") {
    params.status = filters.status;
  }

  if (filters.customer && filters.customer.trim()) {
    params.customer = filters.customer.trim();
  }

  if (filters.page && filters.page > 1) {
    params.page = filters.page;
  }

  if (filters.limit && filters.limit !== 20) {
    params.limit = filters.limit;
  }

  if (filters.sort) {
    params.sort = filters.sort;
  }

  return params;
}

// Validation helpers
export function validateOrderData(orderData) {
  const errors = {};

  if (!orderData.customer_name || orderData.customer_name.trim().length < 2) {
    errors.customer_name = "Customer name must be at least 2 characters long";
  }

  if (!orderData.product_name || orderData.product_name.trim().length < 2) {
    errors.product_name = "Product name must be at least 2 characters long";
  }

  if (
    orderData.quantity &&
    (orderData.quantity < 1 || orderData.quantity > 1000)
  ) {
    errors.quantity = "Quantity must be between 1 and 1000";
  }

  if (orderData.price && orderData.price < 0) {
    errors.price = "Price cannot be negative";
  }

  if (orderData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(orderData.email)) {
    errors.email = "Please enter a valid email address";
  }

  if (orderData.notes && orderData.notes.length > 500) {
    errors.notes = "Notes cannot exceed 500 characters";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// Format helpers
export function formatOrderForDisplay(order) {
  return {
    ...order,
    created_at: new Date(order.created_at).toLocaleString(),
    updated_at: new Date(order.updated_at).toLocaleString(),
    price: order.price ? `$${parseFloat(order.price).toFixed(2)}` : "",
    quantity: order.quantity || 1,
    status_display:
      order.status.charAt(0).toUpperCase() + order.status.slice(1),
  };
}

export function getStatusColor(status) {
  const colors = {
    pending: "yellow",
    shipped: "blue",
    delivered: "green",
  };
  return colors[status] || "gray";
}

export function getStatusIcon(status) {
  const icons = {
    pending: "⏳",
    shipped: "🚚",
    delivered: "✅",
  };
  return icons[status] || "📦";
}

// Export/Import helpers
export function exportOrdersToCSV(orders) {
  const headers = [
    "Order ID",
    "Customer Name",
    "Product Name",
    "Status",
    "Quantity",
    "Price",
    "Email",
    "Notes",
    "Created At",
    "Updated At",
  ];

  const csvContent = [
    headers.join(","),
    ...orders.map((order) =>
      [
        order._id,
        `"${order.customer_name}"`,
        `"${order.product_name}"`,
        order.status,
        order.quantity || 1,
        order.price || "",
        order.email || "",
        `"${(order.notes || "").replace(/"/g, '""')}"`,
        new Date(order.created_at).toISOString(),
        new Date(order.updated_at).toISOString(),
      ].join(",")
    ),
  ].join("\n");

  // Create and download file
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `orders_${new Date().toISOString().split("T")[0]}.csv`
  );
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Health check function
export async function healthCheck() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    const data = await response.json();

    return {
      success: response.ok,
      data,
      status: response.status,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: "Cannot connect to server",
    };
  }
}

// Real-time connection test
export async function testRealtimeConnection() {
  try {
    const { io } = await import("socket.io-client");
    const socket = io(API_BASE_URL, {
      timeout: 5000,
      transports: ["websocket", "polling"],
    });

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        socket.disconnect();
        resolve({
          success: false,
          message: "Connection timeout",
        });
      }, 5000);

      socket.on("connect", () => {
        clearTimeout(timeout);
        socket.disconnect();
        resolve({
          success: true,
          message: "Real-time connection successful",
        });
      });

      socket.on("connect_error", (error) => {
        clearTimeout(timeout);
        socket.disconnect();
        resolve({
          success: false,
          message: `Connection error: ${error.message}`,
          error: error.message,
        });
      });
    });
  } catch (error) {
    return {
      success: false,
      message: "Failed to test real-time connection",
      error: error.message,
    };
  }
}

// Retry mechanism for failed requests
export async function retryApiRequest(requestFn, maxRetries = 3, delay = 1000) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await requestFn();
      if (result.success) {
        return result;
      }
      lastError = result;
    } catch (error) {
      lastError = {
        success: false,
        message: error.message,
        error: error,
      };
    }

    if (attempt < maxRetries) {
      console.log(`Retry attempt ${attempt}/${maxRetries} after ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }

  return (
    lastError || {
      success: false,
      message: "All retry attempts failed",
    }
  );
}

// Local storage helpers for offline support
export function saveOrderToLocalStorage(order) {
  try {
    const orders = getOrdersFromLocalStorage();
    const existingIndex = orders.findIndex((o) => o._id === order._id);

    if (existingIndex >= 0) {
      orders[existingIndex] = order;
    } else {
      orders.unshift(order);
    }

    localStorage.setItem("orders", JSON.stringify(orders));
    return true;
  } catch (error) {
    console.error("Error saving order to localStorage:", error);
    return false;
  }
}

export function getOrdersFromLocalStorage() {
  try {
    const orders = localStorage.getItem("orders");
    return orders ? JSON.parse(orders) : [];
  } catch (error) {
    console.error("Error reading orders from localStorage:", error);
    return [];
  }
}

export function removeOrderFromLocalStorage(orderId) {
  try {
    const orders = getOrdersFromLocalStorage();
    const filteredOrders = orders.filter((o) => o._id !== orderId);
    localStorage.setItem("orders", JSON.stringify(filteredOrders));
    return true;
  } catch (error) {
    console.error("Error removing order from localStorage:", error);
    return false;
  }
}

// Default export with all functions
export default {
  // Order operations
  getOrders,
  getOrder,
  createOrder,
  updateOrder,
  deleteOrder,

  // Statistics
  getOrderStats,

  // Utilities
  buildOrderFilters,
  validateOrderData,
  formatOrderForDisplay,
  getStatusColor,
  getStatusIcon,
  exportOrdersToCSV,

  // Health & Testing
  healthCheck,
  testRealtimeConnection,

  // Retry & Offline
  retryApiRequest,
  saveOrderToLocalStorage,
  getOrdersFromLocalStorage,
  removeOrderFromLocalStorage,
};
