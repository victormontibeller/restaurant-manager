#!/usr/bin/env bash
set -euo pipefail
stage="${1:?Uso: with-env.sh dev|test|hml comando argumentos}"; shift
case "$stage" in dev|test|hml) ;; *) printf 'Ambiente recusado.\n' >&2; exit 2;; esac
home="${RM_HOME:-$HOME/.local/share/restaurant-manager}"
config="$home/$stage.env"
[[ -f "$config" ]] || { printf 'Configuração privada ausente.\n' >&2; exit 2; }
set -a
source "$config"
set +a
export JAVA_HOME="${JAVA_HOME:-$home/toolchains/jdk-21.0.13+9}"
export PATH="$JAVA_HOME/bin:$home/toolchains/apache-maven-3.9.16/bin:$PATH"
export MAVEN_OPTS="-Xmx384m -XX:ActiveProcessorCount=2"
export NODE_OPTIONS="--max-old-space-size=768"
export NG_BUILD_MAX_WORKERS=2
exec "$@"
