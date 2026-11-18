"""Publicação da demo validada com Git, JARs e seleção temporários. Não usa launchd real."""
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch
import zipfile

import demo_sprints as demo


class DemoSprintsTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name).resolve()
        self.releases = self.root / 'sprints'
        self.auto = self.releases / 'automacao'
        self.auto.mkdir(parents=True)
        for chave, valor in [('AUTO', self.auto), ('RELEASES', self.releases)]:
            trocado = patch.object(demo, chave, valor)
            trocado.start()
            self.addCleanup(trocado.stop)
        self.anterior = self.release('09-anterior')
        self.novo = self.release('10-candidato')
        self.diario = self.auto / 'recuperacao.json'
        demo.selecionar(self.anterior)

    def release(self, nome):
        pasta = self.releases / nome
        (pasta / 'static').mkdir(parents=True)
        (pasta / 'static/sw.js').write_bytes(b'worker')
        self.jar(pasta)
        return pasta

    def jar(self, pasta, sql=b'v1', extra=None):
        with zipfile.ZipFile(pasta / 'app.jar', 'w') as z:
            z.writestr(demo.MIGRATIONS + 'tenant/V1__base.sql', sql)
            for n in ['sw.js', 'index.html', 'main-xyz.js']:
                z.writestr(demo.STATIC + n, b'novo')
            if extra:
                z.writestr(demo.STATIC + extra, b'extra')

    def test_preserva_chunks_do_cliente_antigo_sem_copiar_shell_ou_arquivos_privados(self):
        for n in ('chunk-old.js', 'styles-antigo.css', 'segredo.txt', 'index.html'):
            (self.anterior / 'static' / n).write_bytes(b'antigo')
        destino = self.novo / 'static'
        demo.preparar_static(self.novo / 'app.jar', self.anterior, destino)
        self.assertEqual((destino / 'chunk-old.js').read_bytes(), b'antigo')
        self.assertEqual((destino / 'styles-antigo.css').read_bytes(), b'antigo')
        self.assertEqual((destino / 'index.html').read_bytes(), b'novo')
        self.assertFalse((destino / 'segredo.txt').exists())
        self.assertEqual(demo.release_ativa(), self.anterior)

    def test_migracao_e_caminho_incompativeis_abandonam_release(self):
        self.jar(self.novo, sql=b'v2')
        with self.assertRaisesRegex(RuntimeError, 'migrações'):
            demo.preparar_static(self.novo / 'app.jar', self.anterior, self.novo / 'static')
        self.jar(self.novo, extra='../fora')
        with self.assertRaisesRegex(RuntimeError, 'Caminho'):
            demo.preparar_static(self.novo / 'app.jar', self.anterior, self.novo / 'static')
        self.assertEqual(demo.release_ativa(), self.anterior)

    def test_rollback_reinicia_e_confere_o_jar_anterior_apos_falha(self):
        chamadas = []

        def confirmar(p):
            chamadas.append(p)
            self.assertEqual(demo.release_ativa(), p)
            # O lock de pedidos já foi liberado antes da confirmação de saúde.
            with (self.auto / 'pedido.lock').open() as lock:
                demo.fcntl.flock(lock, demo.fcntl.LOCK_EX | demo.fcntl.LOCK_NB)
            if p == self.novo:
                raise RuntimeError('health fora do ar')

        with self.assertRaisesRegex(RuntimeError, 'health fora do ar'):
            demo.promover(self.anterior, self.novo, self.diario, lambda: True, demo.selecionar, confirmar)
        self.assertEqual(chamadas, [self.novo, self.anterior])
        self.assertEqual(demo.release_ativa(), self.anterior)
        self.assertFalse(self.diario.exists())

    def test_rollback_interrompido_fica_no_diario_e_retomada_valida_anterior(self):
        def falhar(_):
            raise RuntimeError('indisponível')
        with self.assertRaisesRegex(RuntimeError, 'indisponível'):
            demo.promover(self.anterior, self.novo, self.diario, lambda: True, demo.selecionar, falhar)
        self.assertEqual(demo.ler(self.diario)['anterior'], str(self.anterior))
        with patch.object(demo, 'validar_ambiente'), patch.object(demo, 'reiniciar') as reiniciar:
            demo.trabalhar(self.root)
            reiniciar.assert_called_once_with(self.anterior)
        self.assertFalse(self.diario.exists())

    def test_commit_superado_nao_seleciona_nem_reinicia(self):
        with patch.object(demo, 'reiniciar') as reiniciar:
            self.assertFalse(demo.promover(self.anterior, self.novo, self.diario,
                             lambda: False, demo.selecionar, reiniciar))
            reiniciar.assert_not_called()
        self.assertEqual(demo.release_ativa(), self.anterior)
        self.assertFalse(self.diario.exists())

    def criar_repo(self):
        repo = self.root / 'projeto'
        repo.mkdir()
        subprocess.run(['git', 'init', '-q', '-b', 'codex/sprint-10-teste'], cwd=repo, check=True)
        return repo

    def commit(self, repo, nome, conteudo):
        p = repo / nome
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(conteudo)
        demo.git(repo, 'add', nome)
        demo.git(repo, '-c', 'user.name=Teste', '-c', 'user.email=teste@example.invalid',
                 '-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'Incremento controlado')

    def test_docs_nao_disparam_build_nem_descartam_commit_de_aplicacao_em_andamento(self):
        repo = self.criar_repo()
        self.commit(repo, 'frontend/src/index.html', 'primeiro')
        first = demo.pedido_atual(repo)
        demo.json_salvar(self.auto / 'pedido.json', first)
        self.commit(repo, 'docs/notas.md', 'documentação')
        self.assertIsNone(demo.pedido_atual(repo))
        self.assertTrue(demo.vigente(repo, first))
        self.commit(repo, 'frontend/src/index.html', 'segundo')
        second = demo.pedido_atual(repo)
        self.assertNotEqual(second['aplicacao'], first['aplicacao'])
        self.assertFalse(demo.vigente(repo, first))
        demo.json_salvar(self.auto / 'pedido.json', second)
        self.assertTrue(demo.vigente(repo, second))
        demo.git(repo, 'switch', '-qc', 'main')
        self.assertIsNone(demo.pedido_atual(repo))

    def test_sprint_antiga_nao_substitui_o_pedido_novo(self):
        repo = self.criar_repo()
        self.commit(repo, 'frontend/src/index.html', 'teste')
        atual = dict(demo.pedido_atual(repo), sprint=11)
        demo.json_salvar(self.auto / 'pedido.json', atual)
        demo.json_salvar(self.auto / 'config.json', {'repo': str(repo)})
        antigo = demo.pedido_atual(repo)
        with patch.object(Path, 'cwd', return_value=repo), patch.object(demo, 'pedido_atual', return_value=antigo), patch.object(demo.sp, 'Popen') as processo:
            demo.enfileirar(repo)
            processo.assert_not_called()
        self.assertEqual(demo.ler(self.auto / 'pedido.json'), atual)

    def test_falha_na_tipagem_ou_build_preserva_demonstracao(self):
        pedido = {'branch': 'codex/sprint-10-teste', 'sprint': 10, 'sha': 'a'*40, 'aplicacao': 'b'*64}
        demo.json_salvar(self.auto / 'pedido.json', pedido)
        with patch.object(demo, 'validar_ambiente'), patch.object(demo, 'vigente', return_value=True), patch.object(demo, 'conferir'), patch.object(demo, 'empacotar', side_effect=RuntimeError('tipagem recusada')), patch.object(demo, 'reiniciar') as reinicio:
            with self.assertRaisesRegex(RuntimeError, 'tipagem recusada'):
                demo.trabalhar(self.root)
            reinicio.assert_not_called()
        self.assertEqual(demo.release_ativa(), self.anterior)
        self.assertEqual(demo.ler(self.auto / 'resultado.json')['estado'], 'falhou')
        self.assertFalse(self.diario.exists())

    def test_instalacao_opt_in_cria_hook_reinstalavel_apenas_no_checkout_de_teste(self):
        repo = self.criar_repo()
        with patch.object(demo, 'validar_ambiente'), patch.object(demo, 'conferir'), patch.object(demo.shutil, 'which', return_value='/bin/true'):
            demo.instalar(repo)
            demo.instalar(repo)
        post = demo.hook(repo)
        self.assertTrue(os.access(post, os.X_OK))
        self.assertIn(demo.HOOK_MARKER, post.read_text().splitlines())
        self.assertEqual((self.auto / 'worker.py').read_bytes(), Path(demo.__file__).read_bytes())
        self.assertEqual(demo.ler(self.auto / 'config.json')['repo'], str(repo))
        self.assertFalse((self.auto / 'pedido.json').exists())

    def test_instalacao_se_recusa_a_sobrescrever_post_commit_existente(self):
        repo = self.criar_repo()
        destino = demo.hook(repo)
        destino.write_text('#!/bin/sh\necho outro hook\n')
        with patch.object(demo, 'validar_ambiente'), patch.object(demo, 'conferir'):
            with self.assertRaisesRegex(RuntimeError, 'outro fluxo'):
                demo.instalar(repo)
        self.assertIn('outro hook', destino.read_text())

    def test_destino_local_exige_os_quatro_valores_e_o_checkout_do_servico(self):
        repo = self.root / 'checkout'
        repo.mkdir()
        env = self.root / '.env'
        env.write_text('RM_STAGE=dev\nRM_DB_USER=rm_dev_app\nRM_DB_URL=jdbc:postgresql://127.0.0.1:5432/rm_dev\nRM_PORT=8095\n')
        (repo / '.env').symlink_to(env)
        args = ['/bin/bash', str(self.releases / 'iniciar.sh'), str(repo), str(self.releases / 'atual'), '/local/bin/java']
        plist = self.releases / (demo.LABEL + '.plist')
        plist.write_bytes(demo.plistlib.dumps({'Label': demo.LABEL, 'ProgramArguments': args}))
        with patch.object(demo, 'BASE', self.root), patch.object(demo.sys, 'platform', 'darwin'), patch.object(os, 'access', return_value=True):
            self.assertEqual(demo.validar_ambiente(repo), Path('/local/bin/java'))
            env.write_text(env.read_text().replace('5432/rm_dev', '5432/rm_test'))
            with self.assertRaisesRegex(RuntimeError, 'Ambiente'):
                demo.validar_ambiente(repo)
