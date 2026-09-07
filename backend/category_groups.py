"""Shop-by-category group titles and leaf_category matching (exact, with DB aliases)."""

from __future__ import annotations

import re

PHONE_PARTS_CATEGORY = "Phone Parts"

# UI chip name -> leaf_category values produced by woocommerce_classify.py (lowercase).
LEAF_ALIASES: dict[str, set[str]] = {
    "adapters": {"charging", "chargers", "adapters"},
    "lightning chargers": {"charging", "chargers"},
    "type-c chargers": {"charging", "chargers"},
    "micro-usb chargers": {"charging", "chargers"},
    "wireless charger": {"charging", "chargers"},
    "lightning cables": {"cables", "charging"},
    "type-c cables": {"cables"},
    "micro cables": {"cables"},
    "internet cables": {"cables"},
    "hdmi cables": {"cables"},
    "headphones": {"audio"},
    "earphones": {"audio"},
    "wireless headset": {"audio"},
    "neck earphone": {"audio"},
    "speakers": {"speakers", "speaker"},
    "smartwatches": {"smartwatches"},
    "smartwatch accessories": {"smartwatches", "audio"},
    "mobile car support": {"car accessories"},
    "car support": {"car accessories"},
    "car chargers": {"car accessories", "charging"},
    "laptop chargers": set(),
    "keyboards": set(),
    "mice": set(),
    "hubs & docks": set(),
    "laptop holders": set(),
    "pc storage": set(),
    "pc cables": set(),
    "laptop tools": set(),
    "microphone": {"audio"},
    "audio cable": {"audio", "cables"},
    "power banks": {"power banks"},
    "hoco beauty care": {"cases", "hoco beauty care"},
    "original accessories": {"cases", "screen protection", "multi-brand"},
    "fans": {"multi-brand"},
    "cell aa/aaa": set(),
    "cards": {"sim/memory"},
    "sim cards": {"sim/memory"},
    "memory cards": {"sim/memory"},
    "repairing tools": {"repair tools"},
}

# Shop group -> classify leaf_category values (lowercase).
GROUP_DB_LEAVES: dict[str, set[str]] = {
    "Powerbanks": {"power banks"},
    "Chargers": {"charging", "chargers"},
    "Cables": {"cables"},
    "Headphones": {"audio"},
    # Exact Speakers leaf only — broad "audio" is shared with earphones/headsets
    # and must be title-disambiguated via is_speaker_product().
    "Speakers": {"speakers", "speaker"},
    "Smartwatch": {"smartwatches"},
    "Mobile Car": {"car accessories"},
    "Mobile Car Accessories": {"car accessories"},
    "Laptop": {"multi-brand"},
    "Audio & Microphone": {"audio"},
    "Beautycare": {"cases"},
    "Electronics": {"multi-brand"},
    "Cell AA/AAA": set(),
    "Original Accessories": {"cases", "screen protection", "multi-brand"},
    # Broad Woo leaf "SIM/MEMORY" also holds phones/pen drives — title filter via is_cards_product().
    "Cards": {"sim/memory"},
    "Repairing Tools": {"repair tools"},
}

GROUP_SUBCATEGORIES: dict[str, set[str]] = {
    "Powerbanks": {"power banks"},
    "Chargers": {"charging", "chargers"},
    "Cables": {"cables"},
    "Headphones": {"audio"},
    "Speakers": {"speakers", "speaker"},
    "Smartwatch": {"smartwatches"},
    "Mobile Car": {"car accessories"},
    "Mobile Car Accessories": {"car accessories"},
    "Laptop": {"multi-brand", "laptop", "pc"},
    "Audio & Microphone": {"audio"},
    "Beautycare": {"beautycare", "hoco beauty care"},
    "Original Accessories": {"cases", "screen protection", "original accessories"},
    "Cards": {"sim/memory"},
    "Repairing Tools": {"repair tools", "repairing tools"},
}

ACCESSORY_CATEGORIES = frozenset({"Accessories", "Hoco", "Smartwatches", "Repair Tools", "Repairing Tools"})

LEAF_DB_VALUES: dict[str, set[str]] = {
    name: set(names) for name, names in ((k, v | {k}) for k, v in LEAF_ALIASES.items())
}

GROUP_ALIASES: dict[str, str] = {
    "powerbank": "Powerbanks",
    "powerbanks": "Powerbanks",
    "power bank": "Powerbanks",
    "power banks": "Powerbanks",
    "chargers": "Chargers",
    "cables": "Cables",
    "headphones": "Headphones",
    "speakers": "Speakers",
    "smartwatch": "Smartwatch",
    "smartwatches": "Smartwatch",
    "mobile car": "Mobile Car",
    "mobile car support": "Mobile Car",
    "mobile car accessories": "Mobile Car",
    "car support": "Mobile Car",
    "car accessories": "Mobile Car",
    "laptop": "Laptop",
    "laptops": "Laptop",
    "pc": "Laptop",
    "pc accessories": "Laptop",
    "computer": "Laptop",
    "computer accessories": "Laptop",
    "audio & microphone": "Audio & Microphone",
    "audio and microphone": "Audio & Microphone",
    "electronics": "Electronics",
    "beautycare": "Beautycare",
    "beauty care": "Beautycare",
    "hoco beauty care": "Beautycare",
    "hoco beautycare": "Beautycare",
    "cell aa/aaa": "Cell AA/AAA",
    "cells": "Cell AA/AAA",
    "original accessories": "Original Accessories",
    "power, car & hoco": "Powerbanks",
    "cards": "Cards",
    "sim cards": "Cards",
    "memory cards": "Cards",
    "sim/memory": "Cards",
    "repairing tools": "Repairing Tools",
    "repair tools": "Repairing Tools",
    "repair tool": "Repairing Tools",
}

CATEGORY_GROUPS: dict[str, list[str]] = {
    "Powerbanks": ["Power Banks"],
    "Chargers": [
        "Adapters",
        "Lightning Chargers",
        "Type-C Chargers",
        "Micro-USB Chargers",
        "Wireless Charger",
    ],
    "Cables": [
        "Lightning Cables",
        "Type-C Cables",
        "Micro Cables",
        "Internet Cables",
        "HDMI Cables",
    ],
    "Headphones": ["Headphones", "Earphones", "Wireless Headset", "Neck Earphone"],
    "Speakers": ["Speakers"],
    "Smartwatch": ["Smartwatches", "Accessories", "Smartwatch Accessories"],
    "Mobile Car": ["Car Support", "Car Chargers"],
    "Mobile Car Accessories": ["Car Support", "Car Chargers"],
    "Laptop": [
        "Laptop Chargers",
        "Keyboards",
        "Mice",
        "Hubs & Docks",
        "Laptop Holders",
        "PC Storage",
        "PC Cables",
        "Laptop Tools",
    ],
    "Audio & Microphone": ["Microphone", "Audio Cable"],
    "Electronics": ["Fans"],
    "Beautycare": ["Hoco Beauty Care"],
    "Cell AA/AAA": ["Cell AA/AAA"],
    "Original Accessories": ["Original Accessories"],
    "Cards": ["SIM Cards", "Memory Cards"],
    "Repairing Tools": ["Repairing Tools"],
}

TITLE_KEYWORDS: dict[str, tuple[str, ...]] = {
    # Powerbanks uses is_powerbank_title allowlist (not broad power-bank keywords).
    "Powerbanks": (),
    "Chargers": (r"\bcharger\b", r"\badapter\b", r"\badaptador\b"),
    "Cables": (r"\bcable\b", r"\busb\b", r"lightning", r"type-?c"),
    "Headphones": (r"headphone", r"earphone", r"earbud", r"headset"),
    "Speakers": (
        r"\bspeaker\b",
        r"\bsoundbar\b",
        r"bluetooth\s*speaker",
        r"portable\s*speaker",
        r"wireless\s*speaker",
        r"bt\s*speaker",
    ),
    # Laptop uses is_laptop_title allowlist (PC / laptop accessories & parts).
    "Laptop": (),
    # Electronics uses is_electronics_title allowlist (not broad fan keywords).
    "Electronics": (),
    # Beautycare uses is_beautycare_title allowlist.
    "Beautycare": (),
    # Cell AA/AAA uses is_cell_aa_title allowlist.
    "Cell AA/AAA": (),
    # Cards uses is_sim_card_title / is_memory_card_title allowlists.
    "Cards": (),
    # Repairing Tools uses is_repairing_tools_title / category+leaf match.
    "Repairing Tools": (),
}

# Legacy alias kept for any older imports; Cell AA/AAA now uses is_cell_aa_title.
_CELL_AA_RE: list[re.Pattern[str]] = []

# WooCommerce ?search= hints for category-group scans (narrows 15k catalog).
GROUP_WC_SEARCH: dict[str, str] = {
    "Powerbanks": "power bank",
    "Chargers": "charger",
    "Cables": "cable",
    "Headphones": "headphone",
    "Speakers": "speaker",
    "Smartwatch": "smartwatch",
    "Mobile Car": "car mount",
    "Mobile Car Accessories": "car mount",
    "Laptop": "laptop",
    "Audio & Microphone": "audio cable",
    "Electronics": "electronics",
    "Beautycare": "hp",
    "Cell AA/AAA": "battery",
    "Original Accessories": "original",
    "Cards": "card",
    "Repairing Tools": "repair",
}

# OR title fragments for group filters (any match). Used when a single LIKE
# would miss allowlisted SKUs (e.g. SANDA portable battery, Samsung pack).
GROUP_WC_SEARCH_ANY: dict[str, tuple[str, ...]] = {
    "Powerbanks": (
        "j106",
        "j115",
        "j116",
        "j128",
        "j132",
        "j134",
        "j135",
        "j139",
        "j140a",
        "j141",
        "j142",
        "j143",
        "j145",
        "j146",
        "j151",
        "j152",
        "j154",
        "j155",
        "j156",
        "j157",
        "j158",
        "j161",
        "j162",
        "j163a",
        "q26",
        "q32",
        "q34",
        "q37",
        "q39",
        "q43",
        "q44",
        "q45",
        "q47",
        "q48",
        "q49",
        "wd9029",
        "wd9152",
        "wd9266",
        "sd2003",
        "sd-3207",
        "vd-pb041",
        "vd-pb042",
        "vd-pb058",
        "vd-pb059",
        "vd-pb060",
        "vd-pb061",
        "vd-pb062",
        "wireless battery pack",
        "xiaomi 22.5w",
        "xiaomi 33w",
    ),
    "Smartwatch": (
        "y5 pro",
        "y7 pro",
        "y9",
        "y12",
        "y15",
        "y17",
        "y18",
        "y23",
        "y25",
        "y26",
        "y27",
        "y29",
        "y30",
        "y31",
        "y32",
        "y33",
        "y34",
        "y35",
        "y36",
        "y37",
        "y41",
        "y42",
        "y43",
        "as100",
        "as101",
        "as102",
        "cw46",
        "wa16",
        "wa17",
        "wa18",
        "wa22",
        "wa23",
        "wa24",
        "wh02",
        "wh03",
        "wh04",
        "wh06",
        "ws3",
        "wb1328",
        "sa0049",
        "watch charging cable",
        "watchband",
        "watch band",
    ),
    "Mobile Car": (
        "ca52",
        "ca55",
        "ca56",
        "ca67",
        "ca73",
        "ca76",
        "ca83",
        "ca86",
        "ca94",
        "ca95",
        "ca103",
        "ca119",
        "ca121",
        "cph01",
        "e58",
        "e81",
        "h3",
        "h4",
        "h5",
        "h8",
        "h9",
        "h10",
        "h15",
        "h19",
        "h20",
        "h22",
        "h24",
        "h27",
        "h28",
        "h29",
        "h30",
        "h31",
        "h32",
        "h33",
        "h34",
        "h36",
        "h37",
        "h38",
        "h39",
        "h44",
        "h45",
        "h56",
        "h57",
        "h58",
        "h59",
        "h60",
        "h64",
        "h65",
        "h68",
        "h71",
        "h72",
        "h73",
        "h74",
        "h75",
        "h78",
        "h79",
        "h80",
        "h81",
        "h82",
        "h86",
        "h88",
        "h89",
        "h91",
        "h92",
        "hd6",
        "hd8",
        "hd10",
        "hw3",
        "hw5",
        "hw29",
        "hw30",
        "hw31",
        "hw32",
        "hw33",
        "hx41",
        "k19",
        "k23",
        "k26",
        "ph23",
        "ph24",
        "ph29a",
        "ph34",
        "ph50",
        "ph52",
        "z47a",
        "z49",
        "z52",
        "z53a",
        "z54",
        "z54a",
        "z54b",
        "z57a",
        "z57b",
        "wa0204",
        "wa0224",
        "wa0225",
        "we5147",
        "sa0041",
        "se5003",
        "se5018",
        "sd-3370",
        "sd-3500",
        "sd-3504",
        "sd-3514",
        "sd-3584",
        "sd-3605",
        "sd-3630",
        "car charger",
        "car holder",
        "car mount",
    ),
    "Laptop": (
        "laptop",
        "notebook",
        "keyboard",
        "mouse",
        "mouse pad",
        "mouse mat",
        "g-1268",
        "wa0160",
        "wa0192",
        "wa0261",
        "wa0336",
        "wm7063",
        "wm7064",
        "wg7055",
        "wg7061",
        "wg7112",
        "wg7089",
        "gm14",
        "gm15",
        "gm18",
        "gm19",
        "gm21",
        "gm22",
        "gm24",
        "gm25",
        "gm28",
        "gm37",
        "m915",
        "k3186",
        "x103",
        "ph52",
        "ud12",
        "rl-728b",
        "sd-2064",
        "sd-3705",
        "sd-3745",
        "sd-3746",
        "sd-3747",
        "sd-3822",
        "sd-4553",
        "sd-8163",
        "vga",
        "pssd",
        "portable ssd",
        "7 in 1",
    ),
    "Electronics": (
        "game controller",
        "oki-59",
        "pa-35",
        "ph-42",
        "doubleshock",
        "sj4000",
        "s10-10",
        "smart tag",
        "gl-69403",
        "gl-69408",
        "gl-69588",
        "gl-f6",
        "gl-pdf15",
        "gl-pdf4",
        "gl69401",
        "gl69407",
        "gl70276",
        "hi50",
        "hocohi41",
        "wa0218",
        "we5095",
        "we5147",
        "we5202",
        "wr9081",
        "wr9084",
        "wr9091",
        "wr9099",
        "wr9143",
        "wr9145",
        "wr9153",
        "wr9157",
        "wr9158",
        "wr9183",
        "sa0114",
        "sk1073",
        "wg9186",
        "scooter elect",
        "alarm clock",
        "m-t1",
        "metal plates",
        "adjustable fans",
        "sd-0023",
        "sd-0026",
        "sd-0029",
        "sd-0203",
        "sd-0205",
        "sd-0993",
        "sd-1020",
        "sd-1047",
        "sd-1050",
        "sd-1333",
        "sd-1636",
        "sd-1710",
        "sd-1804",
        "sd-2351",
        "sd-2352",
        "sd-2411",
        "sd-3075",
        "sd-3207",
        "sd-3370",
        "sd-3433",
        "sd-3441",
        "sd-3461",
        "sd-3550",
        "sd-3556",
        "sd-3584",
        "sd-3605",
        "sd-3635",
        "sd-3636",
        "sd-3641",
        "sd-3642",
        "sd-3645",
        "sd-3647",
        "sd-3787",
        "sd-3796",
        "sd-4210",
        "sd-4211",
        "sd-4508",
        "sd-4550",
        "sd-4583",
        "sd-4593",
        "sd-5889",
        "sd-5890",
        "sd-5892",
        "sd-5897",
        "sd-5907",
        "sd-5935",
        "sd-5936",
        "sd-6235",
        "sd-6237",
        "sd-6285",
        "sd-6455",
        "sd-7217",
        "sd-8188",
        "sd-8240",
    ),
    "Beautycare": (
        "hp11",
        "hp12",
        "hp13",
        "hp20",
        "hp21",
        "hp22",
        "hp23",
        "hp24",
        "hp25",
        "hp30",
        "hp32",
        "hp33",
        "hp36",
        "hp40",
        "hp43",
        "hp44",
        "hp50",
        "hp70",
    ),
    "Cell AA/AAA": (
        "lr8d425",
        "lr1120",
        "lr1130",
        "lr41",
        "lr43",
        "lr44",
        "lr521",
        "lr621",
        "lr626",
        "lr721",
        "lr726",
        "lr754",
        "lr921",
        "lr936",
        "9vx1",
        "cr2032",
        "xtralife",
        "lr14",
        "lr03",
        "lrg",
        "cr2016",
        "cr2025",
        "lr20",
        "6lr61",
        "cr123",
        "cr2",
        "lr1",
        "lr6",
        "lrv08",
        "23a",
        "27a",
        "cr1220",
        "cr1616",
        "cr1620",
        "cr1632",
        "cr2430",
        "cr2450",
        "duracell",
        "maxell",
        "panasonic",
        "vinnic",
        "kodak",
    ),
    "Cards": (
        "lyca sim",
        "lycamobile",
        "meo card",
        "meo sim",
        "moche sim",
        "nos like",
        "uzo sim",
        "vodafone",
        "woo sim",
        "hb22",
        "a2v30",
        "ud10",
        "ud12",
        "tf memory",
        "pen drive",
        "flash drive",
        "camera sd",
        "sd memory",
        "sdcs3",
        "kingstone",
        "mini usb",
    ),
    "Repairing Tools": (
        "relife",
        "jakemy",
        "2uul",
        "mechanic",
        "screwdriver",
        "tweezers",
        "spudger",
        "pry tool",
        "solder",
        "soldering",
        "multimeter",
        "flux paste",
        "bga",
        "opening tool",
        "repair tool",
        "heat gun",
        "suction cup",
        "pliers",
        "rl-",
        "jm-",
    ),
}

