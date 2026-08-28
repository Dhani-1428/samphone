export {
  APPLE_IPHONE_MODELS,
  APPLE_IPAD_MODELS,
  APPLE_WATCH_MODELS,
} from "@/data/nav-brand-models";
import { APPLE_IPAD_MODELS as IPAD_MODELS } from "@/data/nav-brand-models";

export const APPLE_IPAD_NAV_MODELS = IPAD_MODELS;
export const APPLE_IPAD_PRO_MODELS = IPAD_MODELS.filter((n) => /pro/i.test(n));
export const APPLE_IPAD_MINI_MODELS = IPAD_MODELS.filter((n) => /mini/i.test(n));
export const APPLE_IPAD_AIR_MODELS = IPAD_MODELS.filter((n) => /air/i.test(n));

export const APPLE_MACBOOK_MODELS = [
  "13\" Unibody (A1342)",
  "12'' Retina (A1534)",
  "Air 15\" Retina (A3241)",
  "Air 15\" M3 (A3114)",
  "Air 15\" M2 (A2941)",
  "Air 13\" M3 (A3113)",
  "Air 13\" M2 (A2681)",
  "Air 13,3\" M1 (A2337)",
  "Air 13'' (A2179)",
  "Air 13\" (A1932)",
  "Air 13\" (A1466)",
  "Air 13\" (A1369)",
  "Air 13\" Retina (A3240)",
  "Air 11\" (A1465)",
  "Air 11\" (A1370)",
  "Pro 17\" Unibody (A1297)",
  "Pro 16\" (A3186)",
  "Pro 16\" (A3403)",
  "Pro 16\" (A2991)",
  "Pro 16\" (A2780)",
  "Pro 16\" (A2485)",
  "Pro 16\" Retina TB (A2141)",
  "Pro 15\" Retina TB (A1990)",
  "Pro 15\" Retina (A1707)",
  "Pro 15\" Retina (A1398)",
  "Pro 15\" Unibody (A1286)",
  "Pro 14\" (A3185)",
  "Pro 14\" (A3401)",
  "Pro 14\" (A3112)",
  "Pro 14\" (A2992)",
  "Pro 14\" (A2918)",
  "Pro 14\" (A2779)",
];

export const APPLE_NEW_MODELS = new Set<string>();
