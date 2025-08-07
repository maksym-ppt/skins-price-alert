import { Telegraf } from "telegraf";
import { getSteamPrice } from "../src/steam";

const bot = new Telegraf(process.env.BOT_TOKEN!);

bot.on("text", async (ctx) => {
  const itemName = ctx.message.text.trim();
  if (!itemName) {
    await ctx.reply("Send the Steam Market item name to check its price.");
    return;
  }
  const reply = await getSteamPrice(itemName);
  await ctx.reply(reply);
});

// --- Serverless handler for Vercel ---
export default async function handler(req: any, res: any) {
  if (req.method === "POST") {
    await bot.handleUpdate(req.body);
    res.status(200).end("ok");
  } else {
    res.status(200).send("Telegram Bot is running.");
  }
}
