# GeminEye
 
 <div align="center">
  <img src="src/icon128.png" alt="GeminEye Logo" width="128"/>
   
   **A lightweight browser extension designed to monitor, estimate, and visualize resource consumption, token usage, and rate limits dynamically on the Gemini Web UI.**
   
   [![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)](#)
   [![Version 1.2.0](https://img.shields.io/badge/Version-1.2.0-brightgreen)](#)
   [![License: MIT](https://img.shields.io/badge/License-MIT-purple)](#)
   [![Platform](https://img.shields.io/badge/Platform-Chrome%20Extension-yellow)](#)
 </div>
 
 ## Overview
 
 **GeminEye** bridges the gap between server-side AI processing and client-side awareness. Because Google's proprietary web endpoints do not expose direct rate limits or token tallies on the frontend, this extension serves as an intelligent local ledger—intercepting UI text changes, estimating token metrics (using industry-standard ~4 chars/token heuristic), and updating a real-time floating usage progress bar seamlessly at the base of the viewport.

> [!IMPORTANT]
> **Disclaimer on Approximations:** Token counts and pricing metrics provided by GeminEye are **approximations**. Because the Gemini frontend uses private, server-side tokenization schemes, GeminEye utilizes an industry-standard heuristic (~4 characters per token) to calculate stats locally. Actual production token counts, prompt lengths, and API billing rates may vary depending on the target models, system instructions, and exact Google AI Studio / Vertex AI API parameters.
 
 ## Features
 
 - **Real-Time Token & Prompt Stats:** Injects a sleek floating panel that tracks your input/output tokens and prompt counts across hourly and daily windows using Chrome local storage.
 - **Context Bloat Warning (Phase 1):** The floating panel pulses a red warning when your current active conversation exceeds 35,000 tokens, indicating it's time to condense the chat.
 - **Dynamic "Prompt Pricing" Simulator:** Features preset token pricing structures for Gemini models (Gemini 2.5 Pro/Flash/Lite, Gemini 3 Flash, Gemini 3.1 Pro/Flash-Lite, Gemini 3.5 Flash) to dynamically compute API costs in real-time as you chat.
 - **Context Caching ROI Predictor:** Triggers visual notifications when your conversation surpasses 32,768 tokens, indicating context caching cost optimization opportunities.
 - **System Persona Playground:** Inject structural instructions (`[SYSTEM INSTRUCTION: ...]`) directly into the Gemini prompt box, seeded with clinical, security, and developer profiles.
 - **Pre-Flight Privacy Shield:** Intercepts outgoing queries matching common API keys or PII patterns with a prompt modal offering instant auto-redaction or bypassing.
 - **1-Click Bulk Deletion (V1.4):** Click the edit icon to reveal hidden red minus buttons on all sidebar chats, allowing you to bypass Google's tedious multi-click deletion menus.
 - **Chat Compacting (Phase 3):** Click the "Generate Chat Summary" button on the floating action bar to instantly inject a highly-structured summarization prompt directly into the current chat's reply box, generating a compact context snapshot in-place to save input tokens.
 - **Chat Forking (Phase 3):** Message-level Fork (split-branch icon) buttons are injected directly next to each message (styled natively to match the extension's controls). Click to branch the chat up to that point, opening a new session with a structured recap prompt covering objectives, last good state, key decisions, key artifacts, and constraints.

## Installation

1. Clone the repository: `git clone https://github.com/RhythmicDias/GeminEye.git`
2. Open Chrome/Edge and go to `chrome://extensions` or `edge://extensions`.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the `src` directory from this repository.

## How to Use & Features Guide

### 1. Stats Panel & Cost Simulator
* **How to open:** Look for the floating GeminEye gear button in the bottom-right corner of the Gemini screen. Hover over it to expand the details panel.
* **Pricing Simulator:** Select your active model from the **Active Model** dropdown list (e.g., *Gemini 3.5 Flash*, *Gemini 3.1 Pro*). The panel dynamically calculates the estimated Google Cloud API billing cost for the active session based on production token pricing.
* **Usage Caps:** Keep tabs on your rolling hourly and daily token limits under **Prompts/Hr** and **Prompts/Day**.

### 2. Context Caching ROI Predictor
* **How it triggers:** When the active chat exceeds **32,768 tokens**, GeminEye displays an interactive `ROI 💡` badge next to the cost value.
* **Action:** Click the badge to view a toast estimating your exact billing savings if context caching were applied to this workflow.

### 3. System Persona Playground
* **How to use:** 
  1. Click the **Snippet Library 📚** (document stack) icon on the floating action bar.
  2. Under **System Personas**, click any profile (like `🎭 JSON Scribe`, `🎭 Clinical Scribe`, or `🎭 Security Auditor`).
  3. The structured prompt instruction `[SYSTEM INSTRUCTION: ...] Please process the following:` will be automatically injected into your Gemini message area.
  4. You can add new prompts or system directives by typing in the bottom field and clicking **+ Prompt** or **+ System**.

### 4. Zero-Knowledge Privacy Shield
* **How to use:**
  1. Hover over the details card and switch the **Privacy Shield** toggle to **ACTIVE**.
  2. Paste any API Key (e.g. `AIzaSy...`) or PII pattern (emails, phone numbers) into the chat area and submit.
  3. GeminEye intercepts the message pre-flight and shows a modal:
     - **Auto-Redact**: Automatically replaces the sensitive text with `[REDACTED_...]` and sends.
     - **Send Anyway**: Bypasses the interceptor.
     - **Cancel**: Aborts sending so you can edit.

### 5. Chat Compacting & Forking
* **Forking:** Scroll to any message in the chat. A small Fork (split-branch icon) is embedded next to the response (styled to match the other extension icons). Click it to branch the conversation from that point. It automatically opens a fresh chat and pastes a structured recap prompt covering objectives, last good state, key decisions, key artifacts, and constraints.
* **Compacting:** Click the `Generate Chat Summary` icon on the floating action bar to instantly inject a structured summary prompt into the active chat. This generates a compact, copy-ready context block of the entire conversation directly in the active thread, avoiding token duplication.
* **Bulk Deletion:** Click the `Edit 🖊️` (pencil) icon on the action bar to reveal inline deletion minus buttons (`×`) next to all threads in Gemini's left sidebar, enabling rapid cleanup.

## Architecture

Built purely with vanilla HTML, CSS, and JavaScript, strictly adhering to the **Clean Code** principles and the **Manifest V3** standard.

## License
MIT License
