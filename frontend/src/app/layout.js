import "./globals.css";

export const metadata = {
  title: "Real-time Order Management System",
  description:
    "A real-time order management system built with Next.js, Node.js, and MongoDB",
  keywords: "orders, real-time, management, mongodb, websocket",
  authors: [{ name: "Your Name" }],
  viewport: "width=device-width, initial-scale=1",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="true"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-inter antialiased bg-gray-50">
        <div id="root">{children}</div>

        <div
          id="toast-container"
          className="fixed top-4 right-4 z-50 space-y-2"
        ></div>

        <div
          id="loading-overlay"
          className="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
        >
          <div className="bg-white rounded-lg p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading...</p>
          </div>
        </div>
      </body>
    </html>
  );
}
