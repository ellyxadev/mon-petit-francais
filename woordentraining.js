/* Gemengde woordentraining. Bestaande gegevens blijven behouden. */
let mixMode='mix',mixRound=null,mixFeedback=null,mixSelection=null,mixPairs=null;
const mixShuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const mixEq=(a,b)=>normalize(a)===normalize(b);
function mixStart(){
 const items=mixShuffle(filtered());
 mixRound={theme,queue:items.map(w=>w.id),total:items.length,mastered:{},recognition:{},production:{},errors:0,attempts:0};
 mixFeedback=null;mixSelection=null;mixPairs=null;
}
function mixRequeue(id){let q=mixRound.queue;q.push(id)}
function mixAdvance(){mixFeedback=null;mixSelection=null;mixPairs=null;mixShow()}
function mixGrade(w,correct,kind){
 const r=mixRound;r.attempts++;data.stats.total++;
 if(correct){data.stats.correct++;if(kind==='production')r.production[w.id]=true;else r.recognition[w.id]=true}
 else{r.errors++;data.hard[w.id]=(data.hard[w.id]||0)+1;r.production[w.id]=false;r.recognition[w.id]=false;data.known[w.id]=false}
 r.queue.shift();
 const done=mixMode==='mix'?(r.production[w.id]&&r.recognition[w.id]):correct;
 if(done){r.mastered[w.id]=true;data.known[w.id]=true}
 else mixRequeue(w.id);
 save();mixFeedback={correct,kind,word:w};
}
function mixHeader(){
 $('main').innerHTML='<div class="panel"><label class="tag">Thema</label><select id="theme">'+['Alle thema’s',...new Set(words.map(x=>x.theme))].map(t=>'<option '+(theme===t?'selected':'')+'>'+esc(t)+'</option>').join('')+'</select><label class="tag" for="mixMode">Oefenvorm</label><select id="mixMode"><option value="mix">🎯 Gemengde training</option><option value="fr">Nederlands → Frans typen</option><option value="nl">Frans → Nederlands typen</option><option value="choice">Meerkeuze</option><option value="match">Woorden verbinden</option><option value="cards">Flashcards</option></select><p class="small">In de gemengde training moet je woorden herkennen én zelfstandig in het Frans kunnen typen. Fouten keren terug.</p></div><div id="exercise"></div>';
 $('theme').value=theme;$('mixMode').value=mixMode;
 $('theme').onchange=e=>{theme=e.target.value;mixRound=null;mixFeedback=null;mixHeader();mixShow()};
 $('mixMode').onchange=e=>{mixMode=e.target.value;mixRound=null;mixFeedback=null;mixHeader();mixShow()};
}
function mixShow(){
 if(!mixRound||mixRound.theme!==theme)mixStart();
 const r=mixRound,box=$('exercise');
 if(mixFeedback){const f=mixFeedback;box.innerHTML='<div class="panel"><h2>'+(f.correct?'Goed gedaan! ✓':'Nog even oefenen')+'</h2><p>'+(f.correct?'Juist!':('Juiste vertaling: <strong>'+esc(f.word.fr)+' = '+esc(f.word.nl)+'</strong>'))+'</p><p class="muted">'+(f.correct?'Je bent een stap dichter bij het beheersen van dit woord.':'Dit woord komt opnieuw terug in deze ronde.')+'</p><button class="primary wide" id="continueMix">Volgende →</button></div>';$('continueMix').onclick=mixAdvance;return}
 if(!r.queue.length){box.innerHTML='<div class="panel"><h2>Bravo, je kent deze woorden! 🎉</h2><p>Alle '+r.total+' woorden zijn in deze ronde voldoende geoefend.</p><p class="muted">'+r.attempts+' pogingen · '+r.errors+' fouten</p><button class="primary wide" id="restartMix">Nieuwe ronde</button></div>';$('restartMix').onclick=()=>{mixStart();mixShow()};return}
 const w=words.find(x=>x.id===r.queue[0]);if(!w){r.queue.shift();mixShow();return}
 let kind=mixMode;
 if(kind==='mix'){
  if(!r.recognition[w.id])kind=(r.attempts%2===0?'choice':'match');
  else kind='fr';
 }
 const completed=Object.keys(r.mastered).length;
 const heading='<p class="muted">'+completed+' / '+r.total+' woorden beheerst · '+r.queue.length+' nog in de ronde</p>';
 if(kind==='cards'){
  box.innerHTML='<div class="panel">'+heading+'<div class="card" id="mixCard"><strong id="mixCardText">'+esc(w.nl)+'</strong></div><button class="secondary wide" id="flipMix">Toon Frans</button><div class="row"><button class="secondary" id="notYet">Nog oefenen</button><button class="primary" id="knowIt">Ken ik</button></div></div>';
  $('flipMix').onclick=()=>{$('mixCardText').textContent=w.fr};
  $('notYet').onclick=()=>{mixGrade(w,false,'recognition');mixShow()};
  $('knowIt').onclick=()=>{mixGrade(w,true,'recognition');mixShow()};return;
 }
 if(kind==='fr'||kind==='nl'){
  const production=kind==='fr',expected=production?w.fr:w.nl,prompt=production?w.nl:w.fr;
  box.innerHTML='<div class="panel">'+heading+'<span class="tag">'+(production?'Typ in het Frans':'Typ in het Nederlands')+'</span><h2>'+esc(prompt)+'</h2><form id="mixForm"><input class="input" id="mixInput" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Typ je antwoord..." required><button class="primary wide" type="submit">Controleer</button></form><p class="small">Spelling en Franse accenten tellen mee. Hoofdletters niet.</p></div>';
  $('mixForm').onsubmit=e=>{e.preventDefault();const a=$('mixInput').value.trim();if(!a)return;mixGrade(w,mixEq(a,expected),production?'production':'recognition');mixShow()};$('mixInput').focus();return;
 }
 if(kind==='choice'){
  const answers=mixShuffle([w,...mixShuffle(words.filter(x=>x.id!==w.id&&x.nl!==w.nl)).slice(0,3)]),prompt='Wat betekent « '+esc(w.fr)+' »?';
  box.innerHTML='<div class="panel">'+heading+'<span class="tag">Meerkeuze</span><h2>'+prompt+'</h2>'+answers.map(x=>'<button class="choice" data-choice="'+esc(x.id)+'">'+esc(x.nl)+'</button>').join('')+'</div>';
  box.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{mixGrade(w,b.dataset.choice===w.id,'recognition');mixShow()});return;
 }
 // Verbind maximaal drie woordparen. Een fout antwoord laat het juiste paar zien
 // en stuurt het huidige doelwoord opnieuw de ronde in.
 const others=mixShuffle(words.filter(x=>x.id!==w.id&&x.nl!==w.nl)).slice(0,2);
 const candidates=[w,...others],left=mixShuffle(candidates),right=mixShuffle(candidates);
 box.innerHTML='<div class="panel">'+heading+'<span class="tag">Verbind de woorden</span><h2>Welke vertaling hoort erbij?</h2><p class="small">Selecteer eerst een Frans woord en dan de Nederlandse vertaling.</p><div class="row"><div>'+left.map(x=>'<button class="choice" data-left="'+esc(x.id)+'">'+esc(x.fr)+'</button>').join('')+'</div><div>'+right.map(x=>'<button class="choice" data-right="'+esc(x.id)+'">'+esc(x.nl)+'</button>').join('')+'</div></div><p class="small" id="matchStatus">0 / 3 paren gevonden</p></div>';
 let chosen=null,matched=new Set(),mistake=false;
 box.querySelectorAll('[data-left]').forEach(b=>b.onclick=()=>{if(matched.has(b.dataset.left))return;chosen=b.dataset.left;box.querySelectorAll('[data-left]').forEach(x=>x.classList.toggle('selected',x===b))});
 box.querySelectorAll('[data-right]').forEach(b=>b.onclick=()=>{
  if(!chosen||matched.has(b.dataset.right))return;
  if(chosen===b.dataset.right){matched.add(chosen);box.querySelector('[data-left="'+chosen+'"]').disabled=true;b.disabled=true;$('matchStatus').textContent=matched.size+' / 3 paren gevonden';chosen=null;box.querySelectorAll('[data-left]').forEach(x=>x.classList.remove('selected'));if(matched.size===candidates.length){mixGrade(w,!mistake,'recognition');mixShow()}}
  else{mistake=true;$('matchStatus').textContent='Niet juist, probeer opnieuw.'}
 });
}
vocab=function(){mixHeader();mixShow()};
render();
