# Contributing to Usage Pulse

Thanks for helping improve Usage Pulse.

## Before opening a change

1. Search existing issues and pull requests.
2. Open an issue for substantial behavior or data-model changes.
3. Keep the privacy model intact: never request account passwords, session cookies, private endpoints, or payment data.

## Local workflow

```bash
npm ci
npm run lint
npm test
```

Create a focused branch, include tests for behavior changes, and explain both the user impact and validation performed in the pull request.

## Product standards

- Clearly distinguish manual readings from live calculations.
- Keep personal usage data device-local unless a future feature is explicitly opt-in and encrypted.
- Use accessible labels, keyboard-friendly controls, and responsive layouts.
- Do not describe estimates as billing records or guaranteed forecasts.

By contributing, you agree that your contribution is licensed under the MIT License.
