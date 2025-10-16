import 'dotenv/config';
import express from "express";
import { PrismaClient } from "@prisma/client";
import { clerkMiddleware, clerkClient, requireAuth, getAuth } from "@clerk/express";
import clerkWebhook from "./webhooks/clerkWebhook.js";

export const prisma = new PrismaClient();
const app = express();

app.use(express.json());

// Clerk middleware should come before routes
app.use(clerkMiddleware());

// Webhook route
app.use(clerkWebhook);

// Public route
app.get("/", (req, res) => {
  res.send("🚀 Finance Tracker API running!");
});

// Example: Prisma users
app.get("/users", async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});

// Protected route
app.get("/protected", requireAuth(), async (req, res) => {
  const { userId } = getAuth(req);

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const user = await clerkClient.users.getUser(userId);
  res.json({ user });
});

export default app;
