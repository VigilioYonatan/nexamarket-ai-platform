// Appearance bridge only. Does not access credential inputs, OTPs, tokens or secrets.
fetch('/api/v1/settings/theme',{credentials:'omit',cache:'no-store'}).then(r=>r.ok?r.json():null).then(data=>{
 if(!data||!data.tokens)return;
 const t=data.tokens;
 if(/^#[a-f\d]{6}$/i.test(t.primary||''))document.documentElement.style.setProperty('--nexa-primary',t.primary);
 if(/^#[a-f\d]{6}$/i.test(t.surface||''))document.documentElement.style.setProperty('--nexa-card',t.surface);
 if(/^#[a-f\d]{6}$/i.test(t.text||''))document.documentElement.style.setProperty('--nexa-text',t.text);
 const fonts=['Inter','Roboto','Source Sans 3','Nunito','system-ui'];
 if(fonts.includes(t.font))document.documentElement.style.setProperty('--nexa-font',t.font==='system-ui'?'system-ui':`"${t.font}", system-ui`);
 const logo=t.logo_url;
 if(typeof logo==='string'&&/^\/(logo\.svg|media\/brand\/[0-9a-f-]{36}\.webp)$/i.test(logo))document.documentElement.style.setProperty('--nexa-logo',`url("${logo}")`);
 if(typeof t.brand_name==='string' && t.brand_name.length<=60){const title=document.getElementById('kc-header-wrapper');if(title)title.textContent=t.brand_name;}
}).catch(()=>{});