# Leaf chips that share a Woo bucket need their own search hint while catalog warms.
LEAF_WC_SEARCH: dict[str, str] = {
    "Adapters": "adapter",
    "Lightning Chargers": "charger",
    "Type-C Chargers": "charger",
    "Micro-USB Chargers": "charger",
    "Wireless Charger": "wireless",
    "Lightning Cables": "lightning cable",
    "Type-C Cables": "type-c cable",
    "Micro Cables": "micro usb cable",
    "Internet Cables": "network cable",
    "HDMI Cables": "hdmi",
    "Screen / LCD Assembly": "lcd",
    "Batteries": "battery",
    "Charging Ports": "charging port",
    "Speakers": "speaker",
    "Cameras": "camera",
    "Flex Cables": "flex",
    "Back Covers": "back cover",
    "Frames": "frame",
    "Buttons": "button",
    "Earpieces": "earpiece",
    "Microphones": "microphone",
    "Sensors": "sensor",
    "Vibrators": "vibrator",
    "SIM Trays": "sim tray",
}

# OR title fragments for leaf filters (any match). Avoids narrow single LIKE
# like "%iphone charger%" missing "CHARGER SET (C TO IP)" kits.
LEAF_WC_SEARCH_ANY: dict[str, tuple[str, ...]] = {
    "Silicon Soft Jelly": (
        "soft jelly",
        "silicon soft jelly",
        "silicone soft jelly",
    ),
    "Magsafe Cover": (
        "magsafe",
        "mag safe",
    ),
    "Magsafe cover": (
        "magsafe",
        "mag safe",
    ),
    "Adapters": (
        "20w power adapter",
        "25w pd adapter",
        "45w pd adapter",
        "ad504",
        "qc-2402",
        "es5148",
        "n75",
        "hb26",
        "hb28",
        "hb41",
        "hb45",
        "ls36",
        "n22 jetta",
        "n25 maker",
        "n34 dazzling",
        "n41 almighty",
        "n51 scenery",
        "n56 fundador",
        "n60 gentle",
        "n61",
        "n62",
        "n63",
        "n69 nuevo",
        "n70 nuevo",
        "ua17",
        "ua28",
        "ua29",
        "ua36",
        "wa0216",
        "wa0318",
        "wa0348",
        "wa0349",
        "wb1208",
        "wb1209",
        "wb8342",
        "wb8346",
        "wb8349",
        "wg7089",
        "iphone adapter",
        "a8667",
        "sa0072",
        "sa0081",
        "sd0014",
        "sk1061",
        "onemax otg",
        "sd-3802",
        "sd-3804",
        "sd-3816",
        "sd-7248",
        "sd-7257",
        "vd-tc016ba usb adapter",
    ),
    "Lightning Chargers": (
        "n22 jetta",
        "n34 dazzling",
        "n41 almighty",
        "n60 gentle",
        "n61",
        "n62",
        "n63",
        "hocon63",
        "n69 nuevo",
        "n70 nuevo",
        "c to ip",
        "type-c to ip",
        "wa0200",
        "wa0311",
        "sa0005",
        "sa0024",
        "sa0027",
        "sa0037",
        "sa0056",
        "sk0027",
        "vd-tc016ba",
        "vd-tc016bc",
        "a to l",
        "a to c",
        "a to m",
        "c to ip",
    ),
    "Type-C Chargers": (
        "20w power adapter",
        "25w pd adapter",
        "45w pd adapter",
        "n75",
        "n22 jetta",
        "n34 dazzling",
        "n41 almighty",
        "n51 scenery",
        "n56 fundador",
        "n60 gentle",
        "n61",
        "n62",
        "n63",
        "n69 nuevo",
        "n70 nuevo",
        "wa0192",
        "wa0196",
        "wa0303",
        "wb1331",
        "iphone adapter",
        "iphone charger",
        "sa0081",
        "samsung 15w",
        "sd-3784",
        "sd-3789",
        "vd-tc016bc",
        "c to c",
        "type-c to type-c",
    ),
    "Micro-USB Chargers": (
        "micro-usb",
        "micro usb",
        "micro charger",
        "usb micro",
        "2usb micro",
        "a to m",
        "a to micro",
        "usb-a to micro",
        "usb a to micro",
        "to micro",
        "portable charger",
    ),
    "Wireless Charger": (
        "wireless charger",
        "wireless charging",
        "wireless fast charging",
        "magnetic wireless",
        "magnetic charging",
        "magsafe",
        "cw52",
        "cw5",
        "qi charger",
        "qi wireless",
    ),
    "Lightning Cables": (
        "lightning",
        "lighting",  # common misspelling on HOCO titles
        "to ip",
        "to iphone",
        "type-c to ip",
        "type c to ip",
        "usb-c to lightning",
        "usb c to lightning",
        "to lightning",
        "data cable ip",
        "cable ip",
        "for iphone",
        "iphone",
        "ipx/",
        "ip14",
        "type ip",
        "3-in-1",
        "3 in 1",
        "4-in-1",
        "charging data cable",
        "data cable",
    ),
    "Type-C Cables": (
        "type-c",
        "type c",
        "usb-c",
        "usb c",
        "usb-a to c",
        "usb a to c",
        "a to c",
        "c to c",
        "to type-c",
        "to type c",
        "usb to type",
        "type-c to",
        "type c to",
        "data cable",
        "charging data cable",
        "charging cable",
        "hdtv-type-c",
        "hdtv",
        "mag3",
        "2-in-1",
        "spear",
    ),
    "Micro Cables": (
        "micro-usb",
        "micro usb",
        "to micro",
        "usb-a to micro",
        "usb a to micro",
        "usb to micro",
        "a to m",
        "data cable micro",
        "cable micro",
        "micro data",
        "charging data cable micro",
        "am to fm",
        "usb cable",
    ),
    "Internet Cables": (
        "network cable",
        "ethernet",
        "rj45",
        "rj-45",
        "lan cable",
        "internet",
        "cat-6",
        "cat6",
        "cat 6",
        "printer cable",
        "am to bm",
        "flat network",
        "us07",
    ),
    "HDMI Cables": (
        "hdmi",
        "hdtv",
        "hd cable",
        "vga",
        "display port",
        "displayport",
        "av to",
        "on-screen",
        "hb26",
        "us08",
        "us10",
        "ua27",
        "wb1379",
        "wb2918",
        "wb2919",
        "wb2921",
        "wb2922",
        "power cable",
        "sd-8189",
        "sd-4550",
        "sd-4553",
        "sd-7326",
        "sd-8155",
        "sd-8163",
        "sd-8188",
        "sd-8241",
        "aoweixun",
        "4 in 1 adapter",
    ),
    "Earphones": (
        "l7 plus",
        "m1 max",
        "m1 original",
        "m1 pro",
        "m101",
        "m111",
        "m113",
        "m114",
        "m115",
        "m116",
        "m60",
        "m70",
        "m83",
        "m90",
        "wc3418",
        "wc3512",
        "wc3481",
        "wc8279",
        "wc8286",
        "wc8292",
        "sc3006",
        "sc3026",
        "sc3027",
        "sc3042",
        "tune 310c",
        "tune 31oc",
        "samsung earphones",
        "vd-ear031",
        "vd-ear032",
        "vd-ear033",
    ),
    "Wireless Headset": (
        "ba-mini5",
        "bh11",
        "bh12",
        "e60",
        "e63",
        "ea4",
        "ea8",
        "eq1",
        "eq10",
        "eq14",
        "eq15",
        "eq19",
        "eq22",
        "eq24",
        "eq25",
        "eq26",
        "eq27",
        "eq33",
        "ew201",
        "ew41",
        "ew47",
        "ew61",
        "ew84",
        "ew85",
        "ew98",
        "sc-3035",
        "sc3035",
        "sc3003",
        "sc3004",
        "enco buds 3",
        "buds 6 play",
        "buds 8 active",
        "buds 8 lite",
        "bt020",
        "bt055",
        "vd-bt055",
    ),
    "Neck Earphone": (
        "es58",
        "es62",
        "es63",
        "es64",
        "es67",
        "es68",
        "es70",
        "es71",
        "es72",
        "es73",
        "es74",
        "es75",
    ),
    "Microphone": (
        "bk5",
        "l14",
        "l15",
        "l16",
        "l17",
        "l20",
        "we9171",
        "wr9170",
        "m2-0905",
        "vd-mic030",
    ),
    "Audio Cable": (
        "ls37",
        "upa21",
        "upa24",
        "upa27",
        "upa28",
        "upa29",
        "upa32b",
        "wb1304",
        "wb2868",
        "sk1027",
        "sk1030",
        "sd-7207",
        "sd-7211",
    ),
    "Smartwatches": (
        "y5 pro",
        "y7 pro",
        "y9",
        "y12",
        "y15",
        "y17",
        "y18",
        "y23",
        "y25",
        "y27",
        "y30",
        "y31",
        "y32",
        "y33",
        "y34",
        "y35",
        "y36",
        "smart sports watch",
        "smart watch",
    ),
    "Smartwatch Accessories": (
        "as100",
        "as101",
        "as102",
        "cw46",
        "wa16",
        "wa17",
        "wa18",
        "wa22",
        "wa23",
        "wa24",
        "wh02",
        "wh03",
        "wh04",
        "wh06",
        "ws3",
        "wb1328",
        "sa0049",
        "charging cable",
        "watch charger",
        "watchband",
        "watch band",
        "watch strap",
        "silicon strap",
        "silicone strap",
        "leather strap",
        "nylon watchband",
        "iwatch",
        "i watch",
        "protective case for iwatch",
        "wireless charger for i",
    ),
    # Smartwatch page "Accessories" chip (same SKUs as Smartwatch Accessories).
    "Accessories": (
        "as100",
        "as101",
        "as102",
        "cw46",
        "wa16",
        "wa17",
        "wa18",
        "wa22",
        "wa23",
        "wa24",
        "wh02",
        "wh03",
        "wh04",
        "wh06",
        "ws3",
        "wb1328",
        "sa0049",
        "charging cable",
        "watch charger",
        "watchband",
        "watch band",
        "watch strap",
        "silicon strap",
        "silicone strap",
        "leather strap",
        "nylon watchband",
        "iwatch",
        "i watch",
        "protective case for iwatch",
        "wireless charger for i",
    ),
    "Car Support": (
        "ca52",
        "ca55",
        "ca56",
        "ca67",
        "ca73",
        "ca76",
        "ca83",
        "ca86",
        "ca94",
        "ca95",
        "ca103",
        "ca119",
        "ca121",
        "cph01",
        "e58",
        "e81",
        "h10",
        "h15",
        "h19",
        "h20",
        "h22",
        "h24",
        "h27",
        "h28",
        "h29",
        "h30",
        "h31",
        "h32",
        "h33",
        "h34",
        "h36",
        "h37",
        "h38",
        "h39",
        "h44",
        "h45",
        "h56",
        "h57",
        "h58",
        "h59",
        "h60",
        "h64",
        "h65",
        "h68",
        "h71",
        "h72",
        "h73",
        "h74",
        "h75",
        "h78",
        "h79",
        "h80",
        "h81",
        "h82",
        "h86",
        "h88",
        "h89",
        "h91",
        "h92",
        "h3",
        "h4",
        "h5",
        "h8",
        "h9",
        "hd6",
        "hd8",
        "hd10",
        "hw3",
        "hw5",
        "hw29",
        "hw30",
        "hw31",
        "hw32",
        "hw33",
        "hx41",
        "k19",
        "k23",
        "k26",
        "ph23",
        "ph24",
        "ph29a",
        "ph34",
        "ph50",
        "ph52",
        "we5147",
        "sd-3370",
        "sd-3500",
        "sd-3504",
        "sd-3514",
        "sd-3584",
        "sd-3605",
        "sd-3630",
        "car holder",
        "car mount",
    ),
    "Car Chargers": (
        "z47a",
        "z49",
        "z52",
        "z53a",
        "z54",
        "z54a",
        "z54b",
        "z57a",
        "z57b",
        "wa0204",
        "wa0224",
        "wa0225",
        "sa0041",
        "se5003",
        "se5018",
        "car charger",
    ),
}

# Fans leaf on the Electronics page uses the same shop-page allowlist fetch terms.
LEAF_WC_SEARCH_ANY["Fans"] = GROUP_WC_SEARCH_ANY["Electronics"]
LEAF_WC_SEARCH_ANY["Laptop Chargers"] = (
    "laptop",
    "g-1268",
    "wa0160",
    "wa0192",
    "wa0261",
    "wa0336",
    "wm7063",
    "x103",
)
LEAF_WC_SEARCH_ANY["Keyboards"] = (
    "keyboard",
    "sd-2064",
    "sd-3745",
    "sd-3746",
    "sd-3747",
    "gm18",
    "k3186",
)
LEAF_WC_SEARCH_ANY["Mice"] = (
    "mouse",
    "mouse pad",
    "mouse mat",
    "wg7055",
    "wg7061",
    "wg7112",
    "wm7064",
    "gm14",
    "gm15",
    "gm19",
    "gm21",
    "gm22",
    "gm24",
    "gm25",
    "gm28",
    "gm37",
    "m915",
    "sd-3705",
)
LEAF_WC_SEARCH_ANY["Hubs & Docks"] = ("wg7089", "7 in 1", "usb hub", "type-c hub")
LEAF_WC_SEARCH_ANY["Laptop Holders"] = ("ph52", "laptop holder", "laptop stand")
LEAF_WC_SEARCH_ANY["PC Storage"] = ("ud12", "pssd", "portable ssd")
LEAF_WC_SEARCH_ANY["PC Cables"] = ("vga", "sd-3822", "sd-4553", "sd-8163", "hdmi splitter")
LEAF_WC_SEARCH_ANY["Laptop Tools"] = ("rl-728b", "laptop repair")
LEAF_WC_SEARCH_ANY["Repairing Tools"] = GROUP_WC_SEARCH_ANY["Repairing Tools"]
# Hoco Beauty Care leaf uses the Beautycare shop-page allowlist fetch terms.
LEAF_WC_SEARCH_ANY["Hoco Beauty Care"] = GROUP_WC_SEARCH_ANY["Beautycare"]
# Cell AA/AAA leaf uses the same shop-page allowlist fetch terms.
LEAF_WC_SEARCH_ANY["Cell AA/AAA"] = GROUP_WC_SEARCH_ANY["Cell AA/AAA"]
LEAF_WC_SEARCH_ANY["SIM Cards"] = (
    "lyca sim",
    "lycamobile",
    "meo card",
    "meo sim",
    "moche sim",
    "nos like",
    "uzo sim",
    "vodafone",
    "woo sim",
)
LEAF_WC_SEARCH_ANY["Memory Cards"] = (
    "hb22",
    "a2v30",
    "ud10",
    "ud12",
    "tf memory",
    "pen drive",
    "flash drive",
    "camera sd",
    "sd memory",
    "sdcs3",
    "kingstone",
    "mini usb",
)


