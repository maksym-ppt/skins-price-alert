import axios from "axios";

export async function getSteamPrice(itemName: string) {
  const marketUrl = `https://steamcommunity.com/market/priceoverview/?currency=1&appid=730&market_hash_name=${encodeURIComponent(itemName)}`;
  try {
    const { data } = await axios.get(marketUrl, { timeout: 5000 });
    if (data && data.success) {
      return data.lowest_price
        ? `Current lowest price for "${itemName}": ${data.lowest_price}`
        : `No price found for "${itemName}".`;
    } else {
      return `No data found for "${itemName}".`;
    }
  } catch (err) {
    return "Error fetching item price. Check item name and try again.";
  }
}
