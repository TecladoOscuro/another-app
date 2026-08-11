(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))n(s);new MutationObserver(s=>{for(const i of s)if(i.type==="childList")for(const r of i.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&n(r)}).observe(document,{childList:!0,subtree:!0});function a(s){const i={};return s.integrity&&(i.integrity=s.integrity),s.referrerPolicy&&(i.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?i.credentials="include":s.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function n(s){if(s.ep)return;s.ep=!0;const i=a(s);fetch(s.href,i)}})();const Zt="modulepreload",Qt=function(e){return"/another-app/"+e},vt={},ea=function(t,a,n){let s=Promise.resolve();if(a&&a.length>0){document.getElementsByTagName("link");const r=document.querySelector("meta[property=csp-nonce]"),o=r?.nonce||r?.getAttribute("nonce");s=Promise.allSettled(a.map(c=>{if(c=Qt(c),c in vt)return;vt[c]=!0;const l=c.endsWith(".css"),u=l?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${c}"]${u}`))return;const p=document.createElement("link");if(p.rel=l?"stylesheet":Zt,l||(p.as="script"),p.crossOrigin="",p.href=c,o&&p.setAttribute("nonce",o),document.head.appendChild(p),l)return new Promise((m,v)=>{p.addEventListener("load",m),p.addEventListener("error",()=>v(new Error(`Unable to preload CSS for ${c}`)))})}))}function i(r){const o=new Event("vite:preloadError",{cancelable:!0});if(o.payload=r,window.dispatchEvent(o),!o.defaultPrevented)throw r}return s.then(r=>{for(const o of r||[])o.status==="rejected"&&i(o.reason);return t().catch(i)})},xt=new Map;let Te=null;function Ae(e,t){xt.set(e,t)}async function at(e,t={}){if(Te){try{await Te()}catch(r){console.error("unmount",r)}Te=null}const a=xt.get(e);if(!a){console.warn("Ruta desconocida:",e);return}const n=document.getElementById("appMain");n.innerHTML="";const s=document.getElementById("appTitle"),i=await a(n,t);typeof i=="function"&&(Te=i),i&&i.title?s.textContent=i.title:s.textContent="NutTracker",document.querySelectorAll(".tab").forEach(r=>{r.classList.toggle("is-active",r.dataset.route===e)}),n.scrollTop=0}function ta(){document.querySelectorAll(".tab").forEach(e=>{e.addEventListener("click",()=>{const t=e.dataset.route;!t||t==="record"||at(t)})})}const aa="nuttracker",na=2,_={entries:"entries",settings:"settings",actresses:"actresses",customOptions:"customOptions"};let Ie=null;function dt(){return Ie||(Ie=new Promise((e,t)=>{const a=indexedDB.open(aa,na);a.onupgradeneeded=n=>{const s=n.target.result;if(!s.objectStoreNames.contains(_.entries)){const i=s.createObjectStore(_.entries,{keyPath:"id",autoIncrement:!0});i.createIndex("byAt","at",{unique:!1}),i.createIndex("byCategory","category",{unique:!1}),i.createIndex("byActressId","actressId",{unique:!1})}s.objectStoreNames.contains(_.settings)||s.createObjectStore(_.settings,{keyPath:"key"}),s.objectStoreNames.contains(_.actresses)||s.createObjectStore(_.actresses,{keyPath:"id"}).createIndex("byName","name",{unique:!1}),n.oldVersion<2&&!s.objectStoreNames.contains(_.customOptions)&&s.createObjectStore(_.customOptions,{keyPath:"key"}).createIndex("byKey","key",{unique:!0})},a.onsuccess=()=>e(a.result),a.onerror=()=>t(a.error)}),Ie)}function Y(e,t="readonly"){return dt().then(a=>{const n=a.transaction(e,t);return{store:n.objectStore(e),tx:n}})}function U(e){return new Promise((t,a)=>{e.onsuccess=()=>t(e.result),e.onerror=()=>a(e.error)})}async function Lt(e){const{store:t,tx:a}=await Y(_.entries,"readwrite"),n=await U(t.add(e));return await _e(a),n}async function sa(e){const{store:t,tx:a}=await Y(_.entries,"readwrite");await U(t.put(e)),await _e(a)}async function Mt(e){const{store:t,tx:a}=await Y(_.entries,"readwrite");await U(t.delete(e)),await _e(a)}async function ia(e){const{store:t}=await Y(_.entries);return U(t.get(e))}async function Ce(){const{store:e}=await Y(_.entries);return U(e.getAll())}async function ge(e,t=null){const{store:a}=await Y(_.settings),n=await U(a.get(e));return n?n.value:t}async function nt(e,t){const{store:a,tx:n}=await Y(_.settings,"readwrite");await U(a.put({key:e,value:t})),await _e(n)}async function we(e){const{store:t,tx:a}=await Y(_.actresses,"readwrite");await U(t.put(e)),await _e(a)}async function Ye(e){const t=await re(),a=String(e).toLowerCase();return t.find(n=>n.name&&n.name.toLowerCase()===a)||null}async function re(){const{store:e}=await Y(_.actresses);return U(e.getAll())}async function ra(){const[e,t,a]=await Promise.all([Ce(),U((await Y(_.settings)).store.getAll()),re()]);return{entries:e,settings:t,actresses:a,exportedAt:new Date().toISOString()}}async function oa(e){if(!e||typeof e!="object")return;const t=await dt();await new Promise((a,n)=>{const s=t.transaction([_.entries,_.settings,_.actresses],"readwrite");if(s.oncomplete=()=>a(),s.onerror=()=>n(s.error),Array.isArray(e.entries)){const i=s.objectStore(_.entries);e.entries.forEach(r=>i.put(r))}if(Array.isArray(e.settings)){const i=s.objectStore(_.settings);e.settings.forEach(r=>i.put(r))}if(Array.isArray(e.actresses)){const i=s.objectStore(_.actresses);e.actresses.forEach(r=>i.put(r))}})}async function ca(){const e=await dt();await new Promise((t,a)=>{const n=e.transaction([_.entries,_.settings,_.actresses,_.customOptions],"readwrite");n.oncomplete=()=>t(),n.onerror=()=>a(n.error),n.objectStore(_.entries).clear(),n.objectStore(_.settings).clear(),n.objectStore(_.actresses).clear(),n.objectStore(_.customOptions).clear()})}async function Dt(e,t=[]){const{store:a}=await Y(_.customOptions),n=await U(a.get(e));return n?n.values:t}async function la(e,t){const{store:a,tx:n}=await Y(_.customOptions,"readwrite");await U(a.put({key:e,values:t})),await _e(n)}async function da(e,t){const a=await Dt(e,[]);if(a.includes(t))return a;const n=[...a,t];return await la(e,n),n}function _e(e){return new Promise((t,a)=>{e.oncomplete=()=>t(),e.onerror=()=>a(e.error),e.onabort=()=>a(e.error)})}const Tt="theme";async function At(){const e=await ge(Tt,null),t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches,a=e||(t?"dark":"light");return It(a),a}function It(e){document.documentElement.setAttribute("data-theme",e);const t=document.querySelector('meta[name="theme-color"]:not([media])');t&&t.setAttribute("content",e==="dark"?"#0b0b0f":"#f5f5f7"),document.querySelectorAll('meta[name="theme-color"]').forEach(a=>{a.getAttribute("media")&&a.setAttribute("content",e==="dark"?"#0b0b0f":"#f5f5f7")})}async function ua(){const t=(document.documentElement.getAttribute("data-theme")||"dark")==="dark"?"light":"dark";return It(t),await nt(Tt,t),t}const pa=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"],xe=["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"],Ue=["lun","mar","mié","jue","vie","sáb","dom"];function C(e){const t=new Date(e);return t.setHours(0,0,0,0),t.getTime()}function N(e,t){const a=new Date(e);return a.setDate(a.getDate()+t),a.setHours(0,0,0,0),a.getTime()}function ma(e,t){return new Date(e,t,1,0,0,0,0).getTime()}function fa(e,t){return new Date(e,t+1,1,0,0,0,0).getTime()}function ha(e,t){return new Date(e,t+1,0).getDate()}function va(e,t){return`${pa[t]} ${e}`}function q(e){return e.toString().padStart(2,"0")}function Bt(e){const t=new Date(e);return`${q(t.getHours())}:${q(t.getMinutes())}`}function ga(e){if(!e)return"";const t=Math.floor(e/60),a=e%60;return t===0?`${a}s`:`${t}m`}function Oe(e){return e==null||isNaN(e)?"—":e>=1e6?(e/1e6).toFixed(1).replace(/\.0$/,"")+"M":e>=1e3?(e/1e3).toFixed(1).replace(/\.0$/,"")+"k":String(e)}function he(e,t){const a=new Map;for(const n of e){const s=t(n);!s&&s!==0||a.set(s,(a.get(s)||0)+1)}return a}function st(e){const t=new Map;for(const a of e){const n=a.categories?.length?a.categories:a.category?[a.category]:[];for(const s of n)s&&t.set(s,(t.get(s)||0)+1)}return t}function G(e,t=10){return[...e.entries()].sort((a,n)=>n[1]-a[1]).slice(0,t)}function Fe(e){return{count:e.length,totalSeconds:e.reduce((t,a)=>t+(a.duration||0),0)}}function ba(e,t=180){const a=C(Date.now()),n=N(a,-(t-1)),s=new Map;for(let i=n;i<=a;i=N(i,1))s.set(i,0);for(const i of e){const r=C(i.at);s.has(r)&&s.set(r,s.get(r)+1)}return s}function ut(e,t){const a=new Array(12).fill(0);for(const n of e){const s=new Date(n.at);s.getFullYear()===t&&(a[s.getMonth()]+=1)}return a}function pt(e){const t=new Array(24).fill(0);for(const a of e){const n=new Date(a.at).getHours();t[n]+=1}return t}function mt(e){const t=new Array(7).fill(0);for(const a of e){const s=(new Date(a.at).getDay()+6)%7;t[s]+=1}return t}function je(e){if(!e.length)return{current:0,longest:0};const t=new Set(e.map(c=>C(c.at))),a=[...t].sort((c,l)=>c-l);let n=1,s=1;for(let c=1;c<a.length;c++)a[c]===N(a[c-1],1)?(s+=1,n=Math.max(n,s)):s=1;const i=C(Date.now());let r=0,o=i;for(;t.has(o);)r+=1,o=N(o,-1);return{current:r,longest:n}}function it(e,t){const a=e.filter(g=>new Date(g.at).getFullYear()===t);if(!a.length)return null;const n=Fe(a),s=G(st(a),5),i=G(he(a,g=>g.actressId||g.actressName||null),5).filter(([g])=>g),r=G(he(a,g=>g.site||null),5).filter(([g])=>g),o=ut(a,t),c=o.indexOf(Math.max(...o)),l=mt(a),u=l.indexOf(Math.max(...l)),p=pt(a),m=p.indexOf(Math.max(...p)),v=i[0],h=je(a);return{year:t,summary:n,byCategory:s,byActress:i,bySite:r,months:o,peakMonth:c,peakWeekday:u,peakHour:m,best:v,streaks:h}}function ya(e){const t=new Date,a=ma(t.getFullYear(),t.getMonth()),n=fa(t.getFullYear(),t.getMonth());return e.filter(s=>s.at>=a&&s.at<n)}function wa(e){const a=new Date().toDateString();return e.filter(n=>new Date(n.at).toDateString()===a)}function Nt(e){const t=new Set;for(const a of e)a.actressId?t.add(a.actressId):a.actressName&&t.add(a.actressName);return t.size}function _a(e){if(!e||!e.born)return null;const t=e.born.match(/\b(19|20)\d{2}\b/);return t?parseInt(t[0],10):null}function Pt(e){const t=_a(e);if(!t)return null;const a=new Date().getFullYear()-t;return a<20?"<20":a<25?"20-24":a<30?"25-29":a<35?"30-34":a<40?"35-39":a<50?"40-49":"50+"}function Ht(e){if(!e?.ethnicity){if(!e?.name)return null;const a=e.name.toLowerCase(),n=["mei ","ling","xia","yuki"," ai ","sakura","kim ","lee ","park","chan"," ji ","aoi ","rina"," mio ","hina"," yui ","emi "," rio "],s=["lopez","garcia","rodriguez","martinez","hernandez","gonzalez"," luna","isabella","valentina","camila","sofia"," andrea"];return n.some(i=>a.includes(i.trim()))?"Asian":s.some(i=>a.includes(i))?"Latina":null}const t=e.ethnicity.toLowerCase();return t.includes("latin")||t.includes("hispanic")?"Latina":t.includes("asian")?"Asian":t.includes("ebony")||t.includes("black")?"Black":t.includes("caucasian")||t.includes("white")?"Caucasian":t.includes("middle eastern")||t.includes("arab")?"Arab":t.includes("mixed")?"Mixed":e.ethnicity}function $a(e){if(!e?.rank)return null;const t=parseInt(String(e.rank).replace(/[^\d]/g,""),10);return t?t<=100?"Top 100":t<=500?"Top 500":t<=2e3?"Top 2k":t<=1e4?"Top 10k":"Top 10k+":null}function Ze(e,t,a){const n=new Map,s=new Map(t.map(r=>[r.id,r])),i=new Map(t.filter(r=>r.name).map(r=>[r.name.toLowerCase(),r]));for(const r of e){let o=r.actressId||r.actressName||null;if(!o)continue;let c=s.get(o);!c&&r.actressName&&(c=i.get(r.actressName.toLowerCase())),!c&&r.actressId&&(c=i.get(r.actressId.replace(/^slug:/,"").toLowerCase()));const l=a(c);l&&n.set(l,(n.get(l)||0)+1)}return n}function ka(e,t,a=5){const n=new Map;for(const r of e){const o=r.actressId||r.actressName;o&&n.set(o,(n.get(o)||0)+1)}const s=new Map(t.map(r=>[r.id,r])),i=new Map(t.filter(r=>r.name).map(r=>[r.name.toLowerCase(),r]));return[...n.entries()].sort((r,o)=>o[1]-r[1]).slice(0,a).map(([r,o])=>{const c=r.toLowerCase(),l=s.get(r)||i.get(c)||i.get(c.replace(/^slug:/,""))||s.get(c.replace(/^slug:/,""))||null;let u=l?.name;return u||(c.startsWith("slug:")?u=c.replace(/^slug:/,"").replace(/-/g," ").replace(/\b\w/g,p=>p.toUpperCase()):u=r),{actress:l,displayName:u,count:o}})}function f(e){return String(e??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}function ve(e){return f(e)}const Ea=["Amateur","Anal","Arab","Asian","BBW","BDSM","Babysitter","Bathroom","Beach","Big Ass","Big Dick","Big Tits","Black","Blonde","Blowjob","Bondage","Brazilian","British","Brunette","Bukkake","Cambodian","Camgirl","Cartoon","Casting","Celebrity","Chinese","Chubby","Clitoris","Close Up","Compilation","Couple","Creampie","Cuckold","Cumshot","Cunnilingus","Czech","DP","Danish","Deep Throat","Dirty Talk","Dog","Double Penetration","Ebony","Egyptian","European","Ex-Girlfriend","Face","Facial","Fantasy","Feet","Fetish","Filipina","Fingering","Fisting","Foot","French","Fuck","Gangbang","Gay","German","Ghanaian","Glamcore","Glasses","Goth","Greek","Granny","Group","Hairy","Handjob","Hardcore","Hentai","Hungarian","Indian","Indonesian","Interracial","Italian","Japanese","Korean","Lactating","Latina","Lesbian","Lingerie","Machine","Maid","Massage","Masturbation","Mature","Medical","Midget","Milf","Mom","Nerd","Nipples","Nurse","Office","Old/Young","Orgy","Outdoor","POV","Pantyhose","Party","Pawg","Penis","Pissing","Polish","Pool","Pornstar","Pov","Pregnant","Prostate","Public","Pussy","Reality","Redhead","Retro","Romantic","Russian","Scissoring","Shower","Skinny","Small Tits","Smothering","Solo","Spanking","Squirting","Stockings","Strap-On","Striptease","Student","Swallow","Swedish","Tattoo","Teacher","Teen","Thai","Threesome","Titfuck","Toilet","Toys","Turkish","Twink","UFO","UK","Uniform","Upskirt","Vaginal","Vibrator","Vietnamese","Vintage","Voyeur","Wedding","Webcam","Worship","Yuri","Zombie"],Sa=["Pornhub","xvideos","xhamster","xnxx","redtube","youporn","spankbang","tube8","beeg","eporner","hqporner","hentai","onlyfans","fansly","reddit","twitter / X","tiktok","instagram","telegram","discord","cam site","fotos guardadas","recuerdo","fantasía","otro"],Ca=[{id:"web",label:"Web porno",icon:"🌐"},{id:"ad",label:"Anuncio de putas",icon:"📢"},{id:"onlyfans",label:"OnlyFans",icon:"💎"},{id:"cam",label:"Webcam",icon:"📹"},{id:"photo",label:"Fotos o recuerdos",icon:"📸"}],xa=["Móvil","iPad","PC","Otro"],La="https://corsproxy.io/?",Ot="https://www.pornhub.com",Ma={Accept:"text/html,application/xhtml+xml","Accept-Language":"en-US,en;q=0.9,es;q=0.8"},se=new Map,Be=new Map;function Da(e){return`${La}${encodeURIComponent(e)}`}function Ta(e){return e?e.replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&nbsp;/g," "):""}function Qe(e){return Ta(e).replace(/<[^>]+>/g,"").trim()}function et(e){if(!e)return null;const a=String(e).replace(/[^\dKkMm.]/g,"").match(/([\d.]+)\s*([KkMm]?)/);if(!a)return null;const n=parseFloat(a[1]),s=a[2].toLowerCase();return Math.round(s==="k"?n*1e3:s==="m"?n*1e6:n)}function be(e){return e.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")}function Aa(e){return/page not found/i.test(e)||/<title>[^<]*not found/i.test(e)||/removed\s*all\s*of\s*her\s*content/i.test(e)}function Ia(e){return/server-side requests are not allowed/i.test(e)||/"error"\s*:/i.test(e.slice(0,500))||/^<\?xml/i.test(e.trim())}function Ba(e,t){const a={name:t,id:`slug:${be(t)}`,source:"pornhub",url:`${Ot}/pornstar/${be(t)}`,fetchedAt:Date.now()},n=e.match(/Pornstar\s*Rank[^<]*<[^>]*>\s*#?\s*(\d[\d,]*)/i);n&&(a.rank=n[1]);const s=e.match(/(\d[\d,]*)\s*<[^>]*>\s*Videos/i);s&&(a.videosCount=et(s[1]));const i=e.match(/(\d+(?:\.\d+)?[KkMm]?)\s*<[^>]*>\s*Subscribers/i);i&&(a.subscribers=et(i[1]));const r=e.match(/(\d+(?:\.\d+)?[KkMm]?)\s*<[^>]*>\s*Views/i);r&&(a.videoViews=et(r[1])),(e.match(/<div[^>]+class="[^"]*infoPiece[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<div[^>]+class="[^"]*infoPiece[^"]*"/gi)||[]).forEach(p=>{const m=Qe(p),v=m.toLowerCase();if(v.includes("gender")&&!a.gender)a.gender=m.replace(/gender:?/i,"").trim();else if(v.includes("height")&&!a.height)a.height=m.replace(/height:?/i,"").trim();else if(v.includes("weight")&&!a.weight)a.weight=m.replace(/weight:?/i,"").trim();else if(v.includes("born")&&!a.born)a.born=m.replace(/born:?/i,"").trim();else if(v.includes("relationship")&&!a.relation)a.relation=m.replace(/relationship\s*status:?/i,"").trim();else if(v.includes("ethnicity")&&!a.ethnicity)a.ethnicity=m.replace(/ethnicity:?/i,"").trim();else if(v.includes("hair")&&!a.hair)a.hair=m.replace(/hair\s*color:?/i,"").trim();else if(v.includes("eye")&&!a.eyes)a.eyes=m.replace(/eye\s*color:?/i,"").trim();else if(v.includes("measurements")&&!a.measurements)a.measurements=m.replace(/measurements:?/i,"").trim();else if(v.includes("cup")&&!a.cup)a.cup=m.replace(/cup\s*size:?/i,"").trim();else if(v.includes("city")&&!a.city)a.city=m.replace(/city\s*and\s*country:?/i,"").trim();else if(v.includes("started")&&!a.startedYear){const h=m.match(/(\d{4})/);h&&(a.startedYear=h[1])}});const c=e.match(/<ul[^>]+class="[^"]*tagList[^"]*"[^>]*>([\s\S]*?)<\/ul>/i);if(c){const p=[...c[1].matchAll(/<a[^>]+>([^<]+)<\/a>/g)];a.tags=p.map(m=>Qe(m[1])).filter(Boolean).slice(0,20)}const l=e.match(/<img[^>]+class="[^"]*avatar[^"]*"[^>]+data-src="([^"]+)"/i)||e.match(/<img[^>]+class="[^"]*avatar[^"]*"[^>]+src="([^"]+)"/i);if(l&&(a.avatar=l[1]),!a.avatar){const p=e.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);p&&(a.avatar=p[1])}const u=e.match(/<div[^>]+class="[^"]*aboutSection[^"]*"[^>]*>([\s\S]*?)<\/div>/i);return u&&(a.bio=Qe(u[1]).slice(0,500)),a}async function Na(e){const t=await fetch(Da(e),{headers:Ma});if(!t.ok)throw new Error(`HTTP ${t.status}`);return t.text()}function gt(e){return e?e.rank||e.videosCount||e.subscribers||e.born||e.height||e.weight:!1}async function Ft(e,{force:t=!1}={}){const a=String(e||"").trim(),n=be(a);if(!n)return{name:a,id:"",source:"manual",fetchedAt:0,error:"Nombre vacío"};const s=await Ye(a),i=se.get(n);if(!t&&i&&i.fetchedAt&&Date.now()-i.fetchedAt<1e3*60*60*24*7)return i;if(!t&&s&&s.fetchedAt&&Date.now()-s.fetchedAt<1e3*60*60*24*7)return se.set(n,s),s;if(Be.has(n))return Be.get(n);const r=`${Ot}/pornstar/${n}`,o=(async()=>{try{const c=await Na(r);if(Ia(c)){const p={id:s?.id||`slug:${n}`,name:a,source:"pornhub",url:r,fetchedAt:0,transient:!0,error:"Proxy CORS no disponible"};return se.set(n,p),p}if(Aa(c)){const p=s?{...s,notFound:!0,fetchedAt:Date.now()}:{id:`slug:${n}`,name:a,source:"pornhub",url:r,fetchedAt:Date.now(),notFound:!0};return await we(p),se.set(n,p),p}const l=Ba(c,a);return!gt(l)&&(l.notFound=!0,s&&(l.id=s.id,l.url=s.url)),await we(l),se.set(n,l),l}catch(c){if(s&&gt(s))return se.set(n,s),s;const l={id:s?.id||`slug:${n}`,name:a,source:"pornhub",url:r,fetchedAt:0,transient:!0,error:c.message||"Error de red"};return se.set(n,l),l}finally{Be.delete(n)}})();return Be.set(n,o),o}const Pa=()=>document.getElementById("modalRoot"),Ha=()=>document.getElementById("toastRoot"),Q=[];function bt(e){e.style.zIndex=String(100+Q.length*10)}function We({title:e,body:t,footer:a,onClose:n,dismissible:s=!0}){const i=Pa(),r=document.createElement("div");r.className="modal-sheet",r.setAttribute("role","dialog"),r.setAttribute("aria-modal","true"),r.setAttribute("aria-label",e||"Diálogo");const o=document.createElement("div");o.className="modal-grabber",r.appendChild(o);const c=document.createElement("div");c.className="modal-header";const l=document.createElement("h2");l.textContent=e||"";const u=document.createElement("button");u.textContent="Cerrar",c.appendChild(l),s&&c.appendChild(u),r.appendChild(c);const p=document.createElement("div");if(p.className="modal-body",typeof t=="string"?p.innerHTML=t:t instanceof Node&&p.appendChild(t),r.appendChild(p),a){const h=document.createElement("div");h.className="modal-footer",a instanceof Node?h.appendChild(a):typeof a=="string"&&(h.innerHTML=a),r.appendChild(h)}const m={sheet:r,root:i,dismissible:s,onClose:n,onKey:null};Q.push(m),bt(i),i.appendChild(r),requestAnimationFrame(()=>{r.classList.add("is-open"),i.classList.add("is-open")});const v=()=>{if(!Q.includes(m))return;r.classList.remove("is-open"),document.removeEventListener("keydown",m.onKey),setTimeout(()=>{r.parentNode&&r.parentNode.removeChild(r)},280);const h=Q.indexOf(m);h>=0&&Q.splice(h,1),Q.length===0?(i.classList.remove("is-open"),i.setAttribute("aria-hidden","true")):bt(i),m.onClose&&m.onClose()};return m.onKey=h=>{h.key==="Escape"&&m.dismissible&&Q[Q.length-1]===m&&v()},document.addEventListener("keydown",m.onKey),s&&(u.addEventListener("click",v),Oa(r,v)),{close:v,body:p,sheet:r}}function Oa(e,t){let a=0,n=0,s=!1;e.addEventListener("touchstart",i=>{i.target.closest(".modal-body")?.scrollTop>0||(a=i.touches[0].clientY,s=!0)},{passive:!0}),e.addEventListener("touchmove",i=>{s&&(n=i.touches[0].clientY-a,n>0&&(e.style.transform=`translateY(${n}px)`,e.style.transition="none"))},{passive:!0}),e.addEventListener("touchend",()=>{s&&(s=!1,e.style.transition="",e.style.transform="",n>120&&t(),n=0)},{passive:!0})}function F(e,{duration:t=2400,type:a="default"}={}){const n=Ha(),s=document.createElement("div");s.className="toast"+(a==="default"?"":` is-${a}`),s.textContent=e,n.appendChild(s);let i=0,r=0,o=!1,c=!1;const l=m=>{c||(o=!0,i=m.touches[0].clientX,s.style.transition="none")},u=m=>{if(!o||c)return;r=m.touches[0].clientX-i;const v=Math.abs(r),h=Math.min(1,v/120);s.style.transform=`translateX(${r}px)`,s.style.opacity=String(1-h*.6)},p=()=>{if(!(!o||c)){if(o=!1,s.style.transition="",Math.abs(r)>100){c=!0,s.classList.add("is-leaving");const m=r>0?1:-1;s.style.transform=`translateX(${m*400}px)`,s.style.opacity="0",setTimeout(()=>s.remove(),240)}else s.style.transform="",s.style.opacity="";r=0}};s.addEventListener("touchstart",l,{passive:!0}),s.addEventListener("touchmove",u,{passive:!0}),s.addEventListener("touchend",p,{passive:!0}),setTimeout(()=>{c||(c=!0,s.classList.add("is-leaving"),s.style.transform="translateY(-30px)",s.style.opacity="0",setTimeout(()=>s.remove(),240))},t)}function jt({title:e="¿Seguro?",message:t,confirmText:a="Confirmar",cancelText:n="Cancelar",danger:s=!1}){return new Promise(i=>{const r=document.createElement("div");r.innerHTML=`<p style="color: var(--text-muted); margin: 4px 4px 12px;">${t}</p>`;const o=document.createElement("div");o.style.display="flex",o.style.gap="8px",o.style.width="100%";const c=document.createElement("button");c.className="btn",c.textContent=n;const l=document.createElement("button");l.className=s?"btn btn--danger":"btn btn--primary",l.textContent=a,o.appendChild(c),o.appendChild(l);const u=We({title:e,body:r,footer:o});c.addEventListener("click",()=>{u.close(),i(!1)}),l.addEventListener("click",()=>{u.close(),i(!0)})})}const tt={category:"category",site:"site",device:"device"};async function Ve(e){const t={[tt.category]:Ea,[tt.site]:Sa,[tt.device]:xa}[e]||[],a=await Dt(e,[]);return[...t,...a]}async function Fa(e,t){const a=String(t).trim();if(!a)return[];const n=await Ve(e);return n.includes(a)?n:da(e,a).then(()=>n.concat(a))}function yt({name:e,label:t,value:a="",optionKey:n,placeholder:s="—"}){const i=document.createElement("div");i.className="field",i.innerHTML=`
    <label>${t}</label>
    <div class="clearable-select">
      <select name="${e}">
        <option value="">${s}</option>
      </select>
      <button type="button" class="clearable-select__clear" aria-label="Limpiar" hidden>
        <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
      </button>
    </div>
  `;const r=i.querySelector("select"),o=i.querySelector(".clearable-select__clear");(async()=>{const l=await Ve(n);r.innerHTML=`<option value="">${s}</option>`+l.map(u=>`<option value="${f(u)}" ${u===a?"selected":""}>${f(u)}</option>`).join(""),c()})();function c(){o.hidden=!r.value}return r.addEventListener("change",c),o.addEventListener("click",()=>{r.value="",r.dispatchEvent(new Event("change")),c(),r.focus()}),{wrap:i,select:r}}let qe=null,ee=null,rt=null,Ne=null;function Ee(){return Ne||(Ne=Promise.all([fetch("./ph-stars.json").then(e=>e.ok?e.json():[]),fetch("./ph-stars-enriched.json").then(e=>e.ok?e.json():[]).catch(()=>[])]).then(([e,t])=>(ee=e,qe=new Map(e.map(a=>[a.n.toLowerCase(),a])),rt=new Map(t.map(a=>[a.n.toLowerCase(),a])),{base:e,enriched:t})).catch(e=>(typeof console<"u"&&console.warn&&console.warn("No se pudo cargar el dataset de actrices PH:",e.message),ee=[],qe=new Map,rt=new Map,{base:[],enriched:[]})),Ne)}function ja(){return ee!==null}function qa(){return ee?ee.length:0}function ot(e,t=30){if(!ee)return[];const a=e.toLowerCase().trim();if(!a)return ee.slice(0,t);const n=[];for(const s of ee){const i=s.n.toLowerCase();if(i===a){if(n.unshift(s),n.length>=t)break}else if(i.startsWith(a)){if(n.push(s),n.length>=t)break}else if(i.includes(a)&&(n.push(s),n.length>=t))break}return n}function Ge(e){if(!qe)return null;const t=qe.get(e.toLowerCase());if(!t)return null;const a=rt?.get(e.toLowerCase());return a?{...t,...a,n:t.n,r:t.r||a.r,b:t.b||a.b,slug:t.slug||a.slug}:t}async function Ra(e){const t=String(e||"").trim();if(!t)return null;const a=await Ye(t);if(a&&wt(a))return a;const n=Ge(t);if(n){const r={id:`slug:${_t(t)}`,name:n.n,source:"ph-dataset",rank:n.r||null,born:n.b||null,ethnicity:n.ethnicity||null,hair:n.hair||null,eyes:n.eyes||null,cup:n.cup||null,bust:n.bust||null,waist:n.waist||null,hip:n.hip||null,height:za(n.height)||null,weight:Ya(n.weight)||null,tags:n.tags||[],url:`https://www.pornhub.com/pornstar/${_t(t)}`,fetchedAt:Date.now()};return a?wt(a)||await we({...a,...r}):await we(r),r}return a&&a.notFound?a:await Ft(t)}function za(e){if(!e)return null;const t=String(e).match(/(\d+)\s*cm/i);if(t)return`${t[1]} cm`;const a=parseInt(e,10);return a>50&&a<250?`${a} cm`:null}function Ya(e){if(!e)return null;const t=String(e).match(/(\d+)\s*kg/i);if(t)return`${t[1]} kg`;const a=parseInt(e,10);return a>30&&a<200?`${a} kg`:null}function wt(e){return e?e.rank||e.videosCount||e.subscribers||e.born||e.height||e.weight||e.relation||e.ethnicity||e.measurements||e.avatar||e.tags?.length:!1}function _t(e){return String(e).toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")}const Ua=Object.freeze(Object.defineProperty({__proto__:null,findOrCreateActress:Ra,getStar:Ge,getStarsCount:qa,isStarsLoaded:ja,loadStarsDataset:Ee,searchStars:ot},Symbol.toStringTag,{value:"Module"})),qt="recentCategories";function Rt(){try{return JSON.parse(localStorage.getItem(qt)||"[]")}catch{return[]}}function Wa(e){if(!e)return;const t=Rt().filter(a=>a!==e);t.unshift(e),localStorage.setItem(qt,JSON.stringify(t.slice(0,8)))}async function zt(){return await ge("defaultDevice","iPad")||"iPad"}function ct(){try{return JSON.parse(localStorage.getItem("recentActresses")||"[]")}catch{return[]}}function Va(e){if(!e)return;const t=ct().filter(a=>a.toLowerCase()!==e.toLowerCase());t.unshift(e),localStorage.setItem("recentActresses",JSON.stringify(t.slice(0,8)))}function Ga(e){const t=new Date(e),a=n=>n.toString().padStart(2,"0");return`${t.getFullYear()}-${a(t.getMonth()+1)}-${a(t.getDate())}`}function Ka(e){const t=new Date(e),a=n=>n.toString().padStart(2,"0");return`${a(t.getHours())}:${a(t.getMinutes())}`}function $t(e){return!e||e.notFound||e.transient?!1:e.rank||e.videosCount||e.subscribers||e.born||e.height||e.weight||e.relation||e.ethnicity||e.measurements||e.avatar||e.tags&&e.tags.length}function Xa(e){if(!e)return null;const t=String(e).match(/(\d+)\s*cm/i);if(t)return`${t[1]} cm`;const a=parseInt(e,10);return a>50&&a<250?`${a} cm`:null}function Ja(e){if(!e)return null;const t=String(e).match(/(\d+)\s*kg/i);if(t)return`${t[1]} kg`;const a=parseInt(e,10);return a>30&&a<200?`${a} kg`:null}function kt(e){const t=new Set;if(!e)return t;if(e.born){const o=e.born.match(/\b(19|20)\d{2}\b/);if(o){const c=new Date().getFullYear()-parseInt(o[0],10);c>=40||c>=30?t.add("MILF"):c<25?t.add("Teen"):c<30&&t.add("Young")}}if(e.ethnicity){const o=e.ethnicity.toLowerCase();o.includes("latin")||o.includes("hispanic")?t.add("Latina"):o.includes("asian")?t.add("Asian"):o.includes("ebony")||o.includes("black")?t.add("Black"):o.includes("caucasian")||o.includes("white")?t.add("Caucasian"):o.includes("middle eastern")||o.includes("arab")?t.add("Arab"):o.includes("mixed")&&t.add("Mixed")}if(e.hair){const o=e.hair.toLowerCase();o.includes("blond")?t.add("Blonde"):o.includes("brown")||o.includes("brunette")?t.add("Brunette"):o.includes("red")?t.add("Redhead"):o.includes("black")&&t.add("Brunette")}const a=parseInt(String(e.bust||"").match(/(\d+)/)?.[1]||"",10);a&&a>=90&&t.add("Big Tits");const n=parseInt(String(e.hip||"").match(/(\d+)/)?.[1]||"",10),s=parseInt(String(e.waist||"").match(/(\d+)/)?.[1]||"",10);n&&s&&n-s>=25&&t.add("Big Ass");const i=parseInt(String(e.height||"").match(/(\d+)/)?.[1]||"",10);i&&i<160?t.add("Petite"):i&&i>=175&&t.add("Tall");const r=parseInt(String(e.weight||"").match(/(\d+)/)?.[1]||"",10);if(r&&r>=80&&t.add("BBW"),e.relation&&e.relation.toLowerCase().includes("married")&&t.add("MILF"),e.tags&&Array.isArray(e.tags)){const o=new Set(["MILF","Teen","Asian","Latina","Black","Caucasian","Ebony","Amateur","Anal","Blowjob","Threesome","Creampie","Squirt","Petite","Babe","Masturbation","Lesbian","Big Tits","Big Ass","Brunette","Blonde","Redhead","Shaved","Tattoo","Piercing","BBW","Tall","Stockings","Heels","Lingerie","Glamour"]);e.tags.forEach(c=>{o.has(c)&&t.add(c)})}return t}async function Re({presetAt:e=null,editId:t=null,simple:a=!1}={}){let n=null;if(t&&(n=await ia(t),!n)){F("No se encontró el registro");return}if(a&&!t)return Za(e);const s=await Ve("category"),i=n?n.device||"":await zt(),r=n?.categories||(n?.category?[n.category]:[]),o=ct();await Ee();const c=n?.actressName||"",l=document.createElement("div");l.innerHTML=`
    <form id="recordForm" autocomplete="off" tabindex="-1">

      <div class="record-section">
        <div class="field">
          <label>Persona / actriz</label>
          <div class="actress-picker">
            <input
              type="text"
              id="actressInput"
              name="actressName"
              placeholder="Escribe o elige reciente"
              autocomplete="off"
              autocorrect="off"
              autocapitalize="off"
              spellcheck="false"
              value="${ve(c)}"
            />
            <div class="actress-dropdown" id="actressDropdown" hidden></div>
          </div>
          ${o.length&&!c?`<div class="chips" id="recentActressChips" style="margin-top: 6px;">
                ${o.slice(0,4).map(d=>`<button type="button" class="chip" data-actress="${ve(d)}">${f(d)}</button>`).join("")}
              </div>`:""}
          <div id="actressInfo" class="actress-info"></div>
        </div>
      </div>

      <div class="record-section">
        <div class="field">
          <label>Categorías</label>
          <div class="multi-cats" id="catChips"></div>
          <button type="button" class="btn btn--ghost" id="toggleCatPicker" style="margin-top: 6px;">
            <span id="toggleCatPickerText">+ Elegir categorías</span>
          </button>
          <div class="cat-picker" id="catPicker" hidden>
            <div class="cat-picker__head">
              <div class="search" style="flex: 1;">
                <input type="text" id="catSearchInput" placeholder="Buscar..." />
              </div>
            </div>
            <div class="cat-picker__list" id="catPickerList"></div>
            <div class="cat-picker__add">
              <input type="text" id="newCatInput" placeholder="O escribe una nueva" />
              <button type="button" class="btn btn--primary" id="addNewCat">Añadir</button>
            </div>
            <button type="button" class="btn" id="doneCats" style="margin-top: 4px;">Listo</button>
          </div>
        </div>
      </div>

      ${n?`<div class="record-section">
            <div class="field-row">
              <div class="field">
                <label>Fecha</label>
                <input type="date" name="date" value="${ve(Ga(n.at))}" required />
              </div>
              <div class="field">
                <label>Hora</label>
                <input type="time" name="time" value="${ve(Ka(n.at))}" required />
              </div>
            </div>
          </div>`:""}

      <div class="record-section">
        <div class="field-row">
          <div class="field">
            <label>Fuente</label>
            <select name="sourceType" id="sourceType">
              <option value="">—</option>
              ${Ca.map(d=>`<option value="${d.id}" ${n?.sourceType===d.id?"selected":""}>${d.icon} ${d.label}</option>`).join("")}
            </select>
          </div>
          <div class="field" id="deviceField">
            <label>Dispositivo</label>
          </div>
        </div>
        ${n?`<div class="field" id="siteField" style="margin-top: 12px;">
                <label>Sitio web</label>
              </div>`:""}
      </div>

      <div class="record-section">
        <label class="ios-toggle">
          <input type="checkbox" name="lubricant" id="lubricantCheck" ${n?.lubricant==="with"?"checked":""} />
          <span class="ios-toggle__track"><span class="ios-toggle__thumb"></span></span>
          <span class="ios-toggle__label">Lubricante</span>
        </label>
      </div>

      ${n?`<div class="record-section">
              <div class="field">
                <label>Notas</label>
                <textarea name="notes" rows="3" placeholder="Lo que quieras recordar">${f(n.notes||"")}</textarea>
              </div>
            </div>`:""}
    </form>
  `;const u=document.createElement("div");if(u.style.display="flex",u.style.gap="8px",u.style.width="100%",n){const d=document.createElement("button");d.type="button",d.className="btn btn--danger",d.textContent="Eliminar",u.appendChild(d)}const p=document.createElement("button");p.type="button",p.className="btn",p.textContent="Cancelar";const m=document.createElement("button");m.type="button",m.className="btn btn--primary",m.textContent=n?"Guardar":"Registrar",u.appendChild(p),u.appendChild(m);const v=We({title:n?"Editar registro":"Nuevo registro",body:l,footer:u}),h=l.querySelector("#catChips"),g=l.querySelector("#catPicker"),T=l.querySelector("#catPickerList"),A=l.querySelector("#catSearchInput"),M=l.querySelector("#newCatInput"),x=new Set(r);function D(){if(h.innerHTML="",x.size===0){const d=document.createElement("span");d.className="muted",d.style.fontSize="13px",d.textContent="Se autocompletará con la actriz",h.appendChild(d);return}[...x].forEach(d=>{const y=document.createElement("span");y.className="chip is-active",y.innerHTML=`<span>${f(d)}</span> <span class="chip__remove" aria-hidden="true">×</span>`,y.addEventListener("click",()=>{x.delete(d),D(),E(A.value)}),h.appendChild(y)})}D();function E(d=""){T.innerHTML="";const y=d.toLowerCase().trim(),k=Rt().filter($=>$.toLowerCase().includes(y)),S=s.filter($=>$.toLowerCase().includes(y)),B=[...new Set([...k,...S])].sort();if(!B.length){const $=document.createElement("div");$.className="muted",$.style.fontSize="13px",$.style.padding="8px",$.textContent="No hay coincidencias. Escribe abajo para crear una nueva.",T.appendChild($);return}B.forEach($=>{const I=document.createElement("button");I.type="button",I.className="chip"+(x.has($)?" is-active":""),I.textContent=$,I.addEventListener("click",()=>{x.has($)?x.delete($):x.add($),D(),E(A.value)}),T.appendChild(I)})}l.querySelector("#toggleCatPicker").addEventListener("click",()=>{const d=g.hidden;g.hidden=!d,l.querySelector("#toggleCatPickerText").textContent=d?"Cerrar":"+ Elegir categorías",d&&(E(""),A.focus())}),l.querySelector("#addNewCat").addEventListener("click",async()=>{const d=M.value.trim();if(!d){F("Escribe el nombre"),M.focus();return}await Fa("category",d),s.includes(d)||s.push(d),x.add(d),D(),M.value="",E(A.value)}),M.addEventListener("keydown",d=>{d.key==="Enter"&&(d.preventDefault(),l.querySelector("#addNewCat").click())}),l.querySelector("#doneCats").addEventListener("click",()=>{g.hidden=!0,l.querySelector("#toggleCatPickerText").textContent="+ Elegir categorías"}),A.addEventListener("input",()=>E(A.value));const b=l.querySelector("#actressInput"),W=l.querySelector("#actressDropdown");let K=[];function X(d,y){if(W.innerHTML="",!d.length){W.hidden=!0;return}d.slice(0,8).forEach((k,S)=>{const B=document.createElement("button");B.type="button",B.className="actress-dropdown__item",B.dataset.name=k;const $=k.toLowerCase(),I=(y||"").toLowerCase();let H=f(k);if(I){const L=$.indexOf(I);L>=0&&(H=f(k.slice(0,L))+"<b>"+f(k.slice(L,L+I.length))+"</b>"+f(k.slice(L+I.length)))}B.innerHTML=`<span>${H}</span>${S===0?'<small class="muted">↵</small>':""}`,B.addEventListener("mousedown",L=>{L.preventDefault(),te(k)}),W.appendChild(B)}),W.hidden=!1,K=d.slice(0,8)}function P(){W.hidden=!0,K=[]}function te(d){b.value=d,P(),b.dispatchEvent(new Event("input"))}async function ae(d){const y=(d||"").trim();if(!y){const L=ct().map(R=>R).filter(Boolean),Je=ot("",6).map(R=>R.n),pe=new Set,ke=[];[...L,...Je].forEach(R=>{const Z=R.toLowerCase();pe.has(Z)||(pe.add(Z),ke.push(R))}),X(ke.slice(0,8),"");return}const k=y.toLowerCase();let S=[];try{S=(await re()).filter(L=>L&&L.name).map(L=>L.name).filter(L=>L.toLowerCase().includes(k))}catch{}const B=ot(y,12).map(H=>H.n),$=new Set,I=[];[...S,...B].forEach(H=>{const L=H.toLowerCase();$.has(L)||($.add(L),I.push(H))}),X(I.slice(0,8),y)}b.addEventListener("mousedown",()=>{ae(b.value)}),b.addEventListener("touchstart",()=>{ae(b.value)},{passive:!0}),b.addEventListener("blur",()=>{setTimeout(P,200),setTimeout(()=>{},250)});let Le="";b.addEventListener("input",()=>{const d=b.value;d!==Le&&(Le=d,ae(d))}),b.addEventListener("keydown",d=>{if(!W.hidden&&K.length){if(d.key==="Enter"){d.preventDefault(),te(K[0]);return}if(d.key==="Escape"){P();return}}}),l.querySelectorAll("#recentActressChips .chip").forEach(d=>{d.addEventListener("click",()=>{const y=d.dataset.actress;te(y)})}),c&&Ee().then(()=>ae(c));let ue=null;n&&(ue=yt({name:"site",label:"Sitio web",value:n?.site||"",optionKey:"site"}),l.querySelector("#siteField").replaceWith(ue.wrap));const Ke=yt({name:"device",label:"Dispositivo",value:i,optionKey:"device"});l.querySelector("#deviceField").replaceWith(Ke.wrap);let $e=0,w;const Me=()=>{w&&clearTimeout(w),w=null,$e++},ne=l.querySelector("#actressInfo");function Xe(d){if(!d)return;const y=[...kt(d)];return y.forEach(k=>{s.includes(k)||s.push(k),x.add(k)}),D(),E(""),y}function De(d){if(!d){ne.innerHTML="";return}if(d.transient){ne.innerHTML=`<div class="actress-info__row warn">
        <div>
          <strong>No se pudo conectar con Pornhub</strong><br>
          <small>El proxy CORS está bloqueado. Se guardará como nombre manual.</small>
        </div>
      </div>`;return}if(d.notFound&&!$t(d)){ne.innerHTML='<div class="actress-info__row">No encontrada en Pornhub. Se guardará como nombre manual.</div>';return}const y=[];d.rank&&y.push(`#${f(d.rank)}`),d.ethnicity&&y.push(f(d.ethnicity)),d.hair&&y.push(`Cabello: ${f(d.hair)}`),d.height&&y.push(f(d.height)),d.weight&&y.push(f(d.weight)),d.bust&&d.cup&&y.push(`Busto: ${f(d.bust)}${f(d.cup)}`),d.born&&y.push(f(d.born)),d.relation&&y.push(f(d.relation));const k=d.avatar?`<div class="actress-info__avatar"><img src="${f(d.avatar)}" alt="" loading="lazy"></div>`:"",S=[...kt(d)],B=S.length?`<div class="actress-info__autocats">
          <span class="actress-info__autocats-label">Auto:</span>
          ${S.map($=>`<span class="chip is-active" style="font-size: 11px; padding: 3px 8px;">${f($)}</span>`).join(" ")}
        </div>`:"";ne.innerHTML=`<div class="actress-info__row">${k}<div class="actress-info__meta">${y.length?y.join(" · "):"PH sin datos detallados"}</div>${B}</div>`}async function Wt(d){await Ee();const k=(await re()).find($=>$.name&&$.name.toLowerCase()===d.toLowerCase()),S=Ge(d);if(S){const I={id:`slug:${be(d)}`,name:S.n,source:"ph-dataset",rank:S.r||null,born:S.b||null,ethnicity:S.ethnicity||null,hair:S.hair||null,eyes:S.eyes||null,cup:S.cup||null,bust:S.bust||null,waist:S.waist||null,hip:S.hip||null,height:Xa(S.height)||null,weight:Ja(S.weight)||null,tags:S.tags||[],url:`https://www.pornhub.com/pornstar/${be(d)}`,fetchedAt:Date.now()},H=k?{...I,...k,name:S.n,id:k.id||I.id}:I;De(H),Xe(H),k||await we(H);return}if(k&&$t(k)){De(k),Xe(k);return}if(k&&k.notFound){De(k);return}let B=++$e;ne.innerHTML='<div class="actress-info__row">Buscando en Pornhub…</div>';try{const $=await Ft(d);if(B!==$e)return;De($),Xe($)}catch($){ne.innerHTML=`<div class="actress-info__row warn">Error: ${f($.message||"desconocido")}</div>`}}c&&setTimeout(()=>b.dispatchEvent(new Event("input")),50),b.addEventListener("input",()=>{clearTimeout(w);const d=b.value.trim();if(!d){ne.innerHTML="";return}w=setTimeout(()=>Wt(d),350)}),p.addEventListener("click",()=>{Me(),v.close()}),m.addEventListener("click",async()=>{Me();const d=new FormData(l.querySelector("#recordForm")),y=String(d.get("actressName")||"").trim(),k=String(d.get("sourceType")||"").trim(),S=String(d.get("device")||"").trim(),B=l.querySelector("#lubricantCheck").checked?"with":"without",$=ue?String(ue.select.value||"").trim():"",I=String(d.get("notes")||"").trim();let H=n?.at??Date.now();if(n){const R=String(d.get("date")||""),Z=String(d.get("time")||"");if(R&&Z){const[Vt,Gt,Kt]=R.split("-").map(Number),[Xt,Jt]=Z.split(":").map(Number);H=new Date(Vt,(Gt||1)-1,Kt||1,Xt||0,Jt||0,0,0).getTime()}}const L=[...x],Je=L[0]||"Sin categoría";let pe=null;if(y){const R=await Ye(y);if(R)pe=R.id;else{const Z=`slug:${be(y)}`;await we({id:Z,name:y,source:"manual",fetchedAt:Date.now()}),pe=Z}}const ke={at:H,categories:L,category:Je,site:$,actressName:y,actressId:pe,sourceType:k,device:S,lubricant:B,notes:I};n?(await sa({...n,...ke}),F("Actualizado")):(await Lt(ke),F("Registrado"),L.forEach(Wa),y&&Va(y)),v.close(),document.dispatchEvent(new CustomEvent("nuttracker:data-changed"))});const ht=u.querySelector(".btn--danger");ht&&ht.addEventListener("click",async()=>{await Mt(n.id),F("Eliminado"),v.close(),document.dispatchEvent(new CustomEvent("nuttracker:data-changed"))})}async function Za(e){const t=await zt(),a={at:e??Date.now(),categories:[],category:"Sin categoría",site:"",actressName:"",actressId:null,sourceType:"",device:t,lubricant:"without",notes:""};await Lt(a),F("Registrado"),document.dispatchEvent(new CustomEvent("nuttracker:data-changed"))}async function Qa(e){const t=await Ce(),a=await ge("simpleMode",!1),n=wa(t),s=ya(t),i=Fe(t),r=je(t),o=new Date().getFullYear();it(t,o);const c=[...t].sort((P,te)=>te.at-P.at).slice(0,5),l=pt(t),u=mt(t),p=ut(t,o),m=new Date().getHours(),v=m<6?"Buenas noches":m<13?"Buenos días":m<21?"Buenas tardes":"Buenas noches",h=n.length,g=s.length,T=l.indexOf(Math.max(...l)),A=Math.max(...l),M=u.indexOf(Math.max(...u)),x=p.indexOf(Math.max(...p)),D=Math.max(...u),E=Math.max(...p),b=Math.round(i.totalSeconds/60),W=Nt(t),K=r.longest,X=en(t,l,u,h,g,r);e.innerHTML=`
    <div class="screen home-screen">
      <p class="muted" style="margin-top: 8px;">${f(v)},</p>
      <h2>¿Otra vez?</h2>
      <p class="muted">${a?"Modo simple: un toque y listo.":"Toca el botón para registrar con detalles."}</p>

      <div class="record-hero">
        <button class="record-btn" id="recordBtn" aria-label="Registrar ahora">
          <span class="record-btn__label">
            <small>Registrar</small>
            YA
          </span>
        </button>
      </div>

      <div class="home-stats">
        <div class="home-stat home-stat--pink">
          <div class="home-stat__label">Hoy</div>
          <div class="home-stat__value">${h}</div>
          <div class="home-stat__hint">${h===1?"registro":"registros"}</div>
        </div>
        <div class="home-stat home-stat--blue">
          <div class="home-stat__label">Este mes</div>
          <div class="home-stat__value">${g}</div>
          <div class="home-stat__hint">${Oe(b)} min totales</div>
        </div>
        <div class="home-stat home-stat--purple">
          <div class="home-stat__label">Racha</div>
          <div class="home-stat__value">${r.current}<small>d</small></div>
          <div class="home-stat__hint">máx. ${K}d seguidos</div>
        </div>
        <div class="home-stat home-stat--green">
          <div class="home-stat__label">Actrices</div>
          <div class="home-stat__value">${W}</div>
          <div class="home-stat__hint">únicas en tu colección</div>
        </div>
      </div>

      ${i.count>=3?`<div class="insight-card insight-card--${X.color}">
              <div class="insight-card__label">Dato curioso</div>
              <div class="insight-card__value">${X.title}</div>
              <div class="insight-card__hint">${X.sub}</div>
            </div>`:""}

      ${i.count>=1?`<div class="section-head"><h3>Tus patrones</h3></div>
            <div class="home-patterns">
              <div class="home-pattern">
                <div class="home-pattern__icon">⏰</div>
                <div class="home-pattern__info">
                  <div class="home-pattern__label">Hora favorita</div>
                  <div class="home-pattern__value">${q(T)}:00 — ${q(T)}:59</div>
                  <div class="home-pattern__sub">${A} ${A===1?"vez":"veces"}</div>
                </div>
              </div>
              <div class="home-pattern">
                <div class="home-pattern__icon">📅</div>
                <div class="home-pattern__info">
                  <div class="home-pattern__label">Día favorito</div>
                  <div class="home-pattern__value">${Ue[M]}</div>
                  <div class="home-pattern__sub">${D} ${D===1?"vez":"veces"}</div>
                </div>
              </div>
              <div class="home-pattern">
                <div class="home-pattern__icon">🗓</div>
                <div class="home-pattern__info">
                  <div class="home-pattern__label">Mes favorito</div>
                  <div class="home-pattern__value">${xe[x]}</div>
                  <div class="home-pattern__sub">${E} ${E===1?"vez":"veces"}</div>
                </div>
              </div>
            </div>`:""}

      <div class="section-head">
        <h3>Últimos registros</h3>
        <span class="muted">${c.length}</span>
      </div>

      ${c.length?`<div class="list">${c.map(P=>`
            <div class="list-item">
              <div class="list-item__title">
                ${f(P.categories&&P.categories[0]||P.category||"Sin categoría")}
                <div class="list-item__sub">
                  ${f(P.actressName||P.site||"—")} · ${Bt(P.at)}
                  ${P.device?` · <span class="site-badge">${f(P.device)}</span>`:""}
                </div>
              </div>
            </div>`).join("")}
          </div>`:`<div class="empty">
              <div class="empty__icon">·</div>
              <div class="empty__title">Sin registros todavía</div>
              <div>Pulsa el botón rojo para empezar.</div>
            </div>`}
    </div>
  `,document.getElementById("recordBtn").addEventListener("click",()=>{a?Re({simple:!0}):Re()})}function en(e,t,a,n,s,i,r){const o=t.indexOf(Math.max(...t)),c=Math.max(...t);return o>=0&&o<=5?{title:`${q(o)}:00 — ${q(o)}:59`,sub:"Tu hora más activa. Curioso, ¿no? Normal dormir a esas horas.",color:"purple"}:o>=13&&o<=15?{title:"Tarde",sub:`La siesta más entretenida del día. ${c} veces ahí.`,color:"orange"}:o>=22||o<=3?{title:"Noche",sub:`De madrugada. ${c} veces en la mejor hora.`,color:"purple"}:i.longest>=7?{title:`${i.longest} días seguidos`,sub:"Tu récord de racha. Productividad constante.",color:"green"}:s>=30?{title:`${s} este mes`,sub:"Vas a buen ritmo. Interesante ver hasta dónde llegas.",color:"pink"}:n>=3?{title:`${n} hoy`,sub:"Día activo. Curioso, ¿no?",color:"pink"}:{title:`${q(o)}:00 — ${q(o)}:59`,sub:"Tu hora más activa hasta ahora.",color:"blue"}}function tn(e){try{window.open(e,"_blank","noopener,noreferrer")||(window.location.href=e)}catch{window.location.href=e}}function an(e){try{if(navigator.clipboard)navigator.clipboard.writeText(e);else{const t=document.createElement("textarea");t.value=e,document.body.appendChild(t),t.select(),document.execCommand("copy"),document.body.removeChild(t)}}catch{}}async function Yt(e,t=[]){e.toLowerCase();let a=await Ye(e);if(!a){const b=Ge(e);b&&(a={id:`slug:${b.n.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`,name:b.n,source:"ph-dataset",rank:b.r,born:b.b,url:`https://www.pornhub.com/pornstar/${b.n.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`,fetchedAt:Date.now()})}const n=a?t.filter(b=>a.id&&b.actressId===a.id||a.name&&b.actressName===a.name).length:0,s=(a?.name||e).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,""),i=`https://www.pornhub.com/pornstar/${s}`,r=`https://www.iafd.com/results.asp?searchtype=comprehensive&searchstring=${encodeURIComponent(e)}`,o=`https://www.freeones.com/${s}`,c=`https://www.babepedia.com/pornstar/${s}`,l=`https://www.xvideos.com/?k=${encodeURIComponent(e)}`,u=`https://xhamster.com/search/${encodeURIComponent(e)}`,p=`https://www.reddit.com/search/?q=${encodeURIComponent(e+" pornstar")}&type=user`,m=a?.avatar?`<img src="${ve(a.avatar)}" alt="" class="actress-detail__avatar" loading="lazy">`:`<div class="actress-detail__avatar actress-detail__avatar--init">${f((e[0]||"?").toUpperCase())}</div>`,v=[];a?.rank&&v.push({label:"Ranking PH",value:"#"+a.rank}),a?.videosCount&&v.push({label:"Vídeos",value:Oe(a.videosCount)}),a?.subscribers&&v.push({label:"Suscriptores",value:Oe(a.subscribers)}),a?.videoViews&&v.push({label:"Views",value:Oe(a.videoViews)}),a?.born&&v.push({label:"Nacimiento",value:a.born}),a?.ethnicity&&v.push({label:"Etnia",value:a.ethnicity}),a?.relation&&v.push({label:"Relación",value:a.relation}),a?.height&&v.push({label:"Altura",value:a.height}),a?.weight&&v.push({label:"Peso",value:a.weight}),a?.bust&&v.push({label:"Busto",value:a.bust+(a?.cup?a.cup:"")}),a?.waist&&v.push({label:"Cintura",value:a.waist}),a?.hip&&v.push({label:"Cadera",value:a.hip}),a?.cup&&v.push({label:"Copa",value:a.cup}),a?.hair&&v.push({label:"Cabello",value:a.hair}),a?.eyes&&v.push({label:"Ojos",value:a.eyes}),a?.startedYear&&v.push({label:"Año de inicio",value:a.startedYear});const h=(a?.tags||[]).slice(0,12),g=h.length?`<div class="actress-detail__tags">${h.map(b=>`<span class="chip is-active" style="font-size: 11px; padding: 4px 8px;">${f(b)}</span>`).join("")}</div>`:"",T=[{label:"Pornhub",url:i,color:"pink"},{label:"IAFD",url:r,color:"blue"},{label:"FreeOnes",url:o,color:"purple"},{label:"Babepedia",url:c,color:"green"},{label:"XVideos",url:l,color:"orange"},{label:"xHamster",url:u,color:"red"},{label:"Reddit",url:p,color:"pink"}],A=document.createElement("div");A.innerHTML=`
    <div class="actress-detail">
      <div class="actress-detail__header">
        ${m}
        <div class="actress-detail__head-info">
          <h3 style="margin: 0 0 4px;">${f(e)}</h3>
          <div class="muted" style="font-size: 13px;">${n} ${n===1?"registro":"registros"} en tu colección</div>
          ${a?.source?`<div class="muted" style="font-size: 11px; margin-top: 2px;">Fuente: ${f(a.source==="ph-dataset"?"Dataset PH":a.source)}</div>`:""}
        </div>
      </div>

      ${v.length?`<div class="actress-detail__meta-grid">${v.map(b=>`<div class="actress-detail__meta-item"><span class="muted">${f(b.label)}</span><strong>${f(String(b.value))}</strong></div>`).join("")}</div>`:""}

      ${g?`<div style="margin-top: 14px;"><div class="muted" style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px;">Tags</div>${g}</div>`:""}

      <div style="margin-top: 18px;">
        <div class="muted" style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px;">Perfiles y vídeos</div>
        <div class="actress-detail__links">
          ${T.map(b=>`<button type="button" class="actress-detail__link actress-detail__link--${b.color}" data-url="${ve(b.url)}">${f(b.label)} ↗</button>`).join("")}
        </div>
        <p class="subtle" style="margin-top: 8px;">Se abren en una pestaña nueva. Para navegación privada, abre Safari/InPrivate manualmente.</p>
      </div>
    </div>
  `;const M=document.createElement("div");M.style.display="flex",M.style.gap="8px",M.style.width="100%";const x=document.createElement("button");x.type="button",x.className="btn",x.textContent="Copiar nombre";const D=document.createElement("button");D.type="button",D.className="btn btn--primary",D.textContent="Cerrar",M.appendChild(x),M.appendChild(D);const E=We({title:"Actriz",body:A,footer:M});A.querySelectorAll("[data-url]").forEach(b=>{b.addEventListener("click",()=>tn(b.dataset.url))}),x.addEventListener("click",()=>{an(e),F("Nombre copiado")}),D.addEventListener("click",()=>E.close())}const ft={all:{label:"Todo"},today:{label:"Hoy",from:()=>C(Date.now()),to:()=>N(C(Date.now()),1)},"7d":{label:"7d",from:()=>N(C(Date.now()),-6),to:()=>N(C(Date.now()),1)},"30d":{label:"30d",from:()=>N(C(Date.now()),-29),to:()=>N(C(Date.now()),1)},"3m":{label:"3m",from:()=>N(C(Date.now()),-89),to:()=>N(C(Date.now()),1)},"6m":{label:"6m",from:()=>N(C(Date.now()),-179),to:()=>N(C(Date.now()),1)},"1y":{label:"1 año",from:()=>N(C(Date.now()),-364),to:()=>N(C(Date.now()),1)}};let J="all",oe=null,ce=null,le="",de="",lt=90,Se=null;function Et(){let e=0;return J!=="all"&&e++,oe&&e++,ce!==null&&e++,le&&e++,de&&e++,e}function St(){const e=[];return J!=="all"&&e.push(ft[J].label),oe&&e.push(String(oe)),ce!==null&&e.push(xe[ce]),le&&e.push(le),de&&e.push(de),e.join(" · ")}async function ie(e){const t=await Ce(),a=await re();[...new Set(t.map(w=>new Date(w.at).getFullYear()))].sort((w,Me)=>Me-w),[...new Set(t.map(w=>w.device).filter(Boolean))].sort(),[...new Set(t.map(w=>w.sourceType).filter(Boolean))].sort();const n=kn(),s=En(t,n),i=Fe(s);je(s);const o=new Date().getFullYear();Se===null&&(Se=o);const c=Se,l=t.filter(w=>new Date(w.at).getFullYear()===c),u=Fe(l),p=je(l),m=it(l,c),v=it(t,c-1),g=G(st(l),20).length,T=ba(s,lt),A=ut(s,c),M=pt(s),x=mt(s),D=G(st(s),20),E=ka(s,a,10),b=G(he(s,w=>w.site||null),6).filter(([w])=>w),W=G(he(s,w=>w.device||null),6).filter(([w])=>w),K=G(he(s,w=>w.sourceType||null),6).filter(([w])=>w),X=G(he(s,w=>w.lubricant||null),6).filter(([w])=>w);Ze(s,a,Pt),Ze(s,a,Ht),Ze(s,a,$a);const P=[...T.values()],te=Math.max(1,...P),ae=["var(--bg-elevated)"];for(let w=1;w<=4;w++)ae.push(`color-mix(in srgb, var(--accent) ${w*22}%, var(--bg-elevated))`);const Le=nn(s),ue=sn(s),Ke=rn(s),$e=Math.round(i.totalSeconds/60);e.innerHTML=`
    <div class="screen stats-screen">
      <div class="stats-header">
        <h2>Estadísticas</h2>
        <button class="btn-icon" id="openFilters" aria-label="Filtros">
          <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M3 6h18v2H3zm3 5h12v2H6zm4 5h4v2h-4z"/></svg>
          ${Et()>0?`<span class="btn-icon__count">${Et()}</span>`:""}
        </button>
      </div>

      ${St()?`<button class="filter-active" id="clearFilters">
        <span class="filter-active__dot"></span>
        <span class="filter-active__text">Filtrando: <b>${f(St())}</b></span>
        <span class="filter-active__clear">Limpiar</span>
      </button>`:""}

      ${cn(c,u,p,g,v,m,t)}

      <div class="stat-grid">
        ${Pe("Total",i.count,"en este periodo","pink")}
        ${Pe("Media/día",Le,"últimos 30d","blue")}
        ${Pe("Activas",Nt(s),"actrices únicas","green")}
        ${Pe("Tiempo",$e+"m","en sesiones","purple")}
      </div>

      ${z("habits","Tus hábitos",on(s,ue,Ke,M,x),i.count>0)}

      ${z("heatmap","Heatmap",_n(T,lt),i.count>0)}

      ${z("hours","Horas del día",un(M),i.count>0)}

      ${z("weekdays","Días de la semana",pn(x),i.count>0)}

      ${z("months",`Mes a mes · ${c}`,mn(A),i.count>0)}

      ${z("actresses","Top actrices",ln(E),i.count>0)}

      ${z("categories","Top categorías",dn(G(D,12)),i.count>0)}

      ${z("taste-all","Tus gustos",fn(s,a),vn(s,a))}

      ${z("sites","Sitios",He(b,6),b.length>0)}
      ${z("devices","Dispositivos",He(W,6),W.length>0)}
      ${z("source","Tipo de fuente",He(K,6),K.length>0)}
      ${z("lube","Lubricante",He(X,6),X.length>0)}
    </div>
  `,yn(e),gn(e),bn(e),$n(T,ae,te)}function Pe(e,t,a,n){return`
    <div class="summary-cell summary-cell--${n}">
      <div class="summary-cell__label">${f(e)}</div>
      <div class="summary-cell__value">${f(String(t))}</div>
      <div class="summary-cell__hint">${f(a)}</div>
    </div>
  `}function nn(e){if(!e.length)return 0;const t=e.filter(n=>n.at>=Date.now()-30*864e5),a=new Set(t.map(n=>C(n.at))).size||1;return(t.length/a).toFixed(1)}function sn(e){if(e.length<2)return null;const t=[...e].sort((r,o)=>r.at-o.at);let a=0,n=0;for(let r=1;r<t.length;r++){const o=t[r].at-t[r-1].at;o<7*864e5&&(a+=o,n++)}if(n===0)return null;const s=a/n,i=s/36e5;return i<1?`${Math.round(s/6e4)}m`:i<48?`${i.toFixed(1)}h`:`${(i/24).toFixed(1)}d`}function rn(e){if(!e.length)return 0;const t=e.filter(n=>n.at>=Date.now()-30*864e5);return(new Set(t.map(n=>C(n.at))).size/4.3).toFixed(1)}function on(e,t,a,n,s){const i=Math.max(...n),r=n.indexOf(i),o=Math.max(...s),c=s.indexOf(o);return`<div class="habits-grid">${[{label:"Hora pico",value:`${q(r)}:00 – ${q(r)}:59`,sub:`${i} registros`},{label:"Día favorito",value:Ue[c],sub:`${o} registros`},{label:"Días activos/sem",value:a,sub:"media de los últimos 30 días"},{label:"Entre registros",value:t||"—",sub:"tiempo medio entre cada uno"}].map(u=>`
    <div class="habit-cell">
      <div class="habit-cell__label">${f(u.label)}</div>
      <div class="habit-cell__value">${f(String(u.value))}</div>
      <div class="habit-cell__sub">${f(u.sub)}</div>
    </div>
  `).join("")}</div>`}function z(e,t,a,n=!0){const s=["habits","heatmap","hours","actresses","categories","taste-age"].includes(e);return n?`
    <section class="stats-section ${s?"is-open":""}">
      <button class="stats-section__head" data-toggle="${e}" aria-expanded="${s}">
        <span class="stats-section__title">${f(t)}</span>
        <span class="stats-section__chev ${s?"is-open":""}"></span>
      </button>
      <div class="stats-section__body ${s?"is-open":""}" data-body="${e}">${a}</div>
    </section>
  `:`
      <section class="stats-section">
        <header class="stats-section__head">
          <span class="stats-section__title">${f(t)}</span>
          <span class="stats-section__chev"></span>
        </header>
      </section>
    `}function cn(e,t,a,n,s,i,r){let o="";if(t.count){const m=i?.peakHour??0,v=i?.peakMonth??0,h=[];if(h.push(me("Tu año",String(t.count),"momentos","pink")),s&&s.summary.count){const g=t.count-s.summary.count,T=Math.round(g/s.summary.count*100);h.push(me(`vs ${e-1}`,`${g>=0?"+":""}${g}`,`${T>=0?"+":""}${T}%`,g>=0?"green":"orange"))}h.push(me("Mejor racha",`${a.longest}d`,"seguidos","purple")),h.push(me("Hora pico",`${q(m)}:00`,xe[v]||"","blue")),i?.byActress?.[0]&&h.push(me("Tu top","★",`<b>${f(i.byActress[0][0])}</b><br>${i.byActress[0][1]} veces`,"pink")),h.push(me("Variedad",String(n),"categorías","green")),o=`<div class="wrapped-hero__grid">${h.join("")}</div>`}else o=`<div class="wrapped-hero__empty">Sin datos en ${e}</div>`;const c=[...new Set(r.map(m=>new Date(m.at).getFullYear()))].sort((m,v)=>v-m),l=c.indexOf(e),u=l>=0&&l<c.length-1?c[l+1]:null,p=l>0?c[l-1]:null;return`
    <section class="wrapped-hero">
      <div class="wrapped-hero__nav">
        <button class="wrapped-hero__arrow" data-wrapped-nav="${u??""}" ${u?"":"disabled"} aria-label="Año anterior">‹</button>
        <div class="wrapped-hero__title">
          <span>Wrapped</span>
          <strong>${e}</strong>
        </div>
        <button class="wrapped-hero__arrow" data-wrapped-nav="${p??""}" ${p?"":"disabled"} aria-label="Año siguiente">›</button>
      </div>
      <button class="wrapped-hero__global" id="wrappedGlobal">
        <span>Ver global</span>
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M3 6h18v2H3zm3 5h12v2H6zm4 5h4v2h-4z"/></svg>
      </button>
      ${o}
    </section>
  `}function me(e,t,a,n){return`
    <div class="wrapped-card wrapped-card--${f(n)}">
      <div class="wrapped-card__title">${f(e)}</div>
      <div class="wrapped-card__big">${t}</div>
      <div class="wrapped-card__sub">${a}</div>
    </div>
  `}function ln(e){return e.length?`<div class="grid-cards grid-cards--3">${e.map(({actress:t,displayName:a,count:n},s)=>{const i=a||t?.name||"—",r=i[0]?i[0].toUpperCase():"?",o=encodeURIComponent(i),c=t?.born?f(t.born):`${n} ${n===1?"vez":"veces"}`;return`
      <button class="actress-tile" data-actress="${o}">
        <div class="actress-tile__rank">${s+1}</div>
        <div class="actress-tile__avatar">${t?.avatar?`<img src="${f(t.avatar)}" alt="" loading="lazy">`:f(r)}</div>
        <div class="actress-tile__name">${f(i)}</div>
        <div class="actress-tile__meta">${c}</div>
        <div class="actress-tile__count">${n}</div>
      </button>`}).join("")}</div>`:ye("Sin datos.")}function dn(e){if(!e.length)return ye("Sin datos.");const t=e.reduce((a,[,n])=>a+n,0);return`<div class="grid-cards grid-cards--2">${e.slice(0,12).map(([a,n])=>`
      <div class="cat-tile">
        <div class="cat-tile__pct">${t>0?Math.round(n/t*100):0}%</div>
        <div class="cat-tile__label">${f(a)}</div>
        <div class="cat-tile__count">${n} ${n===1?"vez":"veces"}</div>
      </div>`).join("")}</div>`}function un(e){const t=Math.max(1,...e),n=e.map((s,i)=>({h:i,v:s})).sort((s,i)=>i.v-s.v).slice(0,3).filter(s=>s.v>0).map(s=>`${q(s.h)}:00`).join(" · ");return`<div class="card">
    <div class="hours-summary">Top: <b>${f(n||"—")}</b></div>
    <div class="bars">${e.map((s,i)=>{const r=Math.round(s/t*100);return`<div class="bar-row"><span class="bar-row__label">${q(i)}h</span><span class="bar-row__track"><span class="bar-row__fill" style="width:${r}%"></span></span><span class="bar-row__value">${s}</span></div>`}).join("")}</div>
  </div>`}function pn(e){const t=Math.max(1,...e);return`<div class="card"><div class="bars">${e.map((a,n)=>{const s=Math.round(a/t*100);return`<div class="bar-row"><span class="bar-row__label">${Ue[n]}</span><span class="bar-row__track"><span class="bar-row__fill" style="width:${s}%"></span></span><span class="bar-row__value">${a}</span></div>`}).join("")}</div></div>`}function mn(e){const t=Math.max(1,...e);return`<div class="card"><div class="bars">${e.map((a,n)=>{const s=Math.round(a/t*100);return`<div class="bar-row"><span class="bar-row__label">${xe[n]}</span><span class="bar-row__track"><span class="bar-row__fill" style="width:${s}%"></span></span><span class="bar-row__value">${a}</span></div>`}).join("")}</div></div>`}function He(e,t){if(!e.length)return ye("Sin datos.");const a=e.reduce((n,[,s])=>n+s,0);return`<div class="card"><div class="bars">${e.slice(0,t).map(([n,s],i)=>{const r=Math.round(s/a*100);return`<div class="bar-row"><span class="bar-row__rank">${i+1}</span><span class="bar-row__label">${f(n)}</span><span class="bar-row__track"><span class="bar-row__fill" style="width:${r}%"></span></span><span class="bar-row__value">${s}</span></div>`}).join("")}</div></div>`}function fn(e,t){if(!e.length)return ye("Sin registros.");if(!t.length)return ye("Sin actrices guardadas.");new Map(t.map(h=>[h.id,h]));const a=new Map(t.filter(h=>h.name).map(h=>[h.name.toLowerCase(),h])),n=new Map,s=new Map,i=new Map,r=new Map,o=new Map,c=new Map,l=new Map;let u=0;for(const h of e){if(!h.actressName)continue;const g=a.get(h.actressName.toLowerCase());if(!g)continue;const T=Pt(g);T&&(n.set(T,(n.get(T)||0)+1),u++);const A=Ht(g);if(A&&s.set(A,(s.get(A)||0)+1),g.hair){const E=g.hair.toLowerCase(),b=E.includes("blond")?"Rubia":E.includes("brown")||E.includes("brunette")?"Morena":E.includes("red")?"Pelirroja":E.includes("black")?"Morena":g.hair;i.set(b,(i.get(b)||0)+1)}const M=parseInt(String(g.bust||"").match(/(\d+)/)?.[1]||"",10);if(M&&M>=80){const E=M>=95?"Muy grande":M>=90?"Grande":"Mediano";l.set(E,(l.get(E)||0)+1)}g.cup&&c.set(g.cup,(c.get(g.cup)||0)+1);const x=parseInt(String(g.height||"").match(/(\d+)/)?.[1]||"",10);if(x){const E=x<160?"Baja":x>=175?"Alta":"Mediana";r.set(E,(r.get(E)||0)+1)}const D=parseInt(String(g.weight||"").match(/(\d+)/)?.[1]||"",10);if(D){const E=D<50?"Delgada":D>=65?"Curvy":"Normal";o.set(E,(o.get(E)||0)+1)}}if(!u)return ye("Las actrices no tienen datos físicos. Necesitan tener info de Pornhub (fecha de nacimiento, etnia, etc.) para aparecer aquí.");const p=[{title:"Edad",data:n},{title:"Etnia",data:s},{title:"Cabello",data:i},{title:"Altura",data:r},{title:"Complexión",data:o},{title:"Busto",data:l}].filter(h=>h.data.size>0),m=p.sort((h,g)=>g.data.size-h.data.size)[0],v=p.filter(h=>h!==m).slice(0,3);return`
    <div class="card">
      <div class="taste-donut">
        ${hn(m.title,m.data)}
        <div class="taste-side">
          ${Ct(m.title,m.data)}
        </div>
      </div>
      ${v.length?`
        <div class="taste-others">
          ${v.map(h=>`
            <div class="taste-other">
              <div class="taste-other__title">${f(h.title)}</div>
              ${Ct(h.title,h.data,!0)}
            </div>
          `).join("")}
        </div>
      `:""}
    </div>
  `}function hn(e,t){const a=[...t.entries()].sort((u,p)=>p[1]-u[1]),n=a.reduce((u,[,p])=>u+p,0);if(!n)return'<div class="donut-empty">Sin datos</div>';const s=140,i=50,r=2*Math.PI*i;let o=0;const c=a.map(([u,p],m)=>{const v=p/n,h=r*v,g=`<circle cx="${s/2}" cy="${s/2}" r="${i}" fill="none" stroke="${ze[m%ze.length]}" stroke-width="18" stroke-dasharray="${h} ${r-h}" stroke-dashoffset="${-o}" transform="rotate(-90 ${s/2} ${s/2})" />`;return o+=h,g}).join(""),l=a[0];return`
    <div class="donut-wrap">
      <svg class="donut-svg" viewBox="0 0 ${s} ${s}" width="${s}" height="${s}">
        <circle cx="${s/2}" cy="${s/2}" r="${i}" fill="none" stroke="var(--bg-elevated)" stroke-width="18" />
        ${c}
      </svg>
      <div class="donut-center">
        <div class="donut-center__pct">${Math.round(l[1]/n*100)}%</div>
        <div class="donut-center__label">${f(l[0])}</div>
      </div>
      <div class="donut-title">${f(e)}</div>
    </div>
  `}function Ct(e,t,a=!1){const n=[...t.entries()].sort((i,r)=>r[1]-i[1]),s=n.reduce((i,[,r])=>i+r,0);return s?`<div class="taste-bars ${a?"taste-bars--compact":""}">${n.map(([i,r],o)=>{const c=Math.round(r/s*100),l=ze[o%ze.length];return`
      <div class="taste-bar">
        <div class="taste-bar__label">${f(i)}</div>
        <div class="taste-bar__track"><span class="taste-bar__fill" style="width:${c}%; background:${l}"></span></div>
        <div class="taste-bar__value">${c}%</div>
      </div>
    `}).join("")}</div>`:""}const ze=["#ff3b6b","#ff9f0a","#00b894","#0984e3","#6c5ce7","#fdcb6e","#e17055","#74b9ff","#a29bfe","#55efc4"];function ye(e){return`<div class="card empty"><span>${f(e)}</span></div>`}function vn(e,t){if(!e.length||!t.length)return!1;const a=new Map(t.filter(n=>n?.name).map(n=>[n.name.toLowerCase(),n]));for(const n of e){if(!n.actressName)continue;const s=a.get(n.actressName.toLowerCase());if(s&&(s.born||s.ethnicity||s.hair||s.height||s.weight))return!0}return!1}function gn(e){e.querySelectorAll(".stats-section__head").forEach(t=>{t.addEventListener("click",()=>{t.dataset.toggle;const a=t.closest(".stats-section");if(!a)return;a.classList.toggle("is-open");const n=a.classList.contains("is-open");t.setAttribute("aria-expanded",n);const s=a.querySelector(".stats-section__body"),i=t.querySelector(".stats-section__chev");s&&s.classList.toggle("is-open",n),i&&i.classList.toggle("is-open",n)})})}function bn(e){e.querySelectorAll("[data-actress]").forEach(t=>{t.addEventListener("click",()=>{const a=decodeURIComponent(t.dataset.actress);Yt(a,[])})})}function yn(e){document.getElementById("openFilters").addEventListener("click",()=>{wn(e)}),document.getElementById("clearFilters")?.addEventListener("click",()=>{J="all",oe=null,ce=null,le="",de="",ie(e)}),e.querySelectorAll(".stats-section__head").forEach(t=>{t.addEventListener("click",()=>{t.dataset.toggle;const a=t.closest(".stats-section");if(!a)return;a.classList.toggle("is-open");const n=a.classList.contains("is-open");t.setAttribute("aria-expanded",n);const s=a.querySelector(".stats-section__body"),i=t.querySelector(".stats-section__chev");s&&s.classList.toggle("is-open",n),i&&i.classList.toggle("is-open",n)})}),e.querySelectorAll("[data-actress]").forEach(t=>{t.addEventListener("click",()=>{const a=decodeURIComponent(t.dataset.actress);Yt(a,[])})}),e.querySelectorAll("[data-wrapped-nav]").forEach(t=>{t.addEventListener("click",()=>{const a=t.dataset.wrappedNav;a&&(Se=Number(a),ie(e))})}),document.getElementById("wrappedGlobal")?.addEventListener("click",()=>{Se=null,ie(e)}),e.querySelectorAll("[data-heatmap-range]").forEach(t=>{t.addEventListener("click",()=>{lt=Number(t.dataset.heatmapRange),ie(e)})})}function wn(e){const t=document.createElement("div");t.innerHTML=`
    <div class="filter-modal">
      <div class="filter-modal__group">
        <div class="filter-modal__label">Periodo</div>
        <div class="filter-modal__chips">
          ${Object.entries(ft).map(([r,o])=>`<button class="chip chip--lg ${J===r?"is-active":""}" data-filter="${r}">${f(o.label)}</button>`).join("")}
        </div>
      </div>
    </div>
  `;const a=document.createElement("div");a.style.display="flex",a.style.gap="8px",a.style.width="100%";const n=document.createElement("button");n.type="button",n.className="btn",n.textContent="Limpiar todo";const s=document.createElement("button");s.type="button",s.className="btn btn--primary",s.textContent="Cerrar",a.appendChild(n),a.appendChild(s);const i=We({title:"Filtros",body:t,footer:a});t.querySelectorAll("[data-filter]").forEach(r=>r.addEventListener("click",()=>{J=r.dataset.filter,ie(e),i.close()})),n.addEventListener("click",()=>{J="all",oe=null,ce=null,le="",de="",ie(e),i.close()}),s.addEventListener("click",()=>i.close())}function _n(e,t){return`<div class="card">
    <div class="heatmap__nav">
      <span class="heatmap__nav-label">Últimos ${t} días</span>
      <div class="heatmap__nav-chips">
        ${[{days:30,label:"1m"},{days:90,label:"3m"},{days:180,label:"6m"},{days:365,label:"1a"}].map(n=>`<button type="button" class="heatmap__nav-chip ${n.days===t?"is-active":""}" data-heatmap-range="${n.days}">${n.label}</button>`).join("")}
      </div>
    </div>
    <div class="heatmap" id="heatmap"></div>
    <div class="heatmap__legend">menos <span class="heatmap__cell" style="background:var(--bg-elevated)"></span><span class="heatmap__cell" style="background:color-mix(in srgb, var(--accent) 22%, var(--bg-elevated))"></span><span class="heatmap__cell" style="background:color-mix(in srgb, var(--accent) 44%, var(--bg-elevated))"></span><span class="heatmap__cell" style="background:color-mix(in srgb, var(--accent) 66%, var(--bg-elevated))"></span><span class="heatmap__cell" style="background:var(--accent)"></span> más</div>
  </div>`}function $n(e,t,a){const n=document.getElementById("heatmap");if(!n)return;const s=C(Date.now()),i=N(s,-181),r=(new Date(i).getDay()+6)%7;for(let o=0;o<r;o++){const c=document.createElement("div");c.className="heatmap__cell",c.style.visibility="hidden",n.appendChild(c)}for(let o=0;o<182;o++){const c=N(i,o),l=e.get(c)||0,u=l===0?0:Math.min(4,Math.max(1,Math.ceil(l/a*4))),p=document.createElement("div");p.className="heatmap__cell",p.style.background=`color-mix(in srgb, var(--accent) ${u*22}%, var(--bg-elevated))`,p.title=`${new Date(c).toISOString().slice(0,10)}: ${l}`,n.appendChild(p)}}function kn(e){const t={};if(J!=="all"){const a=ft[J];a&&(t.from=a.from(),t.to=a.to())}return oe&&(t.year=oe,ce!==null&&(t.month=ce)),le&&(t.device=le),de&&(t.sourceType=de),t}function En(e,t){return e.filter(a=>{if(t.from!=null&&a.at<t.from||t.to!=null&&a.at>=t.to)return!1;if(t.year!=null){const n=new Date(a.at);if(n.getFullYear()!==t.year||t.month!=null&&n.getMonth()!==t.month)return!1}return!(t.device&&a.device!==t.device||t.sourceType&&a.sourceType!==t.sourceType)})}let j,O,V=null;async function Ut(e){const t=new Date;j=j??t.getFullYear(),O=O??t.getMonth(),V=V??C(t.getTime());const a=await Ce(),n=new Map;for(const c of a){const l=C(c.at);n.has(l)||n.set(l,[]),n.get(l).push(c)}const s=C(t.getTime());e.innerHTML=`
    <div class="screen">
      <h2>Calendario</h2>
      <p class="muted">Toca un día para ver o editar.</p>

      <div class="calendar">
        <div class="calendar__head">
          <div class="calendar__nav">
            <button id="prevY" aria-label="Año anterior">«</button>
            <button id="prevM" aria-label="Mes anterior">‹</button>
          </div>
          <h3>${va(j,O)}</h3>
          <div class="calendar__nav">
            <button id="nextM" aria-label="Mes siguiente">›</button>
            <button id="nextY" aria-label="Año siguiente">»</button>
          </div>
        </div>
        <div class="calendar__weekdays">
          ${Ue.map(c=>`<div>${c}</div>`).join("")}
        </div>
        <div class="calendar__days" id="calendarDays"></div>
      </div>

      <div class="day-detail" id="dayDetail"></div>
    </div>
  `;const i=document.getElementById("calendarDays"),r=ha(j,O),o=(new Date(j,O,1).getDay()+6)%7;for(let c=0;c<o;c++){const l=document.createElement("div");l.className="calendar__day is-empty",i.appendChild(l)}for(let c=1;c<=r;c++){const l=new Date(j,O,c,0,0,0,0).getTime(),u=document.createElement("button");if(u.className="calendar__day",u.textContent=c,(n.get(l)||[]).length){u.classList.add("has-entries");const m=document.createElement("span");m.className="calendar__day__dot",u.appendChild(m)}l===s&&u.classList.add("is-today"),l===V&&u.classList.add("is-selected"),u.addEventListener("click",()=>{V=l,fe(e)}),i.appendChild(u)}document.getElementById("prevM").addEventListener("click",()=>{O-=1,O<0&&(O=11,j-=1),V=C(new Date(j,O,1).getTime()),fe(e)}),document.getElementById("nextM").addEventListener("click",()=>{O+=1,O>11&&(O=0,j+=1),V=C(new Date(j,O,1).getTime()),fe(e)}),document.getElementById("prevY").addEventListener("click",()=>{j-=1,V=C(new Date(j,O,1).getTime()),fe(e)}),document.getElementById("nextY").addEventListener("click",()=>{j+=1,V=C(new Date(j,O,1).getTime()),fe(e)}),Sn(e,n)}async function Sn(e,t){const n=[...t.get(V)||[]].sort((o,c)=>o.at-c.at),s=document.getElementById("dayDetail"),i=new Date(V),r=`${q(i.getDate())} ${xe[i.getMonth()]} ${i.getFullYear()}`;s.innerHTML=`
    <div class="section-head">
      <h3>${r}</h3>
      <button class="btn btn--primary" id="addDay" style="flex: 0 0 auto; font-size: 13px; padding: 8px 12px; min-height: 0;">+ Añadir</button>
    </div>
    ${n.length?`<div class="card">${n.map(o=>`
            <div class="entry-item" data-id="${o.id}">
              <div class="entry-item__time">${Bt(o.at)}</div>
              <div class="entry-item__title">
                <strong>${f(o.category||"Sin categoría")}</strong>
                <small>
                  ${f(o.actressName||"")}
                  ${o.sourceType?` · <span class="site-badge">${f(o.sourceType)}</span>`:""}
                  ${o.site?` · <span class="site-badge">${f(o.site)}</span>`:""}
                  ${o.device?` · <span class="site-badge">${f(o.device)}</span>`:""}
                  ${o.lubricant==="with"?' · <span class="site-badge">con lube</span>':""}
                  ${o.lubricant==="without"?' · <span class="site-badge">sin lube</span>':""}
                  ${o.duration?` · ${ga(o.duration)}`:""}
                </small>
              </div>
              <button class="entry-item__del" data-action="edit" data-id="${o.id}">Editar</button>
              <button class="entry-item__del" data-action="del" data-id="${o.id}" style="color: var(--danger);">Borrar</button>
            </div>`).join("")}</div>`:'<div class="empty">Nada registrado este día.</div>'}
  `,document.getElementById("addDay").addEventListener("click",()=>{Re({presetAt:V})}),s.querySelectorAll('[data-action="del"]').forEach(o=>{o.addEventListener("click",async()=>{await jt({title:"¿Eliminar registro?",message:"Esta acción no se puede deshacer.",confirmText:"Eliminar",danger:!0})&&(await Mt(Number(o.dataset.id)),F("Eliminado"),fe(e))})}),s.querySelectorAll('[data-action="edit"]').forEach(o=>{o.addEventListener("click",()=>{Re({editId:Number(o.dataset.id)})})})}function fe(e){Ut(e)}async function Cn(e){await At();const t=await Ce(),a=await re(),n=await ge("defaultDevice","iPad"),s=await Ve("device");e.innerHTML=`
    <div class="screen">
      <h2>Ajustes</h2>
      <p class="muted">Datos, privacidad y preferencias.</p>

      <div class="install-hint">
        <b>Instala la app:</b> en Safari pulsa <b>Compartir</b> → <b>Añadir a pantalla de inicio</b>.
        En Android, el navegador ofrece el banner automáticamente.
      </div>

      <div class="section-head"><h3>Registro</h3></div>
      <div class="settings-group">
        <div class="switch-row">
          <div>
            <span>Modo simple</span>
            <small>El botón del inicio registra directo sin abrir nada.</small>
          </div>
          <button class="toggle ${await ge("simpleMode",!1)?"is-on":""}" id="simpleModeToggle" aria-label="Modo simple"></button>
        </div>
        <div class="settings-row">
          <div>
            <span>Dispositivo por defecto</span>
            <small>Se usa en modo simple y al abrir el modal.</small>
          </div>
          <select id="defaultDevice" style="max-width: 140px;">
            <option value="">— ninguno —</option>
            ${s.map(i=>`<option value="${i}" ${i===n?"selected":""}>${i}</option>`).join("")}
          </select>
        </div>
      </div>

      <div class="section-head"><h3>Datos</h3></div>
      <div class="settings-group">
        <div class="settings-row">
          <span>Registros totales</span>
          <small>${t.length}</small>
        </div>
        <div class="settings-row">
          <span>Actrices en caché</span>
          <small>${a.length}</small>
        </div>
        <div class="settings-row">
          <span>Almacenamiento</span>
          <small>Local · IndexedDB</small>
        </div>
      </div>

      <div class="section-head"><h3>Copia de seguridad</h3></div>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <button class="btn" id="exportBtn">Exportar JSON</button>
        <button class="btn" id="importBtn">Importar JSON</button>
        <input type="file" id="importFile" accept="application/json" hidden />
      </div>

      <div class="section-head" style="margin-top: 24px;"><h3>Zona peligrosa</h3></div>
      <div style="display: flex; gap: 8px;">
        <button class="btn btn--danger" id="wipeBtn">Borrar todos los datos</button>
      </div>

      <p class="subtle" style="margin-top: 24px;">
        NutTracker no envía datos a ningún servidor. Todo vive en tu dispositivo.
      </p>
    </div>
  `,document.getElementById("defaultDevice").addEventListener("change",async i=>{await nt("defaultDevice",i.target.value),F("Dispositivo por defecto guardado")}),document.getElementById("simpleModeToggle").addEventListener("click",async()=>{const i=await ge("simpleMode",!1);await nt("simpleMode",!i),document.getElementById("simpleModeToggle").classList.toggle("is-on",!i),F(i?"Modo normal":"Modo simple activado")}),document.getElementById("exportBtn").addEventListener("click",async()=>{const i=await ra(),r=new Blob([JSON.stringify(i,null,2)],{type:"application/json"}),o=URL.createObjectURL(r),c=document.createElement("a");c.href=o,c.download=`nuttracker-${new Date().toISOString().slice(0,10)}.json`,c.click(),URL.revokeObjectURL(o),F("Exportado")}),document.getElementById("importBtn").addEventListener("click",()=>{document.getElementById("importFile").click()}),document.getElementById("importFile").addEventListener("change",async i=>{const r=i.target.files?.[0];if(r)try{const o=await r.text(),c=JSON.parse(o);await oa(c),F("Importado. Recargando..."),setTimeout(()=>location.reload(),700)}catch{F("Archivo inválido")}finally{i.target.value=""}}),document.getElementById("wipeBtn").addEventListener("click",async()=>{await jt({title:"Borrar todo",message:"Se eliminarán todos los registros, actrices y ajustes. ¿Seguro?",confirmText:"Sí, borrar todo",danger:!0})&&(await ca(),F("Borrado"),setTimeout(()=>location.reload(),600))})}async function xn(){try{const e=await re(),t=[];for(const n of e)n.source==="ph-dataset"||n.source==="ph-dataset-enriched"||n.rank||n.born||n.ethnicity||n.hair||t.push(n);const{findOrCreateActress:a}=await ea(async()=>{const{findOrCreateActress:n}=await Promise.resolve().then(()=>Ua);return{findOrCreateActress:n}},void 0);for(const n of t.slice(0,30))try{await a(n.name)}catch{}}catch(e){console.warn("Enrich failed:",e)}}async function Ln(){await At(),await Ee(),document.documentElement.dataset.ready="1",xn(),Ae("home",async e=>(await Qa(e),{title:"NutTracker"})),Ae("stats",async e=>(await ie(e),{title:"Estadísticas"})),Ae("calendar",async e=>(await Ut(e),{title:"Calendario"})),Ae("settings",async e=>(await Cn(e),{title:"Ajustes"})),ta(),document.getElementById("themeToggle").addEventListener("click",async()=>{await ua()}),document.addEventListener("nuttracker:data-changed",()=>{const e=document.querySelector(".tab.is-active")?.dataset.route||"home";at(e)}),await at("home"),window.matchMedia("(display-mode: standalone)").matches&&document.documentElement.classList.add("is-installed"),window.addEventListener("beforeinstallprompt",e=>{e.preventDefault()}),Mn()}function Mn(){try{const e=localStorage.getItem("nuttracker-installed-hint"),t=window.matchMedia("(display-mode: standalone)").matches;!e&&!t&&/iPhone|iPad|iPod/.test(navigator.userAgent)&&setTimeout(()=>{F("Toca Compartir → Añadir a pantalla de inicio",{duration:4500}),localStorage.setItem("nuttracker-installed-hint","1")},1200)}catch{}}Ln().catch(e=>{console.error("bootstrap error",e),document.body.innerHTML=`<div style="padding: 20px; color: #fff; background: #0b0b0f; height: 100vh;">
    <h2>Error al iniciar</h2>
    <pre style="white-space: pre-wrap;">${e.message}</pre>
  </div>`});
