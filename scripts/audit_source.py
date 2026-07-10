#!/usr/bin/env python3
"""Deterministic structural preflight, NOT an execution/correctness/security proof."""
from __future__ import annotations
import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import sys
ROOT=Path(__file__).resolve().parent.parent
EXCLUDED={'node_modules','.git','dist','__pycache__','.pytest_cache','test-results','coverage','evidence','backups'}
REQUIRED=['README.md','AGENTS.md','package.json','apps/api/migrations/0001_core.sql','apps/api/src/app.module.ts','apps/web/src/main.tsx','apps/ai/app/main.py','compose/compose.yaml','compose/compose.test.yaml','infra/caddy/Caddyfile','infra/keycloak/realm/nexamarket-realm.json','infra/observability/prometheus.yml','tests/bdd/steps.ts','playwright.config.ts','.forgejo/workflows/ci.yml','contracts/route-manifest.json']
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--syntax-only',action='store_true',help='File/route checks only, without lockfile release gating');args=parser.parse_args()
    errors=[];warnings=[];files=[]
    for p in ROOT.rglob('*'):
        if any(s in EXCLUDED for s in p.relative_to(ROOT).parts) or not p.is_file():continue
        if p.name=='.env' or p.suffix in {'.pyc','.zip'}:continue
        files.append(p)
    for name in REQUIRED:
        if not (ROOT/name).is_file():errors.append(f'MISSING_FILE {name}')
    for p in files:
        if p.suffix=='.json':
            try:json.loads(p.read_text(encoding='utf-8'))
            except Exception as e:errors.append(f'JSON_INVALID {p.relative_to(ROOT)} {e}')
        if p.suffix in {'.ts','.tsx'}:
            t=p.read_text(encoding='utf-8')
            for raw in re.findall(r'(?:from\s+|import\s*\()\s*[\'\"](\.[^\'\"]+)[\'\"]',t):
                dest=(p.parent/raw).resolve()
                candidates=[dest,Path(str(dest).replace('.js','.ts')),Path(str(dest).replace('.js','.tsx')),Path(str(dest)+'.ts'),Path(str(dest)+'.tsx'),dest/'index.ts']
                if not any(x.is_file() for x in candidates):errors.append(f'BROKEN_IMPORT {p.relative_to(ROOT)} {raw}')
        if p.suffix in {'.ts','.tsx','.js','.py','.yaml','.yml','.json'}:
            t=p.read_text(encoding='utf-8',errors='replace')
            if re.search(r'AKIA[0-9A-Z]{16}',t):errors.append(f'POSSIBLE_SECRET {p.relative_to(ROOT)}')
    if not args.syntax_only and not (ROOT/'package-lock.json').is_file(): errors.append('LOCKFILE_MISSING production npm ci cannot run; generate on approved registry and commit')
    elif args.syntax_only and not (ROOT/'package-lock.json').is_file():warnings.append('LOCKFILE_NOT_AVAILABLE production build blocked until generated')
    syntax=subprocess.run(['node','scripts/check_typescript_syntax.cjs'],cwd=ROOT,text=True,capture_output=True)
    if syntax.returncode:errors.append(f'TYPESCRIPT_PARSE_ERROR {syntax.stdout.strip()} {syntax.stderr.strip()}')
    cp=subprocess.run(['node','scripts/generate_contracts.cjs','--check'],cwd=ROOT,text=True,capture_output=True)
    if cp.returncode!=0:errors.append(f'CONTRACT_DRIFT {cp.stderr.strip()}')
    for name in ['apps/api/test/unit','apps/api/test/integration','apps/ai/tests','tests/bdd/features','tests/e2e']:
        if not any((ROOT/name).rglob('*.*')):errors.append(f'TESTS_MISSING {name}')
    print(json.dumps({'files_considered':len(files),'required_files':len(REQUIRED),'route_contract':cp.stdout.strip(),'errors':errors,'warnings':warnings,'status':'FAIL' if errors else 'PASS_WITH_WARNINGS' if warnings else 'PASS'},ensure_ascii=False,indent=2))
    return 1 if errors else 0
if __name__=='__main__':sys.exit(main())
