import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ShoppingCart, Search, ChevronDown, Menu, X, Heart, SlidersHorizontal, Phone, User, LogIn, Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { accessoriesColumns, smartphonesColumns, cardsColumns } from "@/data/categories";
import { useTheme } from "@/contexts/ThemeContext";
import { useLang } from "@/contexts/LanguageContext";

type DropdownKey = "accessories" | "cards" | "allCategories" | null;

export default function Navbar() {
  const [location] = useLocation();
  const [openDropdown, setOpenDropdown] = useState<DropdownKey>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartCount] = useState(3);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang, t } = useLang();

  const handleMouseEnter = (key: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenDropdown(key as DropdownKey);
  };

  const handleMouseLeave = () => {
    closeTimer.current = setTimeout(() => setOpenDropdown(null), 150);
  };

  const closeMenu = () => setOpenDropdown(null);

  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  const navLinks = [
    { label: t("nav_home"), href: "/" },
    { label: t("nav_accessories"), href: "/accessories", dropdown: "accessories" },
    { label: t("nav_smartphones"), href: "/smartphones" },
    { label: t("nav_cards"), href: "/cards", dropdown: "cards" },
    { label: t("nav_new"), href: "/new" },
    { label: t("nav_multibrand"), href: "/multi-brand" },
    { label: t("nav_contact"), href: "/contact" },
  ];

  const dropdownColumns: Record<string, typeof accessoriesColumns> = {
    accessories: accessoriesColumns,
    cards: cardsColumns,
  };

  return (
    <header className="w-full z-50 sticky top-0 shadow-md">
      {/* Top bar */}
      <div className="bg-background border-b border-border">
        <div className="container mx-auto px-4 md:px-6 py-1.5 flex items-center justify-between">
          <p className="text-xs text-muted-foreground hidden sm:block">{t("welcome")}</p>
          <div className="flex items-center gap-3 ml-auto">
            <a href="tel:+351937119295" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
              <Phone className="w-3 h-3" /> {t("phone")}
            </a>
            <a href="#" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
              <User className="w-3 h-3" /> {t("registration")}
            </a>
            <a href="#" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
              <LogIn className="w-3 h-3" /> {t("login")}
            </a>
            {/* Language toggle */}
            <div className="flex items-center rounded-full border border-border overflow-hidden text-xs font-semibold">
              <button
                onClick={() => setLang("en")}
                className={`px-2 py-0.5 transition-colors ${lang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                data-testid="lang-en"
              >
                EN
              </button>
              <button
                onClick={() => setLang("pt")}
                className={`px-2 py-0.5 transition-colors ${lang === "pt" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                data-testid="lang-pt"
              >
                PT
              </button>
            </div>
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="w-6 h-6 flex items-center justify-center rounded-full border border-border text-muted-foreground hover:text-primary hover:border-primary transition-colors"
              data-testid="button-theme-toggle"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
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
              placeholder={t("searchPlaceholder")}
              className="flex-1 px-4 py-2.5 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              data-testid="input-search"
            />
            <button className="px-4 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors" data-testid="button-search">
              <Search className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-3 ml-auto md:ml-0">
            <button className="hidden md:flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
              <SlidersHorizontal className="w-4 h-4" /> {t("compare")}
            </button>
            <button className="hidden md:flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
              <Heart className="w-4 h-4" /> {t("wishlist")}
            </button>
            <button className="relative flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
              <div className="relative">
                <ShoppingCart className="w-5 h-5" />
                <span className="absolute -top-2 -right-2 w-4 h-4 bg-primary text-[10px] font-bold text-primary-foreground rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              </div>
            </button>
            <button className="md:hidden text-foreground" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
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
            <div
              className="relative shrink-0"
              onMouseEnter={() => handleMouseEnter("allCategories")}
              onMouseLeave={handleMouseLeave}
            >
              <div className="flex items-center gap-2 bg-accent px-5 py-3.5 text-accent-foreground font-semibold text-sm cursor-pointer hover:bg-accent/90 transition-colors h-full">
                <Menu className="w-4 h-4" />
                <span>{t("allCategories")}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
              <AnimatePresence>
                {openDropdown === "allCategories" && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                    className="absolute top-full left-0 z-50 bg-background border border-border shadow-2xl rounded-b-xl min-w-[500px] p-6"
                    onMouseEnter={() => { if (closeTimer.current) clearTimeout(closeTimer.current); }}
                    onMouseLeave={handleMouseLeave}
                  >
                    <h4 className="font-display font-bold text-foreground text-xs uppercase tracking-wider mb-4 pb-2 border-b border-border">
                      {t("nav_smartphones")} — {lang === "pt" ? "Por Marca" : "By Brand"}
                    </h4>
                    <div className="grid grid-cols-3 gap-6">
                      {smartphonesColumns.map((col) => (
                        <div key={col.title}>
                          <h5 className="font-semibold text-primary text-xs uppercase tracking-wider mb-3">{col.title}</h5>
                          <ul className="space-y-2">
                            {col.items.map((item) => (
                              <li key={item.slug}>
                                <Link href={`/category/${item.slug}`} onClick={closeMenu} className="text-sm text-foreground/70 hover:text-primary transition-colors block">
                                  {item.label}
                                </Link>
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

            {/* Nav links */}
            <div className="flex items-stretch flex-1">
              {navLinks.map((link) => (
                <div
                  key={link.href}
                  className="relative"
                  onMouseEnter={() => link.dropdown ? handleMouseEnter(link.dropdown) : undefined}
                  onMouseLeave={link.dropdown ? handleMouseLeave : undefined}
                >
                  <Link
                    href={link.href}
                    className={`flex items-center gap-1 px-4 py-3.5 text-sm font-semibold whitespace-nowrap transition-colors text-primary-foreground hover:bg-primary-foreground/10 ${location === link.href ? "bg-primary-foreground/15" : ""}`}
                  >
                    {link.label}
                    {link.dropdown && <ChevronDown className="w-3 h-3 ml-0.5" />}
                  </Link>

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
                        <div className={`grid gap-6 ${dropdownColumns[link.dropdown].length >= 4 ? "grid-cols-4 lg:grid-cols-5" : "grid-cols-3"}`}>
                          {dropdownColumns[link.dropdown].map((col) => (
                            <div key={col.title}>
                              <h4 className="font-display font-bold text-foreground text-xs uppercase tracking-wider mb-3 pb-2 border-b border-border">{col.title}</h4>
                              <ul className="space-y-2">
                                {col.items.map((item) => (
                                  <li key={item.slug}>
                                    <Link href={`/category/${item.slug}`} onClick={closeMenu} className="text-sm text-foreground/70 hover:text-primary transition-colors block">
                                      {item.label}
                                    </Link>
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
                <input type="search" placeholder={t("searchPlaceholder")} className="flex-1 px-3 py-2 text-sm bg-transparent focus:outline-none" />
                <button className="px-3 py-2 bg-primary text-primary-foreground"><Search className="w-4 h-4" /></button>
              </div>
              <div className="flex items-center gap-3 mb-2 px-1">
                <div className="flex items-center rounded-full border border-border overflow-hidden text-xs font-semibold">
                  <button onClick={() => setLang("en")} className={`px-2 py-0.5 ${lang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>EN</button>
                  <button onClick={() => setLang("pt")} className={`px-2 py-0.5 ${lang === "pt" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>PT</button>
                </div>
                <button onClick={toggleTheme} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
                  {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  {theme === "dark" ? "Light" : "Dark"}
                </button>
              </div>
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold text-foreground hover:bg-muted transition-colors">
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
