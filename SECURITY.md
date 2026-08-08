# Security policy

## Reporting a vulnerability

Please do not open a public issue for a suspected vulnerability or accidentally exposed private value. Use GitHub's private vulnerability reporting feature for this repository.

Include the affected version, reproduction steps, potential impact, and any suggested mitigation. Please avoid accessing data that does not belong to you while testing.

## Scope

Usage Pulse stores readings in the current browser's local storage. It must not request ChatGPT passwords, cookies, session tokens, payment details, or API keys. Any change that weakens that boundary should be treated as security-sensitive.
