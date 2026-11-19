'use strict';
const $=id=>document.getElementById(id);
const v=$('v'),frame=$('frame'),box=$('box'),out=$('out');
let url,region,anchor,busy=false,stop=false,name='',engineLoad;
let nameRegion=null, nameMode=false, records=[];
function chooseMode(useName){
 nameMode=useName;
 $('nameMode').setAttribute('aria-pressed',String(useName));
 $('dialogueMode').setAttribute('aria-pressed',String(!useName));
 $('hint').textContent=(useName?'이름':'대사')+' 영역의 두 모서리 사이를 드래그하세요.';
}
$('names').onchange=()=>{const enabled=$('names').checked;$('regionTools').hidden=!enabled;$('nameBox').hidden=!enabled||!nameRegion;chooseMode(enabled);update()};
$('nameMode').onclick=()=>chooseMode(true);
$('dialogueMode').onclick=()=>chooseMode(false);
function ready(){return Number.isFinite(v.duration)&&v.duration>0&&v.readyState>=2}
function update(){ $('run').disabled=!busy&&!(ready()&&region&&(!$("names").checked||nameRegion)); $('copy').disabled=$('save').disabled=!out.value.trim(); }
function openVideo(f){
 if(!f||busy)return;
 if(url)URL.revokeObjectURL(url);
 records=[];nameRegion=region=anchor=null;$('nameBox').hidden=true;chooseMode(false); name=f.name; box.hidden=true; frame.hidden=true; $('empty').hidden=false;
 $('seek').disabled=true; $('status').textContent='영상을 여는 중…'; out.value=''; v.src=url=URL.createObjectURL(f); update();
}
$('pick').onclick=()=>$('file').click();
$('file').onchange=e=>openVideo(e.target.files[0]);
$('stage').ondragover=e=>e.preventDefault();
$('stage').ondrop=e=>{e.preventDefault();openVideo(e.dataTransfer.files[0])};
v.onloadeddata=()=>{if(!ready()){ $('status').textContent='재생 시간을 확인할 수 없는 영상입니다.';return }
 frame.hidden=false;$('empty').hidden=true;$('seek').disabled=false;$('seek').max=v.duration;$('seek').value=0;$('start').value=0;$('end').value=v.duration;$('status').textContent='대사 영역을 지정하세요.';update()};
v.onerror=()=>{$('status').textContent='이 브라우저에서 영상을 열 수 없습니다. MP4 또는 WebM 파일을 사용하세요.';update()};
$('seek').oninput=e=>{v.currentTime=Number(e.target.value)};
v.ontimeupdate=()=>{$('clock').textContent=v.currentTime.toFixed(1)+'초';$('seek').value=v.currentTime};
function point(e){const r=frame.getBoundingClientRect();return [Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))]}
function draw(e){const [x,y]=point(e),[a,b]=anchor;const selection=[Math.min(x,a),Math.min(y,b),Math.abs(x-a),Math.abs(y-b)];
 const target=nameMode?$('nameBox'):box;
 if(nameMode)nameRegion=selection;else region=selection;
 ['left','top','width','height'].forEach((p,i)=>target.style[p]=selection[i]*100+'%');target.hidden=false}

frame.onpointerdown=e=>{if(busy||anchor)return;anchor=point(e);frame.setPointerCapture(e.pointerId);draw(e)};
frame.onpointermove=e=>{if(anchor)draw(e)};
frame.onpointerup=e=>{if(!anchor)return;draw(e);anchor=null;const selected=nameMode?nameRegion:region;
 if(selected[2]*v.videoWidth<4||selected[3]*v.videoHeight<4)clearSelection();
 update();$('status').textContent=$('run').disabled?'필요한 영역을 지정하세요.':'추출 준비 완료'};
