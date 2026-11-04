#!/usr/bin/env bash
set -euo pipefail
home="${RM_HOME:-$HOME/.local/share/restaurant-manager}"
webkit="$home/browsers/webkit-2370/minibrowser-wpe"
# O wrapper distribuído substitui LD_LIBRARY_PATH; preservar bibliotecas privadas.
export LD_LIBRARY_PATH="$webkit/lib:$webkit/sys/lib:$home/toolchains/browser-libs/usr/lib/x86_64-linux-gnu"
export WEBKIT_EXEC_PATH="$webkit/bin"
export WEBKIT_INJECTED_BUNDLE_PATH="$webkit/lib"
export WEBKIT_INSPECTOR_RESOURCES_PATH="$webkit/share"
export WEBKIT_FORCE_COMPLEX_TEXT=1
exec "$webkit/bin/MiniBrowser" "$@"
