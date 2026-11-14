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
let warningData=null, selectedRegion='계룡시';
const regions={
 '계룡시':['계룡','충청남도','충남'],
 '서울특별시':['서울'], '부산광역시':['부산'], '대구광역시':['대구','군위'], '인천광역시':['인천','강화','옹진'], '광주광역시':['광주광역시','광주'], '대전광역시':['대전'], '울산광역시':['울산'], '세종특별자치시':['세종'],
 '경기도':['경기','수원','성남','의정부','안양','부천','광명','평택','동두천','안산','고양','과천','구리','남양주','오산','시흥','군포','의왕','하남','용인','파주','이천','안성','김포','화성','광주시','양주','포천','여주','연천','가평','양평'],
 '강원특별자치도':['강원','춘천','원주','강릉','동해','태백','속초','삼척','홍천','횡성','영월','평창','정선','철원','화천','양구','인제','고성','양양'],
 '충청북도':['충청북도','충북','청주','충주','제천','보은','옥천','영동','증평','진천','괴산','음성','단양'],
 '충청남도':['충청남도','충남','천안','공주','보령','아산','서산','논산','계룡','당진','금산','부여','서천','청양','홍성','예산','태안'],
 '전북특별자치도':['전북','전라북도','전주','군산','익산','정읍','남원','김제','완주','진안','무주','장수','임실','순창','고창','부안'],
 '전라남도':['전남','전라남도','목포','여수','순천','나주','광양','담양','곡성','구례','고흥','보성','화순','장흥','강진','해남','영암','무안','함평','영광','장성','완도','진도','신안'],
 '경상북도':['경북','경상북도','포항','경주','김천','안동','구미','영주','영천','상주','문경','경산','의성','청송','영양','영덕','청도','고령','성주','칠곡','예천','봉화','울진','울릉','독도'],
 '경상남도':['경남','경상남도','창원','진주','통영','사천','김해','밀양','거제','양산','의령','함안','창녕','고성','남해','하동','산청','함양','거창','합천'],
 '제주특별자치도':['제주','서귀포'], '전국':[]
};
const warningColors={'강풍':'#157f89','풍랑':'#1760b5','호우':'#2946cf','대설':'#7655c2','건조':'#c85b12','폭염':'#c52e42','한파':'#338abb','태풍':'#9c369b','해일':'#12734f','황사':'#97721a','기타':'#646b78'};
const kindOf=x=>Object.keys(warningColors).find(k=>x.kind.includes(k))||'기타';
const seaTypes = ['앞바다', '먼바다', '구역 확인'];
const seaBasins = ['서해', '동해', '남해', '제주', '기타 해상'];
const seaMarkers = [
 ['서해', 105, 358], ['동해', 573, 307], ['남해', 484, 550],
 ['제주', 293, 568], ['기타 해상', 592, 552]
];
const isMarine = area => /앞\s*바다|먼\s*바다|해상|연안|해역/.test(area);
function marineRegions(area) {
 const regions = [];
 let basin = '';
 for (const match of area.matchAll(/제주도?|서해|동해|남해|앞\s*바다|먼\s*바다|해상|연안|해역/g)) {
  const term = match[0].replace(/\s/g, '');
  if (/^(제주도?|서해|동해|남해)$/.test(term)) {
   basin = term.startsWith('제주') ? '제주' : term;
   continue;
  }
  regions.push((basin || '기타 해상') + ' ' +
   (seaTypes.includes(term) ? term : '구역 확인'));
 }
 return regions.filter(name => !name.endsWith('구역 확인') ||
  !regions.some(other => other !== name && other.startsWith(name.replace('구역 확인', ''))));
}
function warningAreas(item) {
 // Split top-level areas while keeping parenthesized subdivisions together.
 const parts = String(item.area || '').match(/(?:[^,;，；()（）\n]+|\([^)]*\)|（[^）]*）)+/g) || [];
 return parts.map(part => part.trim()).filter(Boolean);
}
function warningsForSea(name) {
 return warningData?.status === 'ok' ? warningData.items.filter(item =>
  warningAreas(item).some(area => isMarine(area) && marineRegions(area).includes(name))) : [];
}
function paintSeas(svg, ok) {
 svg.querySelector('#marine-markers')?.remove();
 const ns = 'http://www.w3.org/2000/svg';
 function add(parent, tag, attrs, text) {
  const node = document.createElementNS(ns, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  if (text) node.textContent = text;
  parent.append(node);
  return node;
 }
 const layer = add(svg, 'g', {id:'marine-markers', 'aria-label':'해상특보 위치 표시'});
 for (const [basin, x, y] of seaMarkers) {
  const types = basin === '기타 해상' ? seaTypes.filter(type => warningsForSea(basin+' '+type).length) :
   seaTypes.filter(type => type !== '구역 확인' || warningsForSea(basin+' '+type).length);
  if (!types.length) continue;
  add(layer, 'text', {x, y:y-10, 'font-size':17, 'font-weight':700, fill:'#164466'}, basin);
  types.forEach((type, index) => {
   const name = basin+' '+type;
   const matches = warningsForSea(name);
   const top = y + index * 37;
   const active = matches.length > 0;
   const kinds = [...new Set(matches.map(kindOf))];
   const detail = ok ? (active ? matches.map(item => item.kind+' '+item.level).join(', ') : '관련 특보 미검출') : '특보 미확인';
   const marker = add(layer, 'g', {'data-region':name, tabindex:0, role:'button',
    'aria-label':name+' · '+detail, style:'cursor:pointer'});
   add(marker, 'title', {}, name+' · '+detail);
   add(marker, 'rect', {x, y:top, width:127, height:36, rx:6,
    fill:active ? warningColors[kinds[0]] : '#e4f1fa', stroke:'#476e89', 'stroke-width':1.5});
   add(marker, 'text', {x:x+63.5, y:top+23, 'text-anchor':'middle', 'font-size':16,
    'font-weight':700, fill:active?'#fff':'#164466'}, type+(active?' '+matches.length+'건':''));
  });
 }
}
function relatedWarnings(region) {
 return warningData?.status === 'ok' ? warningData.items.filter(item =>
  warningAreas(item).some(area => !isMarine(area) &&
   (/전국/.test(area) || regions[region].some(n => area.includes(n))))) : [];
}
function paintMap(){
 const svg=document.querySelector('#map svg');
 $('mapLegend').innerHTML=Object.entries(warningColors).map(([kind,color])=>'<span class="legend-item"><i style="background:'+color+'"></i>'+kind+'</span>').join('')+'<span class="legend-item"><i style="background:#e4e8ef"></i>관련 항목 미검출</span>';
 const ok=warningData?.status==='ok';
 $('mapStatus').textContent=ok?'특보 종류별 색상 · 내륙 특보 중복은 줄무늬 · 해상 표시는 대표 위치이며 실제 구역 경계와 다릅니다.':'특보 자료 미확인 · 지도 색상으로 특보 유무를 판단하지 마세요.';
 if(!svg)return;
 let defs=svg.querySelector('defs');if(defs)defs.remove();defs=document.createElementNS('http://www.w3.org/2000/svg','defs');svg.prepend(defs);
 svg.querySelectorAll('path[data-region]').forEach((path,i)=>{
 const area=path.dataset.region;
 const matches=ok?relatedWarnings(area):[];
 const kinds=[...new Set(matches.map(kindOf))];
 let fill=ok?'#e4e8ef':'#c9ced6';
 if(kinds.length===1)fill=warningColors[kinds[0]];
 if(kinds.length>1){const ns='http://www.w3.org/2000/svg',pattern=document.createElementNS(ns,'pattern');pattern.setAttribute('id','alert-'+i);pattern.setAttribute('patternUnits','userSpaceOnUse');pattern.setAttribute('width',kinds.length*9);pattern.setAttribute('height',kinds.length*9);pattern.setAttribute('patternTransform','rotate(35)');kinds.forEach((k,j)=>{const r=document.createElementNS(ns,'rect');r.setAttribute('x',j*9);r.setAttribute('width',9);r.setAttribute('height',kinds.length*9);r.setAttribute('fill',warningColors[k]);pattern.append(r)});defs.append(pattern);fill='url(#alert-'+i+')'}
 path.style.fill=fill;const detail=ok?(matches.length?matches.map(x=>x.kind+' '+x.level).join(', '):'관련 특보 미검출'):'특보 미확인';path.setAttribute('aria-label',area+' · '+detail+' · 상세 보기');path.querySelector('title').textContent=area+' · '+detail;
 });
 paintSeas(svg, ok);
}
function gyeryongWarningState(data){
 if(!data)return {state:'loading',text:'계룡시 기상특보 조회 중…',note:'최신 자료를 확인하고 있습니다.'};
 if(data.status!=='ok'||!Array.isArray(data.items))return {state:'unknown',text:'계룡시 기상특보 확인 불가',note:'조회 실패 · 기상청 공식 현황을 확인하세요.'};
 const hits=[],uncertain=[];
 for(const item of data.items){
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
 paintMap();
 $('selectedRegion').textContent=selectedRegion+' 관련 특보';
 document.querySelectorAll('[data-region]').forEach(el=>{const yes=el.dataset.region===selectedRegion;el.setAttribute('aria-pressed',String(yes));el.classList.toggle('selected',yes)});
 $('region').value=selectedRegion;
 if(!warningData){$('warnings').textContent='특보 조회 중 · 유무 미확인';return}
 if(warningData.status!=='ok'){$('warnings').innerHTML='<p class="error">특보 자동 조회 실패 · 특보 유무 미확인</p>';return}
 const items=selectedRegion==='전국'?warningData.items:Object.hasOwn(regions,selectedRegion)?relatedWarnings(selectedRegion):warningsForSea(selectedRegion);
 $('warnings').innerHTML='<p class="fine">관련 후보 '+items.length+'건 / 전국 표 '+warningData.items.length+'건</p>'+(items.length?items.map(x=>'<article class="warning"><h3>'+escape(x.kind+' '+x.level)+'</h3><p>'+escape(x.area)+'</p><p>발표 '+escape(x.announced)+' / 발효 '+escape(x.effective)+'</p>'+(x.end?'<p>'+escape(x.end)+'</p>':'')+'</article>').join(''):'<p>현재 특보 표에서 관련 명칭을 포함한 항목을 찾지 못했습니다. 특보 없음의 확정은 아니며 공식 현황을 확인하세요.</p>');
}
function selectRegion(name){if(!Object.hasOwn(regions,name) && !seaBasins.some(basin => seaTypes.some(type => name === basin+' '+type)))return;selectedRegion=name;renderWarnings()}
async function initMap(){
 document.querySelectorAll('.warning-layout .fine').forEach(note => {
  if (note.textContent.includes('해상 특보는 전국')) note.textContent = '해상 표지를 누르면 앞바다·먼바다 특보 상세를 볼 수 있습니다. 표지는 대표 위치를 나타냅니다.';
 });
 $('region').innerHTML=[...Object.keys(regions), ...seaBasins.flatMap(basin => seaTypes.map(type => basin+' '+type))].map(n=>'<option>'+n+'</option>').join('');$('region').onchange=e=>selectRegion(e.target.value);
 $('scopes').onclick=e=>{if(e.target.dataset.region)selectRegion(e.target.dataset.region)};
 try{const r=await fetch('assets/korea.svg');if(!r.ok)throw Error();$('map').innerHTML=await r.text();$('map').onclick=e=>{const p=e.target.closest('[data-region]');if(p)selectRegion(p.dataset.region)};$('map').onkeydown=e=>{if(['Enter',' '].includes(e.key)&&e.target.dataset.region){e.preventDefault();selectRegion(e.target.dataset.region)}}}catch{$('map').textContent='지도를 불러오지 못했습니다. 아래 지역 선택을 사용하세요.'}renderWarnings();
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
 const a=b.warnings;warningData=a;renderWarnings();lines.push('기상특보 조회: '+(a.status==='ok'?'전국 현재 특보 표 '+a.items.length+'건 수신 · 지역별 탭에서 확인':'조회 실패 · 유무 미확인'));
 lines.push('특보 원문: https://www.weather.go.kr/w/special-report/overall.do');$('summary').value=lines.join('\n');$('status').textContent=b.weatherLabel+' / '+(a.status==='ok'?'특보 표 수신':'특보 실패');
 }catch(e){warningData={status:'error'};renderGyeryongAlert();$('status').textContent='자료 조회 실패 · 공식 원문을 확인하세요.';$('warnings').innerHTML='<p class="error">특보 유무 미확인 · 기상청 공식 현황을 확인하세요.</p>';$('condition').textContent='조회 실패';$('hourly').innerHTML='<tr><td colspan="6">날씨 조회 실패</td></tr>';$('summary').value='자료 조회 실패 · 기상특보 유무 미확인';}finally{$('refresh').disabled=false;}
}
$('refresh').textContent='지금 조회하기';
const notice = document.querySelector('main > .notice');
if (notice) notice.textContent='날씨는 Open-Meteo에서 직접 조회하며, 실패하면 최근 게시 자료를 사용합니다. 기상특보·산불경보·조석은 GitHub에 게시된 자료입니다.';
$('refresh').onclick=()=>{load();loadTides();loadForest()};$('copy').onclick=async()=>{try{await navigator.clipboard.writeText($('summary').value);$('copy').textContent='복사 완료';setTimeout(()=>$('copy').textContent='요약 복사',1500)}catch{$('summary').focus();$('summary').select();$('status').textContent='요약문을 선택했습니다. Ctrl+C로 복사하세요.'}};initMap();load();loadTides();loadForest();

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
