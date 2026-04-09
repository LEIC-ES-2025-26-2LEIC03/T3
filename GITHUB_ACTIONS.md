# IronLog — GitHub Actions Setup Guide

## Workflows Overview

| Workflow | Trigger | What it does |
|---------|---------|-------------|
| `ci.yml` | Push / PR to `main`, `develop` | Lint (ESLint) + unit tests + coverage upload |
| `code-quality.yml` | Push / PR to `main`, `develop` | SonarCloud scan + coverage threshold enforcement |
| `pr-validation.yml` | Every PR | Validates PR title, branch name, CHANGELOG update |
| `release-android.yml` | Push tag `v*.*.*` | Builds signed APK + creates GitHub Release |
| `dependency-audit.yml` | Every Monday / manual | npm security audit + outdated packages |

---

## Required GitHub Secrets

Go to your repo → **Settings → Secrets and variables → Actions** and add:

### For Android release signing
| Secret | Value |
|--------|-------|
| `KEYSTORE_BASE64` | Base64-encoded `.keystore` file: `base64 -i ironlog.keystore` |
| `KEYSTORE_PASSWORD` | Your keystore password |
| `KEY_ALIAS` | Your key alias |
| `KEY_PASSWORD` | Your key password |

### For SonarCloud (code quality)
| Secret | Value |
|--------|-------|
| `SONAR_TOKEN` | Token from [sonarcloud.io](https://sonarcloud.io) → My Account → Security |

> `GITHUB_TOKEN` is provided automatically by GitHub — no setup needed.

---

## Creating a Release

To trigger a new APK build and GitHub Release:

```bash
git tag v0.1.0
git push origin v0.1.0
```

The workflow will:
1. Build the signed APK
2. Name it `IronLog-v0.1.0.apk`
3. Create a GitHub Release using the content from `CHANGELOG.md`
4. Attach the APK as a downloadable asset

---

## Branch & PR Conventions

| Type | Branch pattern | Example |
|------|---------------|---------|
| New feature | `feature/short-description` | `feature/rest-timer` |
| Bug fix | `fix/issue-description` | `fix/set-input-crash` |
| Hotfix | `hotfix/description` | `hotfix/null-workout` |
| Chore | `chore/description` | `chore/update-deps` |
| Docs | `docs/description` | `docs/architecture` |

PR titles must follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat: add rest timer between sets`
- `fix: prevent finish with empty exercise list`
- `chore: update AsyncStorage to v2`

---

## Running Workflows Locally

Install [act](https://github.com/nektos/act) to test workflows locally:

```bash
brew install act          # macOS
act push                  # simulate a push event
act pull_request          # simulate a PR
```
