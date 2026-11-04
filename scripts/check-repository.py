#!/usr/bin/env python3
"""Checks documentais e padrões de segredo; não substitui revisão de segurança."""
from pathlib import Path
import re
import subprocess

repo = Path(__file__).resolve().parents[1]
files = subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard'],cwd=repo,text=True).splitlines()
errors = []
patterns = [r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',r'gh[pousr]_[A-Za-z0-9]{30,}',r'AKIA[0-9A-Z]{16}']
for name in sorted(set(files)):
    path = repo/name
    if not path.is_file(): continue
    if name.endswith(('.env','.pem','.key','.dump')): errors.append(f'{name}: arquivo privado não permitido')
    try: text = path.read_text()
    except UnicodeError: continue
    if any(re.search(pattern,text) for pattern in patterns): errors.append(f'{name}: possível segredo')
    if path.suffix == '.md':
        for target in re.findall(r'\]\(([^)]+)\)',text):
            if '://' in target or target.startswith(('mailto:','#','<')): continue
            local = target.split('#')[0]
            if local and not (path.parent/local).exists(): errors.append(f'{name}: link local ausente {target}')
if errors: raise SystemExit('\n'.join(errors))
print(f'{len(set(files))} arquivos conferidos; links locais e padrões de segredo aprovados. Âncoras exigem revisão adicional.')
