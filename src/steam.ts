import axios from "axios";
import { PriceService } from "./database";

// Steam Apps Enum
export enum Apps {
  TEAM_FORTRESS_2 = 440,
  DOTA_2 = 570,
  CS2 = 730,
  RUST = 252490,
  PUBG = 578080,
}

// Steam Currency Enum
export enum Currency {
  USD = 1, // United States dollar
  GBP = 2, // Pound sterling
  EUR = 3, // Euro
  CHF = 4, // Swiss franc
  RUB = 5, // Russian ruble
  PLN = 6, // Polish złoty
  BRL = 7, // Brazilian real
  JPY = 8, // Japanese yen
  SEK = 9, // Swedish króna
  IDR = 10, // Indonesian rupiah
  MYR = 11, // Malaysian ringgit
  PHP = 12, // Philippine peso
  SGD = 13, // Singapore dollar
  THB = 14, // Thai baht
  VND = 15, // Vietnamese đồng
  KRW = 16, // South Korean won
  TRY = 17, // Turkish lira
  UAH = 18, // Ukrainian hryvnia
  MXN = 19, // Mexican peso
  CAD = 20, // Canadian dollar
  AUD = 21, // Australian dollar
  NZD = 22, // New Zealand dollar
  CNY = 23, // Renminbi
  INR = 24, // Indian rupee
  CLP = 25, // Chilean peso
  CUP = 26, // Cuban peso
  COP = 27, // Colombian peso
  ZAR = 28, // South African rand
  HKD = 29, // Hong Kong dollar
  TWD = 30, // New Taiwan dollar
  SAR = 31, // Saudi riyal
  AED = 32, // United Arab Emirates dirham
  ARS = 34, // Argentine peso
  ILS = 35, // Israeli new shekel
  KZT = 37, // Kazakhstani tenge
  KWD = 38, // Kuwaiti dinar
  QAR = 39, // Qatari riyal
  CRC = 40, // Costa Rican colon
  UYU = 41, // Uruguayan Peso
}

// Currency symbols mapping
export const CURRENCY_SYMBOLS: Record<number, string> = {
  [Currency.USD]: "$",
  [Currency.GBP]: "£",
  [Currency.EUR]: "€",
  [Currency.CHF]: "CHF",
  [Currency.RUB]: "₽",
  [Currency.PLN]: "zł",
  [Currency.BRL]: "R$",
  [Currency.JPY]: "¥",
  [Currency.SEK]: "kr",
  [Currency.IDR]: "Rp",
  [Currency.MYR]: "RM",
  [Currency.PHP]: "₱",
  [Currency.SGD]: "S$",
  [Currency.THB]: "฿",
  [Currency.VND]: "₫",
  [Currency.KRW]: "₩",
  [Currency.TRY]: "₺",
  [Currency.UAH]: "₴",
  [Currency.MXN]: "$",
  [Currency.CAD]: "C$",
  [Currency.AUD]: "A$",
  [Currency.NZD]: "NZ$",
  [Currency.CNY]: "¥",
  [Currency.INR]: "₹",
  [Currency.CLP]: "$",
  [Currency.CUP]: "$",
  [Currency.COP]: "$",
  [Currency.ZAR]: "R",
  [Currency.HKD]: "HK$",
  [Currency.TWD]: "NT$",
  [Currency.SAR]: "ر.س",
  [Currency.AED]: "د.إ",
  [Currency.ARS]: "$",
  [Currency.ILS]: "₪",
  [Currency.KZT]: "₸",
  [Currency.KWD]: "د.ك",
  [Currency.QAR]: "ر.ق",
  [Currency.CRC]: "₡",
  [Currency.UYU]: "$",
};

// Game names mapping
export const GAME_NAMES: Record<number, string> = {
  [Apps.TEAM_FORTRESS_2]: "Team Fortress 2",
  [Apps.DOTA_2]: "Dota 2",
  [Apps.CS2]: "Counter-Strike 2",
  [Apps.RUST]: "Rust",
  [Apps.PUBG]: "PUBG: BATTLEGROUNDS",
};