def group_wc_search_term(group_title: str | None) -> str | None:
    normalized = normalize_group_title(group_title)
    if not normalized:
        return None
    return GROUP_WC_SEARCH.get(normalized)


def group_wc_search_terms(group_title: str | None) -> list[str]:
    """OR title fragments for group SQL fetch (empty → fall back to group_wc_search_term)."""
    normalized = normalize_group_title(group_title)
    if not normalized:
        return []
    any_terms = GROUP_WC_SEARCH_ANY.get(normalized)
    if any_terms:
        return list(any_terms)
    single = GROUP_WC_SEARCH.get(normalized)
    return [single] if single else []


def leaf_wc_search_term(leaf_title: str | None) -> str | None:
    key = (leaf_title or "").strip()
    if not key:
        return None
    return LEAF_WC_SEARCH.get(key)


def leaf_wc_search_terms(leaf_title: str | None) -> list[str]:
    """OR title fragments for leaf SQL fetch (empty → fall back to leaf_wc_search_term)."""
    key = (leaf_title or "").strip()
    if not key:
        return []
    any_terms = LEAF_WC_SEARCH_ANY.get(key)
    if any_terms:
        return list(any_terms)
    single = LEAF_WC_SEARCH.get(key)
    return [single] if single else []


def _allowed_db_leaves(ui_name: str) -> set[str]:
    key = (ui_name or "").strip().lower()
    if not key:
        return set()
    allowed = set(LEAF_DB_VALUES.get(key, {key}))
    allowed |= LEAF_ALIASES.get(key, set())
    return allowed


def leaf_matches_name(product_leaf: str | None, ui_name: str) -> bool:
    pl = (product_leaf or "").strip().lower()
    if not pl:
        return False
    allowed = _allowed_db_leaves(ui_name)
    if pl in allowed:
        return True
    if ui_name.strip().lower() == "power banks" and "power bank" in pl:
        return True
    return False


# Exact shop-page allowlist for Powerbanks category group.
_POWERBANKS_ALLOW_RE = [
    re.compile(p, re.I)
    for p in (
        r"\bj106\b",
        r"\bj115\b",
        r"\bj116\b",
        r"\bj128[ab]?\b",
        r"\bj132[ab]?\b",
        r"\bj134\b",
        r"\bj135\b",
        r"\bj139\b",
        r"\bj140a\b",
        r"\bj141\b",
        r"\bj142\b",
        r"\bj143\b",
        r"\bj145\b",
        r"\bj146[ab]?\b",
        r"\bj151a?\b",
        r"\bj152\b",
        r"\bj154a?\b",
        r"\bj155\b",
        r"\bj156[ab]?\b",
        r"\bj157\b",
        r"\bj158a?\b",
        r"\bj161\b",
        r"\bj162a?\b",
        r"\bj163a\b",
        r"\bq26a?\b",
        r"\bq32\b",
        r"\bq34\b",
        r"\bq37a?\b",
        r"\bq39\b",
        r"\bq43\b",
        r"\bq44a?\b",
        r"\bq45\b",
        r"\bq47\b",
        r"\bq48\b",
        r"\bq49\b",
        r"\bwd9029\b",
        r"\bwd9152\b",
        r"\bwd9266\b",
        r"\bsd2003\b",
        r"\bsd-?3207\b",
        r"vd-?pb0(?:41|42|58|59|60|61|62)\b",
        r"samsung\s+wireless\s+battery\s+pack",
        r"xiaomi\s+22\.5\s*w\s+lite\s+power\s*bank",
        r"xiaomi\s+33\s*w\s+type-?c\s+power\s*bank",
    )
]


def is_powerbank_title(title: str) -> bool:
    """Powerbanks group: only the shop-page allowlist."""
    t = title or ""
    return any(p.search(t) for p in _POWERBANKS_ALLOW_RE)


def is_powerbank_product(product: dict) -> bool:
    return is_powerbank_title(product.get("title") or "")


# Exact shop-page allowlist for Smartwatch category group.
_SMARTWATCH_WATCH_MODEL_RE = [
    re.compile(p, re.I)
    for p in (
        r"\by5\s*pro\b",
        r"\by7\s*pro\b",
        r"\by9\b",
        r"\by12\b",
        r"\by15\b",
        r"\by17\b",
        r"\by18\b",
        r"\by23\b",
        r"\by25\b",
        r"\by27\b",
        r"\by30\b",
        r"\by31\b",
        r"\by32\b",
        r"\by33\b",
        r"\by34\b",
        r"\by35\b",
        r"\by36\b",
    )
]

_SMARTWATCH_ACCESSORY_RE = [
    re.compile(p, re.I)
    for p in (
        r"\bas100\b",
        r"\bas101\b",
        r"\bas102\b",
        r"\bcw46\b",
        r"\bwa16\b",
        r"\bwa17\b",
        r"\bwa18\b",
        r"\bwa22\b",
        r"\bwa23\b",
        r"\bwa24\b",
        r"\bwh02\b",
        r"\bwh03\b",
        r"\bwh04\b",
        r"\bwh06\b",
        r"\bws3\b",
        r"\bwb1328\b",
        r"\bsa0049\b",
        # Watch charging cables (incl. Y26/Y29/Y37/Y41/Y42/Y43 cable-only SKUs)
        r"\by\d{1,2}\b.*(?:watch\s*)?charging\s*cable|(?:watch\s*)?charging\s*cable.*\by\d{1,2}\b",
        r"\by26\b.*\by27\b.*(?:charging\s*)?cable",
        # Generic straps / bands / cases / chargers for Apple Watch & sports watches
        r"watchband|watch\s*band|watch\s*strap",
        r"(?:silicon(?:e)?|leather|nylon|milan(?:ese)?|magnetic\s*chain)\s*strap",
        r"watch\s*charger|wireless\s*charger\s*for\s*i?\s*w?atch|charger\s*for\s*i?\s*w?atch",
        r"protective\s*case\s*for\s*iwatch|\biwatch\b.*(?:strap|band|case|charger)|(?:strap|band|case|charger).*\biwatch\b",
        r"\bi\s*watch\b.*(?:strap|band|case|charger|type-?c)",
    )
]

_SMARTWATCH_NOT_WATCH_RE = re.compile(
    r"charging\s*cable|watchband|watch\s*band|watch\s*strap|strap\s*for|"
    r"protective\s*case|watch\s*charger|\bas10[0-2]\b|\bcw46\b|"
    r"\bwa1[6-8]\b|\bwa2[2-4]\b|\bwh0[2-46]\b|\bws3\b|\bwb1328\b|\bsa0049\b|"
    r"back\s*cover|charging\s*board|sim\s*tray|touch\s*\+?\s*lcd|antishock|"
    r"\bbattery\b(?!\s*pack)",
    re.I,
)

_SMARTWATCH_WATCH_CONTEXT_RE = re.compile(
    r"smart\s*(?:sports\s*)?watch|sports\s*watch|call\s*ver(?:is|si)on|amoled",
    re.I,
)


def is_smartwatches_leaf_title(title: str) -> bool:
    """Smartwatches leaf: call/sports watches only (not bands/chargers/cables/phone parts)."""
    t = title or ""
    if _SMARTWATCH_NOT_WATCH_RE.search(t):
        return False
    if not _SMARTWATCH_WATCH_CONTEXT_RE.search(t):
        return False
    return any(p.search(t) for p in _SMARTWATCH_WATCH_MODEL_RE)


def is_smartwatch_accessories_title(title: str) -> bool:
    """Smartwatch Accessories leaf: bands, cases, chargers, charging cables."""
    t = title or ""
    return any(p.search(t) for p in _SMARTWATCH_ACCESSORY_RE)


def is_smartwatch_shop_title(title: str) -> bool:
    """Smartwatch group: shop-page watches + accessories allowlist."""
    return is_smartwatches_leaf_title(title) or is_smartwatch_accessories_title(title)


def is_smartwatch_shop_product(product: dict) -> bool:
    return is_smartwatch_shop_title(product.get("title") or "")


# Exact shop-page allowlist for Mobile Car (Car Support + Car Chargers).
_CAR_CHARGERS_ALLOW_RE = [
    re.compile(p, re.I)
    for p in (
        r"\bz47a\b",
        r"\bz53a\b",
        r"\bz54[ab]?\b",
        r"\bz57[ab]?\b",
        r"\bz49\b",
        r"\bz52\b",
        r"\bwa0204\b",
        r"\bwa0224\b",
        r"\bwa0225\b",
        r"\bsa0041\b",
        r"\bse5003\b",
        r"\bse5018\b",
        r"car\s*charger",
    )
]

_CAR_SUPPORT_ALLOW_RE = [
    re.compile(p, re.I)
    for p in (
        r"\bca103\b",
        r"\bca119\b",
        r"\bca121\b",
        r"\bca52\b",
        r"\bca55\b",
        r"\bca56\b",
        r"\bca67\b",
        r"\bca73\b",
        r"\bca76\b",
        r"\bca83\b",
        r"\bca86\b",
        r"\bca94\b",
        r"\bca95\b",
        r"\bcph01\b",
        r"\be58\b",
        r"\be81\b",
        r"\bh86\b",
        r"\bh91\b",
        r"\bh92\b",
        r"\bh88\b",
        r"\bh89\b",
        r"\bh80\b",
        r"\bh81\b",
        r"\bh82\b",
        r"\bh78\b",
        r"\bh79\b",
        r"\bh71\b",
        r"\bh72\b",
        r"\bh73\b",
        r"\bh74\b",
        r"\bh75\b",
        r"\bh68\b",
        r"\bh64\b",
        r"\bh65\b",
        r"\bh56\b",
        r"\bh57\b",
        r"\bh58\b",
        r"\bh59\b",
        r"\bh60\b",
        r"\bh44\b",
        r"\bh45\b",
        r"\bh38\b",
        r"\bh39\b",
        r"\bh36\b",
        r"\bh37\b",
        r"\bh30\b",
        r"\bh31\b",
        r"\bh32\b",
        r"\bh33\b",
        r"\bh34\b",
        r"\bh27\b",
        r"\bh28\b",
        r"\bh29\b",
        r"\bh22\b",
        r"\bh24\b",
        r"\bh19\b",
        r"\bh20\b",
        r"\bh15\b",
        r"\bh10\b",
        r"\bh3\b",
        r"\bh4\b",
        r"\bh5\b",
        r"\bh8\b",
        r"\bh9\b",
        r"\bhd10\b",
        r"\bhd6\b",
        r"\bhd8\b",
        r"\bhw29\b",
        r"\bhw30\b",
        r"\bhw31\b",
        r"\bhw32\b",
        r"\bhw33\b",
        r"\bhw3\b",
        r"\bhw5\b",
        r"\bhx41\b",
        r"\bk19\b",
        r"\bk23\b",
        r"\bk26\b",
        r"\bph29a\b",
        r"\bph23\b",
        r"\bph24\b",
        r"\bph34\b",
        r"\bph50\b",
        r"\bph52\b",
        r"\bwe5147\b",
        r"\bsd-?3370\b",
        r"\bsd-?3500\b",
        r"\bsd-?3504\b",
        r"\bsd-?3514\b",
        r"\bsd-?3584\b",
        r"\bsd-?3605\b",
        r"\bsd-?3630\b",
    )
]


def is_car_chargers_title(title: str) -> bool:
    t = title or ""
    return any(p.search(t) for p in _CAR_CHARGERS_ALLOW_RE)


def is_car_support_title(title: str) -> bool:
    t = title or ""
    if is_car_chargers_title(t):
        return False
    return any(p.search(t) for p in _CAR_SUPPORT_ALLOW_RE)


def is_mobile_car_title(title: str) -> bool:
    """Mobile Car group: car holders/mounts + car chargers."""
    return is_car_support_title(title) or is_car_chargers_title(title)


def is_mobile_car_accessories_title(title: str) -> bool:
    """Legacy alias for Mobile Car group matching."""
    return is_mobile_car_title(title)


def is_mobile_car_product(product: dict) -> bool:
    return is_mobile_car_title(product.get("title") or "")


def is_mobile_car_accessories_product(product: dict) -> bool:
    return is_mobile_car_product(product)


def is_car_support_product(product: dict) -> bool:
    return is_car_support_title(product.get("title") or "")


def is_car_chargers_product(product: dict) -> bool:
    return is_car_chargers_title(product.get("title") or "")


# --- Smartphones shop page (complete phones + tablets; not parts/accessories) ---

_SMARTPHONE_PART_OR_ACC_RE = re.compile(
    r"\b(?:battery|lcd|oled|flex|housing|frame|lens|charger|cable|case|speaker|"
    r"antenna|sim\s*tray|fingerprint|vibrator|design\s*cover|antishock|jelly|"
    r"magsafe|privacy|stand|support|holder|tripod|fixture|tool|glue|remote|"
    r"opener|welding|clamp|motherboard|repair|screen\s*protect|back\s*cover|"
    r"full\s*glue|camera\s*lens)\b",
    re.I,
)

_SMARTPHONE_ALLOW_RE = [
    re.compile(p, re.I)
    for p in (
        r"^smartphone\b",
        r"^apple\s+iphone\b.+\d+\s*gb\b",
        r"^samsung\s+galaxy\b.+\d+\s*gb\b",
        r"^samsung\s+tablet\b",
        r"^huawei\s+tablet\b",
        r"^astro\s+sr\b",
        r"^volfen\s+(?:nexo|orion)\b",
    )
]

# Narrow WooCommerce title scan for the Smartphones tab.
SMARTPHONE_WC_SEARCH_ANY: tuple[str, ...] = (
    "smartphone",
    "iphone 17",
    "galaxy a06",
    "galaxy a16",
    "galaxy a17",
    "galaxy m06",
    "galaxy m16",
    "galaxy 25 ultra",
    "galaxy 26 ultra",
    "redmi a5",
    "redmi a7",
    "redmi note 14",
    "redmi15",
    "astro sr",
    "volfen nexo",
    "volfen orion",
    "huawei tablet",
    "tablet grade a p580",
    "mobile phone",
)


def is_smartphone_title(title: str) -> bool:
    """Complete phones/tablets on the shop Smartphones page (excludes parts)."""
    t = (title or "").strip()
    if not t:
        return False
    if not any(p.search(t) for p in _SMARTPHONE_ALLOW_RE):
        return False
    if _SMARTPHONE_PART_OR_ACC_RE.search(t):
        return False
    return True


def is_smartphone_product(product: dict) -> bool:
    if (product.get("category") or "").strip() == "Smartphones":
        # Still require shop-page title shape so parts mis-tagged as phones are excluded.
        return is_smartphone_title(product.get("title") or "")
    return is_smartphone_title(product.get("title") or "")


# --- Laptop / PC accessories & parts (Accessories → Laptop) ---

_LAPTOP_CHARGER_RE = [
    re.compile(p, re.I)
    for p in (
        r"laptop\s*(?:adapter|adaptor|charger)",
        r"charger\s*for\s*laptop",
        r"(?:adapter|adaptor).*laptop",
        r"\bg-?1268\b",
        r"\bwa0(?:160|192|261|336)\b",
        r"\bwm7063\b",
        r"\bx103\b.*laptop|laptop.*\bx103\b|usb-?c\s*to\s*mag3",
    )
]

_LAPTOP_KEYBOARD_RE = [
    re.compile(p, re.I)
    for p in (
        r"\bkeyboard\b",
        r"\bteclado\b",
        r"\bsd-?(?:2064|3745|3746|3747)\b",
        r"\bgm18\b",
        r"\bk3186\b",
    )
]

_LAPTOP_MOUSE_RE = [
    re.compile(p, re.I)
    for p in (
        r"\bmouse\b",
        r"mouse\s*(?:pad|mat)",
        r"\bwg7(?:055|061|112)\b",
        r"\bwm7064\b",
        r"\bgm(?:14|15|19|21|22|24|25|28|37)\b",
        r"\bm915\b",
        r"\bsd-?3705\b",
    )
]

_LAPTOP_HUB_RE = [
    re.compile(p, re.I)
    for p in (
        r"\bwg7089\b",
        r"7\s*in\s*1",
        r"usb(?:\s|-)?c?\s*hub",
        r"type-?c\s*hub",
        r"multiport\s*(?:hub|adapter|dock)",
        r"docking\s*station",
    )
]

_LAPTOP_HOLDER_RE = [
    re.compile(p, re.I)
    for p in (
        r"laptop\s*(?:holder|stand|support)",
        r"\bph52\b",
    )
]

