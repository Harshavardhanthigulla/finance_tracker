import express from "express";
import { PrismaClient } from "@prisma/client";
import { Webhook } from "svix";
import type { WebhookEvent } from "@clerk/express";

const prisma = new PrismaClient();
const router = express.Router();

// GET endpoint for testing webhook accessibility
router.get("/api/webhooks/clerk", (req, res) => {
  res.json({
    message: "✅ Clerk webhook endpoint is accessible",
    status: "ready",
    method: "POST only for actual webhooks"
  });
});

// Use raw body for signature verification
router.post(
  "/api/webhooks/clerk",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const payload = req.body;
    const headers = req.headers as Record<string, string>;

    console.log("🔗 Webhook request received");
    console.log("📋 Headers:", Object.keys(headers));
    console.log("📦 Payload size:", payload?.length || 0);

    const secret = process.env.CLERK_WEBHOOK_SECRET;
    if (!secret) {
      console.error("❌ Missing CLERK_WEBHOOK_SECRET in .env");
      return res.status(500).json({ error: "Missing webhook secret" });
    }

    console.log("🔐 Webhook secret found, verifying signature...");

    const wh = new Webhook(secret);

    try {
      // Verify signature and parse event
      const evt = wh.verify(payload, headers) as WebhookEvent;
      const { type, data } = evt;

      console.log(`✅ Clerk webhook received: ${type}`);
      console.log(`👤 User ID: ${data.id}`);

      if (type === "user.created") {
        // Extract data according to Clerk's actual webhook structure
        const { id, first_name, last_name, email_addresses, phone_numbers } = data;

        const primaryEmail = email_addresses?.find(email => email.email_address) || email_addresses?.[0];

        // Validate required fields for database
        const userEmail = primaryEmail?.email_address || `user_${id}@placeholder.com`;
        const userName = `${first_name || ''} ${last_name || ''}`.trim() || "Unnamed User";
        const userPhone = phone_numbers?.[0]?.phone_number || "";

        console.log(`📧 Email: ${userEmail}`);
        console.log(`📱 Phone: ${userPhone}`);
        console.log(`👨‍💼 Name: ${userName}`);

        try {
          await prisma.user.upsert({
            where: { clerkId: id },
            update: {
              name: userName,
              email: userEmail,
              phoneNumber: userPhone,
            },
            create: {
              clerkId: id,
              name: userName,
              email: userEmail,
              password: "clerk-managed", // Default password since Clerk handles auth
              phoneNumber: userPhone,
            },
          });

          console.log(`✅ User created/updated in DB: ${id} (${userEmail})`);
        } catch (dbError) {
          console.error(`❌ Database error for user ${id}:`, dbError);
          console.error(`❌ Email: ${userEmail}, Name: ${userName}`);
          throw dbError; // Re-throw to fail the webhook
        }
      }

      if (type === "user.deleted") {
        const { id } = data;
        await prisma.user.deleteMany({ where: { clerkId: id } });
        console.log(`🗑️ User deleted from DB: ${id}`);
      }

      return res.status(200).json({ message: "ok" });
    } catch (err) {
      console.error("❌ Webhook verification failed:", err);
      console.error("❌ Error details:", err instanceof Error ? err.message : err);

      // Provide more specific error messages
      if (err instanceof Error) {
        if (err.message.includes('signature')) {
          console.error("❌ Webhook signature verification failed - check CLERK_WEBHOOK_SECRET");
        } else if (err.message.includes('database') || err.message.includes('constraint')) {
          console.error("❌ Database constraint violation - check user data format");
        } else {
          console.error("❌ Unexpected webhook processing error");
        }
      }

      return res.status(400).json({
        error: "Webhook processing failed",
        details: err instanceof Error ? err.message : "Unknown error"
      });
    }
  }
);

export default router;
