#!/usr/bin/env python3
"""Extrai dependências Ubuntu solicitadas pelo Playwright sem instalação global."""
import os
from pathlib import Path
import subprocess

root = Path(os.environ.get('RM_HOME', Path.home() / '.local/share/restaurant-manager'))
downloads = root / 'toolchains/browser-debs'
prefix = root / 'toolchains/browser-libs'
downloads.mkdir(parents=True, exist_ok=True)
result = subprocess.run(['npx', 'playwright', 'install-deps', '--dry-run', 'chromium', 'firefox', 'webkit'], cwd=Path(__file__).resolve().parents[1] / 'frontend', text=True, capture_output=True)
packages = [line.strip() for line in result.stdout.splitlines() if line.startswith('  ') and line.strip().replace('-', '').replace('.', '').replace('+', '').isalnum()]
if not packages:
    raise SystemExit('Nenhuma lista de pacotes identificada; revisar saída do Playwright.')
# apt download verifica hashes contra os índices assinados locais.
subprocess.run(['apt-get', 'download', *packages], cwd=downloads, check=True)
for deb in sorted(downloads.glob('*.deb')):
    subprocess.run(['dpkg-deb', '-x', str(deb), str(prefix)], check=True)
print(f'{len(packages)} pacotes extraídos no prefixo privado. Nenhuma instalação global.')
