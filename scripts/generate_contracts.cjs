#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
let ts;try{ts=require('typescript')}catch{ts=require(path.join(cp.execFileSync('npm',['root','-g'],{encoding:'utf8'}).trim(),'typescript'))}
const root=path.resolve(__dirname,'..');const files=fs.readdirSync(path.join(root,'apps/api/src/modules')).filter(x=>x.endsWith('.ts'));
function dec(node,n){return (ts.canHaveDecorators(node)?ts.getDecorators(node):[]||[]).find(d=>{const e=d.expression;return ts.isCallExpression(e)?e.expression.getText()===n:e.getText()===n});}
function dval(d){if(!d)return '';const e=d.expression;if(!ts.isCallExpression(e)||!e.arguments.length)return '';const a=e.arguments[0];return ts.isStringLiteral(a)?a.text:'';}
function dvals(d){if(!d)return [''];const e=d.expression;if(!ts.isCallExpression(e)||!e.arguments.length)return [''];const a=e.arguments[0];if(ts.isStringLiteral(a))return [a.text];if(ts.isArrayLiteralExpression(a)){const vals=a.elements.filter(ts.isStringLiteral).map(x=>x.text);return vals.length?vals:[''];}return [''];}
const paths={};const operations=[];
for(const file of files){const name=path.join(root,'apps/api/src/modules',file);const source=fs.readFileSync(name,'utf8');const ast=ts.createSourceFile(name,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 for(const statement of ast.statements){if(!ts.isClassDeclaration(statement))continue;const c=dec(statement,'Controller');if(!c)continue;
  const prefixes=dvals(c);const className=statement.name?.text||file;const secured=Boolean(dec(statement,'UseGuards'));
  for(const prefix of prefixes)for(const m of statement.members){if(!ts.isMethodDeclaration(m)||!m.name)continue;
   const method=['Get','Post','Patch','Put','Delete'].find(k=>dec(m,k));if(!method)continue;
   const mroutes=dvals(dec(m,method));
   for(const mroute of mroutes){const full='/'+[prefix,mroute].filter(Boolean).join('/').replace(/\/+/g,'/').replace(/:([a-zA-Z_]+)/g,'{$1}');
   const verb=method.toLowerCase();const hasBody=Boolean(dec(m,'Body')||m.parameters.some(p=>p.decorators?.some(d=>d.getText().includes('@Body'))||p.getText().includes('@Body(')));
   const requiresSession=secured||m.getText().includes('SessionGuard');
   const suffix=prefixes.length>1||mroutes.length>1?'.'+full.replace(/[^a-zA-Z0-9]+/g,'_').replace(/^_|_$/g,''):'';
   const operation={tags:[className.replace(/Controller$/,'')],operationId:className+'.'+m.name.getText()+suffix,summary:`${method.toUpperCase()} ${full}`,responses:{'200':{description:'Successful response'},'400':{description:'Invalid request'},'500':{description:'Internal failure'}},'x-source':`apps/api/src/modules/${file}`,'x-zod-request-schema':'Defined in apps/api/src/shared/dto.ts when @Body(new ZodPipe(...)) is used; no schema auto-generation in this baseline'};
   if(requiresSession){operation.security=[{sessionCookie:[]}];operation.responses['401']={description:'Authentication required'};operation.responses['403']={description:'Permission or CSRF denied'};}
   if(hasBody)operation.requestBody={description:'Validated by controller-specific ZodPipe or route logic',required:true,content:{'application/json':{schema:{type:'object'}}}};
   paths[full]??={};if(paths[full][verb])throw new Error(`Duplicate endpoint ${verb} ${full}`);paths[full][verb]=operation;
   operations.push({method:verb.toUpperCase(),route:full,source:file,handler:className+'.'+m.name.getText(),guarded:requiresSession});
   }
  }
 }
}
const spec={openapi:'3.1.0',info:{title:'NexaMarket HTTP routes - server code index',version:JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version,description:'Generated from NestJS route decorators. Request/response shapes are intentionally NOT claimed complete until Zod schemas are converted and a contract test checks them.'},servers:[{url:'/'}],paths:Object.fromEntries(Object.entries(paths).sort(([a],[b])=>a.localeCompare(b))),components:{securitySchemes:{sessionCookie:{type:'apiKey',in:'cookie',name:'nexa_session'}}}};
const manifest={generated_from:'NestJS controller decorators',total:operations.length,operations:operations.sort((a,b)=>(a.route+a.method).localeCompare(b.route+b.method))};
const outputs=[['contracts/openapi.routes.json',spec],['contracts/route-manifest.json',manifest]];
const check=process.argv.includes('--check');let fail=false;
for(const [relative,data] of outputs){const target=path.join(root,relative);const content=JSON.stringify(data,null,2)+'\n';if(check){if(!fs.existsSync(target)||fs.readFileSync(target,'utf8')!==content){console.error('CONTRACT_DRIFT '+relative);fail=true;}}else{fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,content);}}
console.log(`Contract route index: ${operations.length} operations, ${check?'checked':'written'}`);
if(fail)process.exit(1);
