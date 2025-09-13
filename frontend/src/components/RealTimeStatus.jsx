"use client";

import { useState, useEffect } from "react";

export default function RealTimeStatus({
  connected,
  lastUpdate,
  reconnectAttempts = 0,
  connectionInfo = null,
  onReconnect,
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [pulse, setPulse] = useState(false);

  // Pulse effect when connection status changes
  useEffect(() => {
    setPulse(true);
    const timer = setTimeout(() => setPulse(false), 600);
    return () => clearTimeout(timer);
  }, [connected]);

  const getStatusConfig = () => {
    if (connected) {
      return {
        text: "Connected",
        color: "text-green-700",
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
        dotColor: "bg-green-500",
        icon: (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        ),
      };
    } else if (reconnectAttempts > 0) {
      return {
        text: `Reconnecting...`,
        subtitle: `Attempt ${reconnectAttempts}`,
        color: "text-amber-700",
        bgColor: "bg-amber-50",
        borderColor: "border-amber-200",
        dotColor: "bg-amber-500",
        icon: (
          <svg
            className="w-3 h-3 animate-spin"
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
        ),
      };
    } else {
      return {
        text: "Disconnected",
        color: "text-red-700",
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
        dotColor: "bg-red-500",
        icon: (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        ),
      };
    }
  };

  const formatLastUpdate = () => {
    if (!lastUpdate) return "Never";

    const now = new Date();
    const diff = now - new Date(lastUpdate);

    if (diff < 10000) return "Just now";
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes}m ago`;
    }
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours}h ago`;
    }
    return new Date(lastUpdate).toLocaleDateString();
  };

  const formatConnectionDuration = () => {
    if (!connectionInfo?.connectedAt) return null;

    const duration = Date.now() - new Date(connectionInfo.connectedAt);
    const minutes = Math.floor(duration / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m`;
    return "< 1m";
  };

  const statusConfig = getStatusConfig();

  return (
    <div className="relative">
      {/* Main Status Indicator */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`inline-flex items-center px-3 py-2 rounded-lg border transition-all duration-200 hover:shadow-sm ${
          statusConfig.bgColor
        } ${statusConfig.borderColor} ${statusConfig.color} ${
          pulse ? "scale-105" : ""
        } group`}
        aria-label="Connection status"
        aria-expanded={showDetails}
      >
        {/* Connection Dot */}
        <div className="relative mr-2">
          <div
            className={`w-2.5 h-2.5 rounded-full ${statusConfig.dotColor} ${
              connected ? "animate-pulse" : ""
            }`}
          ></div>
          {connected && (
            <div
              className={`absolute inset-0 w-2.5 h-2.5 rounded-full ${statusConfig.dotColor} opacity-75 animate-ping`}
            ></div>
          )}
        </div>

        {/* Status Text */}
        <div className="text-left min-w-0">
          <div className="text-sm font-medium">{statusConfig.text}</div>
          {statusConfig.subtitle && (
            <div className="text-xs opacity-75">{statusConfig.subtitle}</div>
          )}
        </div>

        {/* Chevron */}
        <svg
          className={`ml-2 w-4 h-4 transition-transform duration-200 ${
            showDetails ? "rotate-180" : ""
          } group-hover:scale-110`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Detailed Status Panel */}
      {showDetails && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black bg-opacity-10"
            onClick={() => setShowDetails(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 mt-3 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
            {/* Header */}
            <div
              className={`px-6 py-4 border-b border-gray-100 ${statusConfig.bgColor}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div
                      className={`w-4 h-4 rounded-full ${
                        statusConfig.dotColor
                      } ${connected ? "animate-pulse" : ""}`}
                    ></div>
                    {connected && (
                      <div
                        className={`absolute inset-0 w-4 h-4 rounded-full ${statusConfig.dotColor} opacity-50 animate-ping`}
                      ></div>
                    )}
                  </div>
                  <div>
                    <h3
                      className={`text-lg font-semibold ${statusConfig.color}`}
                    >
                      {statusConfig.text}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Real-time connection status
                    </p>
                  </div>
                </div>
                {statusConfig.icon}
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Connection Details */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  Connection Details
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">
                        Status
                      </p>
                      <div className="flex items-center mt-1">
                        {statusConfig.icon}
                        <span
                          className={`ml-2 text-sm font-medium ${statusConfig.color}`}
                        >
                          {statusConfig.text}
                        </span>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">
                        Last Update
                      </p>
                      <p className="text-sm font-medium text-gray-900 mt-1">
                        {formatLastUpdate()}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {reconnectAttempts > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">
                          Attempts
                        </p>
                        <p className="text-sm font-medium text-amber-600 mt-1">
                          {reconnectAttempts}
                        </p>
                      </div>
                    )}

                    {connected && connectionInfo?.connectedAt && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">
                          Uptime
                        </p>
                        <p className="text-sm font-medium text-green-600 mt-1">
                          {formatConnectionDuration()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional Connection Info */}
                {connectionInfo && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {connectionInfo.clientId && (
                        <div>
                          <span className="text-gray-500">Client ID:</span>
                          <span className="ml-2 font-mono text-gray-900">
                            ...{connectionInfo.clientId.slice(-8)}
                          </span>
                        </div>
                      )}
                      {connectionInfo.connectedClients && (
                        <div>
                          <span className="text-gray-500">Active Clients:</span>
                          <span className="ml-2 font-semibold text-blue-600">
                            {connectionInfo.connectedClients}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Status Message */}
              <div>
                <div
                  className={`p-4 rounded-lg border-l-4 ${
                    connected
                      ? "bg-green-50 border-green-400 text-green-800"
                      : reconnectAttempts > 0
                      ? "bg-amber-50 border-amber-400 text-amber-800"
                      : "bg-red-50 border-red-400 text-red-800"
                  }`}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mr-3 mt-0.5">
                      {statusConfig.icon}
                    </div>
                    <div className="text-sm">
                      {connected && (
                        <div>
                          <p className="font-medium">All systems operational</p>
                          <p className="mt-1 opacity-90">
                            You're receiving real-time updates. Changes will
                            appear instantly.
                          </p>
                        </div>
                      )}
                      {!connected && reconnectAttempts > 0 && (
                        <div>
                          <p className="font-medium">Reconnecting to server</p>
                          <p className="mt-1 opacity-90">
                            We're working to restore your connection. Please
                            wait...
                          </p>
                        </div>
                      )}
                      {!connected && reconnectAttempts === 0 && (
                        <div>
                          <p className="font-medium">Connection interrupted</p>
                          <p className="mt-1 opacity-90">
                            Real-time updates are paused. You may need to
                            refresh to see latest changes.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Real-time Features */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  Real-time Features
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Order Updates", icon: "📦" },
                    { label: "Status Changes", icon: "🔄" },
                    { label: "Live Statistics", icon: "📊" },
                    { label: "Notifications", icon: "🔔" },
                  ].map((feature, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                          connected
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {feature.icon}
                      </div>
                      <span
                        className={`text-sm ${
                          connected ? "text-gray-900" : "text-gray-500"
                        }`}
                      >
                        {feature.label}
                      </span>
                      {connected && (
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-3">
                {!connected && (
                  <>
                    {onReconnect && (
                      <button
                        onClick={() => {
                          onReconnect();
                          setShowDetails(false);
                        }}
                        className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <svg
                          className="w-4 h-4 mr-2"
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
                        Reconnect
                      </button>
                    )}
                    <button
                      onClick={() => {
                        window.location.reload();
                      }}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <svg
                        className="w-4 h-4 mr-2"
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
                      Refresh Page
                    </button>
                  </>
                )}

                {connected && (
                  <button
                    onClick={() => setShowDetails(false)}
                    className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-green-100 text-green-700 text-sm font-medium rounded-lg hover:bg-green-200 transition-colors"
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    All Good
                  </button>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
              <p className="text-xs text-gray-500 text-center">
                {connected
                  ? "🟢 Connected and monitoring in real-time"
                  : "🔴 Offline mode - Manual refresh required"}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