function clearSelection(){if(nameMode){nameRegion=null;$('nameBox').hidden=true}else{region=null;box.hidden=true}}
frame.onpointercancel=()=>{anchor=null;clearSelection();update()};
function renderLine({speaker,line},format){return speaker?speaker+(format==='colon'?': ':'\n')+line:line}
let lastFormat=$('format').value;
$('format').onchange=()=>{
 // Preserve manual edits, including unrecognized blocks, when switching layouts.
 const speakers=[...new Set(records.map(r=>r.speaker).filter(Boolean))].sort((a,b)=>b.length-a.length);
 const separator=lastFormat==='colon'?': ':'\n';
 out.value=out.value.split('\n\n').map(block=>{
 const speaker=speakers.find(n=>block.startsWith(n+separator));
 return speaker?renderLine({speaker,line:block.slice(speaker.length+separator.length)},$('format').value):block;
 }).join('\n\n');lastFormat=$('format').value;update()
};
function crop(bounds){
 const [x,y,w,h]=bounds.map((n,i)=>Math.round(n*(i%2?v.videoHeight:v.videoWidth)));
 const canvas=document.createElement('canvas'),scale=Math.min(2,2000/w,1600/h);
 canvas.width=Math.max(1,Math.round(w*scale));canvas.height=Math.max(1,Math.round(h*scale));
 const ctx=canvas.getContext('2d');return ()=>{ctx.drawImage(v,x,y,w,h,0,0,canvas.width,canvas.height);return canvas}
}
function loadEngine(){if(!engineLoad)engineLoad=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';s.onload=resolve;s.onerror=()=>{engineLoad=null;s.remove();reject(Error('OCR 엔진을 내려받지 못했습니다. 인터넷 연결을 확인하세요.'))};document.head.append(s)});return engineLoad}
async function seek(t){if(v.currentTime===t&&!v.seeking)return;await new Promise((resolve,reject)=>{const finish=()=>{clearTimeout(timer);v.removeEventListener('seeked',done)},done=()=>{finish();resolve()},timer=setTimeout(()=>{finish();reject(Error('영상 탐색 시간이 초과되었습니다.'))},15000);v.addEventListener('seeked',done);v.currentTime=t})}
$('run').onclick=async()=>{
 if(busy){stop=true;$('status').textContent='현재 작업 후 중지합니다.';return}
 const a=$('start').valueAsNumber,b=$('end').valueAsNumber,dt=Number($('interval').value);
 if(!(a>=0&&a<b&&b<=v.duration)){ $('status').textContent='영상 길이 안에서 시작과 종료 시간을 지정하세요.';return }
 const initial=v.currentTime;busy=true;stop=false;
 const controls=['pick','seek','start','end','interval','lang','names','nameMode','dialogueMode','format'];controls.forEach(k=>$(k).disabled=true);
 $('run').textContent='추출 중지';$('status').textContent='OCR 엔진과 언어 데이터를 불러오는 중…';
 const progress=$('progress');progress.hidden=false;progress.max=Math.ceil((b-a)/dt);progress.value=0;let worker;
 try{await loadEngine();if(!stop)worker=await Tesseract.createWorker($('lang').value);
 const dialogueFrame=crop(region),speakerFrame=$('names').checked?crop(nameRegion):null;
 const lines=[];let previous='';if(!stop){out.value='';records=lines;}out.readOnly=true;
 for(let i=0;i<progress.max&&!stop;i++){const t=a+i*dt;await seek(t);$('status').textContent=t.toFixed(1)+'초 인식 중 · 대사 '+lines.length+'개';
 const {data}=await worker.recognize(dialogueFrame());const line=data.text.trim();
 const speaker=line&&speakerFrame?(await worker.recognize(speakerFrame())).data.text.trim().replace(/\s+/g,' '):'';
 const key=line?JSON.stringify([speaker,line.replace(/\s+/g,'')]):'';
 if(key&&key!==previous){const item={speaker,line};out.value+=(lines.length?'\n\n':'')+renderLine(item,$('format').value);lines.push(item)} previous=key;progress.value=i+1}
 $('status').textContent=(stop?'중지됨':'추출 완료')+' · 대사 '+lines.length+'개';
 }catch(e){$('status').textContent='추출 오류 · '+e.message}finally{try{if(worker)await worker.terminate();await seek(initial)}catch{}busy=false;out.readOnly=false;controls.forEach(k=>$(k).disabled=false);$('run').textContent='텍스트 추출';progress.hidden=true;update()}
};
out.oninput=update;
$('save').onclick=()=>{const link=document.createElement('a');link.href=URL.createObjectURL(new Blob(['\uFEFF',out.value],{type:'text/plain;charset=utf-8'}));link.download=name.replace(/\.[^.]+$/,'')+'-대사.txt';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),2000)};

$('copy').onclick=async()=>{
 try{await navigator.clipboard.writeText(out.value);$('copyStatus').textContent='전체 대사를 복사했습니다.'}
 catch{out.focus();out.select();$('copyStatus').textContent=document.execCommand('copy')?'전체 대사를 복사했습니다.':'전체 텍스트를 선택했습니다. 복사 단축키를 누르세요.'}
};
