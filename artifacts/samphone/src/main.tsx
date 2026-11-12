import { createRoot } from "react-dom/client";
import App from "./App";
import { initClientHardening } from "./lib/security-hardening";
import { installClerkLoadGuard } from "./lib/clerk-runtime";
import "./index.css";

initClientHardening();
installClerkLoadGuard();

createRoot(document.getElementById("root")!).render(<App />);
