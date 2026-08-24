import {
  matchAudioToArtwork,
  releaseHealth,
  titleFromFilename,
  validateArtworkDimensions,
  validateArtworkFile,
  validateAudioFile,
} from './validator.mjs';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const state = { tracks: [], artwork: null, artworkStatus: { ok: false, errors: ['No artwork'], warnings: [] }, bulkAudio: [], bulkArt: [], bulkPairs: [] };
const releaseIds = ['services','previously-released','original-date','artist-name','release-date','record-label','release-title','language','primary-genre','secondary-genre','album-price','spotify-artist','apple-artist','youtube-artist','performer-credit','producer-credit'];

function bytes(n){if(n<1024)return `${n} B`;if(n<1024**2)return `${(n/1024).toFixed(1)} KB`;if(n<1024**3)return `${(n/1024**2).toFixed(1)} MB`;return `${(n/1024**3).toFixed(2)} GB`;}
function today(){return new Date().toISOString().slice(0,10)}
function download(name, content, type='application/json'){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function slug(s){return String(s||'release').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80)||'release'}
function csv(v){const s=String(v??'');return `"${s.replaceAll('"','""')}"`}
function toast(message){const el=document.createElement('div');el.textContent=message;Object.assign(el.style,{position:'fixed',right:'18px',bottom:'18px',zIndex:99,background:'#b8ff2c',color:'#090a0b',padding:'11px 14px',borderRadius:'10px',fontWeight:'900',boxShadow:'0 16px 40px rgba(0,0,0,.35)'});document.body.append(el);setTimeout(()=>el.remove(),1800)}

