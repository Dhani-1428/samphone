import { createRoot } from "react-dom/client";
import App from "./App";
import { initClientHardening } from "./lib/security-hardening";
import "./index.css";

initClientHardening();

createRoot(document.getElementById("root")!).render(<App />);