_LAPTOP_STORAGE_RE = [
    re.compile(p, re.I)
    for p in (
        r"\bud12\b",
        r"\bpssd\b",
        r"portable\s*(?:p?ssd|ssd)",
        r"mobile\s*ssd",
        r"external\s*ssd",
    )
]

_LAPTOP_CABLE_RE = [
    re.compile(p, re.I)
    for p in (
        r"\bvga\b",
        r"hdmi\s*splitter",
        r"\bsd-?(?:3822|4553|8163)\b",
    )
]

_LAPTOP_TOOLS_RE = [
    re.compile(p, re.I)
    for p in (
        r"\brl-?728b\b",
        r"laptop\s*repair\s*(?:screwdriver|tool)",
    )
]


def is_laptop_chargers_title(title: str) -> bool:
    t = title or ""
    return any(p.search(t) for p in _LAPTOP_CHARGER_RE)


def is_laptop_keyboards_title(title: str) -> bool:
    t = title or ""
    return any(p.search(t) for p in _LAPTOP_KEYBOARD_RE)


def is_laptop_mice_title(title: str) -> bool:
    t = title or ""
    # Keyboard+mouse combos belong primarily under Keyboards.
    if is_laptop_keyboards_title(t) and re.search(r"keyboard", t, re.I):
        if re.search(r"keyboard\s*(?:and|&)\s*mouse|mouse\s*(?:and|&)\s*keyboard", t, re.I):
            return False
    return any(p.search(t) for p in _LAPTOP_MOUSE_RE)


def is_laptop_hubs_title(title: str) -> bool:
    t = title or ""
    return any(p.search(t) for p in _LAPTOP_HUB_RE)


def is_laptop_holders_title(title: str) -> bool:
    t = title or ""
    return any(p.search(t) for p in _LAPTOP_HOLDER_RE)


def is_laptop_storage_title(title: str) -> bool:
    t = title or ""
    return any(p.search(t) for p in _LAPTOP_STORAGE_RE)


def is_laptop_cables_title(title: str) -> bool:
    t = title or ""
    # Keep phone HDMI shop cables in Cables → HDMI Cables.
    if re.search(r"\bhdmi\b", t, re.I) and not re.search(r"splitter|\bvga\b", t, re.I):
        if not any(p.search(t) for p in _LAPTOP_CABLE_RE):
            return False
    return any(p.search(t) for p in _LAPTOP_CABLE_RE)


def is_laptop_tools_title(title: str) -> bool:
    t = title or ""
    return any(p.search(t) for p in _LAPTOP_TOOLS_RE)


def is_laptop_title(title: str) -> bool:
    """Laptop group: PC / laptop accessories and parts."""
    return (
        is_laptop_chargers_title(title)
        or is_laptop_keyboards_title(title)
        or is_laptop_mice_title(title)
        or is_laptop_hubs_title(title)
        or is_laptop_holders_title(title)
        or is_laptop_storage_title(title)
        or is_laptop_cables_title(title)
        or is_laptop_tools_title(title)
    )


def is_laptop_product(product: dict) -> bool:
    return is_laptop_title(product.get("title") or "")


def is_laptop_chargers_product(product: dict) -> bool:
    return is_laptop_chargers_title(product.get("title") or "")


def is_laptop_keyboards_product(product: dict) -> bool:
    return is_laptop_keyboards_title(product.get("title") or "")


def is_laptop_mice_product(product: dict) -> bool:
    return is_laptop_mice_title(product.get("title") or "")


def is_laptop_hubs_product(product: dict) -> bool:
    return is_laptop_hubs_title(product.get("title") or "")


def is_laptop_holders_product(product: dict) -> bool:
    return is_laptop_holders_title(product.get("title") or "")


def is_laptop_storage_product(product: dict) -> bool:
    return is_laptop_storage_title(product.get("title") or "")


def is_laptop_cables_product(product: dict) -> bool:
    return is_laptop_cables_title(product.get("title") or "")


def is_laptop_tools_product(product: dict) -> bool:
    return is_laptop_tools_title(product.get("title") or "")


_ELECTRONICS_SD_RE = re.compile(
    r"\bsd-?(?:0023|0026|0029|0203|0205|0993|1020|1047|1050|1333|1636|1710|1804|"
    r"2351|2352|2411|3075|3207|3370|3433|3441|3461|3550|3556|3584|3605|"
    r"3635|3636|3641|3642|3645|3647|3787|3796|4210|"
    r"4211|4508|4550|4583|4593|5889|5890|5892|5897|5907|5935|5936|6235|6237|"
    r"6285|6455|7217|8188|8240)\b",
    re.I,
)

# Exact shop-page allowlist for Electronics category group (non-laptop leftovers).
_ELECTRONICS_ALLOW_RE = [
    re.compile(p, re.I)
    for p in (
        r"2\.4g\s*wireless\s*game\s*controller|game\s*controller.*joystick",
        r"\boki-?59\b",
        r"\bpa-?35\b",
        r"\bph-?42\b",
        r"doubleshock\s*4",
        r"\bsj4000\b",
        r"\bs10-?10\b|extrastar\s+starter",
        r"smart\s*tag\s*2|smart\s*tag2",
        r"\bgl-?69403\b",
        r"\bgl-?69408\b",
        r"\bgl-?69588\b",
        r"\bgl-?f6\b",
        r"\bgl-?pdf15\b",
        r"\bgl-?pdf4\b",
        r"\bgl-?69401\b",
        r"\bgl-?69407\b",
        r"\bgl-?70276\b",
        r"\bhi50\b",
        r"hocohi41|\bhi41\b",
        r"\bwa0218\b",
        r"\bwe5095\b",
        r"\bwe5147\b",
        r"\bwe5202\b",
        r"\bwr9081\b",
        r"\bwr9084\b",
        r"\bwr9091\b",
        r"\bwr9099\b",
        r"\bwr9143\b",
        r"\bwr9145\b",
        r"\bwr9153\b",
        r"\bwr9157\b",
        r"\bwr9158\b",
        r"\bwr9183\b",
        r"\bsa0114\b",
        r"\bsk1073\b",
        r"\bwg9186\b",
        r"84w\s*universal\s*charger.*scooter|scooter\s*elect",
        r"m2\s*tec\s+alarm\s*clock",
        r"\bm-?t1\b",
        r"onemax\s+metal\s*plates|metal\s*plates\s*universal\s*replacements",
        r"spark\s+high\s*speed\s*adjustable\s*fans|high\s*speed\s*adjustable\s*fans",
    )
]


def is_electronics_title(title: str) -> bool:
    """Electronics group: shop-page allowlist, excluding Laptop/PC items."""
    t = title or ""
    if is_laptop_title(t):
        return False
    if _ELECTRONICS_SD_RE.search(t):
        return True
    return any(p.search(t) for p in _ELECTRONICS_ALLOW_RE)


def is_electronics_product(product: dict) -> bool:
    return is_electronics_title(product.get("title") or "")

# Exact shop-page allowlist for Beautycare (HOCO HP series from the shop page).
# HP11 Plus is intentionally excluded; HP13 Plus is included.
_BEAUTYCARE_ALLOW_RE = re.compile(
    r"\bhp(?:11(?!\s*plus)|12|13(?:\s*plus)?|20|21|22|23|24|25|30|32|33|36|40|43|44|50|70)\b",
    re.I,
)


def is_beautycare_title(title: str) -> bool:
    """Beautycare group: only the shop-page allowlist."""
    return bool(_BEAUTYCARE_ALLOW_RE.search(title or ""))


def is_beautycare_product(product: dict) -> bool:
    return is_beautycare_title(product.get("title") or "")


# Exact shop-page allowlist for Cell AA/AAA batteries.
_CELL_AA_ALLOW_RE = [
    re.compile(p, re.I)
    for p in (
        r"\blr8d425\b",
        r"\blr1120\b",
        r"\blr1130\b",
        r"\blr41\b",
        r"\blr43\b",
        r"\blr44\b",
        r"\blr521\b",
        r"\blr621\b",
        r"\blr626\b",
        r"\blr721\b",
        r"\blr726l?\b",
        r"\blr754\b",
        r"\blr921\b",
        r"\blr936\b",
        r"\b9vx1\b",
        r"\bcr2032(?:x5)?\b",
        r"kodak\s+xtralife\s+alkaline\s+batteries\s*aaa",
        r"\blr14\b",
        r"\blr03\b",
        r"\blrg\b",
        r"\bcr2016\b",
        r"\bcr2025\b",
        r"\blr20\b",
        r"\b6lr61\b",
        r"\bcr123\b",
        r"\bcr2\b",
        r"\blr1\b",
        r"\blr6\b",
        r"\blrv08\b",
        r"\b23a\b",
        r"\b27a\b",
        r"\bcr1220\b",
        r"\bcr1616\b",
        r"\bcr1620\b",
        r"\bcr1632\b",
        r"\bcr2430\b",
        r"\bcr2450\b",
    )
]


def is_cell_aa_title(title: str) -> bool:
    """Cell AA/AAA group: only the shop-page allowlist."""
    t = title or ""
    return any(p.search(t) for p in _CELL_AA_ALLOW_RE)


def is_cell_aa_product(product: dict) -> bool:
    return is_cell_aa_title(product.get("title") or "")


def title_matches_group(title: str, group_title: str) -> bool:
    if group_title == "Powerbanks":
        return is_powerbank_title(title)
    if group_title == "Smartwatch":
        return is_smartwatch_shop_title(title)
    if group_title in ("Mobile Car", "Mobile Car Accessories"):
        return is_mobile_car_title(title)
    if group_title == "Laptop":
        return is_laptop_title(title)
    if group_title == "Electronics":
        return is_electronics_title(title)
    if group_title == "Beautycare":
        return is_beautycare_title(title)
    if group_title == "Cell AA/AAA":
        return is_cell_aa_title(title)
    if group_title == "Repairing Tools":
        return is_repairing_tools_title(title)
    patterns = TITLE_KEYWORDS.get(group_title)
    if not patterns:
        return False
    t = title or ""
    return any(re.search(p, t, re.I) for p in patterns)


_SPEAKER_HEADSET_EXCLUSIONS = re.compile(
    r"headphone|earphone|earbud|\btws\b|true\s*wireless|\bheadset\b",
    re.I,
)
_SPEAKER_REPAIR_TITLE_EXCLUSIONS = re.compile(
    r"speaker\s*flex|speaker\+sensor|earpiece|loud\s*speaker|ear\s*speaker|"
    r"headphone\s*jack|\bringer\b|\bbuzzer\b|"
    r"(?:iphone|ipad|samsung|xiaomi|huawei|oppo|realme|redmi|pixel|oneplus)\s+[^\n]{0,40}\bspeaker\b",
    re.I,
)


def is_speaker_product(product: dict) -> bool:
    """True for portable/bluetooth speakers & soundbars (not phone repair parts or earphones)."""
    title = product.get("title") or ""
    if _SPEAKER_REPAIR_TITLE_EXCLUSIONS.search(title):
        return False

    pl = (product.get("leaf_category") or "").strip().lower()
    if pl in {"speakers", "speaker"}:
        return True

    if not title_matches_group(title, "Speakers"):
        return False

    # Earphones/TWS that mention speaker drivers should not land in Speakers.
    if _SPEAKER_HEADSET_EXCLUSIONS.search(title) and not re.search(
        r"\bsoundbar\b|portable\s*(?:bluetooth\s*)?speaker|bluetooth\s*speaker|bt\s*speaker|wireless\s*speaker",
        title,
        re.I,
    ):
        return False
    return True


_CARD_EXCLUSIONS = re.compile(
    r"sim\s*tray|sim\s*reader|sim\s*card\s*tray|dual\s*sim|"
    r"\bsmartphone\b|\btablet\b|"
    r"green\s*lyca",
    re.I,
)

# Exact shop-page allowlist for SIM Cards leaf.
_SIM_CARD_ALLOW_RE = [
    re.compile(p, re.I)
    for p in (
        r"lyca\s*sim\s*card",
        r"lycamobile\s*national\s*card\s*l\b",
        r"lycamobile\s*national\s*card\s*xs\b",
        r"meo\s*card\s*5\s*gb",
        r"meo\s*sim\s*card\s*70",
        r"moche\s*sim\s*card",
        r"nos\s*like\s*55",
        r"uzo\s*sim\s*card",
        r"vodafone\s*5\s*gb\s*card",
        r"vodafone\s*easy\s*91",
        r"vodafone\s*easy\s*to\s*go",
        r"vodafone\s*go\s*total",
        r"vodafone\s*ready\s*(?:5|25|55|95)\s*gb",
        r"woo\s*sim\s*card",
    )
]

# Exact shop-page allowlist for Memory Cards leaf (includes TF/SD, pen drives, SSD).
_MEMORY_CARD_ALLOW_RE = [
    re.compile(p, re.I)
    for p in (
        r"\bhb22\b",
        r"\ba2v30\b",
        r"\bud10\b",
        r"\bud12\b",
        r"hoco\s+\d+\s*gb\s+(?:mini\s*usb\s*pen\s*drive|tf\s*memory\s*card|2-in-1\s*flash\s*drive)",
        r"philips\s+\d+\s*gb\s+(?:pen\s*drive|sd\s*memory\s*card)",
        r"philips\s+pen\s*drive\s+\d+\s*gb",
        r"philips\s+sd\s*memory\s*card\s*with\s*adapter",
        r"kingston\s+camera\s*sd\s*card",
        r"kingston\s+pen\s*drive",
        r"kingston\s+sd\s*memory\s*card",
        r"kingston\s+sdcs3",
        r"kingstone\s+\d+\s*gb",
    )
]


def is_sim_card_title(title: str) -> bool:
    """SIM Cards leaf: only the shop-page allowlist."""
    t = title or ""
    if _CARD_EXCLUSIONS.search(t):
        return False
    return any(p.search(t) for p in _SIM_CARD_ALLOW_RE)


def is_memory_card_title(title: str) -> bool:
    """Memory Cards leaf: only the shop-page allowlist."""
    t = title or ""
    if _CARD_EXCLUSIONS.search(t):
        return False
    return any(p.search(t) for p in _MEMORY_CARD_ALLOW_RE)


def is_cards_product(product: dict) -> bool:
    """Cards group: SIM Cards + Memory Cards shop allowlists."""
    title = product.get("title") or ""
    return is_sim_card_title(title) or is_memory_card_title(title)


_REPAIRING_TOOLS_RE = [
    re.compile(p, re.I)
    for p in (
        r"\brelife\b",
        r"\bjakemy\b",
        r"\b2uul\b",
        r"\bmechanic\b",
        r"screwdriver",
        r"tweezers",
        r"\bspudger\b",
        r"pry\s*tool",
        r"\bsolder",
        r"soldering",
        r"multimeter",
        r"flux\s*paste",
        r"\bbga\b",
        r"opening\s*tool",
        r"repair\s*tool",
        r"heat\s*gun",
        r"suction\s*cup",
        r"\bpliers\b",
        r"\brl-?\d",
        r"\bjm-[a-z0-9]",
    )
]


def is_repairing_tools_title(title: str) -> bool:
    t = title or ""
    if not t.strip():
        return False
    # Keep laptop-specific tools in the Laptop group.
    if is_laptop_tools_title(t):
        return False
    return any(p.search(t) for p in _REPAIRING_TOOLS_RE)


def is_repairing_tools_product(product: dict) -> bool:
    cat = (product.get("category") or "").strip().lower()
    if cat in {"repair tools", "repairing tools"}:
        return True
    leaf = (product.get("leaf_category") or product.get("part_type") or "").strip().lower()
    if leaf in {"repair tools", "repairing tools"}:
        return True
    return is_repairing_tools_title(product.get("title") or "")


