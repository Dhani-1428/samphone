import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ShoppingCart, Search, ChevronDown, Menu, X, Heart, SlidersHorizontal, Phone, User, LogIn } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const accessoriesColumns = [
  {
    title: "Screen Protection",
    items: ["Full Glue Glass", "Privacy Glass", "Normal Glass", "Camera Lens 3-IN-1", "Camera Lens Complete", "Curved Full Glue Glass", "Smart Watch Glass"],
  },
  {
    title: "Cases & Covers",
    items: ["Silicon Soft Jelly", "Antishock Cover", "Flip Cover", "Ring Cover", "Magsafe Cover", "Design Cover", "Wallet Cases"],
  },
  {
    title: "Chargers & Cables",
    items: ["Adapters", "Lightning Chargers", "Type-C Chargers", "Micro-USB Chargers", "Wireless Charger", "Lightning Cables", "Type-C Cables", "Micro Cables", "HDMI Cables"],
  },
  {
    title: "Audio & Wearables",
    items: ["Wireless Headset", "Headphones", "Neck Earphone", "Speakers", "Microphone", "Audio Cable", "Earphones", "Smartwatches", "Smartwatch Accessories"],
  },
  {
    title: "Hoco & Accessories",
    items: ["Original Accessories", "Hoco Beauty Care", "Other Hoco Accessories", "Hoco Power Banks", "Hoco Car Accessories", "Batteries AA"],
  },
];

const smartphonesColumns = [
  {
    title: "Apple & Samsung",
    items: ["iPhone Parts", "Samsung Parts", "Xiaomi Parts", "Oppo Reno Parts", "Realme Parts", "Huawei Parts"],
  },
  {
    title: "Other Brands",
    items: ["One Plus Parts", "Motorola Parts", "Alcatel Parts", "TCL Parts", "ZTE Parts", "Vivo Parts"],
  },
  {
    title: "More",
    items: ["Tablets", "Nokia Parts", "Google Pixel Parts", "LG Parts", "Other Parts", "Repair Tools"],
  },
];

const cardsColumns = [
  {
    title: "Memory Cards",
    items: ["MicroSD Cards", "SD Cards", "Class 10 Cards", "High Speed UHS-I", "High Speed UHS-II", "Industrial Cards"],
  },
  {
    title: "SIM Cards & Adapters",
    items: ["SIM Card Trays", "Nano SIM", "Micro SIM", "SIM Adapters", "Dual SIM Adapters"],
  },
];

const navLinks = [
  { label: "HOME", href: "/" },
  { label: "ACCESSORIES", href: "/accessories", dropdown: "accessories" },
  { label: "SMARTPHONES", href: "/smartphones", dropdown: "smartphones" },
  { label: "CARDS", href: "/cards", dropdown: "cards" },
  { label: "NEW", href: "/new" },
  { label: "MULTI BRAND", href: "/multi-brand" },
  { label: "CONTACT US", href: "/contact" },
];

type DropdownKey = "accessories" | "smartphones" | "cards" | null;

