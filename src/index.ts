import 'dotenv/config'
import express from "express";
import { clerkMiddleware, clerkClient, requireAuth, getAuth } from '@clerk/express'
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 8000;

app.use(express.json());

// Clerk middleware should come before routes
app.use(clerkMiddleware());

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
  // Use `getAuth()` to get the user's `userId`
  const { userId } = getAuth(req);

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Use Clerk’s backend SDK to fetch the user
  const user = await clerkClient.users.getUser(userId);

  return res.json({ user });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