def product_matches_group(product: dict, group_title: str) -> bool:
    # Speakers must match by leaf/title even when WooCommerce mis-tags them as Phone Parts.
    if group_title == "Speakers":
        return is_speaker_product(product)
    if group_title == "Cards":
        return is_cards_product(product)
    if group_title == "Repairing Tools":
        return is_repairing_tools_product(product)
    if group_title == "Powerbanks":
        return is_powerbank_product(product)
    if group_title == "Smartwatch":
        return is_smartwatch_shop_product(product)
    if group_title in ("Mobile Car", "Mobile Car Accessories"):
        return is_mobile_car_product(product)
    if group_title == "Laptop":
        return is_laptop_product(product)
    if group_title == "Electronics":
        return is_electronics_product(product)
    if group_title == "Beautycare":
        return is_beautycare_product(product)
    if group_title == "Cell AA/AAA":
        return is_cell_aa_product(product)

    cat = (product.get("category") or "").strip()
    leaves = CATEGORY_GROUPS.get(group_title, [])

    if cat == PHONE_PARTS_CATEGORY:
        if group_title in ("Headphones", "Audio & Microphone"):
            return any(product_matches_ui_leaf(product, name) for name in leaves)
        return False

    # Chargers / Cables share WooCommerce leaf "CHARGING" or "CABLES" — disambiguate by title.
    if group_title in ("Chargers", "Cables", "Headphones", "Audio & Microphone"):
        return any(product_matches_ui_leaf(product, name) for name in leaves)

    if any(leaf_matches_name(product.get("leaf_category"), name) for name in leaves):
        return True

    pl = (product.get("leaf_category") or "").strip().lower()
    if pl and pl in GROUP_DB_LEAVES.get(group_title, set()):
        return True

    sub = (product.get("subcategory") or "").strip().lower()
    if sub and sub in GROUP_SUBCATEGORIES.get(group_title, set()):
        return True

    if title_matches_group(product.get("title") or "", group_title):
        return True
    return False


def is_accessory_product(product: dict) -> bool:
    cat = (product.get("category") or "").strip()
    if cat == PHONE_PARTS_CATEGORY:
        return False
    if cat in {"Cards", "Smartphones"}:
        return False
    if cat in ACCESSORY_CATEGORIES:
        return True
    pl = (product.get("leaf_category") or "").strip().lower()
    accessory_leaves = set().union(*GROUP_DB_LEAVES.values()) | {
        "cases",
        "screen protection",
        "multi-brand",
        "repair tools",
    }
    return pl in accessory_leaves


def normalize_group_title(group_title: str | None) -> str | None:
    if not group_title:
        return None
    needle = group_title.strip().lower()
    if needle in GROUP_ALIASES:
        return GROUP_ALIASES[needle]
    for title in CATEGORY_GROUPS:
        if title.lower() == needle:
            return title
    return group_title.strip()


def resolve_group_title(q: str) -> str | None:
    needle = (q or "").strip().lower()
    if not needle:
        return None
    if needle in GROUP_ALIASES:
        return GROUP_ALIASES[needle]
    for title in CATEGORY_GROUPS:
        if title.lower() == needle:
            return title
    return None


def filter_by_group(products: list[dict], group_title: str) -> list[dict]:
    normalized = normalize_group_title(group_title)
    if not normalized or normalized not in CATEGORY_GROUPS:
        return products
    return [p for p in products if product_matches_group(p, normalized)]


MOBILE_PART_LEAVES = frozenset({
    "Screen / LCD Assembly",
    "Battery",
    "Back Glass / Cover",
    "Housing / Frame",
    "Charging Port Flex",
    "Front Camera",
    "Rear Camera",
    "Camera Lens",
    "Camera Lens Complete",
    "Camera Lens 3-IN-1",
    "Speaker / Earpiece",
    "Fingerprint Flex",
    "Side Buttons Flex",
    "Main Flex",
    "Vibrator Motor",
    "SIM Tray",
    "SIM Reader",
    "Antenna Flex",
    "Full Glue Glass",
    "Privacy Glass",
    "Normal Glass",
    "Curved Full Glue Glass",
    "Smart Watch Glass",
    "Silicon Soft Jelly",
    "Antishock Cover",
    "Flip Cover",
    "Ring Cover",
    "Magsafe Cover",
    "Magsafe cover",
    "Design cover",
    "Cases & Glass",
    "Repair Tools",
})

# Mobile parts model pages — glass & covers only (per model).
MODEL_GLASS_COVER_LEAVES = frozenset({
    "Full Glue Glass",
    "Privacy Glass",
    "Normal Glass",
    "Camera Lens 3-IN-1",
    "Camera Lens Complete",
    "Curved Full Glue Glass",
    "Smart Watch Glass",
    "Silicon Soft Jelly",
    "Antishock Cover",
    "Flip Cover",
    "Ring Cover",
    "Magsafe Cover",
    "Magsafe cover",
    "Design cover",
})


def is_model_glass_cover_product(product: dict) -> bool:
    return any(product_matches_mobile_part_leaf(product, leaf) for leaf in MODEL_GLASS_COVER_LEAVES)


def filter_model_glass_cover_products(products: list[dict]) -> list[dict]:
    return [p for p in products if is_model_glass_cover_product(p)]


def product_matches_mobile_part_leaf(product: dict, ui_leaf: str) -> bool:
    ui = (ui_leaf or "").strip().lower()
    if not ui:
        return False
    for field in ("leaf_category", "part_type"):
        val = (product.get(field) or "").strip().lower()
        if val == ui:
            return True
    title = (product.get("title") or "").upper()
    from woocommerce_classify import part_leaf_category

    detected = part_leaf_category(f" {title} ", [])
    if detected and detected.strip().lower() == ui:
        return True
    if leaf_matches_name(product.get("leaf_category"), ui_leaf):
        return True
    # Title keyword fallback (mirrors frontend categoryFilter.ts)
    up = f" {title} "
    title_rules: dict[str, list[str]] = {
        "full glue glass": ["FULL GLUE GLASS", " FULL GLUE "],
        "privacy glass": ["PRIVACY GLASS"],
        "normal glass": ["NORMAL GLASS", "TEMPERED GLASS"],
        "camera lens 3-in-1": ["CAMERA LENS 3", "3-IN-1"],
        "camera lens complete": ["LENS COMPLETE", "CAMERA LENS COMPLETE"],
        "curved full glue glass": ["CURVED FULL GLUE"],
        "smart watch glass": ["SMART WATCH GLASS", "SMARTWATCH GLASS"],
        "silicon soft jelly": ["SILICON SOFT JELLY", "SOFT JELLY"],
        "antishock cover": ["ANTISHOCK"],
        "flip cover": ["FLIP COVER"],
        "ring cover": ["RING COVER"],
        "magsafe cover": ["MAGSAFE"],
        "design cover": ["DESIGN COVER"],
    }
    for needle in title_rules.get(ui, []):
        if needle in up:
            return True
    return False


LEAF_TITLE_KEYWORDS: dict[str, tuple[str, ...]] = {
    "Adapters": (
        r"20\s*w\s*power\s*adapter",
        r"25\s*w\s*pd\s*adapter",
        r"45\s*w\s*pd\s*adapter",
        r"\bad504\b",
        r"\bqc-?2402\b",
        r"\bes5148\b",
        r"\bn75\b",
        r"\bhb26\b",
        r"\bhb28\b",
        r"\bhb41\b",
        r"\bhb45\b",
        r"\bls36\b",
        r"\bn22\b.*jetta|\bjetta\b.*\bn22\b",
        r"\bn25\b.*maker|\bmaker\b.*\bn25\b",
        r"\bn34\b.*dazzling|\bdazzling\b.*\bn34\b",
        r"\bn41\b.*almighty|\balmighty\b.*\bn41\b",
        r"\bn51\b.*scenery|\bscenery\b.*\bn51\b",
        r"\bn56\b.*fundador|\bfundador\b.*\bn56\b",
        r"\bn60\b.*gentle|\bgentle\b.*\bn60\b",
        r"\bn61\b",
        r"\bn62\b",
        r"\bn63\b",
        r"\bn69\b.*nuevo|\bnuevo\b.*\bn69\b",
        r"\bn70\b.*nuevo|\bnuevo\b.*\bn70\b",
        r"\bua17\b",
        r"\bua28\b",
        r"\bua29\b",
        r"\bua36c?\b",
        r"\bwa0216\b",
        r"\bwa0318\b",
        r"\bwa0348\b",
        r"\bwa0349\b",
        r"\bwb1208\b",
        r"\bwb1209\b",
        r"\bwb8342\b",
        r"\bwb8346\b",
        r"\bwb8349\b",
        r"\bwg7089\b",
        r"iphone\s*(?:adapter|adaptor|charger).*usb\s*c\s*to\s*c",
        r"\ba8667\b",
        r"\bsa0072\b",
        r"\bsa0081\b",
        r"\bsd0014\b",
        r"\bsk1061\b",
        r"\bonemax\b.*\botg\b|\botg\b.*\bonemax\b",
        r"\bsd-?3802\b",
        r"\bsd-?3804\b",
        r"\bsd-?3816\b",
        r"\bsd-?7248\b",
        r"\bsd-?7257\b",
        r"vd-?tc016ba\s*usb\s*adapter",
    ),
    "Lightning Chargers": (
        r"\bn22\b.*(?:type[-\s]?c\s*to\s*ip|c\s*to\s*ip)",
        r"\bn34\b.*(?:type[-\s]?c\s*to\s*ip|c\s*to\s*ip)",
        r"\bn41\b.*(?:type[-\s]?c\s*to\s*ip|c\s*to\s*ip)",
        r"\bn60\b.*(?:type[-\s]?c\s*to\s*ip|c\s*to\s*ip)",
        r"\bn61\b.*(?:type[-\s]?c\s*to\s*ip|c\s*to\s*ip)",
        r"\bn62\b.*(?:type[-\s]?c\s*to\s*ip|c\s*to\s*ip)",
        r"\bn63\b.*(?:type[-\s]?c\s*to\s*ip|c\s*to\s*ip)",
        r"\bhocon63\b",
        r"\bn69\b.*(?:type[-\s]?c\s*to\s*ip|c\s*to\s*ip)",
        r"\bn70\b.*(?:type[-\s]?c\s*to\s*ip|c\s*to\s*ip)",
        r"\bwa0200\b",
        r"\bwa0311\b",
        r"\bsa0005\b",
        r"\bsa0024\b",
        r"\bsa0027\b",
        r"\bsa0037\b",
        r"\bsa0056\b",
        r"\bsk0027\b",
        r"vd-?tc016ba\s*portable\s*charger.*a\s*to\s*[clm]\b",
        r"vd-?tc016ba\s*portable\s*charger.*a\s*to\s*(?:c|l|m)\b",
        r"vd-?tc016bc.*(?:c\s*to\s*ip|to\s*ip)",
    ),
    "Type-C Chargers": (
        r"20\s*w\s*power\s*adapter",
        r"25\s*w\s*pd\s*adapter",
        r"45\s*w\s*pd\s*adapter",
        r"\bn75\b",
        r"\bn22\b.*jetta",
        r"\bn34\b.*dazzling",
        r"\bn41\b.*almighty",
        r"\bn51\b.*scenery",
        r"\bn56\b.*fundador",
        r"\bn60\b.*gentle",
        r"\bn61\b",
        r"\bn62\b",
        r"\bn63\b",
        r"\bn69\b.*nuevo",
        r"\bn70\b.*nuevo",
        r"\bwa0192\b",
        r"\bwa0196\b",
        r"\bwa0303\b",
        r"\bwb1331\b",
        r"iphone\s*(?:adapter|adaptor|charger).*usb\s*c\s*to\s*c",
        r"\bsa0081\b",
        r"samsung\s*15\s*w\s*pd\s*power\s*adapter",
        r"\bsd-?3784\b",
        r"\bsd-?3789\b",
        r"vd-?tc016bc",
    ),
    "Micro-USB Chargers": (
        r"micro-?usb.*(?:charger|adapter|adaptador|adaptor)",
        r"(?:charger|adapter|adaptador|adaptor).*micro-?usb",
        r"\bmicro\s*charger\b",
        r"2\s*usb\s*micro",
        r"(?:charger|adapter|adaptador|adaptor).*\bmicro\b",
        r"\bmicro\b.*(?:charger|adapter)",
        r"usb-?a\s*to\s*micro",
        r"usb\s*a\s*to\s*micro",
        r"a\s*to\s*micro\b",
        r"a\s*to\s*m\b.*(?:charger|adapter)",
        r"(?:charger|adapter).*a\s*to\s*m\b",
        r"portable\s*charger.*(?:to\s*micro|a\s*to\s*m\b|micro-?usb|usb-?a\s*to\s*micro)",
    ),
    "Wireless Charger": (
        r"wireless\s*charger",
        r"magnetic\s*charger",
        r"\bmagsafe\b",
        r"wireless\s*charging\s*(?:pad|stand|dock|fast)?",
        r"wireless\s*fast\s*charging",
        r"magnetic\s*wireless",
        r"magnetic\s*.*wireless\s*(?:fast\s*)?charging",
        r"wireless\s*.*magnetic",
        r"\bqi\b.*(?:charger|charging|wireless)",
        r"(?:charger|charging).*\bqi\b",
        r"\bcw\d{2}\b.*(?:wireless|magnetic|charging)",
        r"(?:wireless|magnetic|charging).*\bcw\d{2}\b",
    ),
    "Lightning Cables": (
        r"light(?:n)?ing.*\bcables?\b",
        r"\bcables?\b.*light(?:n)?ing",
        r"to\s*light(?:n)?ing",
        r"light(?:n)?ing\s*data",
        r"a\s*to\s*l\b",
        r"usb(?:-?a)?\s*to\s*light(?:n)?ing",
        r"usb[-\s]?c\s*to\s*(?:light(?:n)?ing|iphone|ip\b)",
        r"type[-\s]?c\s*to\s*(?:ip|iphone|light(?:n)?ing)",
        r"c\s*to\s*ip",
        r"type\s*c\s*to\s*type\s*ip",
        r"to\s*type\s*ip",
        r"iphone.*\bcables?\b",
        r"\bcables?\b.*iphone",
        r"(?:charging\s*)?data\s*cable.*(?:\bip\b|iphone|light(?:n)?ing|ipx?)",
        r"(?:\bip\b|iphone|light(?:n)?ing|ipx?).*(?:charging\s*)?data\s*cable",
        r"\bipx?\b.*\bcables?\b",
        r"\bcables?\b.*\bipx?\b",
        r"\bcables?\b.*\bip\d{1,2}\b",
        r"\bip\d{1,2}\b.*\bcables?\b",
        r"(?:3|4)[-\s]?in[-\s]?1.*(?:cable|ip|light(?:n)?ing)",
        r"(?:cable|charging).*(?:3|4)[-\s]?in[-\s]?1.*(?:ip|light(?:n)?ing)",
        r"\+ip\d*",
        r"usb\+?ip|ip\s*spear|\bfor\s*iphone\b",
    ),
    "Type-C Cables": (
        r"type[-\s]?c.*\bcables?\b",
        r"\bcables?\b.*type[-\s]?c",
        r"usb[-\s]?c.*\bcables?\b",
        r"\bcables?\b.*usb[-\s]?c",
        r"usb-?a\s*to\s*c\b",
        r"usb\s*a\s*to\s*c\b",
        r"a\s*to\s*c\b",
        r"usb\s+to\s+type[-\s]?c",
        r"c\s*to\s*c\b",
        r"type[-\s]?c\s*to\s*type[-\s]?c",
        r"type\s*c\s*to\s*type\s*c",
        r"type[-\s]?c\s*to\s*c\b",
        r"c\s*to\s*(?:ip|lightning)",
        r"type[-\s]?c\s*to\s*(?:ip|iphone|ipx?)",
        r"usb[-\s]?c\s*to\s*(?:ip|iphone|light(?:n)?ing|mag)",
        r"for\s*type[-\s]?c",
        r"data\s*cable.*type[-\s]?c",
        r"type[-\s]?c.*data\s*cable",
        r"hdtv[-\s]?type[-\s]?c",
        r"type[-\s]?c\s*spear|micro\s*spear.*cable",
        r"2[-\s]?in[-\s]?1.*(?:c\s*to\s*c|type[-\s]?c|usb[-\s]?c)",
        r"(?:3|4)[-\s]?in[-\s]?1.*type[-\s]?c",
    ),
    "Micro Cables": (
        r"micro[-\s]?usb.*\bcables?\b",
        r"\bcables?\b.*micro[-\s]?usb",
        r"micro[-\s]?usb.*data\s*cable",
        r"data\s*cable.*micro[-\s]?usb",
        r"for\s*micro[-\s]?usb",
        r"usb-?a\s*to\s*micro",
        r"usb\s*a\s*to\s*micro",
        r"usb\s+to\s+micro",
        r"a\s*to\s*m\b",
        r"a\s*to\s*micro\b",
        r"to\s*micro\b",
        r"(?:charging\s*)?data\s*cable.*\bmicro\b",
        r"\bmicro\b.*(?:charging\s*)?data\s*cable",
        r"\bcables?\b.*\bmicro\b",
        r"\bmicro\b.*\bcables?\b",
        r"am\s*to\s*fm",
        r"usb\s*cable\s*2\.0\s*am",
    ),
    "Internet Cables": (
        r"\bethernet\b",
        r"\brj-?45\b",
        r"internet\s*cable",
        r"lan\s*cable",
        r"network\s*cable",
        r"flat\s*network",
        r"\bcat[-\s]?[56]\b",
        r"printer\s*cable",
        r"am\s*to\s*bm",
        r"\bus0?7\b.*network",
        r"network.*\bus0?7\b",
        r"pure\s*copper.*(?:network|lan|ethernet)",
    ),
    "HDMI Cables": (
        r"\bhdmi\b",
        r"\bhdtv\b",
        r"hdtv[-\s]?type",
        r"high\s*speed\s*hd\b",
        r"\bhd\s*cable\b",
        r"\bvga\b",
        r"display\s*port",
        r"av\s*to\s*hdtv",
        r"on[-\s]?screen\s*cable",
        r"to\s*hdtv",
        r"\bhb26\b",
        r"4\s*in\s*1\s*adapter",
        r"\bus0?8\b.*hdtv",
        r"\bua27\b",
        r"\bus10\b",
        r"usba?\s*to\s*micro\s*usb3",
        r"\bwb1379\b",
        r"printer\s*cable.*(?:type[-\s]?c|square\s*port)",
        r"\bwb291[89]\b",
        r"\bwb292[12]\b",
        r"\d\s*pin\s*power\s*cable",
        r"power\s*cable.*\d\s*pin",
        r"\bsd-?8189\b",
        r"\baoweixun\b",
    ),
    # Audio Cable: shop-page allowlist (mirrored by is_audio_cable_title).
    "Audio Cable": (
        r"\bls37\b",
        r"\bupa21\b",
        r"\bupa24\b",
        r"\bupa27\b",
        r"\bupa28\b",
        r"\bupa29\b",
        r"\bupa32b\b",
        r"\bwb1304\b",
        r"\bwb2868\b",
        r"\bsk1027\b",
        r"\bsk1030\b",
        r"\bsd-?7207\b",
        r"\bsd-?7211\b",
    ),
    "Headphones": (
        r"\bheadphones?\b",
        r"gaming\s*headphones?",
        r"wire\s*control",
        r"usb\s*7\.?1",
        r"\bW1[0-2]\d\b",
        r"(?:wireless|bt|bluetooth|stereo).*headphones?",
        r"headphones?.*(?:wireless|bt|bluetooth)",
        r"noise\s*cancell?ation.*headphones?",
    ),
    # Earphones: shop-page allowlist (mirrored by is_earphones_title).
    "Earphones": (
        r"\bl7\s*plus\b",
        r"\bm1\s*max\b",
        r"\bm1\s+original\b",
        r"\bm1\s*pro\b",
        r"\bm101\b",
        r"\bm111(?:\s*(?:max|pro))?\b",
        r"\bm113\b",
        r"\bm114\b",
        r"\bm115\b",
        r"\bm116\b",
        r"\bm60\b",
        r"\bm70\b",
        r"\bm83\b",
        r"\bm90\b",
        r"\bwc3418\b",
        r"\bwc3512\b",
        r"\bwc3481\b",
        r"\bwc8279\b",
        r"\bwc8286\b",
        r"\bwc8292\b",
        r"\bsc3006\b",
        r"\bsc3026\b",
        r"\bsc3027\b",
        r"\bsc3042\b",
        r"\bjbl\s+tune\s+31[0o]c\b",
        r"samsung\s+earphones?\s*3\.5",
        r"vd-?ear0(?:31|32|33)\b",
    ),
    "Wireless Headset": (
        r"\bba-?mini5\b",
        r"\bbh11\b",
        r"\bbh12\b",
        r"\be60\b",
        r"\be63\b",
        r"\bea4\b",
        r"\bea8\b",
        r"\beq10\b",
        r"\beq14\b",
        r"\beq15\b",
        r"\beq19\b",
        r"\beq22\b",
        r"\beq24\b",
        r"\beq25\b",
        r"\beq26\b",
        r"\beq27\b",
        r"\beq33\b",
        r"\beq1\b",
        r"\bew201\b",
        r"\bew41\b",
        r"\bew47\b",
        r"\bew61\b",
        r"\bew84\b",
        r"\bew85\b",
        r"\bew98\b",
        r"\bsc-?3035\b",
        r"\bsc3003\b",
        r"\bsc3004\b",
        r"enco\s+buds\s*3\b",
        r"buds\s*6\s*play",
        r"buds\s*8\s*active",
        r"buds\s*8\s*lite",
        r"\bbt020\b",
        r"\bbt055\b",
        r"vd-?bt055\b",
    ),
    "Neck Earphone": (
        r"\bes58\b",
        r"\bes62\b",
        r"\bes63\b",
        r"\bes64\b",
        r"\bes67\b",
        r"\bes68\b",
        r"\bes70\b",
        r"\bes71\b",
        r"\bes72\b",
        r"\bes73\b",
        r"\bes74\b",
        r"\bes75\b",
    ),
    # Smartwatch leaves use is_smartwatches_leaf_title / is_smartwatch_accessories_title.
    "Smartwatches": (
        r"\by5\s*pro\b",
        r"\by7\s*pro\b",
        r"\by9\b",
        r"\by12\b",
        r"\by15\b",
        r"\by17\b",
        r"\by18\b",
        r"\by23\b",
        r"\by25\b",
        r"\by27\b",
        r"\by30\b",
        r"\by31\b",
        r"\by32\b",
        r"\by33\b",
        r"\by34\b",
        r"\by35\b",
        r"\by36\b",
    ),
    "Smartwatch Accessories": (
        r"\bas100\b",
        r"\bas101\b",
        r"\bas102\b",
        r"\bcw46\b",
        r"\bwa16\b",
        r"\bwa17\b",
        r"\bwa18\b",
        r"\bwa22\b",
        r"\bwa23\b",
        r"\bwa24\b",
        r"\bwh02\b",
        r"\bwh03\b",
        r"\bwh04\b",
        r"\bwh06\b",
        r"\bws3\b",
        r"\bwb1328\b",
        r"\bsa0049\b",
        r"charging\s*cable",
    ),
    "Car Support": (
        r"\bca103\b",
        r"\bca119\b",
        r"\bca121\b",
        r"\bca52\b",
        r"\bca55\b",
        r"\bca56\b",
        r"\bca67\b",
        r"\bca73\b",
        r"\bca76\b",
        r"\bca83\b",
        r"\bca86\b",
        r"\bca94\b",
        r"\bca95\b",
        r"\bcph01\b",
        r"\be58\b",
        r"\be81\b",
        r"\bh86\b",
        r"\bh91\b",
        r"\bh92\b",
        r"\bh88\b",
        r"\bh89\b",
        r"\bh80\b",
        r"\bh81\b",
        r"\bh82\b",
        r"\bh78\b",
        r"\bh79\b",
        r"\bh71\b",
        r"\bh72\b",
        r"\bh73\b",
        r"\bh74\b",
        r"\bh75\b",
        r"\bh68\b",
        r"\bh64\b",
        r"\bh65\b",
        r"\bh56\b",
        r"\bh57\b",
        r"\bh58\b",
        r"\bh59\b",
        r"\bh60\b",
        r"\bh44\b",
        r"\bh45\b",
        r"\bh38\b",
        r"\bh39\b",
        r"\bh36\b",
        r"\bh37\b",
        r"\bh30\b",
        r"\bh31\b",
        r"\bh32\b",
        r"\bh33\b",
        r"\bh34\b",
        r"\bh27\b",
        r"\bh28\b",
        r"\bh29\b",
        r"\bh22\b",
        r"\bh24\b",
        r"\bh19\b",
        r"\bh20\b",
        r"\bh15\b",
        r"\bh10\b",
        r"\bh3\b",
        r"\bh4\b",
        r"\bh5\b",
        r"\bh8\b",
        r"\bh9\b",
        r"\bhd10\b",
        r"\bhd6\b",
        r"\bhd8\b",
        r"\bhw29\b",
        r"\bhw30\b",
        r"\bhw31\b",
        r"\bhw32\b",
        r"\bhw33\b",
        r"\bhw3\b",
        r"\bhw5\b",
        r"\bhx41\b",
        r"\bk19\b",
        r"\bk23\b",
        r"\bk26\b",
        r"\bph29a\b",
        r"\bph23\b",
        r"\bph24\b",
        r"\bph34\b",
        r"\bph50\b",
        r"\bph52\b",
        r"\bwe5147\b",
        r"\bsd-?3370\b",
        r"\bsd-?3500\b",
        r"\bsd-?3504\b",
        r"\bsd-?3514\b",
        r"\bsd-?3584\b",
        r"\bsd-?3605\b",
        r"\bsd-?3630\b",
    ),
    "Car Chargers": (
        r"\bz47a\b",
        r"\bz53a\b",
        r"\bz54[ab]?\b",
        r"\bz57[ab]?\b",
        r"\bz49\b",
        r"\bz52\b",
        r"\bwa0204\b",
        r"\bwa0224\b",
        r"\bwa0225\b",
        r"\bsa0041\b",
        r"\bse5003\b",
        r"\bse5018\b",
        r"car\s*charger",
    ),
    "Microphone": (
        r"\bbk5\b",
        r"\bl14\b",
        r"\bl15\b",
        r"\bl16\b",
        r"\bl17\b",
        r"\bl20a\b",
        r"\bl20\b",
        r"\bwe9171\b",
        r"\bwr9170\b",
        r"\bm2-?0905\b",
        r"vd-?mic030\b",
    ),
}

