#!/usr/bin/env bash
set -euo pipefail

# The deployment lookup accepts either its own hostname or a production alias.
curl --fail --silent --show-error --retry 3 --max-time 30 \
  --header "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v13/deployments/$1?teamId=$VERCEL_ORG_ID" |
  jq -e --arg project "$VERCEL_PROJECT_ID" --arg sha "$GITHUB_SHA" --arg url "$DEPLOYMENT" \
    '.projectId == $project and .target == "production" and .readyState == "READY" and
     .meta.releaseSha == $sha and ("https://" + .url) == $url'
