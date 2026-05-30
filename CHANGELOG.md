# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-05-30
### Added
- **API Cost Simulator**: Integrated dynamic estimation for Gemini models (Gemini 2.5 Pro/Flash/Lite, Gemini 3 Flash, Gemini 3.1 Pro/Flash-Lite, Gemini 3.5 Flash).
- **Context Caching ROI Predictor**: Notifies when context caching triggers savings (>32k tokens).
- **System Persona Playground**: Supports structured inject-injectable template directives (`[SYSTEM INSTRUCTION: ...]`).
- **Pre-Flight Privacy Shield**: Intercepts prompts for API keys / PII and opens modal options (Auto-Redact, Bypass, Cancel).
- **Custom Branding/Icon**: Clean minimalist dark slate and golden-yellow logo assets (`icon16.png`, `icon48.png`, `icon128.png`).
- **Developer Features**: Delete buttons for prompt snippets and system personas.

### Fixed
- Fixed asynchronous double-counting when swapping chats.
- Guarded `chrome.runtime.sendMessage` with `chrome.runtime.id` to suppress "Extension context invalidated" console errors on update.
- Styled dropdown options explicitly to fix unreadable grey-on-light-grey text inside browser dropdown lists.

## [1.0.0] - 2026-05-30
### Added
- Initial release of GeminEye browser extension.
- Manifest V3 implementation.
- Real-time token usage estimation using DOM sniffing.
- Hourly and Daily rolling window metrics.
- Floating status bar at the bottom center of the screen.
