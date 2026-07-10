#!/usr/bin/env node
'use strict';
/** Parse every TS/TSX source/test, without falsely claiming a typecheck or build. */
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
let ts;try{ts=require('typescript')}catch{ts=require(path.join(cp.execFileSync('npm',['root','-g'],{encoding:'utf8'}).trim(),'typescript'))}
const root=path.resolve(__dirname,'..');let total=0;const errors=[];
function visit(dir){for(const name of fs.readdirSync(dir)){
 const full=path.join(dir,name),stat=fs.lstatSync(full);
 if(stat.isSymbolicLink())continue;
 if(stat.isDirectory()){if(!['node_modules','.git','dist','coverage','__pycache__','.pytest_cache'].includes(name))visit(full);continue;}
 if(!/\.(ts|tsx)$/.test(name))continue;total++;
 const text=fs.readFileSync(full,'utf8');const kind=name.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS;
 const ast=ts.createSourceFile(full,text,ts.ScriptTarget.Latest,true,kind);
 for(const diagnostic of ast.parseDiagnostics){const pos=ast.getLineAndCharacterOfPosition(diagnostic.start||0);
  errors.push(`${path.relative(root,full)}:${pos.line+1}:${pos.character+1} ${ts.flattenDiagnosticMessageText(diagnostic.messageText,' ')}`);
 }
 }}
for(const folder of ['apps','packages','tests'])visit(path.join(root,folder));
console.log(JSON.stringify({typescript_files_parsed:total,parse_errors:errors.length,errors,status:errors.length?'FAIL':'PASS'},null,2));
if(errors.length)process.exitCode=1;
