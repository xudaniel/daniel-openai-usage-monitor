# Usage Pulse — Product Requirements Document

| Field | Value |
| --- | --- |
| Product | Usage Pulse |
| Document status | Draft for v1.0 |
| Current release | v1.5 open-source release |
| Product type | Local-first personal usage dashboard |
| Primary platform | Responsive web app |
| Owner | Daniel Xu |
| Last updated | August 8, 2026 |

## 1. Executive summary

Usage Pulse helps individual Codex users understand and manage their available capacity. It combines current credit balance, included weekly allowance, reset timing, and saved historical readings into one decision-oriented dashboard.

The product is not intended to replace OpenAI’s official usage page. The official page remains the source of truth. Usage Pulse provides the analytical layer around that source: freshness, change, runway, thresholds, and historical context.

The v1 product must remain explicit about the boundary between:

- **Account data:** values sourced from the official usage dashboard.
- **Local calculations:** countdowns, freshness, changes, averages, and projections calculated by Usage Pulse.
- **Estimates:** runway and burn-rate outputs that may differ from actual future consumption.

## 2. Problem statement

### User problem

An individual Codex user can see the current remaining allowance but cannot easily answer:

- Whether usage is accelerating or slowing.
- How a recent work session affected the balance.
- Whether the available credits are likely to last until reset.
- When a low balance deserves action.
- Whether purchasing additional credits is necessary now or can be deferred.

The result is avoidable uncertainty, repeated manual checking, and reactive purchasing decisions.

### Product opportunity

Turn periodic balance readings into a small personal operating system for capacity decisions—without requiring account credentials, private endpoint access, or server-side storage.

## 3. Product vision

> Give every Codex user a calm, trustworthy answer to “Can I keep working, and for how long?”

Usage Pulse should feel less like a billing console and more like a fuel gauge with memory: immediately understandable, quietly predictive, and honest about uncertainty.

## 4. Goals

### Primary goals

1. Make remaining capacity understandable in under five seconds.
2. Let a user save a new reading in under 20 seconds.
3. Show whether the latest reading is fresh enough to rely on.
4. Surface when the user crosses a configurable low-credit threshold.
5. Estimate runway from the user’s own observed consumption.
6. Keep personal usage history private by default.

### Secondary goals

1. Help users make better buy-versus-wait decisions.
2. Encourage lower-cost model choices when appropriate.
3. Create an evidence base for future automated synchronization if a supported personal usage feed becomes available.
4. Support an optional browser companion without weakening the core privacy model.

## 5. Non-goals

Usage Pulse v1 will not:

- Replace or dispute OpenAI billing records.
- Predict exact future credit consumption.
- Collect ChatGPT passwords, cookies, or payment details.
- Call undocumented OpenAI endpoints.
- Monitor prompt content or classify user conversations.
- Make purchases or enable auto-reload.
- Provide team-wide cost allocation or administrator analytics.
- Track API organization costs unless introduced later as a clearly separate product mode.

## 6. Target users

### Primary persona: high-frequency individual user

A Plus or Pro user who relies on Codex for sustained professional work and needs to avoid interruption.

**Needs**

- Immediate capacity visibility
- Reset timing
- Low-balance warning
- Confidence that personal account data is not being harvested

### Secondary persona: budget-conscious power user

A user who purchases credits occasionally and wants to understand whether additional credits are justified.

**Needs**

- Burn-rate history
- Purchase timing support
- Custom thresholds
- Exportable records

### Future persona: workspace operator

A Business, Enterprise, or Edu administrator with supported analytics access. This persona is out of scope for v1 and must not be mixed with the personal-credit experience.

## 7. Jobs to be done

1. **When I am close to my included limit,** help me understand whether my purchased credits can carry me to reset.
2. **After a long Codex session,** help me record the new balance and see the impact.
3. **When my balance is low,** notify me early enough to change behavior or add credits deliberately.
4. **When I consider buying credits,** show the reset timing and recent pace so I can avoid an unnecessary purchase.
5. **When a reading is old,** make that obvious so I do not mistake stale data for a current account balance.

## 8. Product principles

### 8.1 Source-of-truth clarity

The official Codex usage dashboard is authoritative. Usage Pulse must label imported or manually entered values as readings, not verified billing records.