// Steam API response interface
export interface SteamPriceResponse {
  success: boolean;
  lowest_price?: string;
  volume?: string;
  median_price?: string;
}

export interface SteamPriceResult {
  success: boolean;
  price?: number;
  currency?: string;
  currencySymbol?: string;
  game?: string;
  volume?: number;
  medianPrice?: number;
  message: string;
  cached: boolean;
  marketUrl?: string; // Official Steam market listing URL
}

export interface SteamPriceOptions {
  appId?: Apps;
  currency?: Currency;
  country?: string; // Country code for regional pricing
}

// Helper function to parse price string (e.g., "0,03€" -> 0.03)
function parsePriceString(priceStr: string): number {
  // Remove currency symbols and replace comma with dot
  const cleanPrice = priceStr.replace(/[^\d,.-]/g, "").replace(",", ".");
  return parseFloat(cleanPrice) || 0;
}

// Helper function to parse volume string (e.g., "435" -> 435)
function parseVolumeString(volumeStr: string): number {
  return parseInt(volumeStr.replace(/[^\d]/g, "")) || 0;
}

// --- Randomized request fingerprints for Steam requests ---
const USER_AGENTS: string[] = [
  // Desktop Chrome variants
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  // Mobile variants
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36",
];

const ACCEPT_LANGUAGE_CANDIDATES: string[] = [
  "en-US,en;q=0.9",
  "en-GB,en;q=0.9",
  "de-DE,de;q=0.9,en;q=0.8",
  "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
  "es-ES,es;q=0.9,en;q=0.8",
  "fr-FR,fr;q=0.9,en;q=0.8",
  "pt-BR,pt;q=0.9,en;q=0.8",
];

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function buildRandomHeaders(
  itemName: string,
  appId: number
): Record<string, string> {
  const encodedItem = encodeURIComponent(itemName);
  const refererChoices = [
    `https://steamcommunity.com/market/listings/${appId}/${encodedItem}`,
    `https://steamcommunity.com/market/search?appid=${appId}`,
  ];

  return {
    "User-Agent": pickRandom(USER_AGENTS),
    Accept: pickRandom([
      "application/json, text/javascript, */*; q=0.01",
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    ]),
    "Accept-Language": pickRandom(ACCEPT_LANGUAGE_CANDIDATES),
    Referer: pickRandom(refererChoices),
    "X-Requested-With": Math.random() < 0.7 ? "XMLHttpRequest" : "",
    Connection: "keep-alive",
    "Cache-Control": Math.random() < 0.5 ? "no-cache" : "max-age=0",
    Pragma: "no-cache",
  };
}

