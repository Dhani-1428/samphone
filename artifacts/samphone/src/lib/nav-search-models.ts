import {
  ALCATEL_SERIES_MODELS,
  APPLE_IPHONE_MODELS,
  APPLE_IPAD_MODELS,
  APPLE_WATCH_MODELS,
  GOOGLE_PIXEL_SERIES_MODELS,
  HUAWEI_HONOR_SERIES_MODELS,
  HUAWEI_MATE_SERIES_MODELS,
  HUAWEI_NOVA_SERIES_MODELS,
  HUAWEI_P_SERIES_MODELS,
  HUAWEI_Y_SERIES_MODELS,
  LG_SERIES_MODELS,
  MOTOROLA_EDGE_SERIES_MODELS,
  MOTOROLA_E_SERIES_MODELS,
  MOTOROLA_G_SERIES_MODELS,
  MOTOROLA_ONE_SERIES_MODELS,
  MOTOROLA_SERIES_MODELS,
  NOKIA_SERIES_MODELS,
  ONEPLUS_NORD_SERIES_MODELS,
  ONEPLUS_SERIES_MODELS,
  OPPO_A_SERIES_MODELS,
  OPPO_F_SERIES_MODELS,
  OPPO_FIND_X_SERIES_MODELS,
  OPPO_RENO_SERIES_MODELS,
  REALME_C_SERIES_MODELS,
  REALME_NARZO_SERIES_MODELS,
  REALME_NUMBER_SERIES_MODELS,
  SAMSUNG_A_SERIES_MODELS,
  SAMSUNG_J_SERIES_MODELS,
  SAMSUNG_M_SERIES_MODELS,
  SAMSUNG_NOTE_SERIES_MODELS,
  SAMSUNG_S_SERIES_MODELS,
  SAMSUNG_Z_SERIES_MODELS,
  TABLET_HUAWEI_MODELS,
  TABLET_IPADS_MODELS,
  TABLET_LENOVO_MODELS,
  TABLET_SAMSUNG_MODELS,
  TABLET_TCL_MODELS,
  TABLET_XIAOMI_MODELS,
  TCL_SERIES_MODELS,
  VIVO_SERIES_MODELS,
  XIAOMI_MI_SERIES_MODELS,
  XIAOMI_POCO_SERIES_MODELS,
  XIAOMI_REDMI_NOTE_SERIES_MODELS,
  XIAOMI_REDMI_SERIES_MODELS,
  ZTE_SERIES_MODELS,
} from "../data/nav-brand-models.ts";
import { compactModel, modelAliases, slugifyModelLabel } from "./model-aliases.ts";

export type NavSearchModel = {
  id: string;
  brand: string;
  family: string;
  slug: string;
  label: string;
  aliases: string[];
  href: string;
};

function pack(brand: string, family: string, labels: string[]): NavSearchModel[] {
  return labels.map((label) => {
    const slug = slugifyModelLabel(label);
    const aliases = modelAliases(brand, label).filter((a) => compactModel(a).length >= 4);
    return {
      id: slug,
      brand,
      family,
      slug,
      label,
      href: `/model/${brand}/${family}/${slug}`,
      aliases,
    };
  });
}

export function buildNavSearchModels(): NavSearchModel[] {
  return [
    ...pack("iphone", "iphones", APPLE_IPHONE_MODELS),
    ...pack("iphone", "ipad", APPLE_IPAD_MODELS),
    ...pack("iphone", "iwatch", APPLE_WATCH_MODELS),
    ...pack("samsung", "a-series", SAMSUNG_A_SERIES_MODELS),
    ...pack("samsung", "s-series", SAMSUNG_S_SERIES_MODELS),
    ...pack("samsung", "z-series", SAMSUNG_Z_SERIES_MODELS),
    ...pack("samsung", "m-series", SAMSUNG_M_SERIES_MODELS),
    ...pack("samsung", "j-series", SAMSUNG_J_SERIES_MODELS),
    ...pack("samsung", "note-series", SAMSUNG_NOTE_SERIES_MODELS),
    ...pack("samsung", "samsung-tablets", TABLET_SAMSUNG_MODELS),
    ...pack("xiaomi", "redmi-series", XIAOMI_REDMI_SERIES_MODELS),
    ...pack("xiaomi", "redmi-note-series", XIAOMI_REDMI_NOTE_SERIES_MODELS),
    ...pack("xiaomi", "mi-series", XIAOMI_MI_SERIES_MODELS),
    ...pack("xiaomi", "poco-series", XIAOMI_POCO_SERIES_MODELS),
    ...pack("xiaomi", "xiaomi-redmi-tablets", TABLET_XIAOMI_MODELS),
    ...pack("oppo", "reno-series", OPPO_RENO_SERIES_MODELS),
    ...pack("oppo", "a-series", OPPO_A_SERIES_MODELS),
    ...pack("oppo", "f-series", OPPO_F_SERIES_MODELS),
    ...pack("oppo", "find-x-series", OPPO_FIND_X_SERIES_MODELS),
    ...pack("realme", "c-series", REALME_C_SERIES_MODELS),
    ...pack("realme", "series", REALME_NUMBER_SERIES_MODELS),
    ...pack("realme", "narzo-series", REALME_NARZO_SERIES_MODELS),
    ...pack("huawei", "p-series", HUAWEI_P_SERIES_MODELS),
    ...pack("huawei", "y-series", HUAWEI_Y_SERIES_MODELS),
    ...pack("huawei", "honor-series", HUAWEI_HONOR_SERIES_MODELS),
    ...pack("huawei", "mate-series", HUAWEI_MATE_SERIES_MODELS),
    ...pack("huawei", "nova-series", HUAWEI_NOVA_SERIES_MODELS),
    ...pack("huawei", "huawei-tablets", TABLET_HUAWEI_MODELS),
    ...pack("oneplus", "oneplus-series", ONEPLUS_SERIES_MODELS),
    ...pack("oneplus", "oneplus-nord-series", ONEPLUS_NORD_SERIES_MODELS),
    ...pack("motorola", "g-series", MOTOROLA_G_SERIES_MODELS),
    ...pack("motorola", "edge-series", MOTOROLA_EDGE_SERIES_MODELS),
    ...pack("motorola", "e-series", MOTOROLA_E_SERIES_MODELS),
    ...pack("motorola", "one-series", MOTOROLA_ONE_SERIES_MODELS),
    ...pack("motorola", "motorola-series", MOTOROLA_SERIES_MODELS),
    ...pack("alcatel", "alcatel-series", ALCATEL_SERIES_MODELS),
    ...pack("tcl", "tcl-series", TCL_SERIES_MODELS),
    ...pack("zte", "zte-series", ZTE_SERIES_MODELS),
    ...pack("vivo", "vivo-series", VIVO_SERIES_MODELS),
    ...pack("iphone", "ipads", TABLET_IPADS_MODELS),
    ...pack("tcl", "tcl-tablets", TABLET_TCL_MODELS),
    ...pack("lenovo", "lenovo-tablets", TABLET_LENOVO_MODELS),
    ...pack("nokia", "nokia-series", NOKIA_SERIES_MODELS),
    ...pack("google", "google-pixel-series", GOOGLE_PIXEL_SERIES_MODELS),
    ...pack("lg", "lg-series", LG_SERIES_MODELS),
  ];
}
