"""Inventário comum das fontes/configurações conferidas nos gates de build."""
import hashlib
from pathlib import Path


SOURCE_DIRECTORIES = ('backend/src/main', 'frontend/src', 'frontend/public')
BUILD_FILES = (
    'backend/pom.xml',
    'backend/mvnw',
    'backend/.mvn/wrapper/maven-wrapper.properties',
    'frontend/package.json',
    'frontend/package-lock.json',
    'frontend/angular.json',
    'frontend/.postcssrc.json',
    'frontend/tsconfig.json',
    'frontend/tsconfig.app.json',
    'frontend/tsconfig.e2e.json',
    'scripts/build-pwa.cjs',
    'scripts/pwa-assets.cjs',
    'scripts/build-release.sh',
)


def build_source_manifest(repo):
    """Retorna caminhos relativos ordenados e hashes; não inclui docs ou outputs."""
    repo = Path(repo).resolve()
    paths = set()
    for name in SOURCE_DIRECTORIES:
        directory = repo / name
        if not directory.is_dir() or directory.is_symlink():
            raise ValueError('Diretório de fontes ausente ou vinculado.')
        for path in directory.rglob('*'):
            if path.is_symlink():
                raise ValueError('Fontes do build não podem conter vínculos simbólicos.')
            if path.is_file():
                paths.add(path)
    paths.update(repo / name for name in BUILD_FILES)
    if any(not path.is_file() or path.is_symlink() for path in paths):
        raise ValueError('Arquivo obrigatório do build ausente ou vinculado.')
    manifest = {}
    for path in sorted(paths):
        # Também recusa redirecionamento por ancestral dentro do checkout.
        if any(parent.is_symlink() for parent in path.parents if parent != repo and repo in parent.parents):
            raise ValueError('Diretório do build não pode ser vínculo simbólico.')
        with path.open('rb') as stream:
            manifest[path.relative_to(repo).as_posix()] = hashlib.file_digest(stream, 'sha256').hexdigest()
    return manifest
