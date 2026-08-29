let records=[],linksCheckedAt="";const $=s=>document.querySelector(s);
function render(){
const q=$("#search").value.trim().toLowerCase(),cat=$("#category").value;
const rows=records.filter(x=>(!q||(x.name+" "+x.category+" "+x.subcategory).toLowerCase().includes(q))&&(!cat||x.category===cat));
$("#status").textContent=rows.length+" of "+records.length+" records shown.";
const root=$("#results");root.replaceChildren();
for(const x of rows){
const a=document.createElement("article");a.className="record";
const h=document.createElement("h3");h.textContent=x.name;
const p=document.createElement("p");p.className="meta";p.textContent=[x.category,x.subcategory].filter(Boolean).join(" · ");
a.append(h,p);
if(x.url){
const l=document.createElement("a");l.href=x.url;l.target="_blank";l.rel="noopener noreferrer";
l.textContent="Open website";
// Every card otherwise exposes the same link text; name the organisation so the
// accessible name is unique and useful out of context.
l.setAttribute("aria-label","Open the website for "+x.name+" (opens in a new tab)");
a.append(l);
}else{
const n=document.createElement("p");n.className="meta nolink";
n.textContent=x.linkStatus==="none-recorded"?"No website recorded for this entry.":"No reachable website found when links were last checked"+(linksCheckedAt?" ("+linksCheckedAt+")":"")+".";
a.append(n);
}
root.append(a);
}
}
async function load(){
try{
const r=await fetch("/api/listings");if(!r.ok)throw Error();
const d=await r.json();records=d.listings;linksCheckedAt=d.linksCheckedAt||"";
const note=$("#link-note");
if(note&&d.unreachableCount)note.textContent="Links last checked "+linksCheckedAt+". "+d.unreachableCount+" of "+d.count+" entries had no reachable website on that date and are shown without a link.";
for(const c of[...new Set(records.map(x=>x.category))].sort()){const o=document.createElement("option");o.value=o.textContent=c;$("#category").append(o)}
render();
}catch{$("#error").hidden=false;$("#status").textContent="Directory unavailable."}
}
$("#search").oninput=render;$("#category").onchange=render;$("#retry").onclick=()=>location.reload();load();