_NECK_EARPHONE_EXCLUSIONS = [re.compile(p, re.I) for p in (r"holder", r"car support", r"phone mount")]

_CHARGER_UI_LEAVES = frozenset({
    "Adapters",
    "Lightning Chargers",
    "Type-C Chargers",
    "Micro-USB Chargers",
    "Wireless Charger",
})

_CABLE_UI_LEAVES = frozenset({
    "Lightning Cables",
    "Type-C Cables",
    "Micro Cables",
    "Internet Cables",
    "HDMI Cables",
})

_AUDIO_UI_LEAVES = frozenset({
    "Headphones",
    "Earphones",
    "Wireless Headset",
    "Neck Earphone",
    "Microphone",
    "Audio Cable",
})


def is_charging_cable_title(title: str) -> bool:
    """True for data/charging cables (not wall plugs / wireless pads / charger sets)."""
    t = title or ""
    if re.search(r"\bpower\s*banks?\b|wireless\s*charger|magsafe|car\s*charger", t, re.I):
        return False
    # Charger bricks, PD adapters, and charger sets are not cables — even if a cable is included.
    if re.search(r"\b(?:chargers?|adapters?|adaptadores?|adaptors?)\b", t, re.I):
        return False
    if re.search(r"\bcables?\b|data\s*cable|charging\s*cable", t, re.I):
        return True
    if re.search(
        r"usb-?a\s*to\s*(?:c|lightning|micro|type-?c)|a\s*to\s*(?:c|l|m)\b|3\s*in\s*1.*(?:lightning|micro|type-?c)",
        t,
        re.I,
    ):
        return True
    return False


# Exact shop-page allowlist for Lightning Chargers.
_LIGHTNING_CHARGERS_ALLOW_RE = [
    re.compile(p, re.I)
    for p in (
        # HOCO C-to-IP / Type-C-to-IP charger sets only (not bare bricks).
        r"\bn22\b.*charger\s*set.*(?:type[-\s]?c\s*to\s*ip|c\s*to\s*ip)",
        r"\bn34\b.*charger\s*set.*(?:type[-\s]?c\s*to\s*ip|c\s*to\s*ip)",
        r"\bn41\b.*charger\s*set.*(?:type[-\s]?c\s*to\s*ip|c\s*to\s*ip)",
        r"\bn60\b.*charger\s*set.*(?:type[-\s]?c\s*to\s*ip|c\s*to\s*ip)",
        r"\bn61\b.*charger\s*set.*(?:type[-\s]?c\s*to\s*ip|c\s*to\s*ip)",
        r"\bn62\b.*charger\s*set.*(?:type[-\s]?c\s*to\s*ip|c\s*to\s*ip)",
        r"\bn63\b.*charger\s*set.*(?:type[-\s]?c\s*to\s*ip|c\s*to\s*ip)",
        r"\bhocon63\b.*(?:type[-\s]?c\s*to\s*ip|c\s*to\s*ip)",
        r"\bn69\b.*charger\s*set.*(?:type[-\s]?c\s*to\s*ip|c\s*to\s*ip)",
        r"\bn70\b.*charger\s*set.*(?:type[-\s]?c\s*to\s*ip|c\s*to\s*ip)",
        r"\bwa0200\b",
        r"\bwa0311\b",
        r"\bsa0005\b",
        r"\bsa0024\b",
        r"\bsa0027\b",
        r"\bsa0037\b",
        r"\bsa0056\b",
        r"\bsk0027\b",
        r"vd-?tc016ba\s*portable\s*charger.*a\s*to\s*(?:c|l|m)\b",
        r"vd-?tc016bc.*(?:c\s*to\s*ip|pd\s*c\s*to\s*ip)",
    )
]


def is_lightning_charger_title(title: str) -> bool:
    """Lightning Chargers leaf: only the shop-page allowlist."""
    t = title or ""
    if is_charging_cable_title(t):
        return False
    if re.search(r"car\s*charger|wireless\s*charger|magsafe|audio\s*jack|3\.5\s*mm", t, re.I):
        return False
    return any(p.search(t) for p in _LIGHTNING_CHARGERS_ALLOW_RE)


def is_micro_usb_charger_title(title: str) -> bool:
    """Micro-USB wall / portable chargers (incl. A-to-Micro kits)."""
    t = title or ""
    if is_charging_cable_title(t):
        return False
    if re.search(r"wireless\s*charger|magsafe|car\s*charger", t, re.I):
        return False
    # Passive converters (IP→Micro, Micro→Type-C adapters) are not chargers.
    if re.search(r"\badapters?\b|\badaptador|\badaptor\b", t, re.I) and not re.search(
        r"\bchargers?\b|portable\s*charger|wall\s*charger|\bmicro\s*charger\b",
        t,
        re.I,
    ):
        return False
    # Explicit Type-C / Lightning destination kits are not Micro-USB.
    if re.search(
        r"c\s*to\s*(?:c|ip)|type[-\s]?c\s*to\s*(?:type[-\s]?c|ip)|usb[-\s]?c\b.*(?:to\s*c|port)|"
        r"\blightning\b|a\s*to\s*l\b",
        t,
        re.I,
    ) and not re.search(r"micro-?usb|to\s*micro|a\s*to\s*m\b|\bmicro\s*charger\b", t, re.I):
        return False
    if is_lightning_charger_title(t) and not re.search(
        r"micro-?usb|to\s*micro|a\s*to\s*m\b|\bmicro\s*charger\b", t, re.I
    ):
        return False
    has_charger = bool(
        re.search(
            r"\b(?:chargers?)\b|wall\s*charger|portable\s*charger|\bmicro\s*charger\b",
            t,
            re.I,
        )
    )
    if not has_charger:
        return False
    return bool(
        re.search(
            r"micro-?usb|"
            r"\bmicro\s*charger\b|"
            r"\d\s*usb\s*micro|"
            r"2\s*usb\s*micro|"
            r"usb-?a\s*to\s*micro|"
            r"usb\s*a\s*to\s*micro|"
            r"a\s*to\s*micro\b|"
            r"a\s*to\s*m\b|"
            r"(?:charger).*\bmicro\b|"
            r"to\s*micro\b|"
            r"\bmicro\b.*(?:charger)",
            t,
            re.I,
        )
    )


