import { AccessToken } from "livekit-server-sdk";

export async function handler(event) {
  try {
    const { room, name } = JSON.parse(event.body || "{}");

    if (!room || !name) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing room or name" }) };
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return { statusCode: 500, body: JSON.stringify({ error: "Missing LIVEKIT_API_KEY or LIVEKIT_API_SECRET" }) };
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: `${name}-${Math.random().toString(16).slice(2)}`,
      name,
    });

    at.addGrant({
      roomJoin: true,
      room,
      canPublish: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: String(e?.stack || e) }),
    };
  }
}