export default function Navbar() {
  const [location] = useLocation();
  const [openDropdown, setOpenDropdown] = useState<DropdownKey>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartCount] = useState(3);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = (key: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenDropdown(key as DropdownKey);
  };

  const handleMouseLeave = () => {
    closeTimer.current = setTimeout(() => setOpenDropdown(null), 150);
  };

  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  const dropdownData: Record<string, { columns: { title: string; items: string[] }[] }> = {
    accessories: { columns: accessoriesColumns },
    smartphones: { columns: smartphonesColumns },
    cards: { columns: cardsColumns },
  };

  return (
    <header className="w-full z-50 sticky top-0 shadow-md">
      {/* Top bar */}
      <div className="bg-background border-b border-border">
        <div className="container mx-auto px-4 md:px-6 py-1.5 flex items-center justify-between">
          <p className="text-xs text-muted-foreground hidden sm:block">Welcome to Samphone's online store</p>
          <div className="flex items-center gap-4 ml-auto">
            <a href="tel:+351937119295" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
              <Phone className="w-3 h-3" /> +351-937119295
            </a>
            <a href="#" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
              <User className="w-3 h-3" /> Registration
            </a>
            <a href="#" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
              <LogIn className="w-3 h-3" /> Log In
            </a>
          </div>
        </div>
      </div>

      {/* Logo + search + cart row */}
      <div className="bg-background border-b border-border">
        <div className="container mx-auto px-4 md:px-6 py-3 flex items-center gap-4 md:gap-8">
          <Link href="/" className="flex items-center gap-1 shrink-0">
            <span className="font-display font-bold text-2xl md:text-3xl text-primary leading-none">sam</span>
            <span className="font-display font-bold text-2xl md:text-3xl text-foreground leading-none">phone</span>
          </Link>

          <div className="flex-1 hidden md:flex items-center border border-border rounded-lg overflow-hidden bg-muted/40 focus-within:border-primary transition-colors">
            <input
              type="search"
              placeholder="To Search For..."
              className="flex-1 px-4 py-2.5 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              data-testid="input-search"
            />
            <button className="px-4 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors" data-testid="button-search">
              <Search className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-3 ml-auto md:ml-0">
            <button className="hidden md:flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors" data-testid="button-compare">
              <SlidersHorizontal className="w-4 h-4" /> Compare
            </button>
            <button className="hidden md:flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors" data-testid="button-wishlist">
              <Heart className="w-4 h-4" /> Wishlist
            </button>
            <button className="relative flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors" data-testid="button-cart">
              <div className="relative">
                <ShoppingCart className="w-5 h-5" />
                <span className="absolute -top-2 -right-2 w-4 h-4 bg-primary text-[10px] font-bold text-primary-foreground rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              </div>
            </button>
            <button className="md:hidden text-foreground" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} data-testid="button-mobile-menu">
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main nav bar - blue */}
      <nav className="bg-primary hidden md:block">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex items-stretch">
            {/* All Categories */}
            <div className="flex items-center gap-2 bg-accent px-5 py-3.5 text-accent-foreground font-semibold text-sm cursor-pointer shrink-0 hover:bg-accent/90 transition-colors">
              <Menu className="w-4 h-4" />
              <span>All Categories</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </div>

            {/* Nav links */}
            <div className="flex items-stretch flex-1">
              {navLinks.map((link) => (
                <div
                  key={link.label}
                  className="relative"
                  onMouseEnter={() => link.dropdown ? handleMouseEnter(link.dropdown) : undefined}
                  onMouseLeave={link.dropdown ? handleMouseLeave : undefined}
                >
                  <Link
                    href={link.href}
                    className={`flex items-center gap-1 px-4 py-3.5 text-sm font-semibold whitespace-nowrap transition-colors text-primary-foreground hover:bg-primary-foreground/10 ${location === link.href ? "bg-primary-foreground/15" : ""}`}
                    data-testid={`nav-link-${link.label.toLowerCase().replace(/\s/g, "-")}`}
                  >
                    {link.label}
                    {link.dropdown && <ChevronDown className="w-3 h-3 ml-0.5" />}
                  </Link>

                  {/* Mega dropdown */}
                  <AnimatePresence>
                    {link.dropdown && openDropdown === link.dropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.18 }}
                        className="absolute top-full left-0 z-50 bg-background border border-border shadow-2xl rounded-b-xl min-w-[600px] p-6"
                        onMouseEnter={() => { if (closeTimer.current) clearTimeout(closeTimer.current); }}
                        onMouseLeave={handleMouseLeave}
                      >
                        <div className={`grid gap-6 ${dropdownData[link.dropdown].columns.length >= 4 ? "grid-cols-4 lg:grid-cols-5" : "grid-cols-3"}`}>
                          {dropdownData[link.dropdown].columns.map((col) => (
                            <div key={col.title}>
                              <h4 className="font-display font-bold text-foreground text-xs uppercase tracking-wider mb-3 pb-2 border-b border-border">{col.title}</h4>
                              <ul className="space-y-2">
                                {col.items.map((item) => (
                                  <li key={item}>
                                    <a href="#" className="text-sm text-foreground/70 hover:text-primary transition-colors block">
                                      {item}
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background border-b border-border overflow-hidden"
          >
            <div className="px-4 py-4 flex flex-col gap-1">
              <div className="mb-3 flex items-center border border-border rounded-lg overflow-hidden">
                <input type="search" placeholder="Search..." className="flex-1 px-3 py-2 text-sm bg-transparent focus:outline-none" />
                <button className="px-3 py-2 bg-primary text-primary-foreground"><Search className="w-4 h-4" /></button>
              </div>
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold text-foreground hover:bg-muted transition-colors"
                >
                  {link.label}
                  {link.dropdown && <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
