# PROJECT.md: Antigravity 🌌
> A lightweight browser extension designed to monitor, estimate, and visualize resource consumption, token usage, and rate limits dynamically on the Gemini Web UI.

---

## 📌 Project Overview
**Antigravity** bridges the gap between server-side AI processing and client-side awareness. Because Google's proprietary web endpoints do not expose direct rate limits or token tallies, this extension serves as an intelligent local ledger—intercepting UI text changes, estimating token metrics, and updating real-time floating usage progress bars seamlessly at the base of the viewport.

### Core Objectives
* **Zero UI Friction:** Inject a beautiful, native-feeling status bar at the bottom of `gemini.google.com` that updates asynchronously without disrupting the chat flow.
* **Intelligent Token Estimation:** Sniff prompt inputs and stream outputs using local text-parsing rules to gauge model overhead without relying on heavy external backends.
* **Rolling Window Metrics:** Track hourly/daily rate boundaries locally using persistent background scripts to accurately calculate reset timelines.

---

## 🏗️ Architectural Topology

The project is structured following the modern **Manifest V3** extension standard to preserve performance and respect memory constraints.