# Changelog

All notable changes follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] — 2026-03-31

### Fixed

- LinkedIn’s newer feed UI (hashed classes): detect post roots via `div[role="listitem"]` + `componentkey` (`MAIN_FEED_RELEVANCE` / `FeedType_MAIN_FEED`), `data-testid` anchors, outer `componentkey` shells, comment-digest lines (ES/EN), shadow-DOM URN scan, and scroll-column chunk fallbacks.
- Text matching: fold Unicode “mathematical” Latin to ASCII; treat built-in `ai` / `ia` as **whole words** only (substring matches were hiding almost the entire feed); combine `innerText` + `textContent` for matching.

### Changed

- Content script: `document_end`, faster debounce / periodic rescan, `pageshow` bfcache refresh; popup saves custom keywords on textarea **blur** (avoids losing edits when the popup closes before debounce).
- Popup: keywords field fixed height, no resize handle, vertical scroll with themed scrollbar (Firefox `scrollbar-color` + WebKit pseudo-elements).

## [1.0.0] — 2026-03-31

### Added

- Initial public release: hide LinkedIn feed posts matching AI/ML keywords (built-in + custom).
- Popup UI (dark theme), `storage.local`, `tabs` messaging for Chrome MV3 and Firefox/Zen.
- `manifest-firefox-v2.json` for environments that need MV2.
- Docs: README, CONTRIBUTING, MIT license.

[Unreleased]: https://github.com/drakvyn/feed-fleaner-for-linkedIn/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/drakvyn/feed-fleaner-for-linkedIn/releases/tag/v1.1.0
[1.0.0]: https://github.com/drakvyn/feed-fleaner-for-linkedIn/releases/tag/v1.0.0