function loadAudioDuration(file, track){
  const audio=document.createElement('audio');audio.preload='metadata';audio.src=URL.createObjectURL(file);
  audio.onloadedmetadata=()=>{track.duration=Number.isFinite(audio.duration)?audio.duration:null;URL.revokeObjectURL(audio.src);renderTracks();validateRelease()};
  audio.onerror=()=>{track.duration=null;URL.revokeObjectURL(audio.src)};
}
function durationText(seconds){if(!seconds)return 'duration unreadable in this browser';const m=Math.floor(seconds/60);const s=Math.round(seconds%60).toString().padStart(2,'0');return `${m}:${s}`}
function loadImage(file){return new Promise((resolve,reject)=>{const img=new Image();const url=URL.createObjectURL(file);img.onload=()=>{resolve({width:img.naturalWidth,height:img.naturalHeight,url});};img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Could not read image'))};img.src=url})}

function getReleaseMeta(){return {
  services:$('#services').value.trim(), previouslyReleased:$('#previously-released').value==='yes', originalReleaseDate:$('#original-date').value,
  artistName:$('#artist-name').value.trim(), releaseDate:$('#release-date').value, recordLabel:$('#record-label').value.trim(), releaseTitle:$('#release-title').value.trim(),
  language:$('#language').value.trim(), primaryGenre:$('#primary-genre').value.trim(), secondaryGenre:$('#secondary-genre').value.trim(), albumPrice:$('#album-price').value.trim(),
  artistMapping:{spotify:$('#spotify-artist').value.trim(),appleMusic:$('#apple-artist').value.trim(),youtubeMusic:$('#youtube-artist').value.trim()},
  appleCredits:{performer:$('#performer-credit').value.trim(),producer:$('#producer-credit').value.trim()},
}}
function getTrackManifest(track,index){return {trackNumber:index+1,fileName:track.file.name,fileSizeBytes:track.file.size,durationSeconds:track.duration,title:track.title,collaborator:{role:track.collabRole,name:track.collabName},version:track.version,isrc:track.isrc,songwriterType:track.songwriterType,songwriters:track.songwriters,coverSong:track.songwriterType==='cover'?{originalArtist:track.originalArtist,originalTitle:track.originalTitle}:null,explicit:track.explicit==='yes',radioEdit:track.radioEdit==='yes',instrumental:track.instrumental==='yes',appleDigitalMaster:track.appleDigitalMaster==='yes',previewStart:track.previewStart,trackPrice:track.trackPrice}}
function buildManifest(){const meta=getReleaseMeta();return {schema:'distroprep.personal.v1',createdAt:new Date().toISOString(),submissionMode:'manual-final-submit',...meta,numberOfSongs:state.tracks.length,artwork:state.artwork?{fileName:state.artwork.file.name,width:state.artwork.width,height:state.artwork.height,validation:state.artworkStatus}:null,tracks:state.tracks.map(getTrackManifest),finalChecklist:{rightsConfirmed:$('#rights-check').checked,spellingReviewed:$('#spelling-check').checked,storesReviewed:$('#stores-check').checked}}}

function addTracks(files){
  for(const file of files){const validation=validateAudioFile(file);const track={file,audioValidation:validation,duration:null,title:titleFromFilename(file.name),collabRole:'',collabName:'',version:'',isrc:'',songwriterType:'original',songwriters:'',originalArtist:'',originalTitle:'',explicit:'no',radioEdit:'no',instrumental:'no',appleDigitalMaster:'no',previewStart:'',trackPrice:''};state.tracks.push(track);loadAudioDuration(file,track)}
  renderTracks();validateRelease();
}
function renderTracks(){
  const list=$('#track-list');list.innerHTML='';list.classList.remove('empty-state');
  if(!state.tracks.length){list.classList.add('empty-state');list.innerHTML='<p>Drop in your mastered audio files to start building track metadata.</p>';return}
  state.tracks.forEach((track,index)=>{
    const node=$('#track-template').content.firstElementChild.cloneNode(true);$('.track-number',node).textContent=String(index+1).padStart(2,'0');$('.track-filename',node).textContent=track.file.name;$('.track-filemeta',node).textContent=`${bytes(track.file.size)} • ${durationText(track.duration)}`;
    $$('[data-field]',node).forEach(input=>{const key=input.dataset.field;input.value=track[key]??'';input.addEventListener('input',()=>{track[key]=input.value;if(key==='songwriterType') $$('.cover-field',node).forEach(x=>x.classList.toggle('hidden',input.value!=='cover'));validateRelease()});});
    $$('.cover-field',node).forEach(x=>x.classList.toggle('hidden',track.songwriterType!=='cover'));
    $('.remove-track',node).addEventListener('click',()=>{state.tracks.splice(index,1);renderTracks();validateRelease()});
    const val=$('.file-validation',node);if(track.audioValidation.ok)val.insertAdjacentHTML('beforeend','<span class="pill ok">✓ accepted audio type</span>');track.audioValidation.errors.forEach(x=>val.insertAdjacentHTML('beforeend',`<span class="pill bad">${escapeHtml(x)}</span>`));track.audioValidation.warnings.forEach(x=>val.insertAdjacentHTML('beforeend',`<span class="pill warn">${escapeHtml(x)}</span>`));
    list.append(node);
  });
}
function escapeHtml(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

async function setArtwork(file){
  if(!file)return;const base=validateArtworkFile(file);try{const img=await loadImage(file);if(state.artwork?.url)URL.revokeObjectURL(state.artwork.url);state.artwork={file,...img};const dim=validateArtworkDimensions(img.width,img.height);state.artworkStatus={ok:base.ok&&dim.ok,errors:[...base.errors,...dim.errors],warnings:[...base.warnings,...dim.warnings]};const p=$('#artwork-preview');p.classList.remove('hidden');p.innerHTML=`<img src="${img.url}" alt="Artwork preview"><div><strong>${escapeHtml(file.name)}</strong><p class="muted">${img.width}×${img.height} • ${bytes(file.size)}</p><div class="file-validation">${state.artworkStatus.ok?'<span class="pill ok">✓ minimum checks passed</span>':''}${state.artworkStatus.errors.map(x=>`<span class="pill bad">${escapeHtml(x)}</span>`).join('')}${state.artworkStatus.warnings.map(x=>`<span class="pill warn">${escapeHtml(x)}</span>`).join('')}</div></div>`;const badge=$('#artwork-badge');badge.textContent=state.artworkStatus.ok?'Artwork ready':'Artwork needs attention';badge.className=`mini-badge ${state.artworkStatus.ok?'ok':'bad'}`;validateRelease()}catch{state.artworkStatus={ok:false,errors:['Artwork could not be read.'],warnings:[]};validateRelease()}
}

function validateRelease(){
  const meta=getReleaseMeta();const health=releaseHealth({...meta,tracks:state.tracks,artworkStatus:state.artworkStatus});const extra=[];
  if(meta.previouslyReleased&&!meta.originalReleaseDate)extra.push('Previously released projects should include the original release date.');
  if(!meta.appleCredits.performer)extra.push('Add a performer credit if delivering to Apple Music/iTunes.');
  if(!meta.appleCredits.producer)extra.push('Add a producer credit if delivering to Apple Music/iTunes.');
  const knownDurations=state.tracks.map(t=>t.duration).filter(Boolean);const total=knownDurations.reduce((a,b)=>a+b,0);if(total>600*60)extra.push('Known track durations exceed DistroKid\'s 10-hour album limit.');if(state.tracks.length>1&&knownDurations.length===state.tracks.length&&total/state.tracks.length<60)extra.push('Average track duration is under 60 seconds; DistroKid says albums cannot average under 60 seconds per track.');
  const all=[...health.errors,...extra];const summary=$('#validation-summary');summary.innerHTML=all.length?all.map(x=>`<div class="issue">${escapeHtml(x)}</div>`).join(''):'<div class="success">✓ Release package passes DistroPrep’s current local checks. Review the official DistroKid form before submitting.</div>';
  const badge=$('#release-status');const ready=health.ok&&extra.length===0;badge.textContent=ready?'Ready to review':'Needs attention';badge.className=`status-chip ${ready?'ok':'bad'}`;
}

function saveDraft(){const meta=getReleaseMeta();localStorage.setItem('distroprep-draft',JSON.stringify(meta));toast('Metadata draft saved locally')}
function restoreDraft(){try{const meta=JSON.parse(localStorage.getItem('distroprep-draft')||'null');if(!meta)return;$('#services').value=meta.services||'All available services';$('#previously-released').value=meta.previouslyReleased?'yes':'no';$('#original-date').value=meta.originalReleaseDate||'';$('#artist-name').value=meta.artistName||'';$('#release-date').value=meta.releaseDate||'';$('#record-label').value=meta.recordLabel||'';$('#release-title').value=meta.releaseTitle||'';$('#language').value=meta.language||'English';$('#primary-genre').value=meta.primaryGenre||'';$('#secondary-genre').value=meta.secondaryGenre||'';$('#album-price').value=meta.albumPrice||'';$('#spotify-artist').value=meta.artistMapping?.spotify||'';$('#apple-artist').value=meta.artistMapping?.appleMusic||'';$('#youtube-artist').value=meta.artistMapping?.youtubeMusic||'';$('#performer-credit').value=meta.appleCredits?.performer||'';$('#producer-credit').value=meta.appleCredits?.producer||'';}catch{}}

function exportReleaseJson(){const manifest=buildManifest();download(`${slug(manifest.artistName)}-${slug(manifest.releaseTitle||manifest.tracks[0]?.title)}-distroprep.json`,JSON.stringify(manifest,null,2))}
function exportReleaseCsv(){const m=buildManifest();const headers=['track_number','artist','release_title','song_title','audio_file','artwork_file','release_date','label','language','primary_genre','secondary_genre','featured_role','featured_artist','version','songwriters','songwriter_type','explicit','instrumental','isrc','producer','performer'];const rows=m.tracks.map(t=>[t.trackNumber,m.artistName,m.releaseTitle||t.title,t.title,t.fileName,m.artwork?.fileName||'',m.releaseDate,m.recordLabel,m.language,m.primaryGenre,m.secondaryGenre,t.collaborator.role,t.collaborator.name,t.version,t.songwriters,t.songwriterType,t.explicit,t.instrumental,t.isrc,m.appleCredits.producer,m.appleCredits.performer]);download(`${slug(m.artistName)}-distroprep.csv`,[headers,...rows].map(r=>r.map(csv).join(',')).join('\n'),'text/csv')}
async function copyManifest(){await navigator.clipboard.writeText(JSON.stringify(buildManifest(),null,2));toast('Manifest copied')}

function bulkDefaults(){return {artistName:$('#bulk-artist').value.trim(),recordLabel:$('#bulk-label').value.trim(),releaseDate:$('#bulk-date').value,language:$('#bulk-language').value.trim(),primaryGenre:$('#bulk-genre').value.trim(),songwriters:$('#bulk-songwriters').value.trim(),producer:$('#bulk-producer').value.trim()}}
async function rebuildBulk(){
  const pairs=matchAudioToArtwork(state.bulkAudio,state.bulkArt);state.bulkPairs=await Promise.all(pairs.map(async p=>{const audioValidation=validateAudioFile(p.audio);let artInfo=null,artValidation={ok:false,errors:['No matching artwork'],warnings:[]};if(p.artwork){const base=validateArtworkFile(p.artwork);try{const image=await loadImage(p.artwork);const dim=validateArtworkDimensions(image.width,image.height);artInfo={file:p.artwork,width:image.width,height:image.height,url:image.url};artValidation={ok:base.ok&&dim.ok,errors:[...base.errors,...dim.errors],warnings:[...base.warnings,...dim.warnings]}}catch{artValidation={ok:false,errors:['Artwork could not be read.'],warnings:[]}}}return {...p,audioValidation,artInfo,artValidation,title:titleFromFilename(p.audio.name)}}));renderBulk()}
function renderBulk(){
  const list=$('#bulk-list');list.innerHTML='';list.classList.remove('empty-state');if(!state.bulkPairs.length){list.classList.add('empty-state');list.innerHTML='<p>Add audio and artwork to build the queue.</p>';return}const matched=state.bulkPairs.filter(p=>p.matched).length;const badge=$('#bulk-status');badge.textContent=`${matched}/${state.bulkPairs.length} matched`;badge.className=`status-chip ${matched===state.bulkPairs.length?'ok':'bad'}`;
  state.bulkPairs.forEach((p,i)=>{const row=document.createElement('div');row.className='bulk-row';const art=p.artInfo?`<img class="bulk-thumb" src="${p.artInfo.url}" alt="">`:'<div class="bulk-thumb"></div>';row.innerHTML=`${art}<div><strong>${escapeHtml(p.title)}</strong><small>${escapeHtml(p.audio.name)} • ${bytes(p.audio.size)}</small></div><div><strong>${p.matched?escapeHtml(p.artwork.name):'⚠ No artwork match'}</strong><small>${p.artInfo?`${p.artInfo.width}×${p.artInfo.height}`:'Rename artwork to match the audio stem'}</small></div><div class="bulk-actions"><button data-copy="${i}">Copy JSON</button><a href="https://distrokid.com/new/" target="_blank" rel="noopener noreferrer">Open DK ↗</a></div>`;list.append(row)});$$('[data-copy]',list).forEach(btn=>btn.addEventListener('click',async()=>{const m=bulkManifest(Number(btn.dataset.copy));await navigator.clipboard.writeText(JSON.stringify(m,null,2));toast('Single manifest copied')}))
}
function bulkManifest(index){const p=state.bulkPairs[index];const d=bulkDefaults();return {schema:'distroprep.personal.single.v1',createdAt:new Date().toISOString(),submissionMode:'manual-final-submit',...d,numberOfSongs:1,releaseTitle:p.title,artwork:p.artwork?{fileName:p.artwork.name,width:p.artInfo?.width||null,height:p.artInfo?.height||null,validation:p.artValidation}:null,tracks:[{trackNumber:1,title:p.title,fileName:p.audio.name,fileSizeBytes:p.audio.size,audioValidation:p.audioValidation,songwriterType:'original',songwriters:d.songwriters,producer:d.producer}]}}
function exportBulk(){download(`distroprep-bulk-${today()}.json`,JSON.stringify(state.bulkPairs.map((_,i)=>bulkManifest(i)),null,2))}

$$('.nav-button').forEach(btn=>btn.addEventListener('click',()=>{$$('.nav-button').forEach(x=>x.classList.remove('active'));btn.classList.add('active');$$('.tab-panel').forEach(x=>x.classList.remove('active'));$(`#${btn.dataset.tab}-tab`).classList.add('active')}));
$$('[data-scroll]').forEach(btn=>btn.addEventListener('click',()=>$(btn.dataset.scroll).scrollIntoView({behavior:'smooth'})));
$('#audio-input').addEventListener('change',e=>addTracks([...e.target.files]));$('#artwork-input').addEventListener('change',e=>setArtwork(e.target.files[0]));releaseIds.forEach(id=>$('#'+id).addEventListener('input',validateRelease));
$('#save-draft').addEventListener('click',saveDraft);$('#export-json').addEventListener('click',exportReleaseJson);$('#export-csv').addEventListener('click',exportReleaseCsv);$('#copy-manifest').addEventListener('click',copyManifest);
$('#bulk-audio-input').addEventListener('change',e=>{state.bulkAudio=[...e.target.files];rebuildBulk()});$('#bulk-art-input').addEventListener('change',e=>{state.bulkArt=[...e.target.files];rebuildBulk()});$('#bulk-export').addEventListener('click',exportBulk);
$('#load-demo').addEventListener('click',()=>{$('#artist-name').value='Independent Artist';$('#release-title').value='Midnight Demo';$('#record-label').value='My Label';$('#primary-genre').value='Hip-Hop/Rap';$('#performer-credit').value='Independent Artist';$('#producer-credit').value='Independent Artist';$('#release-date').value=today();validateRelease();$('#workspace').scrollIntoView({behavior:'smooth'})});
restoreDraft();if(!$('#release-date').value)$('#release-date').value=today();if(!$('#bulk-date').value)$('#bulk-date').value=today();validateRelease();
