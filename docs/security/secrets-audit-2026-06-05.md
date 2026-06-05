# Secrets Audit - 2026-06-05

## Scope

- Repository: `MaarksN/BIRTH-VOICES-HUB`
- Local path: `C:\Users\Marks\Documents\GitHub\BIRTH-VOICES-HUB`
- Git history scanned with `--all`.
- Scanner binaries were downloaded to `.tmp/tools`, which is ignored by Git.

## Scanner Evidence

### gitleaks

Command:

```bash
gitleaks detect --source . --log-opts="--all" --redact=100 --report-format json --report-path .tmp/gitleaks-report.json
```

Result:

- Version: 8.30.1
- Commits scanned: 10
- Bytes scanned: about 1.88 MB
- Findings: 0
- Report: `.tmp/gitleaks-report.json`

### trufflehog

Command:

```bash
trufflehog git file://. --only-verified --json
```

Result:

- Version: 3.95.5
- Verified secrets: 0
- Unverified secrets: 0
- Chunks scanned: 389
- Bytes scanned: 760987
- Report: `.tmp/trufflehog-verified.jsonl`

## Incidents

| Date | Type | Location | Status | Action taken |
| --- | --- | --- | --- | --- |
| 2026-06-05 | Gemini API key | User-provided chat message, outside Git history | Active per owner; revocation declined | Not written to repo, not used in tests, not printed in reports. Owner must revoke/rotate before Phase 0 can be closed. |

## Repository Controls Added

- `.gitignore` now blocks `.env`, `.env.*`, private key/certificate formats, and `secrets/`.
- `.env.example` documents environment variables without real values.
- `.githooks/pre-commit` runs `gitleaks protect --staged --redact=100 --verbose`.
- Local Git config should point hooks to `.githooks`:

```bash
git config core.hooksPath .githooks
```

## Pre-commit Hook Evidence

Local hook path:

```text
.githooks
```

Test procedure:

1. Created temporary file `fake-secret-hook-test.txt` with a fake RSA private-key header.
2. Staged the temporary file.
3. Ran `gitleaks protect --source . --staged --redact=100 --verbose`.
4. Attempted `git commit -m 'test: verify secret hook blocks fake secret'`.
5. Unstaged and removed the temporary file.

Observed output:

```text
RuleID:      private-key
File:        fake-secret-hook-test.txt
scanner_exit_code=1
commit_exit_code=1
leaks found: 1
```

The fake secret value was redacted by gitleaks and was not committed.

## GitHub Secret Scanning

Attempted command:

```bash
gh api --method PATCH repos/MaarksN/BIRTH-VOICES-HUB \
  -f security_and_analysis[secret_scanning][status]=enabled \
  -f security_and_analysis[secret_scanning_push_protection][status]=enabled
```

GitHub response:

```text
Secret scanning is not available for this repository. (HTTP 422)
```

Follow-up attempts:

```text
Advanced security has not been purchased. (HTTP 422)
Secret scanning is not available for this repository. (HTTP 422)
```

The authenticated GitHub user has repository admin permissions, so this is a product/license availability blocker, not a local permission issue.

Compensating control:

- `.github/workflows/ci.yml` installs gitleaks 8.30.1 and runs `gitleaks detect --source . --log-opts="--all" --redact=100 --verbose` as a blocking CI gate.
- This does not replace native GitHub Secret Scanning or push protection, but it prevents PRs and pushes from passing CI when gitleaks detects committed secrets.

## Phase 0 Decision

Phase 0 is not closed. The Git repository scan is clean and a blocking CI compensating control exists, but an externally exposed Gemini key remains active and native GitHub Secret Scanning could not be enabled for this private repository.