# Exact shop-page allowlist for Type-C Chargers.
_TYPE_C_CHARGERS_ALLOW_RE = [
    re.compile(p, re.I)
    for p in (
        r"20\s*w\s*power\s*adapter",
        r"25\s*w\s*pd\s*adapter",
        r"45\s*w\s*pd\s*adapter",
        r"\bn75\b",
        r"\bn22\b.*jetta|\bjetta\b.*\bn22\b",
        r"\bn34\b.*dazzling|\bdazzling\b.*\bn34\b",
        r"\bn41\b.*almighty|\balmighty\b.*\bn41\b",
        r"\bn51\b.*scenery|\bscenery\b.*\bn51\b",
        r"\bn56\b.*fundador|\bfundador\b.*\bn56\b",
        r"\bn60\b.*gentle|\bgentle\b.*\bn60\b",
        r"\bn61\b",
        r"\bn62\b",
        r"\bn63\b",
        r"\bn69\b.*nuevo|\bnuevo\b.*\bn69\b",
        r"\bn70\b.*nuevo|\bnuevo\b.*\bn70\b",
        r"\bwa0192\b",
        r"\bwa0196\b",
        r"\bwa0303\b",
        r"\bwb1331\b",
        r"iphone\s*(?:adapter|adaptor|charger).*usb\s*c\s*to\s*c",
        r"\bsa0081\b",
        r"samsung\s*15\s*w\s*pd\s*power\s*adapter",
        r"\bsd-?3784\b",
        r"\bsd-?3789\b",
        r"vd-?tc016bc",
    )
]


def is_type_c_charger_title(title: str) -> bool:
    """Type-C Chargers leaf: only the shop-page allowlist."""
    t = title or ""
    if is_charging_cable_title(t):
        return False
    if re.search(r"car\s*charger|wireless\s*charger|magsafe", t, re.I):
        return False
    if not any(p.search(t) for p in _TYPE_C_CHARGERS_ALLOW_RE):
        return False

    # C-to-IP sets on this page are only N60 / N63 (N22 C-to-IP stays under Lightning).
    # Use (?!x) so "TO IPX/…" (WB1331) is not treated as C-to-IP.
    if re.search(r"(?:type[-\s]?c|usb[-\s]?c|\bc)\s*to\s*ip(?!x)", t, re.I):
        return bool(re.search(r"\bn60\b|\bn63\b", t, re.I))

    # N22 on Type-C page is C-to-C sets only (not bare brick without set if any IP kit slipped through).
    if re.search(r"\bn22\b", t, re.I):
        return bool(
            re.search(r"c\s*to\s*c|type[-\s]?c\s*to\s*type[-\s]?c", t, re.I)
        )

    # N41 / N61 on this page are C-to-C charger sets only.
    if re.search(r"\bn41\b", t, re.I):
        if not re.search(r"charger\s*set", t, re.I):
            return False
        return bool(re.search(r"c\s*to\s*c|type[-\s]?c\s*to\s*type[-\s]?c", t, re.I))
    if re.search(r"\bn61\b", t, re.I):
        return bool(
            re.search(r"charger\s*set", t, re.I)
            and re.search(r"c\s*to\s*c|type[-\s]?c\s*to\s*type[-\s]?c", t, re.I)
        )

    # VD-TC016BC C-to-IP belongs under Lightning; keep C-to-C / plain portable.
    if re.search(r"vd-?tc016bc", t, re.I) and re.search(r"c\s*to\s*ip", t, re.I):
        return False

    return True


def is_internet_cable_title(title: str) -> bool:
    """Ethernet / LAN / network / printer (AM-BM) cables."""
    t = title or ""
    if re.search(r"hdmi|charging\s*data\s*cable|type[-\s]?c\s*to|lightning|micro[-\s]?usb", t, re.I):
        # Allow printer / network titles that happen to mention usb elsewhere
        if not re.search(r"network|ethernet|rj-?45|lan\b|printer\s*cable|am\s*to\s*bm|cat[-\s]?[56]", t, re.I):
            return False
    return bool(
        re.search(
            r"\bethernet\b|"
            r"\brj-?45\b|"
            r"internet\s*cable|"
            r"lan\s*cable|"
            r"\blan\b.*(?:cable|cat)|"
            r"network\s*cable|"
            r"flat\s*network|"
            r"\bcat[-\s]?[56]\b|"
            r"printer\s*cable|"
            r"am\s*to\s*bm|"
            r"pure\s*copper.*(?:network|lan|ethernet|flat)|"
            r"\bus0?7\b.*(?:network|copper|flat)",
            t,
            re.I,
        )
    )


def is_hdmi_cable_title(title: str) -> bool:
    """HDMI / HDTV / VGA / display adapters and shop-page companions."""
    t = title or ""
    return bool(
        re.search(
            r"\bhdmi\b|"
            r"\bhdtv\b|"
            r"hdtv[-\s]?type|"
            r"high\s*speed\s*hd\b|"
            r"\bhd\s*cable\b|"
            r"\bvga\b|"
            r"display\s*port|"
            r"av\s*to\s*hdtv|"
            r"on[-\s]?screen\s*cable|"
            r"to\s*hdtv|"
            r"\bhb26\b|"
            r"4\s*in\s*1\s*adapter|"
            r"\bus0?8\b.*hdtv|"
            r"\bua27\b|"
            r"\bus10\b|"
            r"usba?\s*to\s*micro\s*usb3|"
            r"\bwb1379\b|"
            r"printer\s*cable.*(?:type[-\s]?c|square\s*port)|"
            r"\bwb291[89]\b|"
            r"\bwb292[12]\b|"
            r"\d\s*pin\s*power\s*cable|"
            r"power\s*cable.*\d\s*pin|"
            r"\bsd-?8189\b|"
            r"\baoweixun\b",
            t,
            re.I,
        )
    )


def is_micro_cable_title(title: str) -> bool:
    """Micro-USB charging/data cables (and a few shop-page neighbors like AM-to-FM)."""
    t = title or ""
    if not is_charging_cable_title(t) and not re.search(r"\bcables?\b|data\s*cable|am\s*to\s*fm", t, re.I):
        return False
    if is_wall_charger_title(t) and not is_charging_cable_title(t):
        return False
    # Pure Type-C / Lightning-only cables stay out (unless also micro).
    # Use usb[-\s]?c\b so "USB CABLE" is not treated as USB-C.
    if re.search(r"type[-\s]?c\b|usb[-\s]?c\b|c\s*to\s*c\b|light(?:n)?ing|c\s*to\s*ip", t, re.I) and not re.search(
        r"micro[-\s]?usb|to\s*micro|a\s*to\s*m\b|\bmicro\b|am\s*to\s*fm", t, re.I
    ):
        # Shop Micro page also lists some USB-A to Type-C silicone cables
        if re.search(r"usb-?a\s*to\s*type[-\s]?c|usb\s*a\s*to\s*type[-\s]?c", t, re.I):
            return True
        return False
    return bool(
        re.search(
            r"micro[-\s]?usb|"
            r"usb-?a\s*to\s*micro|"
            r"usb\s*a\s*to\s*micro|"
            r"usb\s+to\s+micro|"
            r"a\s*to\s*micro\b|"
            r"a\s*to\s*m\b|"
            r"to\s*micro\b|"
            r"(?:charging\s*)?data\s*cable.*\bmicro\b|"
            r"\bmicro\b.*(?:charging\s*)?(?:data\s*)?cable|"
            r"\bcables?\b.*\bmicro\b|"
            r"for\s*micro[-\s]?usb|"
            r"am\s*to\s*fm|"
            r"usb-?a\s*to\s*type[-\s]?c",
            t,
            re.I,
        )
    )


def is_type_c_cable_title(title: str) -> bool:
    """USB-C / Type-C charging & data cables (C-to-C, A-to-C, C-to-IP with Type-C)."""
    t = title or ""
    if not is_charging_cable_title(t) and not re.search(r"\bcables?\b|data\s*cable", t, re.I):
        return False
    if is_wall_charger_title(t) and not is_charging_cable_title(t):
        return False
    # Pure Lightning-only cables (no Type-C / USB-C / A-to-C) stay under Lightning.
    if is_lightning_cable_title(t) and not re.search(
        r"type[-\s]?c|usb[-\s]?c|c\s*to\s*c|a\s*to\s*c\b|usb-?a\s*to\s*c|usb\s+to\s+type|"
        r"hdtv[-\s]?type|mag\d|micro\s*spear|type[-\s]?c\s*spear|"
        r"hyper.*(?:pd\s*)?charging\s*data\s*cable|"
        r"2[-\s]?in[-\s]?1|\+c\b|c\s*to\s*ip\s*\+\s*c",
        t,
        re.I,
    ):
        return False
    return bool(
        re.search(
            r"type[-\s]?c|"
            r"usb[-\s]?c|"
            r"c\s*to\s*c\b|"
            r"type[-\s]?c\s*to\s*type[-\s]?c|"
            r"type\s*c\s*to\s*type\s*c|"
            r"usb-?a\s*to\s*c\b|"
            r"usb\s*a\s*to\s*c\b|"
            r"a\s*to\s*c\b|"
            r"usb\s+to\s+type[-\s]?c|"
            r"for\s*type[-\s]?c|"
            r"c\s*to\s*ip|"
            r"type[-\s]?c\s*to\s*(?:ip|iphone|ipx?|c\b)|"
            r"usb[-\s]?c\s*to\s*(?:ip|iphone|light(?:n)?ing|mag)|"
            r"hdtv[-\s]?type[-\s]?c|"
            r"type[-\s]?c\s*spear|"
            r"micro\s*spear.*(?:charging\s*)?(?:data\s*)?cable|"
            r"2[-\s]?in[-\s]?1.*(?:c\s*to\s*c|type[-\s]?c|\+c\b|c\s*to\s*ip)|"
            r"(?:3|4)[-\s]?in[-\s]?1.*type[-\s]?c|"
            # Shop Type-C page also lists some IP short cables in the same HOCO Hyper line
            r"hyper.*(?:pd\s*)?charging\s*data\s*cable.*\bip\b",
            t,
            re.I,
        )
    )


def is_lightning_cable_title(title: str) -> bool:
    """Lightning / iPhone / C-to-IP charging & data cables (incl. multi tips with IP)."""
    t = title or ""
    if not is_charging_cable_title(t) and not re.search(r"\bcables?\b|data\s*cable", t, re.I):
        return False
    if is_wall_charger_title(t) and not is_charging_cable_title(t):
        return False
    return bool(
        re.search(
            r"light(?:n)?ing|"
            r"\biphone\b|"
            r"\bipx?\b|"
            r"\bip\d{1,2}\b|"
            r"\bip\b|"
            r"a\s*to\s*l\b|"
            r"c\s*to\s*ip|"
            r"type[-\s]?c\s*to\s*(?:ip|iphone|light(?:n)?ing)|"
            r"usb[-\s]?c\s*to\s*(?:ip|iphone|light(?:n)?ing)|"
            r"type\s*c\s*to\s*type\s*ip|"
            r"to\s*type\s*ip|"
            r"\+ip\d*|"
            r"for\s*iphone|"
            r"ip\s*spear|"
            r"(?:3|4)[-\s]?in[-\s]?1.*(?:ip|light(?:n)?ing)|"
            r"(?:ip|light(?:n)?ing).*(?:3|4)[-\s]?in[-\s]?1",
            t,
            re.I,
        )
    )


def is_wireless_charger_title(title: str) -> bool:
    """Magnetic / Qi / MagSafe wireless charging pads and mounts."""
    t = title or ""
    if is_charging_cable_title(t):
        return False
    if re.search(r"\bpower\s*banks?\b", t, re.I):
        return False
    # Phone cases, repair parts, and bare MagSafe covers are not chargers.
    if re.search(
        r"\bcovers?\b|\bcases?\b|\bchip\b|\bflex\b|tempered|protector|back\s*glass|"
        r"charging\s*port|\bbatter(?:y|ies)\b",
        t,
        re.I,
    ):
        return False
    return bool(
        re.search(
            r"wireless\s*charger|"
            r"magnetic\s*charger|"
            r"magsafe\s*(?:charger|charging|pad|stand|dock|wireless)|"
            r"(?:charger|pad|stand|dock).*\bmagsafe\b|"
            r"wireless\s*(?:fast\s*)?charging|"
            r"magnetic\s*wireless|"
            r"magnetic\s*.*wireless|"
            r"wireless\s*.*magnetic|"
            r"\bqi\b.*(?:charger|charging|wireless)|"
            r"(?:charger|charging).*\bqi\b|"
            r"\bcw\d{2}\b.*(?:wireless|magnetic|charging)|"
            r"(?:wireless|magnetic|charging).*\bcw\d{2}\b",
            t,
            re.I,
        )
    )


# Exact shop-page allowlist for Adapters (model / SKU fragments).
_ADAPTERS_ALLOW_RE = [
    re.compile(p, re.I)
    for p in (
        r"20\s*w\s*power\s*adapter",
        r"25\s*w\s*pd\s*adapter",
        r"45\s*w\s*pd\s*adapter",
        r"\bad504\b",
        r"\bqc-?2402\b",
        r"\bes5148\b",
        r"\bn75\b",
        r"\bhb26\b",
        r"\bhb28\b",
        r"\bhb41\b",
        r"\bhb45\b",
        r"\bls36\b",
        r"\bn22\b.*jetta|\bjetta\b.*\bn22\b",
        r"\bn25\b.*maker|\bmaker\b.*\bn25\b",
        r"\bn34\b.*dazzling|\bdazzling\b.*\bn34\b",
        r"\bn41\b.*almighty|\balmighty\b.*\bn41\b",
        r"\bn51\b.*scenery|\bscenery\b.*\bn51\b",
        r"\bn56\b.*fundador|\bfundador\b.*\bn56\b",
        r"\bn60\b.*gentle|\bgentle\b.*\bn60\b",
        r"\bn61\b",
        r"\bn62\b",
        r"\bn63\b",
        r"\bn69\b.*nuevo|\bnuevo\b.*\bn69\b",
        r"\bn70\b.*nuevo|\bnuevo\b.*\bn70\b",
        r"\bua17\b",
        r"\bua28\b",
        r"\bua29\b",
        r"\bua36c?\b",
        r"\bwa0216\b",
        r"\bwa0318\b",
        r"\bwa0348\b",
        r"\bwa0349\b",
        r"\bwb1208\b",
        r"\bwb1209\b",
        r"\bwb8342\b",
        r"\bwb8346\b",
        r"\bwb8349\b",
        r"\bwg7089\b",
        r"iphone\s*(?:adapter|adaptor|charger).*usb\s*c\s*to\s*c",
        r"\ba8667\b",
        r"\bsa0072\b",
        r"\bsa0081\b",
        r"\bsd0014\b",
        r"\bsk1061\b",
        r"\bonemax\b.*\botg\b|\botg\b.*(?:iphone|type[-\s]?c|usb)",
        r"\bsd-?3802\b",
        r"\bsd-?3804\b",
        r"\bsd-?3816\b",
        r"\bsd-?7248\b",
        r"\bsd-?7257\b",
        r"vd-?tc016ba\s*usb\s*adapter",
    )
]


def is_adapter_charger_title(title: str) -> bool:
    """Adapters leaf: only the shop-page allowlist (not every charger/adapter)."""
    t = title or ""
    if is_charging_cable_title(t):
        return False
    if re.search(r"car\s*charger|wireless\s*charger|magsafe|\bcovers?\b|\bcases?\b", t, re.I):
        return False
    if not any(p.search(t) for p in _ADAPTERS_ALLOW_RE):
        return False
    # C-to-IP charger sets on the Adapters page are only N60 (plus UA29 / WB8346 pass-through adapters).
    if re.search(r"(?:type[-\s]?c|usb[-\s]?c|\bc)\s*to\s*ip", t, re.I):
        if re.search(r"\bua29\b|\bwb8346\b|\bwb8349\b", t, re.I):
            return True
        return bool(re.search(r"\bn60\b", t, re.I))
    # N61–N70 / N22 / N25… brick+set pages: drop other brands’ C-to-C sets not in allowlist — already gated by model.
    # Exclude N61–N70 / N62–N63 “SET (C to IP)” already handled; also drop SET C-to-C except N22.
    if re.search(r"charger\s*set", t, re.I) and re.search(r"c\s*to\s*c|type[-\s]?c\s*to\s*type[-\s]?c", t, re.I):
        return bool(re.search(r"\bn22\b", t, re.I))
    return True


def is_wall_charger_title(title: str) -> bool:
    """True for plug/wall USB adapters (bricks), not cables."""
    t = title or ""
    if is_charging_cable_title(t):
        return False
    if re.search(r"\bpower\s*banks?\b|wireless\s*charger|magsafe", t, re.I):
        return False
    return bool(
        re.search(
            r"\badapters?\b|\badaptador(?:es)?\b|wall\s*charger|plug\s*charger|"
            r"travel\s*(?:adapter|charger)|dual\s*usb\s*charger|gan\s*(?:charger|adapter)|"
            r"pd\s*(?:wall\s*)?charger|\bcharger\b",
            t,
            re.I,
        )
    )


