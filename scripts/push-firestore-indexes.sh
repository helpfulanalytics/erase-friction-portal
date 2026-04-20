#!/usr/bin/env bash
# Push composite indexes to Firebase (Firestore).
#
# Project resolution (first match wins):
#   1. FIREBASE_PROJECT_ID
#   2. NEXT_PUBLIC_FIREBASE_PROJECT_ID (shell env)
#   3. NEXT_PUBLIC_FIREBASE_PROJECT_ID from .env.local (same as Next.js / firebase-admin)
#   4. npx firebase-tools deploy without --project (uses firebase use / .firebaserc)
#
# Prereqs (one-time): npm run firebase:login   OR   npx firebase-tools@13 login
# (Do not use bare `firebase login` unless the CLI is installed globally.)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

strip_env_value() {
  local v="$1"
  v="${v%$'\r'}"
  v="${v#\"}"
  v="${v%\"}"
  v="${v#\'}"
  v="${v%\'}"
  printf '%s' "$v"
}

project_from_dotenv() {
  local f="$1"
  [[ -f "$f" ]] || return 1
  local line
  line="$(grep -E '^[[:space:]]*NEXT_PUBLIC_FIREBASE_PROJECT_ID=' "$f" 2>/dev/null | tail -n1)" || return 1
  [[ -n "$line" ]] || return 1
  strip_env_value "${line#*=}"
}

PROJECT_ID="${FIREBASE_PROJECT_ID:-}"
if [[ -z "$PROJECT_ID" ]]; then
  PROJECT_ID="${NEXT_PUBLIC_FIREBASE_PROJECT_ID:-}"
fi
if [[ -z "$PROJECT_ID" ]]; then
  PROJECT_ID="$(project_from_dotenv .env.local 2>/dev/null || true)"
fi
if [[ -z "$PROJECT_ID" ]]; then
  PROJECT_ID="$(project_from_dotenv .env 2>/dev/null || true)"
fi

echo "Deploying Firestore indexes from firestore.indexes.json …"
if [[ -n "$PROJECT_ID" ]]; then
  echo "Using Firebase project: $PROJECT_ID"
  exec npx --yes firebase-tools@13 deploy --only firestore:indexes --project "$PROJECT_ID" "$@"
else
  echo "No project id in env or .env.local — using Firebase CLI default (run: npx firebase-tools use --add)"
  exec npx --yes firebase-tools@13 deploy --only firestore:indexes "$@"
fi