### 8.2 Privacy before automation

Automation is valuable only when achieved through a supported, user-authorized method. No feature may require account passwords, copied cookies, session tokens, or undocumented private endpoints.

### 8.3 Explainable estimates

Every projection must be traceable to saved readings and display its confidence or data sufficiency.

### 8.4 Actionable hierarchy

The first viewport must prioritize:

1. Credits remaining
2. Included allowance remaining
3. Time until reset
4. Freshness
5. Runway and recent change

### 8.5 Calm urgency

Warnings should become stronger as the situation becomes more urgent, but the product must avoid manipulative purchase pressure.

## 9. Current-state assessment

### Available in v1.5

- Manual credit and weekly-percentage readings
- Local storage of 30 readings
- Freshness classification
- Credit delta between readings
- Basic runway calculation
- Fixed low-credit threshold at 125
- Fixed reset timestamp
- Responsive UI
- Browser notification-permission preference
- Link to the official usage dashboard

### Gaps to close for v1

- Reset timestamp must be user-configurable and renewable.
- Notification dispatch must work when thresholds are crossed.
- Alert threshold must be configurable.
- History must support export, import, and deletion.
- Runway must include confidence and avoid misleading results from irregular top-ups.
- The user must be able to distinguish purchases from consumption events.
- Tests must cover calculations, persistence, validation, and critical UI states.

## 10. Functional requirements

Priorities use **P0** for release-blocking, **P1** for important, and **P2** for desirable.

### 10.1 Dashboard

| ID | Priority | Requirement |
| --- | --- | --- |
| DASH-01 | P0 | Display current credits remaining as the dominant metric. |
| DASH-02 | P0 | Display included weekly allowance remaining as a percentage. |
| DASH-03 | P0 | Display the configured reset date, time, timezone, and live countdown. |
| DASH-04 | P0 | Display reading freshness as Live, Recent, or Stale. |
| DASH-05 | P0 | Display a clear state when account values have never been synchronized. |
| DASH-06 | P1 | Display change since the previous reading. |
| DASH-07 | P1 | Display estimated runway and confidence. |
| DASH-08 | P1 | Display the active low-credit threshold. |
| DASH-09 | P2 | Show suggested actions such as wait for reset, sync now, or consider a lighter model. |

### 10.2 Reading capture

| ID | Priority | Requirement |
| --- | --- | --- |
| READ-01 | P0 | Allow manual entry of credits and weekly percentage. |
| READ-02 | P0 | Validate credits as a non-negative whole number. |
| READ-03 | P0 | Validate weekly percentage between 0 and 100. |
| READ-04 | P0 | Timestamp each reading automatically. |
| READ-05 | P0 | Preserve the previous saved reading if the capture flow is cancelled. |
| READ-06 | P1 | Allow the user to classify a balance increase as a purchase, adjustment, or reset. |
| READ-07 | P1 | Allow correction or deletion of an erroneous reading. |
| READ-08 | P2 | Support a user-authorized browser companion when technically and policy compliant. |

### 10.3 Reset management

| ID | Priority | Requirement |
| --- | --- | --- |
| RESET-01 | P0 | Allow the user to set the next reset date and time. |
| RESET-02 | P0 | Store an explicit IANA timezone, defaulting to the browser timezone. |
| RESET-03 | P0 | Mark a passed reset as due and prompt for a fresh official reading. |
| RESET-04 | P1 | Suggest a subsequent reset based on the configured cadence without silently changing it. |
| RESET-05 | P1 | Preserve historical reset events separately from credit purchases. |

### 10.4 Alerts

| ID | Priority | Requirement |
| --- | --- | --- |
| ALERT-01 | P0 | Let the user enable or disable alerts. |
| ALERT-02 | P0 | Let the user configure the low-credit threshold. |
| ALERT-03 | P0 | Dispatch a browser notification when a new reading crosses below the threshold and permission is granted. |
| ALERT-04 | P0 | Never repeatedly notify for the same threshold crossing. |
| ALERT-05 | P1 | Support reset-due and stale-reading alerts. |
| ALERT-06 | P1 | Explain when browser settings prevent notifications. |

### 10.5 History and portability

