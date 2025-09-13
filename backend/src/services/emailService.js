const nodemailer = require("nodemailer");

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.initializeTransporter();
  }

  initializeTransporter() {
    try {
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn(
          "⚠️ Email service not configured - missing EMAIL_USER or EMAIL_PASS"
        );
        return;
      }

      // Enhanced configuration with more options
      this.transporter = nodemailer.createTransporter({
        host: process.env.EMAIL_HOST || "smtp.gmail.com",
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        // Additional options that might help
        tls: {
          ciphers: "SSLv3",
          rejectUnauthorized: false,
        },
        // Enable debugging
        debug: process.env.NODE_ENV === "development",
        logger: process.env.NODE_ENV === "development",
      });

      // Make verification async and add better error handling
      this.verifyConnection();
    } catch (error) {
      console.error(
        "❌ Failed to initialize email transporter:",
        error.message
      );
      console.error("Full error:", error);
    }
  }

  async verifyConnection() {
    if (!this.transporter) {
      console.error("❌ No transporter available for verification");
      return;
    }

    try {
      console.log("🔄 Verifying email connection...");
      await this.transporter.verify();
      this.isConfigured = true;
      console.log("✅ Email service configured and verified successfully");

      // Log configuration (without sensitive data)
      console.log("📧 Email config:", {
        host: process.env.EMAIL_HOST || "smtp.gmail.com",
        port: parseInt(process.env.EMAIL_PORT) || 587,
        user: process.env.EMAIL_USER
          ? process.env.EMAIL_USER.replace(/(.{2}).*(@.*)/, "$1***$2")
          : "Not set",
        hasPassword: !!process.env.EMAIL_PASS,
      });
    } catch (error) {
      console.error("❌ Email transporter verification failed:");
      console.error("Error message:", error.message);
      console.error("Error code:", error.code);
      console.error("Full error:", error);
      this.isConfigured = false;

      // Provide specific troubleshooting hints
      this.provideTroubleshootingHints(error);
    }
  }

  provideTroubleshootingHints(error) {
    console.log("\n🔧 TROUBLESHOOTING HINTS:");

    if (error.code === "EAUTH") {
      console.log("- Authentication failed. Check your email/password");
      console.log("- For Gmail: Use App Password instead of regular password");
      console.log(
        "- Enable 2FA and generate App Password at: https://myaccount.google.com/apppasswords"
      );
    }

    if (error.code === "ECONNECTION" || error.code === "ETIMEDOUT") {
      console.log("- Connection failed. Check your internet connection");
      console.log("- Verify SMTP host and port settings");
      console.log("- Check if firewall is blocking the connection");
    }

    if (error.message.includes("self signed certificate")) {
      console.log(
        "- SSL certificate issue. Try adding tls.rejectUnauthorized: false"
      );
    }

    console.log("- Double-check all environment variables are set correctly");
    console.log("- Test with a simple email client first\n");
  }

  async sendEmail(to, subject, html, text = null) {
    if (!this.isConfigured) {
      const errorMsg = "⚠️ Email service not configured, skipping email send";
      console.warn(errorMsg);
      console.log("Current email service status:", this.getStatus());
      return { success: false, message: "Email service not configured" };
    }

    const recipient = process.env.EMAIL_TO || to;

    // Log what we're trying to send (without sensitive data)
    console.log("📤 Attempting to send email:", {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: recipient,
      subject: subject,
      hasHtml: !!html,
      hasText: !!text,
    });

    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: recipient,
        subject,
        html,
        text: text || this.stripHtmlTags(html),
      };

      // Add more detailed logging
      console.log("🔄 Sending email with options:", {
        ...mailOptions,
        html: html ? `HTML content (${html.length} chars)` : "No HTML",
        text: mailOptions.text
          ? `Text content (${mailOptions.text.length} chars)`
          : "No text",
      });

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`📧 Email sent successfully to ${recipient}`);
      console.log("Message ID:", info.messageId);
      console.log("Response:", info.response);
      console.log("Envelope:", info.envelope);

      return {
        success: true,
        messageId: info.messageId,
        response: info.response,
        envelope: info.envelope,
      };
    } catch (error) {
      console.error(`❌ Failed to send email to ${recipient}:`);
      console.error("Error message:", error.message);
      console.error("Error code:", error.code);
      console.error("Full error:", error);

      // Provide specific error guidance
      this.handleSendError(error);

      return {
        success: false,
        error: error.message,
        code: error.code,
      };
    }
  }

  handleSendError(error) {
    console.log("\n🔧 EMAIL SEND ERROR ANALYSIS:");

    if (error.code === "EAUTH") {
      console.log("- Authentication error during send");
      console.log("- Your credentials might have expired or been rejected");
    }

    if (error.responseCode === 550) {
      console.log("- Mailbox unavailable or recipient doesn't exist");
      console.log("- Check the recipient email address");
    }

    if (error.responseCode === 535) {
      console.log("- Authentication credentials rejected");
      console.log("- Verify your EMAIL_USER and EMAIL_PASS");
    }

    if (error.message.includes("Daily sending quota exceeded")) {
      console.log("- You've exceeded your daily sending limit");
      console.log("- Wait 24 hours or upgrade your email service plan");
    }

    console.log("- Check spam folder of recipient");
    console.log("- Verify sender email is not blacklisted\n");
  }

  // Add a comprehensive test method
  async runDiagnostics() {
    console.log("🔍 Running Email Service Diagnostics...\n");

    // 1. Check environment variables
    console.log("1. Environment Variables:");
    console.log(
      "   EMAIL_USER:",
      process.env.EMAIL_USER ? "✅ Set" : "❌ Missing"
    );
    console.log(
      "   EMAIL_PASS:",
      process.env.EMAIL_PASS ? "✅ Set" : "❌ Missing"
    );
    console.log(
      "   EMAIL_HOST:",
      process.env.EMAIL_HOST || "Default (smtp.gmail.com)"
    );
    console.log("   EMAIL_PORT:", process.env.EMAIL_PORT || "Default (587)");
    console.log(
      "   EMAIL_FROM:",
      process.env.EMAIL_FROM || "Will use EMAIL_USER"
    );
    console.log(
      "   EMAIL_TO:",
      process.env.EMAIL_TO ? "✅ Set" : "Will use recipient parameter"
    );

    // 2. Check transporter
    console.log("\n2. Transporter Status:");
    console.log(
      "   Transporter exists:",
      this.transporter ? "✅ Yes" : "❌ No"
    );
    console.log("   Is configured:", this.isConfigured ? "✅ Yes" : "❌ No");

    // 3. Test connection
    console.log("\n3. Testing Connection:");
    if (this.transporter) {
      try {
        await this.transporter.verify();
        console.log("   Connection test: ✅ Success");
      } catch (error) {
        console.log("   Connection test: ❌ Failed");
        console.log("   Error:", error.message);
      }
    } else {
      console.log("   Connection test: ❌ Cannot test (no transporter)");
    }

    console.log("\n" + "=".repeat(50));
    return this.getStatus();
  }

  async sendTestEmail(to) {
    console.log(`🧪 Sending test email to: ${to}`);

    const subject = "Test Email - Real-time Order System";
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Test Email</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; padding: 20px; }
            .container { max-width: 500px; margin: 0 auto; background: #f8f9fa; padding: 30px; border-radius: 8px; }
            .header { text-align: center; color: #007bff; }
            .info { background: #e9ecef; padding: 15px; border-radius: 5px; margin: 15px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>✅ Email Service Test</h1>
                <p>This is a test email from the Real-time Order Management System.</p>
                <p>If you received this, the email service is working correctly!</p>
            </div>
            <div class="info">
                <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
                <p><strong>From:</strong> ${
                  process.env.EMAIL_FROM || process.env.EMAIL_USER
                }</p>
                <p><strong>Test ID:</strong> ${Math.random()
                  .toString(36)
                  .substr(2, 9)}</p>
            </div>
            <p><strong>Next Steps:</strong></p>
            <ul>
                <li>Check your spam/junk folder if you don't see this email</li>
                <li>Add the sender to your contacts</li>
                <li>Reply to confirm receipt</li>
            </ul>
        </div>
    </body>
    </html>
    `;

    const result = await this.sendEmail(to, subject, html);

    if (result.success) {
      console.log("✅ Test email sent successfully!");
      console.log("📝 Instructions:");
      console.log("   1. Check your inbox (and spam folder)");
      console.log("   2. Look for email with subject:", subject);
      console.log(
        "   3. If not received, run diagnostics: emailService.runDiagnostics()"
      );
    } else {
      console.log("❌ Test email failed!");
      console.log(
        "🔧 Run diagnostics for troubleshooting: emailService.runDiagnostics()"
      );
    }

    return result;
  }

  // Rest of your existing methods remain the same...
  async sendOrderCreatedEmail(order) {
    const subject = `Order Confirmation - ${order.product_name}`;
    const html = this.getOrderCreatedEmailTemplate(order);
    return await this.sendEmail(order.email, subject, html);
  }

  async sendStatusChangeEmail(order, oldStatus, newStatus) {
    const subject = `Order Update - ${order.product_name} is now ${newStatus}`;
    const html = this.getStatusChangeEmailTemplate(order, oldStatus, newStatus);
    return await this.sendEmail(order.email, subject, html);
  }

  async sendOrderCancelledEmail(order) {
    const subject = `Order Cancelled - ${order.product_name}`;
    const html = this.getOrderCancelledEmailTemplate(order);
    return await this.sendEmail(order.email, subject, html);
  }

  getStatus() {
    return {
      configured: this.isConfigured,
      transporter_ready: !!this.transporter,
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: process.env.EMAIL_PORT || 587,
      user: process.env.EMAIL_USER
        ? process.env.EMAIL_USER.replace(/(.{2}).*(@.*)/, "$1***$2")
        : "Not configured",
      hasPassword: !!process.env.EMAIL_PASS,
      emailFrom: process.env.EMAIL_FROM || process.env.EMAIL_USER || "Not set",
      emailTo: process.env.EMAIL_TO
        ? "Override set"
        : "Will use recipient parameter",
    };
  }

  // Keep all your existing template methods...
  getOrderCreatedEmailTemplate(order) {
    // Your existing implementation
    return `<!-- Your existing template code -->`;
  }

  getStatusChangeEmailTemplate(order, oldStatus, newStatus) {
    // Your existing implementation
    return `<!-- Your existing template code -->`;
  }

  getOrderCancelledEmailTemplate(order) {
    // Your existing implementation
    return `<!-- Your existing template code -->`;
  }

  getStatusSpecificMessage(status) {
    // Your existing implementation
    const messages = {
      pending: `<div>Pending message</div>`,
      shipped: `<div>Shipped message</div>`,
      delivered: `<div>Delivered message</div>`,
    };
    return messages[status] || "";
  }

  stripHtmlTags(html) {
    return html
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }
}

module.exports = EmailService;
