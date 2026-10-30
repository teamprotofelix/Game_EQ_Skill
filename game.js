'use strict';
(() => {
  const $=id=>document.getElementById(id);
  const canvas=$('world'),ctx=canvas.getContext('2d',{alpha:false});
  const CARD=[...document.querySelectorAll('.choice')];
  const C={w:1100,h:650};
  const TOTAL=GAME_STAGES.reduce((a,x)=>a+x.questions.length,0);
  const state={phase:'home',stage:0,qi:0,total:0,correct:0,score:0,hp:100,combo:0,maxCombo:0,lane:1,heroX:550,time:20,maxTime:20,last:0,clock:0,effects:[],particles:[],muted:true,how:'',errors:0,winning:false,modalAction:()=>{},modalSecondary:()=>{},suspended:false};
  const ART_NAMES=['hero-atlas','companion-atlas','enemy-atlas','boss-atlas','portal-atlas','item-atlas','floor-tile','bg-intro',...Array.from({length:7},(_,i)=>'bg-stage-'+String(i+1).padStart(2,'0'))];
  const IM={};ART_NAMES.forEach(name=>{const img=new Image();img.decoding='async';img.src='assets/'+name+'.webp';IM[name]=img});
  const atlasSpec={'hero-atlas':[241,335],'companion-atlas':[200,200],'enemy-atlas':[220,220],'boss-atlas':[256,256],'portal-atlas':[240,240],'item-atlas':[164,164]};
  function drawSprite(name,frame,x,y,w,h,alpha=1){const im=IM[name],spec=atlasSpec[name];if(!im?.complete||!im.naturalWidth||!spec)return;const [fw,fh]=spec;const count=Math.floor(im.naturalWidth/fw);ctx.save();ctx.globalAlpha=alpha;ctx.drawImage(im,((frame%count+count)%count)*fw,0,fw,fh,x,y,w,h);ctx.restore()}
  const svgless=(n)=>String(n).padStart(6,'0');
  const esc=s=>String(s).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  const AUDIT=[];
  const reduceMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let audioCtx;
  function sound(type){if(state.muted)return;try{audioCtx||=new (window.AudioContext||window.webkitAudioContext)();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.connect(g);g.connect(audioCtx.destination);const t=audioCtx.currentTime;o.type=type==='bad'?'sawtooth':'sine';o.frequency.setValueAtTime(type==='bad'?180:520,t);o.frequency.exponentialRampToValueAtTime(type==='bad'?85:880,t+.14);g.gain.setValueAtTime(.06,t);g.gain.exponentialRampToValueAtTime(.0001,t+.2);o.start(t);o.stop(t+.22)}catch{}}
  function resize(){const d=Math.min(window.devicePixelRatio||1,2);canvas.width=C.w*d;canvas.height=C.h*d;ctx.setTransform(d,0,0,d,0,0)}
  function log(t){AUDIT.unshift(t);if(AUDIT.length>6)AUDIT.length=6;$('eventLog').innerHTML=AUDIT.map(x=>`<li>${esc(x)}</li>`).join('')}
  function scoreHud(){$('scoreText').textContent=svgless(state.score);$('hpText').textContent=state.hp+'%';$('hpFill').style.width=state.hp+'%';$('hpFill').style.background=state.hp<=30?'linear-gradient(90deg,#ff944e,#ff516d)':'linear-gradient(90deg,#49debd,#bfffca)';$('comboText').textContent='×'+state.combo;$('progressText').textContent=`${Math.min(TOTAL,state.total)} / ${TOTAL}`}
  function updateMap(){let html='';GAME_STAGES.forEach((s,i)=>{let done=i<state.stage||state.phase==='finish',active=i===state.stage&&state.phase!=='finish';html+=`<li class="stage-step ${done?'done':''} ${active?'active':''}"><div class="step-symbol">${done?'✓':String(i+1).padStart(2,'0')}</div><div class="step-body"><strong>${esc(s.name)}</strong><small>${esc(s.sub)}</small></div></li>`});$('stageMap').innerHTML=html}
  function stageConcept(){let s=GAME_STAGES[state.stage];$('conceptTitle').textContent=s.name;$('conceptText').textContent=s.concept;const stageNo=state.stage+1;const scene=$('sceneImage');if(scene){scene.src='assets/chapter-'+String(stageNo).padStart(2,'0')+'.webp';scene.alt=s.name+' 게임 지역 배경';$('sceneName').textContent=String(stageNo).padStart(2,'0')+' / 07 · '+s.name}document.documentElement.style.setProperty('--stage-hue',String([184,200,205,166,242,268,288][state.stage]||190))}

  function modal(opts){state.currentModal=opts;state.phase=opts.phase||'modal';$('modalEyebrow').textContent=opts.eyebrow||'DATA VERIFICATION';$('modalTitle').textContent=opts.title;$('modalCopy').innerHTML=opts.html||'';$('modalAction').innerHTML=opts.primary||'계속 <span>➜</span>';$('modalSecondary').textContent=opts.secondary||'시스템 구조 보기';$('modalSecondary').style.display=opts.hideSecondary?'none':'';state.modalAction=opts.action||closeModal;state.modalSecondary=opts.secondaryAction||openMap;$('overlay').classList.remove('hidden');$('modalAction').focus({preventScroll:true});$('liveRegion').textContent=opts.title}
  function closeModal(){const hasQuestion=state.stage<GAME_STAGES.length;state.phase=hasQuestion?'play':'home';$('overlay').classList.add('hidden');state.last=performance.now();$('liveRegion').textContent='게임 계속'}
  function openMap(){const prev=state.phase;const priorModal=prev!=='play'&&prev!=='home'?state.currentModal:null;const goBack=()=>priorModal?modal(priorModal):prev==='home'?startNew():closeModal();const names=['① 사용자 출원번호(13자리) 입력','② SKILL.md 지침 해석 및 실행','③ 키 확인 → KIPRIS Plus REST API','④ 행정이력·PDF 검증과 통지 시점 청구항 복원','⑤ OA(17) / RD(6) / RC(7) 규칙 적용','⑥ AI 근거 포함 결과 보고 → 평가관 검토','⑦ 별도 요청 시 피드백 → 검토된 개선·정식 배포'];modal({phase:'help',eyebrow:'SYSTEM BLUEPRINT / 원리 지도',title:'실제 스킬이 작동하는 7단계',html:`<p>이 게임은 스킬 <strong>지침→도구→문서→판본→규칙→검토→개선</strong>을 아케이드 미션으로 바꾼 교육용 모형입니다.</p><ol>${names.map(x=>`<li>${esc(x)}</li>`).join('')}</ol><div class="brief">AI는 지침을 실행하고 문서와 규칙을 대조합니다. KIPRIS는 원본을 공급하고 평가관은 결과를 검토합니다. 게임 속 응답은 가상 사례이며 실제 KIPRIS와 통신하지 않습니다.</div><p>의견제출통지서의 내부 모순은 <strong>OA</strong>, 거절결정과 선행 통지의 대조는 <strong>RD</strong>, 등록청구항 점검은 <strong>RC</strong>입니다.</p>`,primary:prev==='home'?'작전 시작 ➜':'이전 화면으로 돌아가기 ➜',action:goBack,secondary:'학습 도감 보기',secondaryAction:openGuide})}
  function openGuide(){const prior=state.phase;const priorModal=prior!=='play'&&prior!=='home'?state.currentModal:null;modal({phase:'help',eyebrow:'EXAMINER FIELD GUIDE / 참고 자료',title:'스킬 코어 학습 도감',html:`<p><strong>SKILL.md</strong>는 AI가 이행할 작업 순서이며, <strong>references/</strong>의 규칙 파일은 각각의 검토 기준을 담습니다. AI가 모든 판단을 자유롭게 만들어 내는 방식이 아닙니다.</p><ul><li><strong>Drive형:</strong> Google Drive의 API키/KIPRIS_KEY.txt를 매 실행 조회. 검증된 원문을 Drive에 선별 보관.</li><li><strong>무연결형:</strong> 개인 설치본의 APIKEY.md에서 키 조회. 검증된 원문을 ChatGPT에 보관(불가하면 미보관 표시).</li><li><strong>판본 복원:</strong> 보정 변경 이력에서 통지 이전에 접수된 변경만 반영. 다른 시점의 공보를 오용하지 않음.</li><li><strong>OA 17개:</strong> 개별 통지서의 주문·법조항·대상항·인용발명·논증 점검.</li><li><strong>RD 6개:</strong> 거절결정 전의 모든 통지와 거절결정의 핵심 이유·사실·문헌을 대조.</li><li><strong>RC 7개:</strong> 최종 유효 등록청구항 전부의 명확성·형식·인용관계 점검.</li><li><strong>피드백·업데이트:</strong> 진단과 분리된 스킬. 사용자 요청·정식 버전 확인·키 보존 필요.</li></ul><div class="brief">주의: 게임은 가상 문서·가상 판정을 사용합니다. 개인 API 키, 실제 출원번호 또는 기밀 자료를 입력할 필요가 없습니다.</div><p><a href="https://github.com/teamprotofelix/EQAi_Skills" target="_blank" rel="noopener noreferrer">스킬 원본 저장소</a> · <a href="https://skill.inwardis.chatgpt.site/" target="_blank" rel="noopener noreferrer">AI 품질진단 시스템 Skill Archive</a></p>`,primary:'게임으로 돌아가기 ➜',action:()=>priorModal?modal(priorModal):prior==='home'?showHome():closeModal(),secondary:'시스템 원리 지도',secondaryAction:openMap})}
  function showHome(){state.phase='home';log('스킬 코어 시스템 대기');scoreHud();updateMap();modal({phase:'home',eyebrow:'ARCADE / 진단 시스템 교육 임무',title:'마리의 SKILL CORE : 데이터 방어전',html:`<p>어서 오세요, 평가관님. <strong>생성형 AI·KIPRIS Plus·스킬 지침·OA/RD/RC 규칙</strong>의 관계를 게임으로 배워봅니다.</p><div class="brief">7개 작전 구역 · 총 ${TOTAL}개 데이터 게이트 · 100% 시스템 무결성을 지키며 최종 보스 ‘환각 엔진’을 무력화하세요.</div><p><strong>조작:</strong> ← → / A D 로 게이트를 고르고, <strong>SPACE·ENTER</strong>로 스캔. <strong>1·2·3</strong> 또는 카드 터치로 즉시 선택합니다. 타이머가 끝나기 전에 올바른 경로를 고르세요.</p><p>정답마다 원본 스킬 규칙과 설명을 볼 수 있습니다. 실제 특허에 대한 진단이나 API 호출은 수행하지 않습니다.</p>`,primary:'미션 시작 <span>➜</span>',action:startNew,secondary:'시스템 전체 구조',secondaryAction:openMap})}
  function startNew(){Object.assign(state,{stage:0,qi:0,total:0,correct:0,score:0,hp:100,combo:0,maxCombo:0,lane:1,heroX:550,errors:0,winning:false});AUDIT.length=0;log('부팅 완료 · KIPRIS 통신 없음(가상)');scoreHud();showStageIntro()}
  function showStageIntro(){const s=GAME_STAGES[state.stage];updateMap();stageConcept();const isBoss=state.stage===GAME_STAGES.length-1;modal({phase:'intro',eyebrow:`MISSION ${String(state.stage+1).padStart(2,'0')} / ${isBoss?'FINAL BOSS':'SYSTEM CORE'}`,title:(isBoss?'⚡ ':'')+s.name,html:`<p>${esc(s.concept)}</p><div class="brief">핵심 임무: <strong>${esc(s.sub)}</strong></div><p>가상 데이터 게이트 <strong>${s.questions.length}개</strong>를 열어 다음 코어를 활성화하세요. 오답이나 시간 초과 시 무결성이 감소합니다.</p>`,primary:isBoss?'환각 엔진 격퇴 <span>➜</span>':'게이트 진입 <span>➜</span>',action:()=>{state.phase='play';$('overlay').classList.add('hidden');state.last=performance.now();loadQuestion()}})}
  function getQuestion(){return GAME_STAGES[state.stage]?.questions[state.qi]}
  function loadQuestion(){const s=GAME_STAGES[state.stage],q=getQuestion();if(!q){stageEnd();return}state.phase='play';state.lane=1;state.maxTime=state.stage===6?15.5:Math.max(18.5,24-state.stage*.9);state.time=state.maxTime;state.last=performance.now();$('chapter').textContent=`${s.name} / ${state.qi+1}-${s.questions.length}`;$('ruleRef').textContent=q.ref;$('question').textContent=q.q;$('missionHint').textContent=`${q.tag} · ${s.sub}`;$('statusText').textContent='데이터 비교 실행 중 · 올바른 게이트를 선택하세요';CARD.forEach((el,i)=>{el.disabled=false;el.classList.remove('correct','wrong');el.querySelector('.c-index').textContent=String(i+1).padStart(2,'0');el.querySelector('.c-text').textContent=q.choices[i];const item=el.querySelector('.c-art');if(item)item.style.backgroundPosition=((state.stage*3+i)%8)/7*100+'% 50%'});colorChoices();scoreHud();updateMap();stageConcept()}
  function colorChoices(){CARD.forEach((el,i)=>el.classList.toggle('is-selected',i===state.lane))}
  function selectLane(step){if(state.phase!=='play')return;state.lane=Math.max(0,Math.min(2,state.lane+step));colorChoices();sound('move')}
  function sparkle(good){state.effects.push({x:[190,550,910][state.lane],y:430,r:0,life:.65,good});for(let k=0;k<22;k++){let a=Math.random()*Math.PI*2,s=30+Math.random()*260;state.particles.push({x:[190,550,910][state.lane],y:445,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:1.1,color:good?'#73ffe0':'#ff7895'})}const flash=$('flash');flash.className='flash '+(good?'good':'');flash.style.opacity='.34';setTimeout(()=>flash.style.opacity='0',130)}
  function choose(index,timedOut=false){if(state.phase!=='play')return;const q=getQuestion();if(!q)return;state.lane=index>=0?index:state.lane;const good=!timedOut&&index===q.a;state.total++;if(good){state.correct++;state.combo++;state.maxCombo=Math.max(state.maxCombo,state.combo);state.score+=100+Math.floor(state.time*5)+Math.min(10,state.combo)*20;sound('good')}else{state.combo=0;state.hp=Math.max(0,state.hp-(timedOut?12:16));state.errors++;sound('bad')}scoreHud();sparkle(good);CARD.forEach((el,i)=>{el.disabled=true;el.classList.toggle('correct',i===q.a);el.classList.toggle('wrong',!timedOut&&i===index&&i!==q.a)});log(`${good?'✓ 승인':timedOut?'⌛ 시간초과':'✕ 차단'} · ${q.tag} (${q.ref})`);const why=`<p>${good?'정확한 경로를 선택했습니다.':timedOut?'데이터 처리 시간이 초과됐습니다.':'선택한 경로는 시스템의 실제 동작과 다릅니다.'}</p><div class="brief"><strong>정답:</strong> ${esc(q.choices[q.a])}</div><p><strong>원리:</strong> ${esc(q.why)}</p><p style="font-size:12px;color:#98b7d0">근거: ${esc(q.ref)} · 교육용 가상 상황</p>`;modal({phase:'result',eyebrow:good?`VERIFIED / COMBO ×${state.combo}`:'DATA INTEGRITY ALERT',title:good?'✓ 데이터 검증 성공':timedOut?'⌛ 처리 시간 초과':'✕ 잘못된 처리 경로',html:why,primary:'다음 데이터 <span>➜</span>',action:()=>{state.qi++;if(state.hp===0){recovery();return}if(state.qi>=GAME_STAGES[state.stage].questions.length)stageEnd();else{state.phase='play';$('overlay').classList.add('hidden');loadQuestion()}},secondary:'시스템 지도',secondaryAction:openMap})}
  function recovery(){modal({phase:'recover',eyebrow:'RECOVERY PROTOCOL',title:'무결성 0% · 코어 복구',html:'<p>오류가 쌓였지만 게임은 계속할 수 있습니다. 현재 작전 구역의 시작점으로 돌아갑니다.</p><div class="brief">무결성을 70%로 복원하고 해당 구역을 재도전합니다. 점수와 전체 처리 기록은 유지됩니다.</div>',primary:'코어 복구 <span>➜</span>',action:()=>{state.hp=70;state.qi=0;state.combo=0;scoreHud();showStageIntro()},hideSecondary:true})}
  function stageEnd(){const s=GAME_STAGES[state.stage];log(`◎ ${s.name} 코어 클리어`);if(state.stage===GAME_STAGES.length-1){finish();return}state.stage++;state.qi=0;updateMap();stageConcept();const next=GAME_STAGES[state.stage];modal({phase:'checkpoint',eyebrow:'CORE UNLOCKED / 새로운 경로 확보',title:`✓ ${s.name} 통과`,html:`<p>진단 경로가 연결됐습니다. 이제 다음 시스템으로 이동합니다.</p><div class="brief">다음 구역: <strong>${esc(next.name)}</strong><br>${esc(next.concept)}</div><p>현재 스코어 <strong>${state.score.toLocaleString('ko-KR')}</strong> · 시스템 무결성 <strong>${state.hp}%</strong></p>`,primary:'다음 코어 활성화 <span>➜</span>',action:showStageIntro,secondary:'전체 원리 다시 보기',secondaryAction:openMap})}
  function finish(){state.phase='finish';state.winning=true;let high=state.score;try{const old=Number(localStorage.getItem('skillcore-high')||0);high=Math.max(old,state.score);localStorage.setItem('skillcore-high',String(high))}catch{};const rank=state.correct>=30?'S':state.correct>=26?'A':state.correct>=20?'B':'C';log(`★ 최종 보스 무력화 · 평가관 등급 ${rank}`);updateMap();modal({phase:'finish',eyebrow:'MISSION COMPLETE / HUMAN IN THE LOOP',title:`★ 심사품질 수호자 · ${rank} 등급`,html:`<p>환각 엔진 격퇴 완료! 스킬은 <strong>지침을 실행</strong>하고, KIPRIS는 <strong>문서를 공급</strong>하고, 규칙은 <strong>검토 범위를 제시</strong>하며, 최종적으로 <strong>사람이 진단 결과를 검증</strong>합니다.</p><div class="brief">점수 <strong>${state.score.toLocaleString('ko-KR')}</strong> · 정답 <strong>${state.correct}/${state.total}</strong> · 최대 콤보 <strong>×${state.maxCombo}</strong> · 최고 기록 <strong>${high.toLocaleString('ko-KR')}</strong></div><p>핵심 원칙: <strong>① 원문 우선 ② 시점 복원 ③ 근거 중심 ④ 확정/보류 구분 ⑤ 검토 후 피드백·개선</strong></p><p>이 게임은 실제 API 연계나 AI 특허 진단을 수행하지 않으며 정답은 스킬 지침에 대한 교육용 선택입니다.</p>`,primary:'다시 도전 <span>➜</span>',action:startNew,secondary:'학습 도감',secondaryAction:openGuide})}
  function drawRoundRect(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke()}}
  const starfield=Array.from({length:75},()=>({x:Math.random()*C.w,y:Math.random()*C.h,rad:.3+Math.random()*1.9,offset:Math.random()*5}));
  const beams=Array.from({length:35},(_,i)=>({x:(i*193)%1100,speed:.45+(i%6)*.11,alpha:.04+(i%3)*.012}));
  function draw(dt){
    state.clock+=reduceMotion?0:dt;
    const t=state.clock,stage=state.stage,stageNo=String(stage+1).padStart(2,'0');
    ctx.fillStyle='#071a37';ctx.fillRect(0,0,C.w,C.h);
    const background=IM['bg-stage-'+stageNo];
    if(background?.complete&&background.naturalWidth){const shift=reduceMotion?0:Math.sin(t*.17)*12;ctx.drawImage(background,-33+shift,0,1166,C.h)}
    const veil=ctx.createLinearGradient(0,0,0,C.h);
    veil.addColorStop(0,'rgba(3,10,35,.17)');veil.addColorStop(.50,'rgba(3,9,30,.1)');veil.addColorStop(.75,'rgba(6,7,26,.27)');veil.addColorStop(1,'rgba(1,7,24,.69)');
    ctx.fillStyle=veil;ctx.fillRect(0,0,C.w,C.h);
    // Simulated flowing data pipes and holographic dust.
    ctx.save();ctx.globalCompositeOperation='screen';
    beams.forEach((b,i)=>{let x=(b.x+t*(b.speed*35))%1180-40,y=320+(i%5)*53;
      ctx.fillStyle='rgba(50,213,255,'+b.alpha+')';ctx.fillRect(x,y,15+(i%5)*21,2);
    });
    for(const st of starfield){let a=.12+.28*(.5+.5*Math.sin(t*1.7+st.offset));ctx.fillStyle='rgba(174,250,255,'+a+')';ctx.beginPath();ctx.arc(st.x,st.y,st.rad,0,Math.PI*2);ctx.fill()}
    ctx.restore();
    // Scene props, reward pickups, and sentry enemies are sprite-sheet WebP assets.
    const laneX=[190,550,910];
    for(let i=0;i<3;i++){
      const x=laneX[i],active=state.lane===i&&state.phase==='play';
      const grd=ctx.createRadialGradient(x,532,3,x,532,162);
      grd.addColorStop(0,active?'rgba(71,250,251,.36)':'rgba(35,178,235,.13)');
      grd.addColorStop(1,'rgba(5,14,35,0)');ctx.fillStyle=grd;ctx.beginPath();ctx.ellipse(x,530,175,94,0,0,Math.PI*2);ctx.fill();
      drawSprite('portal-atlas',active?0:2,x-76,420+(active?Math.sin(t*3)*4:0),152,152,active?.79:.40);
      ctx.strokeStyle=active?'rgba(117,245,255,.88)':'rgba(67,165,210,.30)';ctx.lineWidth=active?4:2;
      ctx.beginPath();ctx.ellipse(x,560,109,18,0,0,Math.PI*2);ctx.stroke();
    }
    // Animated assistant on the left and harmless threat examples on the right.
    const botIndex=reduceMotion?0:Math.floor(t*3.1)%4;
    drawSprite('companion-atlas',botIndex,36,407+Math.sin(t*2.2)*8,130,130,.95);
    const enemyClass=stage===6?2:stage%4;
    const foeIndex=enemyClass*4+(reduceMotion?0:Math.floor(t*6)%4);
    if(stage<6)drawSprite('enemy-atlas',foeIndex,905+Math.sin(t*.9)*16,424+Math.sin(t*2)*9,148,143,.94);
    else{
      ctx.save();ctx.shadowBlur=38;ctx.shadowColor='#ff42e9';
      drawSprite('boss-atlas',(reduceMotion?0:Math.floor(t*5)%8),850+Math.sin(t*.9)*11,385+Math.sin(t*1.7)*7,206,204,.96);
      ctx.restore();
      ctx.fillStyle='rgba(19,7,40,.83)';ctx.fillRect(862,585,190,13);
      ctx.fillStyle='#f761e7';ctx.fillRect(865,588,184*Math.max(0,1-state.qi/GAME_STAGES[6].questions.length),7);
    }
    // Reward emblem reflects the part of the actual workflow now being learned.
    const rewardIdx=(stage+2)%8;
    ctx.save();ctx.shadowColor='#69eaff';ctx.shadowBlur=17;
    drawSprite('item-atlas',rewardIdx,510,351+Math.sin(t*1.8)*9,76,76,.8);ctx.restore();
    // Decorative floor: the game remains a fast three-lane choice arcade, not a platformer.
    ctx.fillStyle='#07152ad8';ctx.fillRect(0,604,1100,46);
    const floor=IM['floor-tile'];
    if(floor?.complete&&floor.naturalWidth){
      const scroll=reduceMotion?0:Math.floor(t*22)%179;
      for(let i=-1;i<8;i++)ctx.drawImage(floor,i*179-scroll,565,185,82);
    }else{ctx.fillStyle='#58d7ff88';ctx.fillRect(0,603,1100,5)}
    const target=laneX[state.lane];state.heroX+=(target-state.heroX)*Math.min(1,dt*9.5);
    const heroFrame=state.phase==='play'?(reduceMotion?2:([2,3,4,5][Math.floor(t*8)%4])):0;
    ctx.save();ctx.shadowColor='#65daff';ctx.shadowBlur=16;
    drawSprite('hero-atlas',heroFrame,state.heroX-83,434+Math.sin(t*7)*4,166,169,1);
    ctx.restore();
    for(const e of state.effects){e.life-=dt;e.r+=dt*430;ctx.globalAlpha=Math.max(0,e.life/.7);ctx.strokeStyle=e.good?'#77ffe2':'#ff647e';ctx.lineWidth=8;ctx.beginPath();ctx.arc(e.x,e.y,e.r,0,Math.PI*2);ctx.stroke()}ctx.globalAlpha=1;state.effects=state.effects.filter(x=>x.life>0);
    for(const part of state.particles){part.x+=part.vx*dt;part.y+=part.vy*dt;part.vy+=dt*140;part.life-=dt;ctx.globalAlpha=Math.max(0,part.life);ctx.fillStyle=part.color;ctx.fillRect(part.x,part.y,5,5)}ctx.globalAlpha=1;state.particles=state.particles.filter(x=>x.life>0).slice(-150);
  }
  function tick(now){const dt=Math.min(.06,Math.max(0,(now-(state.last||now))/1000));state.last=now;if(state.phase==='play'){state.time-=dt;$('timerBar').style.width=Math.max(0,100*state.time/state.maxTime)+'%';$('timerBar').classList.toggle('low',state.time<5);$('countdown').textContent=Math.max(0,state.time).toFixed(1)+'s';if(state.time<=0)choose(-1,true)}draw(dt);requestAnimationFrame(tick)}
  CARD.forEach((el,i)=>el.addEventListener('click',()=>choose(i)));
  $('leftBtn').addEventListener('click',()=>selectLane(-1));$('rightBtn').addEventListener('click',()=>selectLane(1));$('scanBtn').addEventListener('click',()=>choose(state.lane));
  $('mapBtn').addEventListener('click',openMap);$('guideBtn').addEventListener('click',openGuide);$('soundBtn').addEventListener('click',()=>{state.muted=!state.muted;$('soundBtn').textContent=state.muted?'♫':'♪';$('soundBtn').setAttribute('aria-label',state.muted?'음향 켜기':'음향 끄기');if(!state.muted)sound('good')});
  $('modalAction').addEventListener('click',()=>state.modalAction());$('modalSecondary').addEventListener('click',()=>state.modalSecondary());
  window.addEventListener('keydown',e=>{if(state.phase==='play'&&['ArrowLeft','ArrowRight',' ','Enter','a','A','d','D','1','2','3'].includes(e.key))e.preventDefault();if(state.phase==='play'){if(e.key==='ArrowLeft'||e.key.toLowerCase()==='a')selectLane(-1);else if(e.key==='ArrowRight'||e.key.toLowerCase()==='d')selectLane(1);else if(e.key===' '||e.key==='Enter')choose(state.lane);else if(/^[1-3]$/.test(e.key))choose(Number(e.key)-1)}else if(e.key==='Enter'&&document.activeElement===document.body)state.modalAction()},{passive:false});
  window.addEventListener('resize',resize,{passive:true});resize();scoreHud();updateMap();showHome();requestAnimationFrame(tick);
  window.SKILL_CORE_TEST={getState:()=>({...state,particles:undefined,effects:undefined}),getTotal:()=>TOTAL,question:()=>getQuestion()};
})();
