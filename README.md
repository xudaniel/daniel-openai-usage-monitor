# Usage Pulse

[![MIT License](https://img.shields.io/badge/license-MIT-111827.svg)](LICENSE)

> Know your Codex runway before it runs out.

Usage Pulse is a private, local-first dashboard for monitoring Codex credits, included weekly usage, reset timing, and consumption pace. It turns two numbers from the official Codex usage page into a clearer operational view: **how much capacity is left, how quickly it is changing, and when action may be needed**.

**Live app:** [usage-pulse-daniel.danyelxu.chatgpt.site](https://usage-pulse-daniel.danyelxu.chatgpt.site)

![Usage Pulse social preview](public/og.png)

## Why Usage Pulse exists

Codex usage is easy to understand at a single moment but harder to reason about over time. A balance alone does not answer questions such as:

- Am I consuming credits faster than usual?
- Will my current balance last until the next included-usage reset?
- Did my latest work session materially change my runway?
- Should I buy credits now, wait for the reset, or switch to a lighter model?

Usage Pulse is designed to answer those questions without collecting account credentials or sending personal usage history to an application database.

## Current product

The current release provides:

- **Credit balance monitoring** with a visible low-balance threshold.
- **Included weekly usage tracking** as a percentage remaining.
- **Configurable reset countdown** displayed in the browser's local time.
- **Snapshot history** for the 30 most recent readings.
- **Change detection** between the latest two readings.
- **Runway estimation** based on observed credit decreases.
- **Freshness states**—Live, Recent, and Stale—based on the age of the latest reading.
- **Device-local persistence** using browser `localStorage`.
- **Responsive design** for desktop, tablet, and mobile.
- **Direct access** to the official Codex usage dashboard for source verification.

## How it works

Usage Pulse deliberately separates what can update continuously from what must currently be synchronized by the user.

### Continuously updated

- Current time
- Reset countdown
- Reading freshness
- Balance status relative to the low-credit threshold
- Runway calculations based on saved readings

### Manually synchronized

- Credits remaining
- Weekly allowance remaining

Personal ChatGPT/Codex credit balance does not currently have a documented public API feed. The app therefore asks the user to read the two current values from the [official Codex usage page](https://chatgpt.com/codex/settings/usage) and save a snapshot. This constraint is intentional: Usage Pulse does not scrape private endpoints, store session cookies, or ask for account credentials.

## Using the app

1. Open the [official Codex usage page](https://chatgpt.com/codex/settings/usage).
2. Note **Credits remaining** and **Weekly usage remaining**.
3. Open Usage Pulse and select **Sync reading**.
4. Enter the two values and save.
5. Repeat after meaningful work sessions or when deciding whether to purchase more credits.

The app retains up to 30 readings in the current browser. A new browser, device, private window, or cleared site storage starts with a separate history.

## Privacy and security model

Usage Pulse follows a minimal-data design.

### Stored locally

- Credit balance
- Weekly percentage remaining
- Reading timestamp
- Reading source label
- Alert preference

### Never requested or stored

- ChatGPT password
- Payment or card information
- OpenAI API keys
- ChatGPT cookies or session tokens
- Prompt or conversation content
- Browser history
- Identity documents or unrelated personal data

No D1 database or R2 bucket is configured. Current usage history stays in browser storage on the device where it was entered.

## Freshness and interpretation

| State | Meaning |
| --- | --- |
| **Live** | Latest reading is less than 5 minutes old. |
| **Recent** | Latest reading is between 5 and 60 minutes old. |
| **Stale** | Latest reading is more than 60 minutes old. |

“Live” describes the freshness of the last synchronized reading. It does **not** imply an authenticated real-time connection to the user’s OpenAI account.

Runway is an estimate, not a billing forecast. It uses the average credit decrease between saved readings that show consumption. Model choice, context size, reasoning effort, tools, images, and task duration can all change actual usage.

## Known limitations in v0.1

- Balance synchronization is manual.
- The alert preference and browser permission flow exist, but automatic threshold-notification dispatch is not yet complete.
- Data does not sync across browsers or devices.
- There is no export, import, or reset-history control in the UI.
- Runway becomes meaningful only after multiple credit-decrease readings have been saved.
- The low-credit threshold is currently fixed at 125 credits.

These limitations are addressed in the [Product Requirements Document](PRD.md) as part of the v1 roadmap.

## Technology

- React 19
- TypeScript
- vinext and Vite
- Cloudflare Workers-compatible output
- Tailwind CSS build tooling with product styling in `app/globals.css`
- Browser `localStorage` for device-local state
- Cloudflare Workers-compatible hosting

## Project structure

```text
daniel-openai-usage-monitor/
├── app/
│   ├── globals.css       # Visual system and responsive layout
│   ├── layout.tsx        # Metadata and social-preview configuration
│   └── page.tsx          # Dashboard behavior and UI
├── public/
│   └── og.png            # Social preview card
├── tests/                # Production-render and public-safety checks
├── PRD.md                # Product requirements and roadmap
└── README.md             # Project guide
```

## Local development

### Requirements

- Node.js 22.13 or newer
- npm

### Start the app

```bash
git clone https://github.com/xudaniel/daniel-openai-usage-monitor.git
cd daniel-openai-usage-monitor
npm ci
npm run dev
```

Open the local URL printed by the development server.

### Validate a production build

```bash
npm run build
```

### Lint

```bash
npm run lint
```

## Core data model

Each saved reading has the following shape:

```ts
type Reading = {
  id: string;
  credits: number;
  weeklyRemaining: number;
  capturedAt: string;
  source: "manual" | "local";
};
```

Readings are stored under `usage-pulse-readings`; the alert preference is stored under `usage-pulse-alerts`.
The configured reset time is stored under `usage-pulse-reset-at`.

## Product principles

1. **Honest status over false precision.** The interface must distinguish live calculations from manually synchronized account values.
2. **Privacy by default.** Do not request credentials or depend on undocumented account endpoints.
3. **Decision support, not decoration.** Every metric should help the user decide whether to continue, slow down, switch models, wait, or add credits.
4. **Calm urgency.** Low-balance states should be unmistakable without creating unnecessary anxiety.
5. **Useful with minimal effort.** A reading should take less than 20 seconds to record.

## Roadmap

- Explicit timezone selection
- Working low-credit and reset notifications
- Custom alert thresholds
- CSV/JSON export and import
- History deletion and full local reset
- Improved burn-rate and confidence calculations
- Installable PWA behavior
- Optional browser companion for user-authorized dashboard capture
- Optional encrypted multi-device sync if users explicitly opt in

## Documentation

- [Product Requirements Document](PRD.md)
- [Official ChatGPT and Codex pricing documentation](https://learn.chatgpt.com/docs/pricing)
- [OpenAI API Usage API](https://platform.openai.com/docs/api-reference/usage)

The API Usage endpoint applies to OpenAI API organization activity; it should not be represented as a personal ChatGPT/Codex credit-balance feed.

## Status

Usage Pulse is an early open-source release. It is suitable for personal tracking and product feedback, but its estimates should not be treated as invoices, billing records, or guaranteed capacity forecasts.

## Contributing

Issues and pull requests are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before proposing a change. Security concerns should follow [SECURITY.md](SECURITY.md), not a public issue.

## License

Usage Pulse is available under the [MIT License](LICENSE).