| ID | Priority | Requirement |
| --- | --- | --- |
| HIST-01 | P0 | Retain at least the latest 30 readings locally. |
| HIST-02 | P1 | Export readings and settings as JSON. |
| HIST-03 | P1 | Export readings as CSV. |
| HIST-04 | P1 | Import a validated Usage Pulse JSON export. |
| HIST-05 | P0 | Delete an individual reading. |
| HIST-06 | P0 | Clear all local product data after explicit confirmation. |
| HIST-07 | P2 | Allow a user-defined retention limit. |

### 10.6 Runway calculation

| ID | Priority | Requirement |
| --- | --- | --- |
| RUN-01 | P0 | Exclude balance increases from consumption averages. |
| RUN-02 | P0 | Require sufficient consumption readings before showing a numeric estimate. |
| RUN-03 | P0 | Label the result as an estimate. |
| RUN-04 | P1 | Show sample size and confidence: low, medium, or high. |
| RUN-05 | P1 | Offer both per-session and time-to-reset views. |
| RUN-06 | P2 | Segment estimates by user-supplied workload or model labels. |

## 11. User experience requirements

### First visit

1. Explain that account balance synchronization is manual.
2. Provide a direct link to the official usage page.
3. Ask for the first credit and weekly readings.
4. Ask for reset date/time and confirm timezone.
5. Offer alerts only after the core setup is complete.

The product must not seed a first-time user with another user’s balance or reset data.

### Returning visit

1. Load local settings and history.
2. Display the latest reading immediately.
3. Calculate freshness and reset countdown.
4. Prompt for synchronization if the reading is stale or the reset has passed.

### Low-balance state

- Use a clear warning treatment.
- State the active threshold.
- Show time until reset.
- Avoid implying that a purchase is required.
- Link to the official usage dashboard for confirmation.

### Empty and error states

The app must handle:

- No readings
- Corrupt or incompatible local data
- Notifications denied
- Reset time in the past
- Zero credits
- Weekly allowance unavailable
- Imported data with invalid values

## 12. Data model

### Reading

```ts
type Reading = {
  id: string;
  credits: number;
  weeklyRemaining: number | null;
  capturedAt: string;
  source: "manual" | "browser-companion" | "import";
  eventType?: "reading" | "purchase" | "reset" | "adjustment";
  note?: string;
};
```

### Settings

```ts
type Settings = {
  lowCreditThreshold: number;
  resetAt: string | null;
  timezone: string;
  alertsEnabled: boolean;
  staleAfterMinutes: number;
  retentionLimit: number;
};
```

### Calculation result

```ts
type RunwayEstimate = {
  averageCreditsPerSession: number | null;
  estimatedSessionsRemaining: number | null;
  sampleSize: number;
  confidence: "insufficient" | "low" | "medium" | "high";
};
```

## 13. Privacy, security, and trust requirements

1. Usage history remains local unless the user explicitly enables a future sync feature.
2. The app must not request OpenAI passwords, session cookies, authentication tokens, payment data, or API keys for personal-credit tracking.
3. The app must not call undocumented OpenAI account endpoints.
4. Exported files must be generated locally.
5. Destructive actions require explicit confirmation.
6. The UI must explain that clearing browser storage removes local history.
7. Any future browser companion must request the narrowest possible permission and disclose exactly what it reads.
8. A future cloud-sync feature must use encryption in transit and at rest, provide deletion controls, and remain opt-in.

## 14. Accessibility requirements

- Meet WCAG 2.2 AA for contrast, keyboard use, focus visibility, labels, and dialog behavior.
- Do not rely on color alone for low-balance or stale states.
- Support 200% zoom without loss of functionality.
- Respect `prefers-reduced-motion`.
- Announce saved readings and validation failures to assistive technology.
- Trap focus inside the synchronization dialog and restore focus when it closes.
- Provide accessible names for charts and a text alternative for all calculated insights.

## 15. Performance requirements

- First meaningful content should appear within 2 seconds on a typical broadband connection.
- Saving a reading should feel immediate and complete within 100 ms under normal device conditions.
- The initial JavaScript payload should remain small enough for reliable mobile use.
- Countdown updates must not cause visible layout shifts.
- The app must remain functional offline after an installable PWA phase is introduced.

## 16. Success metrics