_PHONE_REPAIR_AUDIO_EXCLUSIONS = [
    re.compile(p, re.I)
    for p in (
        r"headphone\s*jack",
        r"\bringer\b",
        r"\bbuzzer\b",
        r"earpiece",
        r"ear\s*speaker",
        r"loud\s*speaker",
        r"speaker\s*flex",
        r"headset\s*flex",
        r"microphone\s*(?:flex|sensor)",
    )
]


def is_phone_repair_audio_part(title: str, part_type: str | None = None) -> bool:
    t = title or ""
    if any(p.search(t) for p in _PHONE_REPAIR_AUDIO_EXCLUSIONS):
        return True
    pt = (part_type or "").strip()
    if pt == "Speaker / Earpiece":
        return True
    return False


def should_exclude_phone_part_from_audio(product: dict, ui_leaf: str) -> bool:
    if ui_leaf not in _AUDIO_UI_LEAVES:
        return False
    if (product.get("category") or "").strip() != PHONE_PARTS_CATEGORY:
        return False
    return is_phone_repair_audio_part(
        product.get("title") or "",
        product.get("part_type"),
    )


def is_smartwatch_product(product: dict, title: str | None = None) -> bool:
    t = title if title is not None else (product.get("title") or "")
    lc = (product.get("leaf_category") or "").strip().lower()
    if lc in {"smartwatches", "smartwatch accessories"}:
        return True
    if re.search(
        r"smartwatch|smart\s*watch|\biwatch\b|\bwatch\s*strap\b|"
        r"strap\s*for\s*(?:i\s*)?watch|\bleather\s*strap\s*for|\bWA\d{2}\b",
        t,
        re.I,
    ):
        return True
    if re.search(r"\bwatch\b", t, re.I) and re.search(r"strap|band|magnetic\s*chain|\d{2}/\d{2}", t, re.I):
        return True
    return False


def should_exclude_from_audio_leaf(product: dict, ui_leaf: str) -> bool:
    if ui_leaf not in _AUDIO_UI_LEAVES:
        return False
    return is_smartwatch_product(product)


# Exact shop-page allowlist for Earphones leaf.
_EARPHONES_ALLOW_RE = [
    re.compile(p, re.I)
    for p in (
        r"\bl7\s*plus\b",
        r"\bm1\s*max\b",
        r"\bm1\s+original\b",
        r"\bm1\s*pro\b",
        r"\bm101\b",
        r"\bm111(?:\s*(?:max|pro))?\b",
        r"\bm113\b",
        r"\bm114\b",
        r"\bm115\b",
        r"\bm116\b",
        r"\bm60\b",
        r"\bm70\b",
        r"\bm83\b",
        r"\bm90\b",
        r"\bwc3418\b",
        r"\bwc3512\b",
        r"\bwc3481\b",
        r"\bwc8279\b",
        r"\bwc8286\b",
        r"\bwc8292\b",
        r"\bsc3006\b",
        r"\bsc3026\b",
        r"\bsc3027\b",
        r"\bsc3042\b",
        r"\bjbl\s+tune\s+31[0o]c\b",
        r"samsung\s+earphones?\s*3\.5",
        r"vd-?ear0(?:31|32|33)\b",
    )
]


def is_earphones_title(title: str) -> bool:
    """Earphones leaf: only the shop-page allowlist."""
    t = title or ""
    return any(p.search(t) for p in _EARPHONES_ALLOW_RE)


# Exact shop-page allowlist for Wireless Headset leaf.
_WIRELESS_HEADSET_ALLOW_RE = [
    re.compile(p, re.I)
    for p in (
        r"\bba-?mini5\b",
        r"\bbh11\b",
        r"\bbh12\b",
        r"\be60\b",
        r"\be63\b",
        r"\bea4\b",
        r"\bea8\b",
        r"\beq10\b",
        r"\beq14\b",
        r"\beq15\b",
        r"\beq19\b",
        r"\beq22\b",
        r"\beq24\b",
        r"\beq25\b",
        r"\beq26\b",
        r"\beq27\b",
        r"\beq33\b",
        r"\beq1\b",
        r"\bew201\b",
        r"\bew41\b",
        r"\bew47\b",
        r"\bew61\b",
        r"\bew84\b",
        r"\bew85\b",
        r"\bew98\b",
        r"\bsc-?3035\b",
        r"\bsc3003\b",
        r"\bsc3004\b",
        r"enco\s+buds\s*3\b",
        r"buds\s*6\s*play",
        r"buds\s*8\s*active",
        r"buds\s*8\s*lite",
        r"\bbt020\b",
        r"\bbt055\b",
        r"vd-?bt055\b",
    )
]


def is_wireless_headset_title(title: str) -> bool:
    """Wireless Headset leaf: only the shop-page allowlist."""
    t = title or ""
    return any(p.search(t) for p in _WIRELESS_HEADSET_ALLOW_RE)


# Exact shop-page allowlist for Neck Earphone leaf.
_NECK_EARPHONE_ALLOW_RE = [
    re.compile(p, re.I)
    for p in (
        r"\bes58\b",
        r"\bes62\b",
        r"\bes63\b",
        r"\bes64\b",
        r"\bes67\b",
        r"\bes68\b",
        r"\bes70\b",
        r"\bes71\b",
        r"\bes72\b",
        r"\bes73\b",
        r"\bes74\b",
        r"\bes75\b",
    )
]


def is_neck_earphone_title(title: str) -> bool:
    """Neck Earphone leaf: only the shop-page allowlist."""
    t = title or ""
    return any(p.search(t) for p in _NECK_EARPHONE_ALLOW_RE)


# Exact shop-page allowlist for Microphone leaf.
_MICROPHONE_ALLOW_RE = [
    re.compile(p, re.I)
    for p in (
        r"\bbk5\b",
        r"\bl14\b",
        r"\bl15\b",
        r"\bl16\b",
        r"\bl17\b",
        r"\bl20a\b",
        r"\bl20\b",
        r"\bwe9171\b",
        r"\bwr9170\b",
        r"\bm2-?0905\b",
        r"vd-?mic030\b",
    )
]


def is_microphone_title(title: str) -> bool:
    """Microphone leaf: only the shop-page allowlist."""
    t = title or ""
    return any(p.search(t) for p in _MICROPHONE_ALLOW_RE)


# Exact shop-page allowlist for Audio Cable leaf.
_AUDIO_CABLE_ALLOW_RE = [
    re.compile(p, re.I)
    for p in (
        r"\bls37\b",
        r"\bupa21\b",
        r"\bupa24\b",
        r"\bupa27\b",
        r"\bupa28\b",
        r"\bupa29\b",
        r"\bupa32b\b",
        r"\bwb1304\b",
        r"\bwb2868\b",
        r"\bsk1027\b",
        r"\bsk1030\b",
        r"\bsd-?7207\b",
        r"\bsd-?7211\b",
    )
]


def is_audio_cable_title(title: str) -> bool:
    """Audio Cable leaf: only the shop-page allowlist."""
    t = title or ""
    return any(p.search(t) for p in _AUDIO_CABLE_ALLOW_RE)


def is_wired_earphone_title(title: str) -> bool:
    t = title or ""
    if re.search(
        r"3\.5\s*mm|aux\s*(?:plug|jack)|(?:type-?c|lightning|ip)\s*(?:plug|audio\s*jack)|"
        r"wire-?controlled|wire\s*control|wired\b|plug\s*and\s*play|"
        r"audio\s*jack\s*stereo|,\s*1\.2m|\b1\.2m\b",
        t,
        re.I,
    ):
        return True
    if re.search(r"\bearbuds?\b", t, re.I) and not re.search(
        r"wireless|bt|bluetooth|tws|true\s*wireless|\bEW\d{2}\b|\bEA\d\b|\bEQ\d{2}\b|\bbuds\b",
        t,
        re.I,
    ):
        return True
    return False


def is_wireless_earbud_title(title: str) -> bool:
    t = title or ""
    if is_wired_earphone_title(t):
        return False
    if re.search(r"\btws\b|true\s*wireless", t, re.I):
        return True
    if re.search(
        r"(?:wireless|bt|bluetooth).*(?:headset|earbuds?|buds)|"
        r"(?:headset|earbuds?).*(?:wireless|bt|bluetooth)",
        t,
        re.I,
    ):
        return True
    # Ven Dens / Vd-bt0xx compact buds are often mis-titled "Wireless Headphones".
    if re.search(
        r"(?:ven[- ]?dens|vd)[- ]*(?:bt|vd-?bt)?\s*\d{2,3}|\b(?:vd[- ]?)?bt0?\d{2,3}\b",
        t,
        re.I,
    ) and re.search(r"wireless|bluetooth|headphones?|earbuds?|buds|headset|\btws\b", t, re.I):
        return True
    if re.search(r"\bEW\d{2}\b|\bEA\d\b|\bEQ\d{2}\b", t, re.I):
        return True
    if re.search(r"open\s*[-]?\s*ear|open\s+bt\s+headphones?|open[- ]design|\bows\b", t, re.I):
        return True
    if re.search(r"\bbuds\b", t, re.I):
        return True
    return False


def is_earbud_style_title(title: str) -> bool:
    return is_wireless_earbud_title(title)


def is_over_ear_headphone_title(title: str) -> bool:
    t = title or ""
    if is_wireless_earbud_title(t):
        return False
    if re.search(r"headphone\s*jack", t, re.I):
        return False
    if re.search(r"(?:\btws\b|true\s*wireless)\s*headphones?\b", t, re.I) and not re.search(
        r"\bheadphones\b", t, re.I
    ):
        return False
    if re.search(r"\bheadphones\b", t, re.I):
        return True
    if re.search(
        r"(?:wireless|bt|bluetooth|stereo|gaming|noise\s*cancell?).*\bheadphones?\b",
        t,
        re.I,
    ):
        return True
    if re.search(r"\bheadphones?\b.*(?:wireless|bt|bluetooth|gaming|usb\s*7)", t, re.I):
        return True
    if re.search(r"\bW1[0-2]\d\b", t, re.I):
        return True
    return False


def is_tws_wireless_headset_title(title: str) -> bool:
    t = title or ""
    if is_over_ear_headphone_title(t):
        return False
    return bool(
        re.search(
            r"\btws\b|true\s*wireless|(?:wireless|bt|bluetooth).*\bheadset\b|"
            r"\bheadset\b.*(?:wireless|bt|bluetooth)|\bEW\d{2}\b|\bEA\d\b|\bEQ\d{2}\b",
            t,
            re.I,
        )
    )


_LEAF_TITLE_RE = {
    leaf: [re.compile(p, re.I) for p in patterns]
    for leaf, patterns in LEAF_TITLE_KEYWORDS.items()
}


def title_matches_ui_leaf(title: str, ui_leaf: str) -> bool:
    t = title or ""
    if ui_leaf == "Earphones":
        return is_earphones_title(t)
    if ui_leaf == "Wireless Headset":
        return is_wireless_headset_title(t)
    if ui_leaf == "Neck Earphone":
        return is_neck_earphone_title(t)
    if ui_leaf == "Smartwatches":
        return is_smartwatches_leaf_title(t)
    if ui_leaf in ("Accessories", "Smartwatch Accessories"):
        return is_smartwatch_accessories_title(t)
    if ui_leaf in ("Car Support", "Mobile Car Support"):
        return is_car_support_title(t)
    if ui_leaf == "Car Chargers":
        return is_car_chargers_title(t)
    if ui_leaf == "Laptop Chargers":
        return is_laptop_chargers_title(t)
    if ui_leaf == "Keyboards":
        return is_laptop_keyboards_title(t)
    if ui_leaf == "Mice":
        return is_laptop_mice_title(t)
    if ui_leaf == "Hubs & Docks":
        return is_laptop_hubs_title(t)
    if ui_leaf == "Laptop Holders":
        return is_laptop_holders_title(t)
    if ui_leaf == "PC Storage":
        return is_laptop_storage_title(t)
    if ui_leaf == "PC Cables":
        return is_laptop_cables_title(t)
    if ui_leaf == "Laptop Tools":
        return is_laptop_tools_title(t)
    if ui_leaf == "Microphone":
        return is_microphone_title(t)
    if ui_leaf == "Audio Cable":
        return is_audio_cable_title(t)
    if ui_leaf == "Fans":
        return is_electronics_title(t)
    if ui_leaf == "Hoco Beauty Care":
        return is_beautycare_title(t)
    if ui_leaf == "SIM Cards":
        return is_sim_card_title(t)
    if ui_leaf == "Memory Cards":
        return is_memory_card_title(t)
    if ui_leaf == "Cards":
        return is_sim_card_title(t) or is_memory_card_title(t)
    patterns = _LEAF_TITLE_RE.get(ui_leaf)
    if not patterns:
        return False
    if ui_leaf in _AUDIO_UI_LEAVES and is_phone_repair_audio_part(t):
        return False
    if ui_leaf in _AUDIO_UI_LEAVES and is_smartwatch_product({}, t):
        return False
    if ui_leaf == "Headphones":
        if re.search(r"headphone\s*jack", t, re.I):
            return False
        if is_wireless_headset_title(t) or is_neck_earphone_title(t):
            return False
        if is_wireless_earbud_title(t) or is_tws_wireless_headset_title(t):
            return False
        if re.search(r"\bearphones?\b", t, re.I) and not re.search(r"\bheadphones?\b", t, re.I):
            return False

    # Chargers vs cables (shared WooCommerce CHARGING / CABLES buckets)
    if ui_leaf in _CHARGER_UI_LEAVES:
        if ui_leaf == "Lightning Chargers":
            return is_lightning_charger_title(t)
        if ui_leaf == "Type-C Chargers":
            return is_type_c_charger_title(t)
        if ui_leaf == "Micro-USB Chargers":
            return is_micro_usb_charger_title(t)
        if ui_leaf == "Adapters":
            return is_adapter_charger_title(t)
        if ui_leaf == "Wireless Charger":
            return is_wireless_charger_title(t)
        if is_charging_cable_title(t):
            return False

    if ui_leaf in _CABLE_UI_LEAVES:
        if ui_leaf in {"Lightning Cables", "Type-C Cables", "Micro Cables"}:
            if is_wall_charger_title(t) and not is_charging_cable_title(t):
                return False
        if ui_leaf == "Lightning Cables":
            return is_lightning_cable_title(t)
        if ui_leaf == "Type-C Cables":
            return is_type_c_cable_title(t)
        if ui_leaf == "Micro Cables":
            return is_micro_cable_title(t)
        if ui_leaf == "Internet Cables":
            return is_internet_cable_title(t)
        if ui_leaf == "HDMI Cables":
            return is_hdmi_cable_title(t)

    return any(p.search(t) for p in patterns)


def product_matches_ui_leaf(product: dict, ui_leaf: str) -> bool:
    if should_exclude_phone_part_from_audio(product, ui_leaf):
        return False
    if should_exclude_from_audio_leaf(product, ui_leaf):
        return False
    pl = (product.get("leaf_category") or "").strip().lower()
    ui = (ui_leaf or "").strip().lower()
    title = product.get("title") or ""
    if pl and (pl == ui or pl == ui.rstrip("s")):
        if _LEAF_TITLE_RE.get(ui_leaf):
            return title_matches_ui_leaf(title, ui_leaf)
        return True
    if leaf_matches_name(product.get("leaf_category"), ui_leaf):
        patterns = _LEAF_TITLE_RE.get(ui_leaf)
        if not patterns:
            return True
        return title_matches_ui_leaf(title, ui_leaf)
    if title_matches_ui_leaf(title, ui_leaf):
        return True
    return False


def filter_by_leaf(products: list[dict], ui_leaf: str) -> list[dict]:
    if ui_leaf == "Cell AA/AAA":
        return [p for p in products if is_cell_aa_title(p.get("title") or "")]
    if ui_leaf in (
        "Laptop Chargers",
        "Keyboards",
        "Mice",
        "Hubs & Docks",
        "Laptop Holders",
        "PC Storage",
        "PC Cables",
        "Laptop Tools",
    ):
        return [p for p in products if title_matches_ui_leaf(p.get("title") or "", ui_leaf)]
    if ui_leaf in MOBILE_PART_LEAVES:
        return [p for p in products if product_matches_mobile_part_leaf(p, ui_leaf)]
    return [p for p in products if product_matches_ui_leaf(p, ui_leaf)]
