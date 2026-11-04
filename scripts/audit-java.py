#!/usr/bin/env python3
"""Consulta OSV para coordenadas Maven do artefato real; erro de rede falha o gate."""
import json
from pathlib import Path
import subprocess
import urllib.request
import zipfile

jar = Path('backend/target/restaurant-manager-0.1.0-SNAPSHOT.jar')
subprocess.run(['bash','backend/mvnw','-B','-ntp','-f','backend/pom.xml','dependency:tree','-DoutputType=json','-DoutputFile=target/dependency-tree.json'],check=True,stdout=subprocess.DEVNULL)
tree = json.loads(Path('backend/target/dependency-tree.json').read_text())
coordinates = {}
def visit(node):
    if node.get('scope') in ('compile','runtime') and node.get('type') == 'jar':
        classifier = ('-' + node['classifier']) if node.get('classifier') else ''
        coordinates[node['artifactId']+'-'+node['version']+classifier+'.jar'] = (node['groupId']+':'+node['artifactId'],node['version'])
    for child in node.get('children',[]): visit(child)
visit(tree)
with zipfile.ZipFile(jar) as app:
    libs = {Path(name).name for name in app.namelist() if name.startswith('BOOT-INF/lib/') and name.endswith('.jar')}
# Spring Boot injeta jarmode-tools no repackage, fora da árvore de dependências.
for lib in libs:
    if lib.startswith('spring-boot-jarmode-tools-'):
        coordinates[lib] = ('org.springframework.boot:spring-boot-jarmode-tools',lib.removeprefix('spring-boot-jarmode-tools-').removesuffix('.jar'))
missing = libs - coordinates.keys()
if missing: raise SystemExit('JARs sem coordenadas verificáveis: '+str(sorted(missing)))
packages = {coordinates[lib] for lib in libs}
if not packages: raise SystemExit('Nenhuma dependência identificada; gate recusado.')
issues = []
ordered = sorted(packages)
for offset in range(0,len(ordered),100):
    batch = ordered[offset:offset+100]
    payload = {'queries':[{'package':{'ecosystem':'Maven','name':name},'version':version} for name,version in batch]}
    req = urllib.request.Request('https://api.osv.dev/v1/querybatch',data=json.dumps(payload).encode(),headers={'Content-Type':'application/json'})
    with urllib.request.urlopen(req,timeout=45) as response: data = json.load(response)
    if len(data['results']) != len(batch): raise SystemExit('Resposta OSV incompleta.')
    for package,result in zip(batch,data['results']):
        if result.get('vulns') or result.get('next_page_token'):
            issues.append((package,[v['id'] for v in result.get('vulns',[])]))
print(json.dumps({'packages_checked':len(ordered),'findings':issues},ensure_ascii=False))
if issues: raise SystemExit(1)
