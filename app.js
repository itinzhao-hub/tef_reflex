(() => {
  'use strict';

  const STORAGE = {
    attempts: 'tef_reflex_attempts_v01',
    mastery: 'tef_reflex_mastery_v01',
    settings: 'tef_reflex_settings_v01',
    session: 'tef_reflex_session_v01'
  };
  const DEFAULT_SETTINGS = {
    moduleFilter: 'ALL', audioMode: 'auto', ttsRate: 1, autoNextDelay: 550,
    shuffleOptions: true, showPostRt: false, useFastTtsRandom: true
  };

  const els = Object.fromEntries([
    'trainerView','statsView','settingsView','statsBtn','settingsBtn','moduleBadge','maturityBadge','progressText',
    'statusIcon','listenStatus','promptText','preReadBar','readyBtn','options','replayBtn','revealBtn','nextBtn','feedback',
    'miniFp','miniReplayFree','miniRt','statsCards','moduleStatsBody','exportJsonBtn','exportCsvBtn','resetSessionBtn','resetAllBtn',
    'moduleFilter','audioMode','ttsRate','autoNextDelay','shuffleOptions','showPostRt','useFastTtsRandom'
  ].map(id => [id, document.getElementById(id)]));

  let stimuli = [];
  let config = {};
  let attempts = loadJSON(STORAGE.attempts, []);
  let mastery = loadJSON(STORAGE.mastery, {});
  let settings = {...DEFAULT_SETTINGS, ...loadJSON(STORAGE.settings, {})};
  let session = loadJSON(STORAGE.session, null) || {id: makeSessionId(), startedAt: Date.now(), count: 0, recentSourceUnits: [], reinsertion: []};
  let current = null;
  let currentOptions = [];
  let state = 'LOAD';
  let replayCount = 0;
  let playCount = 0;
  let prematureInputCount = 0;
  let firstAudioEndAt = null;
  let lastAudioEndAt = null;
  let firstChoiceMade = false;
  let gaveUp = false;
  let activeAudio = null;
  let ttsUtterance = null;
  let autoNextTimer = null;
  let sessionAttempts = [];
  let stimulusStartedAt = null;
  let lastAudioMeta = {mode:null, voice:null, speed:null, duration_ms:null};
  let groupQueue = [];
  let activeGroupRun = null;
  let preReadStartedAt = null;
  let preReadTimeMs = null;

  init();

  async function init(){
    try {
      [stimuli, config] = await Promise.all([
        fetch('data/stimuli.json').then(r=>r.json()),
        fetch('data/trainer_config.json').then(r=>r.json())
      ]);
      applySettingsToUI();
      bindEvents();
      sessionAttempts = attempts.filter(a => a.session_id === session.id);
      if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
      nextStimulus();
      updateMiniStats();
    } catch(e){
      els.listenStatus.textContent = '加载失败';
      els.promptText.textContent = '请使用 start_local.bat 启动本地服务器，而不是直接双击 index.html。';
      console.error(e);
    }
  }

  function bindEvents(){
    els.statsBtn.onclick = () => showView('stats');
    els.settingsBtn.onclick = () => showView('settings');
    document.querySelectorAll('.closeView').forEach(b => b.onclick = () => showView('trainer'));
    els.replayBtn.onclick = () => requestReplay();
    els.revealBtn.onclick = () => revealAnswer();
    els.nextBtn.onclick = () => nextStimulus();
    els.readyBtn.onclick = () => startPlayback();
    els.exportJsonBtn.onclick = exportJSON;
    els.exportCsvBtn.onclick = exportCSV;
    els.resetSessionBtn.onclick = resetSession;
    els.resetAllBtn.onclick = resetAll;
    ['moduleFilter','audioMode','ttsRate','autoNextDelay','shuffleOptions','showPostRt','useFastTtsRandom'].forEach(id => {
      els[id].addEventListener('change', saveSettingsFromUI);
    });
    window.addEventListener('keydown', handleKeydown);
  }

  function showView(which){
    els.trainerView.classList.toggle('hidden', which !== 'trainer');
    els.statsView.classList.toggle('hidden', which !== 'stats');
    els.settingsView.classList.toggle('hidden', which !== 'settings');
    if (which === 'stats') renderStats();
  }

  function applySettingsToUI(){
    Object.entries(settings).forEach(([k,v]) => {
      if (!els[k]) return;
      if (els[k].type === 'checkbox') els[k].checked = !!v;
      else els[k].value = String(v);
    });
  }
  function saveSettingsFromUI(){
    settings = {
      moduleFilter: els.moduleFilter.value,
      audioMode: els.audioMode.value,
      ttsRate: Number(els.ttsRate.value),
      autoNextDelay: Number(els.autoNextDelay.value),
      shuffleOptions: els.shuffleOptions.checked,
      showPostRt: els.showPostRt.checked,
      useFastTtsRandom: els.useFastTtsRandom.checked
    };
    localStorage.setItem(STORAGE.settings, JSON.stringify(settings));
  }

  function handleKeydown(e){
    if (!els.trainerView || els.trainerView.classList.contains('hidden')) return;
    if (['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName)) return;
    if (e.key >= '1' && e.key <= '4') {
      e.preventDefault();
      const idx = Number(e.key)-1;
      if (state === 'PLAYING') { prematureInputCount++; pulseLocked(idx); return; }
      if (state === 'DECISION' && currentOptions[idx]) chooseOption(idx);
      return;
    }
    if (e.key.toLowerCase() === 'r') { e.preventDefault(); requestReplay(); return; }
    if (e.key === '0') { e.preventDefault(); revealAnswer(); return; }
    if (e.key === 'Enter' && (state === 'FEEDBACK' || state === 'FEEDBACK_REVEAL')) { e.preventDefault(); nextStimulus(); return; }
    if (e.code === 'Space' && state === 'PRE_READ') { e.preventDefault(); startPlayback(); }
  }

  function nextStimulus(){
    clearTimeout(autoNextTimer);
    stopAudio();
    if (groupQueue.length) {
      const nextId = groupQueue.shift();
      current = stimuli.find(s=>s.stimulus_id===nextId) || selectStimulus();
    } else {
      activeGroupRun = null;
      current = selectStimulus();
      if (current?.group_id && Number(current.group_position)===1) {
        const members = stimuli.filter(s=>s.group_id===current.group_id).sort((a,b)=>(a.group_position||0)-(b.group_position||0));
        groupQueue = members.slice(1).map(s=>s.stimulus_id);
        activeGroupRun = {id:current.group_id, runId:`${session.id}_${current.group_id}_${Date.now()}`};
      }
    }
    if (!current) return;
    session.count++;
    session.recentSourceUnits.push(current.source_unit_id);
    session.recentSourceUnits = session.recentSourceUnits.slice(-20);
    persistSession();

    replayCount = 0; playCount = 0; prematureInputCount = 0; firstAudioEndAt = null; lastAudioEndAt = null;
    stimulusStartedAt = performance.now();
    preReadStartedAt = null; preReadTimeMs = null;
    lastAudioMeta = {mode:null, voice:null, speed:null, duration_ms:null};
    firstChoiceMade = false; gaveUp = false;
    els.feedback.classList.add('hidden'); els.feedback.innerHTML='';
    els.nextBtn.classList.add('hidden');
    els.replayBtn.classList.remove('hidden'); els.revealBtn.classList.remove('hidden');
    els.moduleBadge.textContent = current.module;
    els.maturityBadge.textContent = getMaturity(current.stimulus_id);
    els.progressText.textContent = `本轮 ${sessionAttempts.length + 1} · ${current.stimulus_id}` + (current.group_id ? ` · 观点组 ${current.group_position}/${current.group_size||3}` : '');
    els.promptText.textContent = current.prompt;

    currentOptions = prepareOptions(current);
    renderOptions(true);

    if (current.behavior?.preread) {
      state = 'PRE_READ';
      preReadStartedAt = performance.now();
      els.preReadBar.classList.remove('hidden');
      els.listenStatus.textContent = 'PRE-READ';
      els.statusIcon.textContent = '◫';
      lockOptions(false, true);
    } else {
      els.preReadBar.classList.add('hidden');
      setTimeout(startPlayback, 120);
    }
  }

  function prepareOptions(stim){
    const arr = stim.options.map((o,i)=>({...o,_originalIndex:i}));
    const fixedScale = stim.answer_ui === 'fixed_scale';
    if (settings.shuffleOptions && stim.behavior?.shuffle_options !== false && !fixedScale) shuffle(arr);
    return arr;
  }

  function renderOptions(locked){
    els.options.innerHTML = '';
    currentOptions.forEach((o,i)=>{
      const b=document.createElement('button');
      b.className='option'+(locked?' locked':'');
      b.innerHTML=`<span class="key">${i+1}</span><span>${escapeHtml(o.text)}</span>`;
      b.onclick=()=>{
        if(state==='PLAYING'){prematureInputCount++;pulseLocked(i);return;}
        if(state==='DECISION') chooseOption(i);
      };
      els.options.appendChild(b);
    });
  }

  function lockOptions(locked, preRead=false){
    [...els.options.children].forEach(b=>b.classList.toggle('locked', locked));
    if (preRead) [...els.options.children].forEach(b=>b.classList.remove('locked'));
  }
  function pulseLocked(idx){
    const b=els.options.children[idx]; if(!b)return;
    b.animate([{transform:'translateX(0)'},{transform:'translateX(-3px)'},{transform:'translateX(3px)'},{transform:'translateX(0)'}],{duration:180});
  }

  async function startPlayback(isReplay=false, withTranscript=false){
    if (!current || state==='PLAYING') return;
    if (!isReplay && state==='PRE_READ' && preReadStartedAt!=null && preReadTimeMs==null) preReadTimeMs=Math.round(performance.now()-preReadStartedAt);
    stopAudio();
    els.preReadBar.classList.add('hidden');
    state='PLAYING'; playCount++; if(isReplay) replayCount++;
    lockOptions(true);
    els.listenStatus.textContent = isReplay ? `REPLAY ×${replayCount}` : 'LISTENING';
    els.statusIcon.textContent='▶';
    if(withTranscript){ els.feedback.classList.remove('hidden'); }
    const playbackStartedAt = performance.now();
    try { await playCurrentAudio(); }
    catch(e){
      console.warn(e);
      if (settings.audioMode === 'auto') {
        await playTTS(current.audio?.text || current.source?.transcript_normalized || '');
      } else {
        els.listenStatus.textContent = 'AUDIO ERROR';
      }
    }
    if(state!=='PLAYING') return;
    const now=performance.now();
    lastAudioMeta.duration_ms = Math.round(now - playbackStartedAt);
    if(firstAudioEndAt===null) firstAudioEndAt=now;
    lastAudioEndAt=now;
    state='DECISION';
    lockOptions(false);
    els.listenStatus.textContent='DECIDE';
    els.statusIcon.textContent='●';
  }

  async function playCurrentAudio(){
    const variants = current.audio?.variants || [];
    if(settings.audioMode!=='tts' && variants.length){
      const v=variants[Math.floor(Math.random()*variants.length)];
      if(v.path){
        lastAudioMeta.mode='mp3'; lastAudioMeta.voice=v.voice||null; lastAudioMeta.speed=v.speed||null;
        return playMp3(v.path);
      }
    }
    if(settings.audioMode==='mp3') throw new Error('No MP3 variant for '+current.stimulus_id);
    return playTTS(current.audio?.text || current.source?.transcript_normalized || '');
  }

  function playMp3(path){
    return new Promise((resolve,reject)=>{
      const a=new Audio(path); activeAudio=a;
      a.onended=()=>resolve(); a.onerror=()=>reject(new Error('MP3 unavailable: '+path));
      a.play().catch(reject);
    });
  }

  function playTTS(text){
    return new Promise(resolve=>{
      if(!('speechSynthesis' in window)){ setTimeout(resolve,Math.max(1200,text.length*55)); return; }
      speechSynthesis.cancel();
      const u=new SpeechSynthesisUtterance(text); ttsUtterance=u; u.lang='fr-FR';
      const voices=speechSynthesis.getVoices().filter(v=>/^fr/i.test(v.lang));
      if(voices.length) u.voice=voices[Math.floor(Math.random()*Math.min(voices.length,4))];
      let rate=settings.ttsRate;
      if(settings.useFastTtsRandom && Math.random()<0.35) rate=Math.max(rate,1.15);
      u.rate=rate; u.pitch=1;
      lastAudioMeta.mode='tts'; lastAudioMeta.voice=u.voice?.name||'browser-default'; lastAudioMeta.speed=rate;
      u.onend=()=>resolve(); u.onerror=()=>resolve();
      speechSynthesis.speak(u);
    });
  }

  function requestReplay(){
    if(!current || state!=='DECISION') return;
    startPlayback(true,false);
  }

  function chooseOption(idx){
    if(state!=='DECISION') return;
    const chosen=currentOptions[idx];
    const correct=!!chosen.correct;
    const rt=Math.round(performance.now()-lastAudioEndAt);
    firstChoiceMade=true;

    const resultCode = replayCount===0 ? (correct?'FP_CORRECT':'FP_WRONG') : (correct?'REPLAY_CORRECT':'REPLAY_WRONG');
    const attempt=buildAttempt(resultCode, chosen, correct, rt);
    recordAttempt(attempt);
    markChoice(idx, correct);

    if(correct){
      state='FEEDBACK';
      els.listenStatus.textContent = replayCount===0 ? 'FIRST-PASS ✓' : `CORRECT · REPLAY ×${replayCount}`;
      els.statusIcon.textContent='✓';
      if(settings.showPostRt) els.listenStatus.textContent += ` · ${formatMs(rt)}`;
      autoNextTimer=setTimeout(nextStimulus, settings.autoNextDelay);
    } else {
      showFeedback(chosen.error_tag || 'WRONG', false);
    }
  }

  function revealAnswer(){
    if(!current || state!=='DECISION') return;
    gaveUp=true;
    const attempt=buildAttempt('REVEAL', null, false, null);
    recordAttempt(attempt);
    showFeedback('REVEAL', true);
  }

  function buildAttempt(resultCode, chosen, correct, finalRt){
    const now=Date.now();
    return {
      stimulus_id: current.stimulus_id, source_unit_id:current.source_unit_id, canonical_id:current.canonical_id,
      module:current.module, tier:current.tier, answer_ui:current.answer_ui||null, session_id:session.id, timestamp:new Date(now).toISOString(),
      group_id:current.group_id||null, group_position:current.group_position||null, group_run_id:activeGroupRun?.runId||null,
      play_count:playCount, replay_count:replayCount,
      first_pass_correct:resultCode==='FP_CORRECT', final_correct:correct, gave_up:resultCode==='REVEAL',
      first_decision_rt:resultCode==='FP_CORRECT'?finalRt:null, final_decision_rt:finalRt,
      premature_input_count:prematureInputCount,
      selected_option:chosen?chosen.text:null, error_tag:chosen?.error_tag || (resultCode==='REVEAL'?'REVEAL':null),
      result_code:resultCode, maturity_before:getMaturity(current.stimulus_id),
      audio_mode:lastAudioMeta.mode, audio_voice:lastAudioMeta.voice, audio_speed:lastAudioMeta.speed,
      audio_duration_ms:lastAudioMeta.duration_ms, pre_read_time_ms:preReadTimeMs,
      total_elapsed:stimulusStartedAt==null?null:Math.round(performance.now()-stimulusStartedAt)
    };
  }

  function recordAttempt(a){
    attempts.push(a); sessionAttempts.push(a);
    updateMastery(a); a.maturity_after=getMaturity(a.stimulus_id);
    localStorage.setItem(STORAGE.attempts,JSON.stringify(attempts));
    localStorage.setItem(STORAGE.mastery,JSON.stringify(mastery));
    if(['FP_WRONG','REPLAY_WRONG','REVEAL'].includes(a.result_code)) {
      if (current?.group_id) {
        const first=stimuli.find(s=>s.group_id===current.group_id && Number(s.group_position)===1);
        scheduleReinsert(first?.stimulus_id||a.stimulus_id);
      } else scheduleReinsert(a.stimulus_id);
    }
    updateMiniStats();
  }

  function showFeedback(errorTag, reveal){
    clearTimeout(autoNextTimer); state=reveal?'FEEDBACK_REVEAL':'FEEDBACK'; stopAudio();
    const correct=current.options.find(o=>o.correct);
    [...els.options.children].forEach((b,i)=>{
      const o=currentOptions[i];
      if(o.correct)b.classList.add('correct');
    });
    els.listenStatus.textContent=reveal?'REVEALED':'WRONG'; els.statusIcon.textContent=reveal?'?':'✕';
    els.replayBtn.classList.add('hidden'); els.revealBtn.classList.add('hidden'); els.nextBtn.classList.remove('hidden');
    const transcript=current.source?.transcript_original || current.audio?.text || '';
    const key=current.answer_explanation?.key_span || '';
    const highlighted=highlightSpan(transcript,key);
    els.feedback.innerHTML=`<h3>${reveal?'答案已揭示':'需要修正'}</h3>
      <div class="transcript">${highlighted}</div>
      <div class="answer-line">正确答案：<strong>${escapeHtml(correct?.text||'—')}</strong></div>
      <div class="error-line">${escapeHtml(current.answer_explanation?.short_note||'')} ${errorTag && errorTag!=='REVEAL'?`<span class="muted">· ${escapeHtml(errorTag)}</span>`:''}</div>
      <div class="controls"><button id="feedbackReplay" class="secondary">R · 带文本重听</button></div>`;
    els.feedback.classList.remove('hidden');
    document.getElementById('feedbackReplay').onclick=()=>playFeedbackTTS(transcript);
  }

  function playFeedbackTTS(text){
    stopAudio();
    const oldState=state;
    playTTS(text).finally(()=>{state=oldState;});
  }

  function markChoice(idx,correct){
    [...els.options.children].forEach((b,i)=>{
      const o=currentOptions[i];
      if(i===idx)b.classList.add(correct?'correct':'wrong');
      if(!correct && o.correct)b.classList.add('correct');
    });
  }

  function selectStimulus(){
    let pool=stimuli.filter(s=>(settings.moduleFilter==='ALL'||s.module===settings.moduleFilter) && (!s.group_id || Number(s.group_position)===1));
    if(!pool.length) pool=stimuli;
    session.reinsertion = session.reinsertion || [];
    for(const item of session.reinsertion) item.after--;
    const dueIdx=session.reinsertion.findIndex(x=>x.after<=0);
    if(dueIdx>=0){
      const id=session.reinsertion.splice(dueIdx,1)[0].id;
      persistSession();
      const s=pool.find(x=>x.stimulus_id===id);
      if(s && !recentSourceConflict(s)) return s;
    }
    const candidates=pool.filter(s=>!recentSourceConflict(s));
    const usable=candidates.length?candidates:pool;
    const weighted=usable.map(s=>({s,w:stimulusWeight(s)}));
    return weightedChoice(weighted);
  }

  function recentSourceConflict(s){
    const recent=session.recentSourceUnits||[];
    return recent.slice(-Math.min(8,recent.length)).includes(s.source_unit_id);
  }
  function stimulusWeight(s){
    const tierW={A:3,B:1.6,C:.7}[s.tier]||1;
    const m=mastery[s.stimulus_id]||{score:0,state:'ACQUISITION',recent:[]};
    let maturityW=m.state==='ACQUISITION'?1.5:m.state==='CONSOLIDATION'?1.1:.55;
    const r=m.recent||[];
    if(r.some(x=>['FP_WRONG','REPLAY_WRONG','REVEAL'].includes(x))) maturityW*=1.5;
    return tierW*maturityW*(.85+Math.random()*.3);
  }

  function scheduleReinsert(id){
    session.reinsertion=session.reinsertion||[];
    if(session.reinsertion.some(x=>x.id===id))return;
    session.reinsertion.push({id,after:5+Math.floor(Math.random()*11)});
    persistSession();
  }

  function updateMastery(a){
    const id=a.stimulus_id;
    const m=mastery[id]||{score:0,state:'ACQUISITION',recent:[]};
    const delta={FP_CORRECT:6,REPLAY_CORRECT:a.replay_count===1?2:0,FP_WRONG:-4,REPLAY_WRONG:-5,REVEAL:-7}[a.result_code]||0;
    m.score=Math.max(0,Math.min(100,m.score+delta));
    m.recent=[...(m.recent||[]),a.result_code].slice(-6);
    // State by recent windows
    const last4=m.recent.slice(-4), last5=m.recent.slice(-5), last3=m.recent.slice(-3);
    if(m.state==='ACQUISITION' && last4.length===4 && last4.filter(x=>x==='FP_CORRECT').length>=3 && !last4.includes('REVEAL')) m.state='CONSOLIDATION';
    if(m.state==='CONSOLIDATION' && last5.length===5 && last5.filter(x=>x==='FP_CORRECT').length>=4) m.state='EXAM';
    if(m.state==='EXAM' && last3.length===3 && last3.filter(x=>x!=='FP_CORRECT').length>=2) m.state='CONSOLIDATION';
    mastery[id]=m;
  }
  function getMaturity(id){return mastery[id]?.state||'ACQUISITION';}

  function updateMiniStats(){
    const s=calcStats(sessionAttempts);
    els.miniFp.textContent=pct(s.fpAcc);
    els.miniReplayFree.textContent=pct(s.replayFree);
    els.miniRt.textContent=s.medianRt==null?'—':formatMs(s.medianRt);
    if (els.miniGroup) { const g=calcStanceGroupStats(sessionAttempts); els.miniGroup.textContent=g.completed?`${Math.round(g.passRate*100)}% (${g.passed}/${g.completed})`:'—'; }
  }

  function renderStats(){
    const s=calcStats(attempts);
    const g=calcStanceGroupStats(attempts);
    const cards=[['First-pass正确',pct(s.fpAcc)],['无重播完成',pct(s.replayFree)],['FP中位RT',s.medianRt==null?'—':formatMs(s.medianRt)],['Hard fail',pct(s.hardFail)]];
    if(g.completed) cards.push(['STANCE ≥2/3组',`${Math.round(g.passRate*100)}%`]);
    els.statsCards.innerHTML=cards.map(([l,v])=>`<div class="stat-card"><div class="stat-label">${l}</div><div class="stat-value">${v}</div></div>`).join('');
    const mods=[...new Set(stimuli.map(x=>x.module))];
    els.moduleStatsBody.innerHTML=mods.map(m=>{const q=calcStats(attempts.filter(a=>a.module===m));return `<tr><td>${m}</td><td>${q.n}</td><td>${pct(q.fpAcc)}</td><td>${pct(q.replayFree)}</td><td>${q.medianRt==null?'—':formatMs(q.medianRt)}</td><td>${pct(q.hardFail)}</td></tr>`}).join('');
  }

  function calcStats(arr){
    const n=arr.length; if(!n)return {n:0,fpAcc:null,replayFree:null,medianRt:null,hardFail:null};
    const fp=arr.filter(a=>a.result_code==='FP_CORRECT').length;
    const replayFree=arr.filter(a=>a.replay_count===0 && a.result_code!=='REVEAL').length;
    const rts=arr.filter(a=>a.result_code==='FP_CORRECT'&&Number.isFinite(a.first_decision_rt)).map(a=>a.first_decision_rt).sort((a,b)=>a-b);
    const hard=arr.filter(a=>['FP_WRONG','REPLAY_WRONG','REVEAL'].includes(a.result_code)).length;
    return {n,fpAcc:fp/n,replayFree:replayFree/n,medianRt:median(rts),hardFail:hard/n};
  }

  function calcStanceGroupStats(arr){
    const grouped={};
    for(const a of arr){
      if(!a.group_run_id || !a.group_id) continue;
      (grouped[a.group_run_id] ||= []).push(a);
    }
    let completed=0, passed=0;
    for(const xs of Object.values(grouped)){
      const positions=new Set(xs.map(x=>x.group_position));
      if(positions.size<3) continue;
      completed++;
      const fp=xs.filter(x=>x.result_code==='FP_CORRECT').length;
      if(fp>=2) passed++;
    }
    return {completed,passed,passRate:completed?passed/completed:null};
  }

  function resetSession(){
    if(!confirm('开始一个新的本轮统计？历史数据会保留。'))return;
    session={id:makeSessionId(),startedAt:Date.now(),count:0,recentSourceUnits:[],reinsertion:[]}; sessionAttempts=[]; groupQueue=[]; activeGroupRun=null; persistSession(); updateMiniStats(); showView('trainer');
  }
  function resetAll(){
    if(!confirm('确定清空全部成绩历史与成熟度？此操作不可恢复。'))return;
    attempts=[];mastery={};session={id:makeSessionId(),startedAt:Date.now(),count:0,recentSourceUnits:[],reinsertion:[]};sessionAttempts=[];groupQueue=[];activeGroupRun=null;
    Object.values(STORAGE).forEach(k=>localStorage.removeItem(k)); persistSession(); updateMiniStats(); renderStats();
  }

  function exportJSON(){download(`tef_reflex_log_${dateStamp()}.json`,JSON.stringify(attempts,null,2),'application/json');}
  function exportCSV(){
    const cols=['timestamp','session_id','stimulus_id','module','tier','answer_ui','group_id','group_position','group_run_id','result_code','play_count','replay_count','first_pass_correct','final_correct','gave_up','first_decision_rt','final_decision_rt','premature_input_count','audio_mode','audio_voice','audio_speed','audio_duration_ms','pre_read_time_ms','total_elapsed','selected_option','error_tag','maturity_before','maturity_after'];
    const rows=[cols.join(',')].concat(attempts.map(a=>cols.map(c=>csv(a[c])).join(',')));
    download(`tef_reflex_log_${dateStamp()}.csv`,rows.join('\n'),'text/csv;charset=utf-8');
  }

  function persistSession(){localStorage.setItem(STORAGE.session,JSON.stringify(session));}
  function stopAudio(){
    if(activeAudio){try{activeAudio.pause();activeAudio.currentTime=0;}catch{} activeAudio=null;}
    if('speechSynthesis' in window)speechSynthesis.cancel(); ttsUtterance=null;
  }
  function highlightSpan(text,span){
    const safe=escapeHtml(text); if(!span)return safe;
    const i=text.indexOf(span); if(i<0)return safe;
    return escapeHtml(text.slice(0,i))+`<span class="key-span">${escapeHtml(span)}</span>`+escapeHtml(text.slice(i+span.length));
  }
  function weightedChoice(items){let total=items.reduce((a,x)=>a+x.w,0),r=Math.random()*total;for(const x of items){r-=x.w;if(r<=0)return x.s;}return items.at(-1)?.s;}
  function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  function median(a){if(!a.length)return null;const m=Math.floor(a.length/2);return a.length%2?a[m]:Math.round((a[m-1]+a[m])/2);}
  function pct(v){return v==null?'—':`${Math.round(v*100)}%`;}
  function formatMs(ms){return ms<1000?`${ms} ms`:`${(ms/1000).toFixed(2)} s`;}
  function loadJSON(k,f){try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}}
  function makeSessionId(){return new Date().toISOString().replace(/[-:.TZ]/g,'').slice(0,14)+'_'+Math.random().toString(36).slice(2,6)}
  function dateStamp(){return new Date().toISOString().slice(0,10)}
  function escapeHtml(s){return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
  function csv(v){const s=v==null?'':String(v);return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;}
  function download(name,content,type){const b=new Blob([content],{type});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
})();