Because v1 is local-first, success measurement should avoid hidden behavioral tracking.

### Primary metrics

- Time to first saved reading: under 60 seconds
- Median time to save a returning reading: under 20 seconds
- Reading validation success rate: at least 98%
- Percentage of estimates with honest confidence labeling: 100%
- Notification duplication rate: 0%
- Reported cases of unexpected data transmission: 0

### Product-outcome indicators

- Users report greater confidence deciding whether to buy credits or wait.
- Users can correctly identify whether a reading is current or stale.
- Users can explain why the runway estimate may change.
- Users return after meaningful work sessions to add readings.

Opt-in analytics may be introduced later, but v1 must work fully without telemetry.

## 17. Risks and mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Users interpret a stale reading as live account data | High | Prominent freshness state and stale prompt |
| Runway appears more precise than evidence supports | High | Minimum sample size, confidence label, estimate wording |
| Hard-coded reset becomes inaccurate | High | Make reset user-configurable and prompt after it passes |
| Browser storage is cleared | Medium | Export/import and clear warning about local persistence |
| Notification permission is denied | Low | Explain status and keep in-app warning states |
| Undocumented account integration breaks trust | High | Prohibit private endpoints and credential collection |
| Balance increases distort burn rate | Medium | Classify purchases/resets and exclude increases |
| Product pressures users to spend | Medium | Neutral buy-versus-wait framing; no purchase automation |

## 18. Release plan

### Milestone A — trustworthy local core

- First-run setup
- Configurable reset and timezone
- Custom threshold
- Reading correction and deletion
- Robust validation
- Calculation unit tests

### Milestone B — alerts and portability

- Working threshold notifications
- Stale and reset-due alerts
- JSON and CSV export
- Validated JSON import
- Full local-data reset

### Milestone C — improved insight

- Confidence-aware runway
- Purchase/reset event classification
- Time-to-reset forecast
- Improved historical visualization

### Milestone D — optional automation

- Evaluate supported OpenAI personal-usage integrations if officially documented
- Evaluate a narrowly permissioned browser companion
- Keep manual mode available regardless of automation

## 19. v1 acceptance criteria

The v1 release is ready when:

1. A first-time user can configure balance, weekly percentage, reset time, timezone, and threshold.
2. No user-specific sample balance is shown before setup.
3. A returning user sees the latest local reading and an accurate freshness state.
4. The reset countdown remains correct across timezone and daylight-saving transitions.
5. Invalid readings cannot be saved.
6. A threshold notification fires once when a new reading crosses below the configured threshold.
7. Deleting a reading immediately recalculates change and runway.
8. Exported JSON can restore the same readings and settings in a clean browser.
9. Clearing data requires confirmation and removes all Usage Pulse keys.
10. Runway is hidden or labeled insufficient until the minimum sample size is met.
11. Build, calculation tests, persistence tests, and critical accessibility checks pass.
12. The README accurately reflects the released behavior and known limitations.

## 20. Open questions

1. Should the default stale threshold remain 60 minutes or be user-configurable from launch?
2. What minimum sample size creates a useful runway estimate—three, five, or seven consumption events?
3. Should reset cadence be inferred after two observed resets or always remain explicit?
4. Should purchase events allow optional cost entry, or would that shift the product too far into budgeting?
5. Can an officially supported personal usage feed be used in the future without requiring elevated account access?
6. Should PWA installation precede a browser companion?

## 21. Decision log

| Decision | Rationale |
| --- | --- |
| Keep the official usage page as source of truth | Avoids false authority and unsupported integrations |
| Use local storage for v1 | Minimizes privacy risk and removes account infrastructure |
| Separate readings from estimates | Prevents calculated outputs from appearing official |
| Keep purchasing outside the app | Avoids payment handling and manipulative spend flows |
| Retain manual synchronization | Provides a durable fallback even if automation is unavailable |

## 22. Definition of product integrity

Usage Pulse succeeds only if it is simultaneously useful and trustworthy. A less automated product that clearly explains its data is preferable to a more automated product that depends on hidden access, fragile scraping, or misleading “live” claims.

The product promise is therefore:

> Usage Pulse will help users make better capacity decisions from their own readings, while remaining explicit about what is official, what is local, and what is estimated.
