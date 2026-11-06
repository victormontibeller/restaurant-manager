#!/usr/bin/env bash
# Templates reais; API unitária fictícia, sem PostgreSQL e sem promoção de release.
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ "${CI:-}" != "true" && "$(uname -s)" == "Linux" ]]; then
  root="${RM_HOME:-$HOME/.local/share/restaurant-manager}"
  export PLAYWRIGHT_BROWSERS_PATH="$root/browsers"
  export LD_LIBRARY_PATH="$root/toolchains/browser-libs/usr/lib/x86_64-linux-gnu"
  export RM_WEBKIT_EXECUTABLE="$PWD/scripts/webkit-local.sh"
fi
for browser in chromium firefox webkit; do
  RM_TEMPLATE_BROWSER="$browser" node scripts/test_profile_selects.cjs
  RM_TEMPLATE_BROWSER="$browser" node scripts/test_identity_forms.cjs
  RM_TEMPLATE_BROWSER="$browser" node scripts/test_unit_schedule_templates.cjs
done
