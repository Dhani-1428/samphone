import { useEffect } from "react";
import { useLocation } from "wouter";
import { useBrowseBehavior } from "@/contexts/BrowseBehaviorContext";

function normalizePath(location: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  if (!base) return location;
  return location.startsWith(base) ? location.slice(base.length) || "/" : location;
}

export default function BrowseRouteTracker() {
  const [loc] = useLocation();
  const { recordFromPath } = useBrowseBehavior();

  useEffect(() => {
    recordFromPath(normalizePath(loc));
  }, [loc, recordFromPath]);

  return null;
}
