import { bot } from "../src/telegram/bot";

// --- Serverless handler for Vercel ---
export default async function handler(req: any, res: any) {
  if (req.method === "POST") {
    await bot.handleUpdate(req.body);
    res.status(200).end("ok");
  } else {
    res.status(200).send("Telegram Bot is running.");
  }
}