export async function getSteamPrice(
  itemName: string,
  options: SteamPriceOptions = {}
): Promise<SteamPriceResult> {
  const { appId = Apps.CS2, currency = Currency.USD, country = "US" } = options;

  // Check cache first
  const cachedPrice = await PriceService.getCachedPrice(itemName);
  if (cachedPrice) {
    // Generate official Steam market URL for cached result
    const marketUrl = `https://steamcommunity.com/market/listings/${appId}/${itemName}`;

    return {
      success: cachedPrice.success,
      price: cachedPrice.price,
      currency: cachedPrice.currency,
      currencySymbol: CURRENCY_SYMBOLS[currency] || "$",
      game: GAME_NAMES[appId] || "CS2",
      message: cachedPrice.success
        ? `Current lowest price for "${itemName}": ${
            CURRENCY_SYMBOLS[currency] || "$"
          }${cachedPrice.price}`
        : `No price found for "${itemName}".`,
      cached: true,
      marketUrl: cachedPrice.success ? marketUrl : undefined,
    };
  }

  // Fetch from Steam API - emulating official Steam implementation
  const params = {
    country: country,
    currency: currency,
    appid: appId,
    market_hash_name: itemName,
  };

  try {
    const { data } = await axios.get<SteamPriceResponse>(
      "https://steamcommunity.com/market/priceoverview/",
      {
        params,
        timeout: 4500 + Math.floor(Math.random() * 2500),
        headers: buildRandomHeaders(itemName, appId),
      }
    );

    let result: SteamPriceResult;

    if (data && data.success) {
      const price = data.lowest_price ? parsePriceString(data.lowest_price) : 0;
      const volume = data.volume ? parseVolumeString(data.volume) : 0;
      const medianPrice = data.median_price
        ? parsePriceString(data.median_price)
        : 0;
      const success = price > 0;
      const currencySymbol = CURRENCY_SYMBOLS[currency] || "$";
      const gameName = GAME_NAMES[appId] || "CS2";

      // Build message similar to official Steam implementation
      let message = "";
      if (data.lowest_price) {
        message += `Starting at: ${data.lowest_price}\n`;
      } else {
        message += `There are no listings currently available for this item.\n`;
      }

      if (data.volume) {
        message += `Volume: ${data.volume} sold in the last 24 hours\n`;
      }

      if (data.median_price) {
        message += `Median price: ${data.median_price}\n`;
      }

      // Generate official Steam market URL
      const marketUrl = `https://steamcommunity.com/market/listings/${appId}/${encodeURIComponent(
        itemName
      )}`;

      result = {
        success,
        price: success ? price : undefined,
        currency: currency.toString(),
        currencySymbol,
        game: gameName,
        volume: success ? volume : undefined,
        medianPrice: success ? medianPrice : undefined,
        message:
          message || `No price data available for "${itemName}" (${gameName}).`,
        cached: false,
        marketUrl: success ? marketUrl : undefined,
      };
    } else {
      const gameName = GAME_NAMES[appId] || "CS2";
      result = {
        success: false,
        game: gameName,
        message: `No data found for "${itemName}" (${gameName}).`,
        cached: false,
      };
    }

    // Cache the result
    await PriceService.cachePrice(
      itemName,
      result.price || 0,
      result.currency || currency.toString(),
      result.success,
      result.volume,
      result.medianPrice
    );

    return result;
  } catch (err) {
    const gameName = GAME_NAMES[appId] || "CS2";
    const result = {
      success: false,
      game: gameName,
      message: `Error fetching item price for ${gameName}. Check item name and try again.`,
      cached: false,
    };

    // Cache the error result too
    await PriceService.cachePrice(itemName, 0, currency.toString(), false);

    return result;
  }
}

// Helper function to get available games
export function getAvailableGames(): Record<string, number> {
  return {
    "Team Fortress 2": Apps.TEAM_FORTRESS_2,
    "Dota 2": Apps.DOTA_2,
    "Counter-Strike 2": Apps.CS2,
    Rust: Apps.RUST,
    "PUBG: BATTLEGROUNDS": Apps.PUBG,
  };
}

// Helper function to get available currencies
export function getAvailableCurrencies(): Record<string, number> {
  return {
    USD: Currency.USD,
    GBP: Currency.GBP,
    EUR: Currency.EUR,
    CHF: Currency.CHF,
    RUB: Currency.RUB,
    PLN: Currency.PLN,
    BRL: Currency.BRL,
    JPY: Currency.JPY,
    SEK: Currency.SEK,
    IDR: Currency.IDR,
    MYR: Currency.MYR,
    PHP: Currency.PHP,
    SGD: Currency.SGD,
    THB: Currency.THB,
    VND: Currency.VND,
    KRW: Currency.KRW,
    TRY: Currency.TRY,
    UAH: Currency.UAH,
    MXN: Currency.MXN,
    CAD: Currency.CAD,
    AUD: Currency.AUD,
    NZD: Currency.NZD,
    CNY: Currency.CNY,
    INR: Currency.INR,
    CLP: Currency.CLP,
    CUP: Currency.CUP,
    COP: Currency.COP,
    ZAR: Currency.ZAR,
    HKD: Currency.HKD,
    TWD: Currency.TWD,
    SAR: Currency.SAR,
    AED: Currency.AED,
    ARS: Currency.ARS,
    ILS: Currency.ILS,
    KZT: Currency.KZT,
    KWD: Currency.KWD,
    QAR: Currency.QAR,
    CRC: Currency.CRC,
    UYU: Currency.UYU,
  };
}
