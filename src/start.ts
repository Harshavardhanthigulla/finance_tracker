import localtunnel from "localtunnel";
import app from "./index.js";

const PORT = Number(process.env.PORT) || 8000;

const getSubdomain = (): string => {
  const subdomain = process.env.TUNNEL_SUBDOMAIN;
  if (subdomain) {
    console.log(`🎯 Using custom subdomain: ${subdomain}`);
    return subdomain;
  }

  // Generate a more stable subdomain based on project name
  const stableSubdomain = "finance-tracker-" + Date.now().toString().slice(-6);
  console.log(`🔄 Using generated subdomain: ${stableSubdomain}`);
  return stableSubdomain;
};

const startServer = async (): Promise<void> => {
  console.log(`✅ Local server running at http://localhost:${PORT}`);

  try {
    const tunnel = await localtunnel({
      port: PORT,
      subdomain: getSubdomain()
    });

    console.log(`🌍 Public URL: ${tunnel.url}`);
    console.log(`🔗 Webhook URL: ${tunnel.url}/api/webhooks/clerk`);
    console.log(`📝 Configure this URL in your Clerk webhook settings`);
    console.log(`🔧 Tunnel is ready!`);

    tunnel.on('close', () => {
      console.log('🚪 Tunnel closed');
    });

    tunnel.on('error', (err: Error) => {
      console.error('❌ Tunnel error:', err);
    });

  } catch (err) {
    console.error("❌ Failed to create tunnel:", err);
    console.log("💡 Make sure you have a stable internet connection");
  }
};

app.listen(PORT, startServer);
