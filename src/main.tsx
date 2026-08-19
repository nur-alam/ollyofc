import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { syncServerClock } from "@/lib/clock";
import "./scss/styles.css";
import "./scss/index.scss";

void syncServerClock();

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
