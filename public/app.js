const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?latitude=36.274&longitude=127.249&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=temperature_2m,precipitation_probability,precipitation,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&wind_speed_unit=ms&timezone=Asia%2FSeoul&forecast_days=2';
const koreaDate = () => new Intl.DateTimeFormat('sv-SE', {
 timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(new Date());

async function requestJson(url) {
 const response = await fetch(url, {cache:'no-store', signal:AbortSignal.timeout(10000)});
 if (!response.ok) throw new Error('HTTP ' + response.status);
 return response.json();
}

async function getSnapshot(name) {
 const data = await requestJson('data/' + name + '.json');
 const timestamp = Date.parse(data.retrievedAt);
 if (!Number.isFinite(timestamp) || Date.now() - timestamp > 7200000) {
  throw new Error('게시 자료 갱신 지연');
 }
 return data;
}

function isTodayWeather(data) {
 const day = koreaDate();
 return data?.current?.time?.slice(0,10) === day &&
  Number.isFinite(data.current.temperature_2m) &&
  Array.isArray(data.daily?.time) && data.daily.time.includes(day) &&
  Array.isArray(data.hourly?.time);
}

async function loadBriefing() {
 const [live, published] = await Promise.allSettled([
  requestJson(WEATHER_URL),
  getSnapshot('briefing')
 ]);
 const snapshot = published.status === 'fulfilled' ? published.value : null;
 const warnings = snapshot?.warnings || {status:'error',items:[]};
 if (live.status === 'fulfilled' && isTodayWeather(live.value)) {
  return {warnings, weather:{status:'ok',data:live.value}, weatherLabel:'날씨 직접 조회'};
 }
 if (snapshot?.weather?.status === 'ok' && isTodayWeather(snapshot.weather.data)) {
  return {warnings, weather:snapshot.weather, weatherLabel:'날씨 게시 자료'};
 }
 return {warnings, weather:{status:'error'}, weatherLabel:'오늘 날씨 미확인'};
}

const $=id=>document.getElementById(id),fmt=t=>new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',dateStyle:'medium',timeStyle:'short'}).format(new Date(t)),num=(n,u='')=>typeof n==='number'&&Number.isFinite(n)?n.toFixed(1)+u:'미확인',escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const label=c=>({0:'맑음',1:'대체로 맑음',2:'구름 조금',3:'흐림',45:'안개',48:'착빙 안개',51:'약한 이슬비',53:'이슬비',55:'강한 이슬비',56:'어는 이슬비',57:'어는 이슬비',61:'약한 비',63:'비',65:'강한 비',66:'어는 비',67:'어는 비',71:'약한 눈',73:'눈',75:'강한 눈',77:'싸락눈',80:'약한 소나기',81:'소나기',82:'강한 소나기',85:'눈 소나기',86:'강한 눈 소나기',95:'뇌우',96:'우박 동반 뇌우',99:'강한 우박 동반 뇌우'}[c]||'상태 미확인');
let warningData = null;
const isMarine = area => /앞\s*바다|먼\s*바다|해상|연안|해역/.test(area);
const isPreliminary = item => /예비/.test(item.level);
function warningAreas(item) {
 // Split top-level areas while keeping parenthesized subdivisions together.
 const parts = String(item.area || '').match(/(?:[^,;，；()（）\n]+|\([^)]*\)|（[^）]*）)+/g) || [];
 return parts.map(part => part.trim()).filter(Boolean);
}
function renderOfficialMap() {
 const panel = $('officialMap');
 if (!panel) return;
 panel.replaceChildren();
 const source = document.createElement('a');
 source.href = 'https://www.weather.go.kr/w/special-report/overall.do';
 source.target = '_blank';
 source.rel = 'noopener';
 source.textContent = '기상청 특보 원문 보기 ↗';
 const url = warningData?.maps?.preliminary;
 if (!url || !/^https:\/\/www\.weather\.go\.kr\/w\/repositary\/image\/wrn\/img\/KTKO52_\d{12}_\d+_\d+\.png$/.test(url)) {
  panel.append(warningData ? '공식 지도 이미지를 확인할 수 없습니다. ' : '공식 지도 조회 중… ', source);
  return;
 }
 const img = document.createElement('img');
 img.alt = '기상청 예비특보 발표현황 지도';
 img.style.cssText = 'display:block;width:100%;max-width:560px;height:auto;margin:0 0 8px';
 img.onerror = () => img.replaceWith(document.createTextNode('지도 이미지를 불러오지 못했습니다. '));
 img.src = url;
 panel.append(img, source);
}

function gyeryongWarningState(data){
 if(!data)return {state:'loading',text:'계룡시 기상특보 조회 중…',note:'최신 자료를 확인하고 있습니다.'};
 if(data.status!=='ok'||!Array.isArray(data.items))return {state:'unknown',text:'계룡시 기상특보 확인 불가',note:'조회 실패 · 기상청 공식 현황을 확인하세요.'};
 const hits=[],uncertain=[];
 for(const item of data.items.filter(item => !isPreliminary(item))){
 for(const area of warningAreas(item).filter(area => !isMarine(area))){
 if(!/계룡|충청남도|충남|전국/.test(area))continue;
 if(/계룡/.test(area)){if(/제외|해제/.test(area))uncertain.push(item);else hits.push(item);continue}
 // Explicit province/national coverage is a candidate; named subsets and exclusions require review.
 if(/제외|일부|내륙|북부|남부|동부|서부|산지|[（(]/.test(area)){uncertain.push(item);continue}
 if(/해상|앞바다|먼바다|연안/.test(area))continue;
 hits.push(item);
 }
 }
 if(hits.length)return {state:'active',text:'계룡시 기상특보 · '+[...new Set(hits.map(x=>x.kind+' '+x.level))].join(' / '),note:'현재 특보 표 기준 · 발효시각과 적용구역은 아래 상세에서 확인하세요.'};
 if(uncertain.length)return {state:'unknown',text:'계룡시 기상특보 · 적용지역 확인 필요',note:'충남·전국 관련 특보의 일부지역·제외조건을 공식 원문에서 확인하세요.'};
 return {state:'none',text:'계룡시 기상특보 없음',note:'조회된 현재 특보 표 기준 · 예비특보는 기상청 원문에서 별도 확인하세요.'};
}
function renderGyeryongAlert(){const a=gyeryongWarningState(warningData);$('gyeryongAlert').className='local-alert '+a.state;$('gyeryongAlertText').textContent=a.text;$('gyeryongAlertNote').textContent=a.note}
function renderWarnings(){
 renderGyeryongAlert();
 renderOfficialMap();
 if(!warningData){$('warnings').textContent='특보 조회 중 · 유무 미확인';return}
 if(warningData.status!=='ok'){$('warnings').innerHTML='<p class="error">특보 자동 조회 실패 · 특보 유무 미확인</p>';return}
 const items = warningData.items.filter(item => !isPreliminary(item));
 const cards = items.map(item =>
  '<article class="warning"><h4>' + escape(item.kind + ' ' + item.level) +
  '</h4><p>' + escape(item.area) + '</p><p>발표 ' + escape(item.announced) +
  ' / 발효 ' + escape(item.effective) + '</p>' +
  (item.end ? '<p>' + escape(item.end) + '</p>' : '') + '</article>');
 $('warnings').innerHTML = items.length
  ? '<p class="fine">발효 특보 ' + items.length + '건</p>' + cards.join('')
  : '<p>수집한 특보 표에 발효 특보 항목이 없습니다.</p>';
}
async function loadTides(){
 $('tideRefresh').disabled=true;$('tideStatus').textContent='보령 기준 조석 조회 중…';$('tides').replaceChildren();
 try{const t=await getSnapshot('tides');if(t.status!=='ok')throw Error();
 const events=(day,type)=>day.events.filter(e=>e.type===type).map(e=>escape(e.time)+' / '+escape(e.height)+'cm').join('<br>')||'해당일 예보 없음';
 $('tides').innerHTML=t.days.map(d=>'<tr><td>'+escape(d.date)+'</td><td>'+escape(d.mool)+'</td><td>'+events(d,'high')+'</td><td>'+events(d,'low')+'</td></tr>').join('');$('tideStatus').textContent='보령 기준 · '+fmt(t.retrievedAt)+' 조회';
 }catch{$('tideStatus').textContent='조석 자동 조회 실패 · 아래 공식 조석예보 또는 대천항 물때표를 확인하세요.'}finally{$('tideRefresh').disabled=false}
}

$('date').textContent=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',dateStyle:'full'}).format(new Date());
async function load(){
 warningData=null;renderWarnings();$('refresh').disabled=true;$('status').textContent='최신 자료 조회 중…';$('warnings').textContent='기상특보 조회 중 · 이전 특보 상태를 사용하지 않습니다.';$('summary').value='조회 중';$('temperature').innerHTML='—<small>℃</small>';$('condition').textContent='조회 중';$('weatherTime').textContent='자료 기준시각 —';$('metrics').replaceChildren();$('hourly').innerHTML='<tr><td colspan="6">조회 중</td></tr>';
 try{const b=await loadBriefing();let lines=['계룡시 기상 상황 (참고용)','화면 조회: '+fmt(new Date())];
 if(b.weather.status==='ok'){const d=b.weather.data,c=d.current,k=c.time.slice(0,10),i=d.daily.time.indexOf(k),day=d.daily;const items=[['체감온도',num(c.apparent_temperature,'℃')],['습도',num(c.relative_humidity_2m,'%')],['풍속',num(c.wind_speed_10m,'m/s')],['순간풍속',num(c.wind_gusts_10m,'m/s')],['오늘 최저 / 최고',num(day.temperature_2m_min[i])+' / '+num(day.temperature_2m_max[i])+'℃'],['오늘 예상 강수',num(day.precipitation_sum[i],'mm')]];
 $('temperature').innerHTML=escape(num(c.temperature_2m))+'<small>℃</small>';$('condition').textContent=label(c.weather_code);$('weatherTime').textContent='모델 자료 기준 '+c.time.replace('T',' ')+' KST';$('metrics').innerHTML=items.map(([t,v])=>'<div class="metric"><span>'+t+'</span><strong>'+escape(v)+'</strong></div>').join('');
 const times=d.hourly.time;let rows=[];times.forEach((t,j)=>{if(t.slice(0,10)===k)rows.push('<tr><td>'+escape(t.slice(11))+'</td><td>'+escape(label(d.hourly.weather_code?.[j]))+'</td><td>'+num(d.hourly.temperature_2m[j],'℃')+'</td><td>'+num(d.hourly.precipitation_probability[j],'%')+'</td><td>'+num(d.hourly.precipitation[j],'mm')+'</td><td>'+num(d.hourly.wind_speed_10m[j],'m/s')+'</td></tr>')});$('hourly').innerHTML=rows.join('')||'<tr><td colspan="6">오늘 시간대 자료 없음</td></tr>';lines.push('날씨: '+label(c.weather_code)+', '+num(c.temperature_2m,'℃')+', 습도 '+num(c.relative_humidity_2m,'%')+', 풍속 '+num(c.wind_speed_10m,'m/s'),'날씨 기준: '+c.time+' KST / Open-Meteo 모델 기반');
 }else{$('condition').textContent='날씨 조회 실패';$('hourly').innerHTML='<tr><td colspan="6">날씨 조회 실패</td></tr>';lines.push('날씨: 조회 실패');}
 const a=b.warnings;warningData=a;renderWarnings();lines.push('기상특보 조회: '+(a.status==='ok'?'전국 현재 특보 표 '+a.items.length+'건 수신':'조회 실패 · 유무 미확인'));
 lines.push('특보 원문: https://www.weather.go.kr/w/special-report/overall.do');$('summary').value=lines.join('\n');$('status').textContent=b.weatherLabel+' / '+(a.status==='ok'?'특보 표 수신':'특보 실패');
 }catch(e){warningData={status:'error'};renderWarnings();$('status').textContent='자료 조회 실패 · 공식 원문을 확인하세요.';$('warnings').innerHTML='<p class="error">특보 유무 미확인 · 기상청 공식 현황을 확인하세요.</p>';$('condition').textContent='조회 실패';$('hourly').innerHTML='<tr><td colspan="6">날씨 조회 실패</td></tr>';$('summary').value='자료 조회 실패 · 기상특보 유무 미확인';}finally{$('refresh').disabled=false;}
}
$('refresh').textContent='지금 조회하기';
const notice = document.querySelector('main > .notice');
if (notice) notice.textContent='날씨는 Open-Meteo에서 직접 조회하며, 실패하면 최근 게시 자료를 사용합니다. 기상특보·산불경보·조석은 GitHub에 게시된 자료입니다.';
$('refresh').onclick=()=>{load();loadTides();loadForest()};$('copy').onclick=async()=>{try{await navigator.clipboard.writeText($('summary').value);$('copy').textContent='복사 완료';setTimeout(()=>$('copy').textContent='요약 복사',1500)}catch{$('summary').focus();$('summary').select();$('status').textContent='요약문을 선택했습니다. Ctrl+C로 복사하세요.'}};load();loadTides();loadForest();

$('tideRefresh').onclick=loadTides;

async function loadForest(){
 $('forestStatus').textContent='산림청 원본 조회 중';$('forestStageText').textContent='조회 중';$('forestStageText').setAttribute('fill','#666');$('forestNeedle').setAttribute('visibility','hidden');$('forestWidget').setAttribute('aria-label','산불경보수준 조회 중 · 산림청 원문 새 창');
 try{const d=await getSnapshot('forest');const i=['관심','주의','경계','심각'].indexOf(d.stage);if(d.status!=='ok'||i<0||!Array.isArray(d.items))throw Error();
 $('forestStageText').textContent=d.stage;$('forestStageText').setAttribute('fill',['#2769b4','#8a6500','#bc5200','#bf1420'][i]);$('forestNeedle').setAttribute('transform','rotate('+[-67.5,-22.5,22.5,67.5][i]+' 120 125)');$('forestNeedle').setAttribute('visibility','visible');
 $('forestStatus').textContent='산림청 · '+new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(d.retrievedAt))+' 조회 ↗';
 const detail='산불경보수준 '+d.stage+' · '+d.items.map(x=>x.area+' / 발령 '+x.announced).join('; ')+' · 조회 '+fmt(d.retrievedAt)+' · GitHub 게시 자료';$('forestWidget').setAttribute('title',detail);$('forestWidget').setAttribute('aria-label',detail+' · 산림청 원문 새 창');
 }catch{$('forestStageText').textContent='미확인';$('forestStatus').textContent='조회 실패 · 원문 확인 ↗';$('forestWidget').setAttribute('title','자동 조회 실패 · 산림청 원문에서 확인하세요.');$('forestWidget').setAttribute('aria-label','산불경보수준 미확인 · 산림청 원문 새 창')}
}

setInterval(()=>{if(document.visibilityState==='visible')loadForest()},5*60*1000);
