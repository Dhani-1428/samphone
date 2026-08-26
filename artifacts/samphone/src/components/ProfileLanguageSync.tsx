import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { LANG_OPTIONS, useLang, type Lang } from "@/contexts/LanguageContext";

/** Keep website language in sync with the profile (same as the app). */
export default function ProfileLanguageSync() {
  const { user } = useAuth();
  const { setLang } = useLang();
  const applied = useRef<string | null>(null);

  useEffect(() => {
    const next = (user?.language || "").toLowerCase();
    if (!next || applied.current === next) return;
    if (!LANG_OPTIONS.some((o) => o.id === next)) return;
    applied.current = next;
    setLang(next as Lang);
  }, [user?.language, setLang]);

  return null;
}
