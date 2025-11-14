/* --------- Utils --------- */

// ===== [BOOK HEAD CHIPS] 각 책의 1장 첫 단락 '설교' 오른쪽에 칩스 주입 =====

function ensureBookHeadChips(){
  const doc = document;

  // 1) 책 노드 찾기
  const books = doc.querySelectorAll('#tree > details, details.book');
  if (!books.length) {
    console.warn('[bookchips] 책(details) 없음: #tree 구조를 확인하세요.');
    return;
  }

  books.forEach((bookEl, bookIdx) => {
    try{
      // 2) 1장 + 첫 단락
      const ch1 = bookEl.querySelector(':scope > .chapters > details') || bookEl.querySelector('details');
      if (!ch1) return;

      const p1  = ch1.querySelector(':scope > .paras > details.para') || ch1.querySelector('details.para');
      if (!p1) return;

      // 3) 툴바 확보
      let tb = p1.querySelector('.ptoolbar');
      if (!tb) {
        const body = p1.querySelector('.pbody') || p1;
        tb = doc.createElement('div');
        tb.className = 'ptoolbar';
        body.insertAdjacentElement('afterbegin', tb);
      }

      // 4) 설교 버튼 확보
      let sermBtn = tb.querySelector('.sermBtn');
      if (!sermBtn) {
        sermBtn = doc.createElement('button');
        sermBtn.className = 'sermBtn';
        sermBtn.textContent = '설교';
        tb.appendChild(sermBtn);
      }

      // 5) 기존 칩스 제거
      tb.querySelectorAll('.bookhead-chips').forEach(n => n.remove());

      // 6) 칩스 생성 후 설교 오른쪽에 삽입
      const chips = doc.createElement('span');
      chips.className = 'bookhead-chips';
      chips.innerHTML = `
        <button type="button" class="book-chip" data-type="basic">기본이해</button>
        <button type="button" class="book-chip" data-type="structure">내용구조</button>
        <button type="button" class="book-chip" data-type="summary">메세지요약</button>
      `;

      sermBtn.insertAdjacentElement('afterend', chips);

      // ===== 기본이해·내용구조·메세지요약 → "책 단위" 에디터 연결 =====
      const chipBasic   = chips.querySelector('button[data-type="basic"]');
      const chipStruct  = chips.querySelector('button[data-type="structure"]');
      const chipSummary = chips.querySelector('button[data-type="summary"]');

      // 이 단락의 책 정보만 사용 (chap/paraIdx는 여기선 안 씀)
      const summaryEl = p1.querySelector(':scope > summary .ptitle');
      if (!summaryEl) return;

      const book = summaryEl.dataset.book;
      if (!book) return;

      const openBookChipEditor = (mode) => {
        openBookDocEditor(mode, book); // 🌟 새로 만든 책 단위 에디터
      };

      if (chipBasic)
        chipBasic.onclick = () => openBookChipEditor('basic');

      if (chipStruct)
        chipStruct.onclick = () => openBookChipEditor('struct');

      if (chipSummary)
        chipSummary.onclick = () => openBookChipEditor('summary');

    } catch(err){
      console.warn('[bookchips] 처리 중 오류:', err);
    }
  });
}

window.ensureBookHeadChips = ensureBookHeadChips;

// ===== [GLOBAL BOOK CHIPS] 헤더의 '서식가져오기' 오른쪽에 전역 칩스 =====
// ===== [GLOBAL BOOK CHIPS] '서식가져오기' 오른쪽 칩스 주입 =====
function ensureGlobalBookChips(){
  const doc = document;

  // 기준: "서식가져오기" 버튼 찾기
  const anchor =
    doc.getElementById('btnFmtLoad') ||
    Array.from(doc.querySelectorAll('button')).find(b => (b.textContent||'').includes('서식가져오기'));
  if(!anchor) return;

  // 이미 있으면 재배치만
  let wrap = doc.getElementById('globalBookChips');
  if(!wrap){
    wrap = doc.createElement('span');
    wrap.id = 'globalBookChips';
    wrap.innerHTML = `
      <button type="button" class="book-chip" data-type="basic">기본이해</button>
      <button type="button" class="book-chip" data-type="structure">내용구조</button>
      <button type="button" class="book-chip" data-type="summary">메세지요약</button>
    `;
    anchor.insertAdjacentElement('afterend', wrap);

    // 클릭 → 현재 열린 "책(summary)" 기준 책 단위 에디터 실행
    wrap.addEventListener('click', (e)=>{
      const btn = e.target.closest('.book-chip');
      if(!btn) return;
      e.stopPropagation();

      // ✅ 책 summary를 유연하게 찾는 헬퍼
      const getCurrentBookSummary = () => {
        // 1) 현재 열린 단락이 있으면 그 단락이 속한 책
        const openPara = document.querySelector('details.para[open]');
        if (openPara) {
          const bookEl = openPara.closest('details.book');
          if (bookEl) {
            if (!bookEl.hasAttribute('open')) bookEl.setAttribute('open','');
            const sum = bookEl.querySelector(':scope > summary');
            if (sum) return sum;
          }
        }
        // 2) 이미 열려 있는 책
        const opened = document.querySelector('details.book[open] > summary');
        if (opened) return opened;

        // 3) 아무 책도 안 열려 있으면 첫 번째 책을 자동으로 열기
        const first = document.querySelector('details.book > summary');
        if (first) {
          const bookEl = first.parentElement;
          if (bookEl && !bookEl.hasAttribute('open')) bookEl.setAttribute('open','');
          return first;
        }
        return null;
      };

      const bookSummary = getCurrentBookSummary();
      if (!bookSummary) {
        alert('성경(책)을 찾지 못했습니다. 트리가 렌더링되었는지 확인하세요.');
        return;
      }

      if (typeof openBookEditor === 'function') {
        openBookEditor(btn.dataset.type, bookSummary);
      } else {
        alert('openBookEditor 함수가 없습니다.');
      }
    });

  }

  // 항상 '서식가져오기' 오른쪽에 위치 보정
  if (wrap.previousElementSibling !== anchor){
    anchor.insertAdjacentElement('afterend', wrap);
  }
}

// 콘솔에서도 호출 가능
window.ensureGlobalBookChips = ensureGlobalBookChips;

// ===== [BOOK-UNIT EDITOR] 성경(책) 단위 에디터 & 칩스 =====
const BOOK_UNIT_NS = 'WBP3_BOOKUNIT';

// 책 키 생성: data-book 우선, 없으면 제목 텍스트 사용
function _bookKeyFromSummary(sumEl, type){
  if (!sumEl) return null;
  const btitle = sumEl.querySelector('.btitle');
  const dataBook = btitle?.dataset?.book || sumEl.dataset?.book;
  let bookId = dataBook || (btitle?.textContent || sumEl.textContent || '').trim();
  if (!bookId) return null;
  // 공백 정리
  bookId = bookId.replace(/\s+/g,' ');
  return `${BOOK_UNIT_NS}:${bookId}:${type}`;
}

// 기존 단위 에디터 팝업을 재사용 (없으면 생성)
function _ensureBookUnitEditorHost(){
  let host = document.getElementById('unitEditor');
  if (host) return host;
  host = document.createElement('div');
  host.id = 'unitEditor';
  host.className = 'unit-editor';
  host.innerHTML = `
    <header>
      <div class="ue-title">단위 에디터</div>
      <div class="ue-actions">
        <button type="button" id="ueSave">저장</button>
        <button type="button" id="ueClose">닫기</button>
      </div>
    </header>
    <textarea id="ueText" placeholder="여기에 내용을 입력하세요. (자동저장)"></textarea>
  `;
  document.body.appendChild(host);
  // 닫기
  host.querySelector('#ueClose').addEventListener('click', ()=> { host.style.display = 'none'; });
  // 수동 저장
  host.querySelector('#ueSave').addEventListener('click', ()=>{
    const key = host.dataset.key;
    if (key) localStorage.setItem(key, host.querySelector('#ueText').value || '');
  });
  // 자동 저장(디바운스)
  let _tm = null;
  host.querySelector('#ueText').addEventListener('input', ()=>{
    clearTimeout(_tm);
    _tm = setTimeout(()=>{
      const key = host.dataset.key;
      if (key) try { localStorage.setItem(key, host.querySelector('#ueText').value || ''); } catch(_){}
    }, 400);
  });
  return host;
}

// 책 단위 에디터 열기
function openBookEditor(type, sumEl){
  const sum = sumEl || document.querySelector('details.book[open] > summary');
  if (!sum) { alert('열린 성경(책)을 찾을 수 없습니다. 책 summary를 먼저 여세요.'); return; }

  const key = _bookKeyFromSummary(sum, type);
  if (!key) { alert('책 키 생성 실패: .btitle data-book 또는 텍스트 확인'); return; }

  const host = _ensureBookUnitEditorHost();
  const label = (type === 'basic') ? '기본이해' : (type === 'structure' ? '내용구조' : '메세지요약');
  host.dataset.key = key;
  host.querySelector('.ue-title').textContent = `단위 에디터 — ${label} (책 단위)`;
  host.querySelector('#ueText').value = localStorage.getItem(key) || '';
  host.style.display = 'flex';
  host.querySelector('#ueText').focus();
}

// 책 summary 옆 칩스 주입
function ensureBookChips(){
  const books = document.querySelectorAll('details.book > summary');
  if (!books.length) return;

  books.forEach(sum => {
    // btitle 없으면 생성(한 번만)
    let bt = sum.querySelector('.btitle');
    if (!bt) {
      bt = document.createElement('span');
      bt.className = 'btitle';
      const first = sum.firstChild;
      if (first && first.nodeType === Node.TEXT_NODE) {
        bt.textContent = first.nodeValue.trim();
        first.nodeValue = '';
        sum.insertBefore(bt, sum.firstChild);
      } else {
        // 텍스트가 없으면 빈 btitle 삽입
        sum.insertBefore(bt, sum.firstChild);
      }
    }

    // 이미 summary 바로 아래에 칩스가 있는지 확인
    let chips = sum.querySelector(':scope > .book-chips');
    if (!chips) {
      chips = document.createElement('span');
      chips.className = 'book-chips';
      chips.innerHTML = `
        <button type="button" class="book-chip" data-type="basic">기본이해</button>
        <button type="button" class="book-chip" data-type="structure">내용구조</button>
        <button type="button" class="book-chip" data-type="summary">메세지요약</button>
      `;
      sum.insertBefore(chips, sum.firstChild);

      // summary 토글로 전파 차단 + 해당 책 컨텍스트로 에디터 열기
      chips.addEventListener('click', (e)=>{
        e.stopPropagation();
        const btn = e.target.closest('.book-chip'); if (!btn) return;
        const paraBook = sum.closest('details.book');
        if (paraBook && !paraBook.hasAttribute('open')) paraBook.setAttribute('open',''); // 책 열기 보장
        openBookEditor(btn.dataset.type, sum);
        e.preventDefault();
      });
    }
  });
}

// 전역에서 콘솔로도 호출 가능하게 등록
// window.ensureBookChips = ensureBookChips;

// ===== [UNIT-EDITOR GLOBAL CHIPS] 헤더 우측 전역 칩스 생성 (전역 등록) BEGIN =====
function ensureUnitGlobalChips(){
  const doc = document;

  // 헤더 확보(없으면 대체 헤더 생성)
  let header = doc.querySelector('header');
  if (!header) {
    header = doc.createElement('header');
    header.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--panel,#161922);border-bottom:1px solid var(--border,#252a36);position:sticky;top:0;z-index:1000;';
    doc.body.insertAdjacentElement('afterbegin', header);
  } else {
    const cs = getComputedStyle(header);
    if (cs.display !== 'flex') header.style.display = 'flex';
    if (!cs.alignItems || cs.alignItems === 'normal') header.style.alignItems = 'center';
    if (!cs.gap || cs.gap === '0px') header.style.gap = '8px';
  }

  // 중복 생성 방지
  let bar = doc.getElementById('unitGlobalChips');
  if (!bar) {
    bar = doc.createElement('div');
    bar.id = 'unitGlobalChips';
    bar.innerHTML = `
      <button type="button" class="unit-chip" data-type="basic">기본이해</button>
      <button type="button" class="unit-chip" data-type="structure">내용구조</button>
      <button type="button" class="unit-chip" data-type="summary">메세지요약</button>
    `;
    header.appendChild(bar);

    // 클릭: 현재 열린 단락 기준으로 에디터 열기
    bar.addEventListener('click', (e)=>{
      const btn = e.target.closest('.unit-chip'); if(!btn) return;
      const open = document.querySelector('details.para[open]');
      if(!open){ alert('열린 단락이 없습니다. 단락을 먼저 여세요.'); return; }
      if(!open.hasAttribute('open')) open.setAttribute('open','');
      openUnitEditor(btn.dataset.type);
      e.preventDefault();
      e.stopPropagation();
    });
  }
}
// 전역에서 콘솔 호출 가능하도록 노출
// window.ensureUnitGlobalChips = ensureUnitGlobalChips;
// ===== [UNIT-EDITOR GLOBAL CHIPS] END =====

const UNIT_NS = 'WBP3_UNIT';

function _unitKeyFromTitleEl(ptitleEl, type){
  const b = ptitleEl?.dataset?.book, c = ptitleEl?.dataset?.ch, i = ptitleEl?.dataset?.idx;
  if(!b || !c || !i) return null;
  return `${UNIT_NS}:${b}:${c}:${i}:${type}`;
}

function _ensureUnitEditorHost(){
  let host = document.getElementById('unitEditor');
  if (host) return host;
  host = document.createElement('div');
  host.id = 'unitEditor';
  host.className = 'unit-editor';
  host.innerHTML = `
    <header>
      <div class="ue-title">단위 에디터</div>
      <div class="ue-actions">
        <button type="button" id="ueSave">저장</button>
        <button type="button" id="ueClose">닫기</button>
      </div>
    </header>
    <textarea id="ueText" placeholder="여기에 내용을 입력하세요. (자동저장)"></textarea>
  `;
  document.body.appendChild(host);

  // 닫기
  host.querySelector('#ueClose').addEventListener('click', ()=> { host.style.display='none'; });
  // 저장 (수동)
  host.querySelector('#ueSave').addEventListener('click', ()=>{
    const key = host.dataset.key;
    if (key) localStorage.setItem(key, host.querySelector('#ueText').value || '');
  });
  // 자동저장 (디바운스)
  let _tm = null;
  host.querySelector('#ueText').addEventListener('input', ()=>{
    clearTimeout(_tm);
    _tm = setTimeout(()=>{
      const key = host.dataset.key;
      if (key) try{ localStorage.setItem(key, host.querySelector('#ueText').value || ''); }catch(_){}
    }, 400);
  });

  return host;
}

function openUnitEditor(type){
  const open = document.querySelector('details.para[open]');
  const t = open?.querySelector('summary .ptitle');
  if(!t){ alert('열린 단락을 찾을 수 없습니다.'); return; }

  const key = _unitKeyFromTitleEl(t, type);
  if(!key){ alert('키 생성 오류: data-book/ch/idx 확인'); return; }

  const host = _ensureUnitEditorHost();
  const label = type === 'basic' ? '기본이해' : (type === 'structure' ? '내용구조' : '메세지요약');

  host.dataset.key = key;
  host.querySelector('.ue-title').textContent = `단위 에디터 — ${label}`;
  host.querySelector('#ueText').value = localStorage.getItem(key) || '';
  host.style.display = 'flex';
  host.querySelector('#ueText').focus();
}

// ===== [FORMAT-PERSIST BACKUP] 내보내기/가져오기 유틸 (WBP3_FMT) BEGIN =====
// const FMT_NS = typeof FMT_NS === 'string' ? FMT_NS : 'WBP3_FMT'; // 이미 있으면 재사용

function wbpExportFormats(){
  try{
    const keys = Object.keys(localStorage).filter(k => k.startsWith(FMT_NS + ':'));
    const items = keys.map(k => ({ key: k, value: JSON.parse(localStorage.getItem(k) || 'null') }));
    const payload = {
      ns: FMT_NS,
      exportedAt: new Date().toISOString(),
      count: items.length,
      items
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const ts = new Date(); // YYYYMMDD-HHMMSS
    const pad = n => String(n).padStart(2,'0');
    const fname = `wbp-format-backup-${ts.getFullYear()}${pad(ts.getMonth()+1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}.json`;
    a.href = url; a.download = fname; document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 0);
    if (typeof status === 'function') status(`서식 내보내기 완료 (${items.length}개)`);
  }catch(e){
    console.error(e);
    alert('서식 내보내기 중 오류가 발생했습니다.');
  }
}

function wbpImportFormatsFromFile(){
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.onchange = () => {
    const file = input.files && input.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try{
        const json = JSON.parse(String(reader.result||'{}'));
        // 허용 포맷: {ns, exportedAt, items:[{key,value}]} 또는 { "<key>": <value>, ... }
        let kvList = [];
        if (Array.isArray(json.items)) {
          kvList = json.items;
        } else {
          kvList = Object.keys(json).map(k => ({ key: k, value: json[k] }));
        }
        // 네임스페이스 키만 반영
        const onlyFmt = kvList.filter(rec => typeof rec.key === 'string' && rec.key.startsWith(FMT_NS + ':'));
        if (onlyFmt.length === 0) {
          alert('가져올 WBP 서식 키를 찾지 못했습니다.');
          return;
        }
        // 덮어쓰기 확인
        const overwrite = confirm(`${onlyFmt.length}개의 서식 데이터를 가져옵니다.\n동일 키는 덮어쓰기 됩니다. 계속할까요?`);
        if(!overwrite) return;

        let applied = 0;
        for(const rec of onlyFmt){
          try{
            localStorage.setItem(rec.key, JSON.stringify(rec.value ?? null));
            applied++;
          }catch(e){
            console.warn('skip:', rec.key, e);
          }
        }
        if (typeof status === 'function') status(`서식 가져오기 완료 (${applied}개 적용)`);
        alert(`가져오기 완료: ${applied}개 적용`);
      }catch(e){
        console.error(e);
        alert('서식 가져오기 중 오류가 발생했습니다. JSON 형식을 확인하세요.');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}
// ===== [FORMAT-PERSIST BACKUP] 내보내기/가져오기 유틸 (WBP3_FMT) END =====

// ===== [FORMAT-PERSIST/RUNS] 위치정보(오프셋) 추출 및 HTML 재구성 유틸 BEGIN =====
function _collectTextAndRuns(rootEl){
  const spans = [];
  let text = '';
  let offset = 0;
  const active = [];

  function pushSpan(start, end, attrs){
    if (end > start) spans.push({ start, end, attrs: { ...attrs } });
  }
  function attrsFromEl(el){
    const a = {};
    const tag = el.tagName?.toLowerCase?.() || '';
    if (tag === 'b' || tag === 'strong') a.b = true;
    if (tag === 'i' || tag === 'em')     a.i = true;
    if (tag === 'u')                      a.u = true;
    if (tag === 's' || tag === 'strike')  a.s = true;
    if (tag === 'mark')                   a.mark = true;
    const color = (el.style && el.style.color) || el.getAttribute?.('color');
    if (color) a.color = color;
    return a;
  }
  function walk(node){
    if (!node) return;
    if (node.nodeType === Node.TEXT_NODE) {
      const chunk = node.nodeValue || '';
      const start = offset;
      const cps = [...chunk]; // 유니코드 안전
      text += chunk; offset += cps.length;
      for (const a of active) pushSpan(start, offset, a);
      return;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const attrs = attrsFromEl(node);
      const has = Object.keys(attrs).length > 0;
      if (has) active.push(attrs);
      for (let c=node.firstChild; c; c=c.nextSibling) walk(c);
      if (has) active.pop();
    }
  }
  walk(rootEl);
  return { text, spans };
}

function _wrapRunsToHTML(text, spans){
  // 유니코드 안전 문자 배열
  const cps = [...String(text||'')];

  // 위치별 시작/끝 인덱스 맵
  const starts = new Map(), ends = new Map();
  (spans||[]).forEach(sp => {
    if (!starts.has(sp.start)) starts.set(sp.start, []);
    starts.get(sp.start).push(sp);
    if (!ends.has(sp.end)) ends.set(sp.end, []);
    ends.get(sp.end).push(sp);
  });

  // 태그 열기/닫기
  function openTags(a){
    let out = '';
    if (a.b) out += '<b>';
    if (a.i) out += '<i>';
    if (a.u) out += '<u>';
    if (a.s) out += '<s>';
    if (a.mark) out += '<mark>';
    if (a.color) out += `<span style="color:${a.color}">`;
    return out;
  }
  function closeTags(a){
    let out = '';
    if (a.color) out = '</span>' + out;
    if (a.mark)  out = '</mark>' + out;
    if (a.s)     out = '</s>' + out;
    if (a.u)     out = '</u>' + out;
    if (a.i)     out = '</i>' + out;
    if (a.b)     out = '</b>' + out;
    return out;
  }

  // 현재 활성 속성 스택(단순 병합 전략)
  const active = [];
  const out = [];

  for (let i=0;i<=cps.length;i++){
    // 먼저 닫기
    if (ends.has(i)){
      if (active.length){
        const merged = active.reduce((m,a)=>Object.assign(m,a),{});
        out.push(closeTags(merged));
        active.length = 0;
      }
    }
    // 그 다음 열기
    if (starts.has(i)){
      const list = starts.get(i) || [];
      if (list.length){
        const merged = {};
        for (const sp of list){
          const a = sp.attrs || {};
          if (a.b) merged.b = true;
          if (a.i) merged.i = true;
          if (a.u) merged.u = true;
          if (a.s) merged.s = true;
          if (a.mark) merged.mark = true;
          if (a.color) merged.color = a.color;
          active.push(a);
        }
        out.push(openTags(merged));
      }
    }
    // 본문 문자 추가
    if (i < cps.length){
      const ch = cps[i]
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;');
      out.push(ch);
    }
  }

  if (active.length){
    const merged = active.reduce((m,a)=>Object.assign(m,a),{});
    out.push(closeTags(merged));
  }
  return out.join('');
}

// ===== [FORMAT-PERSIST/RUNS] END =====

// ===== [FORMAT-PERSIST] WBP-3.0 절문장 서식 저장/복원 (localStorage, v2 runs) BEGIN =====

// ---- (ADD) 현재 열린 단락 서식초기화 ----
function clearFormatForOpenPara(){
  // 1) 현재 열린 단락 컨텍스트
  const ctx = (typeof getOpenParaKeyAndEls === 'function') ? getOpenParaKeyAndEls() : null;
  if(!ctx){ alert('열려있는 단락을 찾을 수 없습니다.'); return; }

  // 2) localStorage 저장본 삭제 (그 단락만)
  try{
    localStorage.removeItem(ctx.key);
  }catch(e){
    console.warn('localStorage remove 실패:', e);
  }

  // 3) 화면의 인라인 서식 제거 (.pline .content 우선)
  const SKIP_SELECTOR = 'sup, sup.pv, .pv, .pvnum, .verse-no'; // 절번호 등은 건드리지 않음
  const isEmptyStyle = (el) => !el.getAttribute('style') || el.getAttribute('style').trim()==='';

  const stripInlineFormat = (root)=>{
    if(!root) return;
    // 굵게/기울임/밑줄/취소선/mark/font → 언랩 (태그 제거, 텍스트만 남김)
    root.querySelectorAll('b,i,u,s,mark,font').forEach(el=>{
      if (el.matches(SKIP_SELECTOR)) return;
      const frag = document.createDocumentFragment();
      while(el.firstChild) frag.appendChild(el.firstChild);
      el.replaceWith(frag);
    });
    // span의 색/배경색 제거. 쓸모없어지면 언랩
    root.querySelectorAll('span').forEach(el=>{
      if (el.matches(SKIP_SELECTOR)) return;
      const style = el.getAttribute('style') || '';
      // 색 관련 속성 비우기
      el.style && (el.style.color = '', el.style.backgroundColor = '');
      // color/background만 있었던 경우 style 비우기
      if (style) {
        const s = el.getAttribute('style') || '';
        if (!s || s.trim()==='') el.removeAttribute('style');
      }
      // 클래스/데이터/아이디 등 메타가 없고 style도 없으면 언랩
      if (!el.classList.length && !el.attributes.length) {
        const frag = document.createDocumentFragment();
        while(el.firstChild) frag.appendChild(el.firstChild);
        el.replaceWith(frag);
      }
    });
  };

  // 각 절문장에 적용
  for (const lineEl of ctx.lineEls){
    const root = lineEl.matches('.content') ? lineEl : (lineEl.querySelector('.content') || lineEl);
    stripInlineFormat(root);
  }

  // 4) 상태 표시
  if (typeof status === 'function') status('서식초기화 완료 (해당 단락만)');
}

const FMT_NS = 'WBP3_FMT';

function getOpenParaKeyAndEls(){
  // 현재 열려있는 단락(details.para[open])과 키 구성
  const openPara = document.querySelector('details.para[open]');
  if(!openPara) return null;

  const t = openPara.querySelector('summary .ptitle');
  if(!t) return null;

  const book = t.dataset.book;
  const ch   = t.dataset.ch;
  const idx  = t.dataset.idx;
  if(!book || !ch || !idx) return null;

  // 절문장(라인) 엘리먼트 수집: .pline .content 우선, 없으면 .pline 자체
  const candidates = openPara.querySelectorAll('.pline .content, .pline');
  const lineEls = Array.from(candidates).filter(el => !el.matches('details, summary'));

  const key = `${FMT_NS}:${book}:${ch}:${idx}`;
  return { key, openPara, lineEls };
}

function saveFormatForOpenPara(){
  const ctx = getOpenParaKeyAndEls();
  if(!ctx){ alert('열려있는 단락을 찾을 수 없습니다.'); return; }

  const lines = ctx.lineEls.map(el => {
    const root = el.matches('.content') ? el : (el.querySelector('.content') || el);
    const { text, spans } = _collectTextAndRuns(root);
    return { html: root.innerHTML, text, spans };
  });

  const payload = { v: 2, savedAt: Date.now(), lines };
  try{
    localStorage.setItem(ctx.key, JSON.stringify(payload));
    status && status('서식 저장 완료 (정밀: 위치정보 포함)');
  }catch(e){
    console.error(e);
    alert('서식 저장 중 오류가 발생했습니다.');
  }
}

function restoreFormatForOpenPara(){
  const ctx = getOpenParaKeyAndEls();
  if(!ctx){ alert('열려있는 단락을 찾을 수 없습니다.'); return; }

  const raw = localStorage.getItem(ctx.key);
  if(!raw){ alert('저장된 서식이 없습니다. 먼저 [서식저장]을 실행하세요.'); return; }

  let data;
  try{ data = JSON.parse(raw); }catch(e){ console.error(e); alert('저장된 서식 데이터를 읽는 중 오류가 발생했습니다.'); return; }
  if(!data || !Array.isArray(data.lines)){ alert('저장된 서식 형식이 올바르지 않습니다.'); return; }

  const n = Math.min(ctx.lineEls.length, data.lines.length);
  for (let i=0; i<n; i++){
    const el = ctx.lineEls[i];
    const root = el.matches('.content') ? el : (el.querySelector('.content') || el);
    const rec = data.lines[i] || {};
    if (rec.text && Array.isArray(rec.spans)){
      // runs 기반 복원
      root.innerHTML = _wrapRunsToHTML(rec.text, rec.spans);
    } else if (rec.html){
      // 구형 저장본 호환
      root.innerHTML = rec.html;
    }
  }
  status && status('서식 회복 완료 (runs 기반)');
}

// ===== [FORMAT-PERSIST] WBP-3.0 절문장 서식 저장/복원 (localStorage, v2 runs) END =====

// ===== [FORMAT-PERSIST UI] 버튼 생성/바인딩 BEGIN =====
// === [FORMAT-PERSIST UI] 버튼 생성/배치 — 헤더(내용가져오기 옆)로 이동 ===
function ensureFormatButtons(){
  const doc = document;

  // 0) 앵커: 헤더의 "내용가져오기" 버튼(기존 id: btnImportAll) 우선 탐색
  let anchor =
    doc.getElementById('btnImportAll') ||
    Array.from(doc.querySelectorAll('header button')).find(b => (b.textContent||'').trim().includes('내용가져오기')) ||
    null;

  // 1) 호스트: 헤더 우선
  const headerEl = doc.querySelector('header');
  const host = (anchor && anchor.parentElement) || headerEl || doc.body;

  // 2) 중복 검사
  const existSave = doc.getElementById('btnFmtSave');
  const existLoad = doc.getElementById('btnFmtLoad');
  const existExp  = doc.getElementById('btnFmtExport');
  const existImp  = doc.getElementById('btnFmtImport');

  // 3) 생성 유틸
  const mkBtn = (id, label) => {
    const b = doc.createElement('button');
    b.id = id;
    b.type='button';
    b.textContent = label;
    b.className = 'fmt-btn';
    b.style.marginLeft = '6px';
    return b;
  };

  const btnSave = existSave || mkBtn('btnFmtSave','서식저장');
  const btnLoad = existLoad || mkBtn('btnFmtLoad','서식회복');
  const btnExp  = existExp  || mkBtn('btnFmtExport','서식내보내기');
  const btnImp  = existImp  || mkBtn('btnFmtImport','서식가져오기');

  // 4) 배치: "내용가져오기" 버튼의 오른쪽에 순서대로 붙이기
  //    [내용가져오기] [서식가져오기] [서식내보내기] [서식회복] [서식저장]
  if (anchor) {
    // 이미 있으면 재정렬만
    anchor.insertAdjacentElement('afterend', btnSave);
    anchor.insertAdjacentElement('afterend', btnLoad);
    anchor.insertAdjacentElement('afterend', btnExp);
    anchor.insertAdjacentElement('afterend', btnImp);
  } else if (host) {
    host.append(btnImp, btnExp, btnLoad, btnSave);
  }

  // 5) 클릭 이벤트(기존 핸들러 재사용)
  btnSave.onclick = saveFormatForOpenPara;
  btnLoad.onclick = restoreFormatForOpenPara;
  btnExp.onclick  = wbpExportFormats;
  btnImp.onclick  = wbpImportFormatsFromFile;
}

function safeBindFmtButtons(){
  try{ ensureFormatButtons(); }
  catch(e){ console.error('ensureFormatButtons error:', e); }
}
// ===== [FORMAT-PERSIST UI] 버튼 생성/바인딩 END =====

// ===== [UNIT-EDITOR] ptitle 옆 버튼 주입 (전방위 견고 버전) =====
function ensureUnitChips(){
  // 열려있는 단락이 없으면 모든 단락에 시도(최초 로드 대비)
  const paras = document.querySelectorAll('details.para');
  if (!paras.length) return;

  paras.forEach(para => {
    const sum = para.querySelector('summary');
    if (!sum) return;

    // 1) ptitle 확보: 없으면 summary 텍스트를 감싸서 생성
    let t = sum.querySelector('.ptitle');
    if (!t) {
      t = document.createElement('span');
      t.className = 'ptitle';
      // summary 첫 번째 노드가 텍스트라면 그 텍스트를 ptitle로 옮김
      const first = sum.firstChild;
      if (first && first.nodeType === Node.TEXT_NODE) {
        t.textContent = first.nodeValue.trim();
        first.nodeValue = '';
        sum.insertBefore(t, sum.firstChild);
      } else {
        // 텍스트가 없으면 summary 맨 앞에 빈 ptitle 삽입
        sum.insertBefore(t, sum.firstChild);
      }
    }

    // 2) 이미 있으면 중복 생성 금지
    if (t.querySelector('.unit-chips')) return;

    // 3) 버튼 삽입
    const wrap = document.createElement('span');
    wrap.className = 'unit-chips';
    wrap.innerHTML = `
      <button type="button" class="unit-chip" data-type="basic">기본이해</button>
      <button type="button" class="unit-chip" data-type="structure">내용구조</button>
      <button type="button" class="unit-chip" data-type="summary">메세지요약</button>
    `;
    t.appendChild(wrap);

    // 4) 클릭이 summary 토글로 전파되지 않도록 차단 + 에디터 열기
    if (!wrap.dataset.bound) {
      wrap.addEventListener('click', (e)=>{
        e.stopPropagation(); // summary의 열기/닫기 방지
        const btn = e.target.closest('.unit-chip');
        if (!btn) return;
        // 단락이 닫혀 있으면 열기
        if (!para.hasAttribute('open')) para.setAttribute('open','');
        // 에디터 실행
        openUnitEditor(btn.dataset.type);
        e.preventDefault(); // 모바일 더블탭 등 방지
      });
      wrap.dataset.bound = '1';
    }

    // 4) 클릭 처리 (오픈 단락 기준으로 에디터 열기)
    wrap.addEventListener('click', (e)=>{
      const btn = e.target.closest('.unit-chip');
      if (!btn) return;
      // 이 버튼이 속한 단락을 "열린" 상태로 만들고 에디터 호출
      if (!para.hasAttribute('open')) para.setAttribute('open','');
      openUnitEditor(btn.dataset.type);
    });
  });
}

const AI_ENDPOINT = 'http://localhost:5174/api/unit-context';
const el = id => document.getElementById(id);
const treeEl = el('tree'), statusEl = el('status');
function status(msg){ statusEl.textContent = msg; }
function escapeHtml(s){
  return String(s||'')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;');
}
function stripBlankLines(s){return String(s||'').split(/\r?\n/).filter(l=>l.trim()!=='').join('\n');}

function syncCurrentFromOpen(){
  const openPara = treeEl.querySelector('details.para[open]');
  if(!openPara) return false;
  const t = openPara.querySelector('summary .ptitle');
  if(!t) return false;
  const book = t.dataset.book;
  const chap = parseInt(t.dataset.ch, 10);
  const idx  = parseInt(t.dataset.idx, 10);
  const para = BIBLE?.books?.[book]?.[chap]?.paras?.[idx];
  if(!para) return false;
  CURRENT.book   = book;
  CURRENT.chap   = chap;
  CURRENT.paraIdx= idx;
  CURRENT.paraId = `${book}|${chap}|${para.ref}`;
  return true;
}

// 제목 변경 반영
function updateParaTitle(book, chap, idx, newTitle){
  try{
    const para = BIBLE?.books?.[book]?.[chap]?.paras?.[idx];
    if(!para) return;
    para.title = newTitle;
    const s = document.querySelector(
      `summary .ptitle[data-book="${CSS.escape(String(book))}"][data-ch="${CSS.escape(String(chap))}"][data-idx="${CSS.escape(String(idx))}"]`
    );
    if(s) s.textContent = newTitle;
  }catch(_){}
}

// JSON 다운로드
function downloadBibleJSON(){
  if(!BIBLE){ alert('BIBLE 데이터가 없습니다.'); return; }
  const blob = new Blob([JSON.stringify(BIBLE, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'bible-paragraphs.json';
  document.body.appendChild(a); a.click();
  setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 0);
  status('수정된 JSON을 다운로드했습니다.');
}

/* ==== 전체 데이터 백업/복원 ==== */
const STORAGE_SERMON      = 'wbps.sermons.v4';
const STORAGE_UNIT_CTX    = 'wbps.ctx.unit.v1';
const STORAGE_WHOLE_CTX   = 'wbps.ctx.whole.v1';
const STORAGE_COMMENTARY  = 'wbps.ctx.comm.v1';
const STORAGE_SUMMARY     = 'wbps.ctx.summary.v1';
const VOICE_CHOICE_KEY    = 'wbps.tts.choice.v2';

const STORAGE_BOOK_BASIC   = 'WBP3_BOOK_BASIC';
const STORAGE_BOOK_STRUCT  = 'WBP3_BOOK_STRUCT';
const STORAGE_BOOK_SUMMARY = 'WBP3_BOOK_SUMMARY';

function todayStr(){
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function exportAllData(){
  const keys = [STORAGE_SERMON, STORAGE_UNIT_CTX, STORAGE_WHOLE_CTX, STORAGE_COMMENTARY, STORAGE_SUMMARY, VOICE_CHOICE_KEY];
  const payload = { __wbps:1, date: todayStr(), items:{} };
  keys.forEach(k=> payload.items[k] = localStorage.getItem(k) ?? null);
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  const ts = new Date();
  const tss = `${ts.getFullYear()}${String(ts.getMonth()+1).padStart(2,'0')}${String(ts.getDate()).padStart(2,'0')}-${String(ts.getHours()).padStart(2,'0')}${String(ts.getMinutes()).padStart(2,'0')}`;
  a.href = URL.createObjectURL(blob);
  a.download = `wbps-backup-${tss}.json`;
  document.body.appendChild(a); a.click();
  setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 0);
  status('전체 데이터를 내보냈습니다.');
}
async function importAllData(file){
  try{
    const text = await file.text();
    const json = JSON.parse(text);
    if(!json || json.__wbps!==1 || !json.items){ alert('백업 파일 형식이 아닙니다.'); return; }
    if(!confirm('이 백업으로 현재 기기의 데이터를 덮어쓸까요?')) return;
    Object.entries(json.items).forEach(([k,v])=>{
      if(v===null || v===undefined) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    });
    status('가져오기가 완료되었습니다. 페이지를 새로고침하면 반영됩니다.');
  }catch(e){
    console.error(e);
    alert('가져오기 중 오류가 발생했습니다.');
  }
}

/* --------- Refs / State --------- */
const voiceSelect = el('voiceSelect'), testVoiceBtn = el('testVoice');
const rateCtl = el('rateCtl'), pitchCtl = el('pitchCtl'), voiceHint = el('voiceHint');
const modalWrap = el('modalWrap'), modalRef = el('modalRef');
const sermonList = el('sermonList'), sermonEditor = el('sermonEditor');
const sermonTitle = el('sermonTitle'), sermonBody = el('sermonBody');
const editorSpeakBtn = el('editorSpeak');
const modalFooterNew = el('modalFooterNew');

let BIBLE = null;
let CURRENT = { book:null, chap:null, paraIdx:null, paraId:null };
let READER = { playing:false, q:[], idx:0, synth:window.speechSynthesis||null, scope:null, btn:null, continuous:false };
let EDITOR_READER = { playing:false, u:null, synth:window.speechSynthesis||null };

/* --------- Boot --------- */
(async function boot(){
  try{
    BIBLE = await tryFetchJSON('bible-paragraphs.json');
  }catch(_){
    try{ BIBLE = await tryFetchJSON('bible_paragraphs.json'); }
    catch(e){ status('bible-paragraphs.json을 찾을 수 없습니다. 같은 폴더에 두고 다시 열어주세요.'); return; }
  }
  buildTree();
  ensureSermonButtons();   // 🔧 설교 버튼 누락 시 보강
  status('불러오기 완료. 66권 트리가 활성화되었습니다.');
  await setupVoices();
})();

(function bindButtons(){
  el('btnSaveJSON')?.addEventListener('click', downloadBibleJSON);
  const btnExport = el('btnExportAll');
  const btnImport = el('btnImportAll');
  const fileInput = el('importFile');
  if (btnExport) btnExport.onclick = exportAllData;
  if (btnImport) btnImport.onclick = ()=> fileInput && fileInput.click();
  if (fileInput) fileInput.addEventListener('change', (e)=>{
    const f = e.target.files?.[0]; if(!f) return;
    importAllData(f).finally(()=>{ e.target.value=''; });
  });
})();

async function tryFetchJSON(path){ const res = await fetch(path, {cache:'no-store'}); if(!res.ok) throw 0; return await res.json(); }

/* --------- Voice --------- */
function waitForVoices(timeout=1500){
  return new Promise(resolve=>{
    const have = speechSynthesis.getVoices?.();
    if (have && have.length) return resolve(have);
    const t = setTimeout(()=> resolve(speechSynthesis.getVoices?.()||[]), timeout);
    speechSynthesis.onvoiceschanged = ()=>{ clearTimeout(t); resolve(speechSynthesis.getVoices?.()||[]); };
  });
}
function getKoreanVoices(all){
  return (all||[]).filter(v=>{
    const n=(v.name||'').toLowerCase(), l=(v.lang||'').toLowerCase();
    return l.startsWith('ko') || n.includes('korean') || n.includes('한국') || n.includes('korea');
  });
}
function presetsForSingleVoice(){
  return [
    {id:'preset-soft-low',  label:'프리셋 · 저음/느림',   rate:0.85, pitch:0.85},
    {id:'preset-soft-high', label:'프리셋 · 고음/느림',   rate:0.90, pitch:1.20},
    {id:'preset-fast',      label:'프리셋 · 빠름',       rate:1.20, pitch:1.05},
    {id:'preset-bright',    label:'프리셋 · 밝게',       rate:1.05, pitch:1.25},
    {id:'preset-radio',     label:'프리셋 · 라디오톤',   rate:1.00, pitch:0.90},
    {id:'preset-reading',   label:'프리셋 · 낭독체',     rate:0.95, pitch:1.00},
  ];
}
async function setupVoices(){
  const all = await waitForVoices();
  const kos = getKoreanVoices(all);

  voiceSelect.innerHTML = '';
  const def = document.createElement('option');
  def.value = JSON.stringify({type:'default'});
  def.textContent = '브라우저 기본(ko-KR)';
  voiceSelect.appendChild(def);

  if(kos.length > 0){
    const og = document.createElement('optgroup'); og.label = '한국어 보이스';
    kos.forEach(v=>{
      const opt = document.createElement('option');
      opt.value = JSON.stringify({type:'voice', uri:v.voiceURI});
      opt.textContent = `${v.name} — ${v.lang}${v.localService ? ' (로컬)' : ''}`;
      og.appendChild(opt);
    });
    voiceSelect.appendChild(og);
  }
  if(kos.length <= 1){
    const pg = document.createElement('optgroup'); pg.label = '스타일 프리셋';
    presetsForSingleVoice().forEach(p=>{
      const opt = document.createElement('option');
      opt.value = JSON.stringify({type:'preset', rate:p.rate, pitch:p.pitch});
      opt.textContent = p.label;
      pg.appendChild(opt);
    });
    voiceHint.style.display = '';
  } else {
    voiceHint.style.display = 'none';
  }

  const saved = localStorage.getItem(VOICE_CHOICE_KEY);
  if(saved){
    const idx = [...voiceSelect.options].findIndex(o=>o.value===saved);
    if(idx>=0) voiceSelect.selectedIndex = idx;
  } else {
    localStorage.setItem(VOICE_CHOICE_KEY, voiceSelect.value);
  }
  voiceSelect.addEventListener('change', ()=> localStorage.setItem(VOICE_CHOICE_KEY, voiceSelect.value));
  testVoiceBtn.onclick = ()=> speakSample('태초에 하나님이 천지를 창조하시니라.');
}
function resolveVoiceChoice(){
  try{ return JSON.parse(localStorage.getItem(VOICE_CHOICE_KEY)||'{"type":"default"}'); }
  catch{ return {type:'default'}; }
}
function pickVoiceByURI(uri){ return (speechSynthesis.getVoices?.()||[]).find(v=>v.voiceURI===uri) || null; }
function applyVoice(u){
  const choice = resolveVoiceChoice();
  const baseRate = parseFloat(rateCtl.value||'0.95');
  const basePitch = parseFloat(pitchCtl.value||'1');
  if(choice.type==='voice'){
    const v = pickVoiceByURI(choice.uri);
    if(v){ u.voice = v; u.lang = v.lang; } else { u.lang = 'ko-KR'; }
    u.rate = baseRate; u.pitch = basePitch;
  } else if(choice.type==='preset'){
    u.lang = 'ko-KR';
    u.rate = clamp((choice.rate ?? 0.95) * baseRate / 0.95, 0.5, 2);
    u.pitch = clamp((choice.pitch ?? 1.0) * basePitch / 1.0, 0, 2);
  } else {
    u.lang = 'ko-KR'; u.rate = baseRate; u.pitch = basePitch;
  }
}
function clamp(n,min,max){ return Math.max(min, Math.min(max,n)); }
function speakSample(text){
  const synth = window.speechSynthesis;
  try{ synth.cancel(); }catch(e){}
  const u = new SpeechSynthesisUtterance(text);
  applyVoice(u);
  synth.speak(u);
}

/* --------- Tree --------- */
function buildTree(){
  treeEl.innerHTML = '';
  if(!BIBLE){ treeEl.innerHTML = '<div class="muted">파일을 찾을 수 없습니다.</div>'; return; }

  for(const bookName of Object.keys(BIBLE.books)){
    const detBook = document.createElement('details');
    const sumBook = document.createElement('summary');
    sumBook.innerHTML = `<span class="tw">${escapeHtml(bookName)}</span>`;
    detBook.appendChild(sumBook);

    const chWrap = document.createElement('div'); chWrap.className='chapters';
    const chapters = Object.keys(BIBLE.books[bookName]).map(n=>parseInt(n,10)).sort((a,b)=>a-b);

    for(const chap of chapters){
      const detChap = document.createElement('details');
      const sumChap = document.createElement('summary');
      sumChap.innerHTML = `<span class="chip">${chap}장</span>`;
      detChap.appendChild(sumChap);

      const parWrap = document.createElement('div'); parWrap.className='paras';
      const paras = BIBLE.books[bookName][chap].paras || [];
      paras.forEach((p, idx)=>{
        const detPara = document.createElement('details'); detPara.className='para';

        const m = String(p.ref||'').match(/^(\d+):(\d+)(?:-(\d+))?$/);
        const v1 = m ? m[2] : '?', v2 = m ? (m[3]||m[2]) : '?';
        const titleText = p.title || p.ref;

        const sum = document.createElement('summary');
        sum.innerHTML = `
          <span class="vrange">(${v1}-${v2})</span>
          <span class="ptitle"
                data-book="${bookName}"
                data-ch="${chap}"
                data-idx="${idx}"
                title="제목을 더블클릭하면 편집할 수 있습니다">${escapeHtml(titleText)}</span>
        `;

        const titleEl = sum.querySelector('.ptitle');

        titleEl.addEventListener('dblclick', (e)=>{
          e.preventDefault(); e.stopPropagation();
          detPara.open = true;
          startInlineTitleEdit(titleEl, bookName, chap, idx);
        }, true);

        function guardSummary(ev){
          const isEditing = titleEl.isContentEditable;
          const dblOnTitle = (ev.type === 'dblclick' && ev.target === titleEl);
          if (isEditing || dblOnTitle){
            ev.preventDefault();
            ev.stopPropagation();
          }
        }
        ['pointerdown','mousedown','click','dblclick'].forEach(type=>{
          sum.addEventListener(type, guardSummary, true);
        });

        detPara.appendChild(sum);

        const body = document.createElement('div');
        body.className = 'pbody';
        body.innerHTML = `
          <div class="ptoolbar">
            <button class="primary speakBtn">낭독</button>
            <label class="chip"><input type="checkbox" class="keepReading" style="margin-right:6px">계속 낭독</label>
            <button class="ctxBtn btnSummary">내용흐름</button>
            <button class="ctxBtn btnUnitCtx">단위성경속 맥락</button>
            <button class="ctxBtn btnWholeCtx">전체성경속 맥락</button>
            <button class="ctxBtn btnCommentary">주석</button>
            <button class="sermBtn">설교</button>
            <div class="spacer"></div>
          </div>
          <div class="pcontent"></div>`;

        // [PATCH 1 START] 설교 버튼 생성/가시성만 보강 (클릭 바인딩 없음)
        (function ensureSermonBtn(){
          const tb = body.querySelector('.ptoolbar');
          if (!tb) return;

          if (!tb.querySelector('.spacer')) {
            const sp = document.createElement('div');
            sp.className = 'spacer';
            tb.appendChild(sp);
          }
          let sermBtn = tb.querySelector('.sermBtn');
          if (!sermBtn) {
            sermBtn = document.createElement('button');
            sermBtn.className = 'sermBtn';
            sermBtn.textContent = '설교';
            tb.appendChild(sermBtn);
          }
        })();
        // [PATCH 1 END]

        detPara.appendChild(body);

        const pcontent = body.querySelector('.pcontent');
        (p.verses||[]).forEach(([v,t])=>{
          const line = document.createElement('div');
          line.className = 'pline';
          line.dataset.verse = v;
          line.innerHTML = `<sup class="pv">${v}</sup>${t}`;
          pcontent.appendChild(line);
        });

        detPara.addEventListener('toggle', ()=>{
          if(detPara.open){
            CURRENT.book = bookName; CURRENT.chap = chap; CURRENT.paraIdx = idx;
            const para = BIBLE.books[bookName][chap].paras[idx];
            CURRENT.paraId = `${bookName}|${chap}|${para.ref}`;
            status(`선택됨: ${bookName} ${chap}장 · ${para.title||para.ref}`);
            // 열릴 때 설교 버튼 누락 시 즉시 생성 (클릭 바인딩 없음)
            const tb = detPara.querySelector('.ptoolbar');
            if (tb && !tb.querySelector('.sermBtn')) {
              const btn = document.createElement('button');
              btn.className = 'sermBtn';
              btn.textContent = '설교';
              tb.appendChild(btn);
            }
          }
        });

        body.querySelector('.speakBtn').addEventListener('click', ()=>{
          toggleSpeakInline(bookName, chap, idx, detPara, body.querySelector('.speakBtn'));
        });

        // 컨텍스트 에디터 버튼들
        body.querySelector('.btnUnitCtx').addEventListener('click', ()=>{ CURRENT.book=bookName; CURRENT.chap=chap; CURRENT.paraIdx=idx; openSingleDocEditor('unit'); }); // 단위성경속 편집기 호출
        body.querySelector('.btnWholeCtx').addEventListener('click',()=>{ CURRENT.book=bookName; CURRENT.chap=chap; CURRENT.paraIdx=idx; openSingleDocEditor('whole'); }); // 전체성경속 편집기 호출
        body.querySelector('.btnCommentary').addEventListener('click',()=>{ CURRENT.book=bookName; CURRENT.chap=chap; CURRENT.paraIdx=idx; openSingleDocEditor('commentary'); }); // 주석 편집기 호출
        body.querySelector('.btnSummary').addEventListener('click',   ()=>{ CURRENT.book=bookName; CURRENT.chap=chap; CURRENT.paraIdx=idx; openSingleDocEditor('summary'); }); // 내용흐름 편집기 호출

        parWrap.appendChild(detPara);
      });

      detChap.appendChild(parWrap);
      chWrap.appendChild(detChap);
    }

    detBook.appendChild(chWrap);
    treeEl.appendChild(detBook);
  }
    // ✅ 바로 여기에 한 줄 추가합니다 👇👇👇
  document.dispatchEvent(new CustomEvent('wbp:treeBuilt'));
}

// [PATCH 2 START] 렌더 후에도 설교 버튼 누락 시 자동 보정(클릭 바인딩 없음)
(function sermonBtnWatcher(){
  const root = document.getElementById('tree');
  if (!root) return;

  function fix(tb){
    if (!tb.querySelector('.spacer')) {
      const sp = document.createElement('div');
      sp.className = 'spacer';
      tb.insertBefore(sp, tb.firstChild);
    }
    if (!tb.querySelector('.sermBtn')) {
      const b = document.createElement('button');
      b.className = 'sermBtn';
      b.textContent = '설교';
      tb.appendChild(b);
    }
  }

  function sweep(){
    root.querySelectorAll('details.para .ptoolbar').forEach(fix);
  }

  sweep();
  new MutationObserver(sweep).observe(root, {subtree:true, childList:true});
})();
// [PATCH 2 END]

/* ✅ 트리 렌더 후 설교 버튼이 누락됐을 때 자동 보강(클릭 바인딩 없음) */
function ensureSermonButtons(){
  document.querySelectorAll('#tree details.para .ptoolbar').forEach(tb=>{
    if (tb.querySelector('.sermBtn')) return;

    let spacer = tb.querySelector('.spacer');
    if (!spacer) {
      spacer = document.createElement('div');
      spacer.className = 'spacer';
      tb.appendChild(spacer);
    }

    const btn = document.createElement('button');
    btn.className = 'sermBtn';
    btn.textContent = '설교';
    tb.appendChild(btn);
  });
}

/* 🔧 트리 위임 클릭 공용 처리 (유일한 클릭 바인딩) */
treeEl.addEventListener('click', (e)=>{
  const isCtxBtn = e.target.closest('.btnSummary, .btnUnitCtx, .btnWholeCtx, .btnCommentary, .sermBtn');
  if (!isCtxBtn) return;

  const paraEl = e.target.closest('details.para');
  const t = paraEl?.querySelector('summary .ptitle');
  if (!paraEl || !t) return;

  CURRENT.book   = t.dataset.book;
  CURRENT.chap   = parseInt(t.dataset.ch, 10);
  CURRENT.paraIdx= parseInt(t.dataset.idx, 10);
  const para = BIBLE?.books?.[CURRENT.book]?.[CURRENT.chap]?.paras?.[CURRENT.paraIdx];
  if (!para) return;
  CURRENT.paraId = `${CURRENT.book}|${CURRENT.chap}|${para.ref}`;

  if (e.target.closest('.btnSummary'))    { openSingleDocEditor('summary');    return; }
  if (e.target.closest('.btnUnitCtx'))    { openSingleDocEditor('unit');       return; }
  if (e.target.closest('.btnWholeCtx'))   { openSingleDocEditor('whole');      return; }
  if (e.target.closest('.btnCommentary')) { openSingleDocEditor('commentary'); return; }
  if (e.target.closest('.sermBtn'))       { openSermonModal();                 return; }

  // === [BOOK-CHIP → '내용흐름' 편집기 동일 사용] =========================
  const chip = e.target.closest('.book-chip[data-type="basic"], .book-chip[data-type="structure"], .book-chip[data-type="summary"]');
  if (chip) {
    e.preventDefault();
    e.stopPropagation();

    // 2개 이상 책 오픈 시 제한
    const openedBooks = [...document.querySelectorAll('#tree details.book[open]')];
    if (openedBooks.length > 1) {
      alert('2개 이상 성경이 열려 있습니다. 한 권만 연 다음 다시 시도하세요.');
      return;
    }

    // 대상 책: 열려있는 책 1개 또는 첫 책
    const bookEl = openedBooks[0] || document.querySelector('#tree > details.book');
    if (!bookEl) return;

    // 이 책의 1장 / 첫 단락
    const ch1 = bookEl.querySelector(':scope > .chapters > details') || bookEl.querySelector('details');
    const p1  = ch1?.querySelector(':scope > .paras > details.para') || ch1?.querySelector('details.para');
    if (!p1) return;

    // '내용흐름' 트리거 버튼 탐색
    const flowBtn =
      p1.querySelector('.ptoolbar [data-action="flow"]') ||
      p1.querySelector('.ptoolbar .btn-flow') ||
      [...(p1.querySelectorAll('.ptoolbar button')||[])].find(b => (b.textContent||'').trim() === '내용흐름');

    if (!flowBtn) return;

    // 내용흐름 편집기를 그대로 호출
    flowBtn.click();

    // 에디터 타이틀을 칩 라벨로 교체 (스타일/기능은 내용흐름 그대로)
    const label = (chip.textContent||'').trim();
    setTimeout(()=>{
      const dlg =
        document.querySelector('.flow-editor-modal') ||
        document.querySelector('.editor-modal') ||
        document.querySelector('.wbp-editor') ||
        document.querySelector('.modal');
      const titleEl =
        dlg?.querySelector('.modal-title') ||
        dlg?.querySelector('.editor-title') ||
        dlg?.querySelector('.title');
      if (titleEl) titleEl.textContent = label;
    }, 0);

    return;
  }
  // ======================================================================


});

/* --------- Inline TTS --------- */
function buildQueueFrom(book, chap, idx){
  const para = BIBLE.books[book][chap].paras[idx];
  return (para.verses||[]).map(([v,t])=>({verse:v, text:t}));
}
function clearReadingHighlight(scope){ [...scope.querySelectorAll('.pline')].forEach(el=> el.classList.remove('reading')); }
function bindKeepReading(scope){
  const cb = scope.querySelector('.keepReading');
  if(!cb) return;
  cb.checked  = READER.continuous;
  cb.disabled = false;
  cb.onchange = ()=>{ READER.continuous = cb.checked; };
}
function speakVerseItemInScope(item, scope, onend){
  if(!READER.synth) return;
  const u = new SpeechSynthesisUtterance(String(item.text));
  applyVoice(u);
  let done = false;
  const safeEnd = ()=>{ if(done) return; done = true; onend(); };
  u.onstart = ()=>{
    clearReadingHighlight(scope);
    const line = scope.querySelector(`.pline[data-verse="${item.verse}"]`);
    if(line){ line.classList.add('reading'); line.scrollIntoView({block:'center', behavior:'smooth'}); }
    if (READER._wd){ clearTimeout(READER._wd); READER._wd = null; }
    const base = Math.max(800, Math.round(item.text.length * 65));
    const rate = u.rate || 1;
    const estimate = Math.max(600, Math.round(base / rate)) + 1200;
    READER._wd = setTimeout(safeEnd, estimate);
  };
  u.onend   = safeEnd;
  u.onerror = safeEnd;
  READER.synth.speak(u);
}
function toggleSpeakInline(book, chap, idx, paraDetailsEl, btnEl){
  if(!READER.synth) return alert('이 브라우저는 음성합성을 지원하지 않습니다.');
  const sameScope = READER.playing && READER.scope === paraDetailsEl;
  if(READER.playing && sameScope){ stopSpeakInline(); return; }
  READER.continuous = true;
  READER.q = buildQueueFrom(book, chap, idx);
  READER.idx = 0;
  READER.playing = true;
  READER.scope = paraDetailsEl;
  READER.btn = btnEl;
  try{ READER.synth.cancel(); }catch(e){}
  bindKeepReading(READER.scope);
  updateInlineSpeakBtn();
  playNextInQueueInline(book, chap, idx);
}
function playNextInQueueInline(book, chap, idx){
  if(!READER.playing) return;
  if(READER.idx >= READER.q.length){
    if(READER.continuous && goToNextParagraphInline(book, chap, idx)){
      const nextCb = READER.scope?.querySelector?.('.keepReading');
      if(nextCb){ nextCb.checked = READER.continuous; nextCb.disabled = false; }
      READER.q = buildQueueFrom(CURRENT.book, CURRENT.chap, CURRENT.paraIdx);
      READER.idx = 0;
      bindKeepReading(READER.scope);
      updateInlineSpeakBtn();
      setTimeout(()=>{ try{ READER.synth.cancel(); }catch(e){} playNextInQueueInline(CURRENT.book, CURRENT.chap, CURRENT.paraIdx); }, 120);
      return;
    }
    stopSpeakInline();
    return;
  }
  const item = READER.q[READER.idx];
  speakVerseItemInScope(item, READER.scope, ()=>{ READER.idx++; playNextInQueueInline(book, chap, idx); });
}
function stopSpeakInline(){
  READER.playing = false;
  try{ READER.synth && READER.synth.cancel(); }catch(e){}
  if (READER._wd){ clearTimeout(READER._wd); READER._wd = null; }
  if(READER.scope){
    const cb = READER.scope.querySelector?.('.keepReading');
    if(cb) cb.disabled = false;
    clearReadingHighlight(READER.scope);
  }
  updateInlineSpeakBtn();
  READER.scope = null; READER.btn = null;
}
function updateInlineSpeakBtn(){ if(READER.btn) READER.btn.textContent = READER.playing ? '중지' : '낭독'; }

function goToNextParagraphInline(book, chap, idx){
  const chObj = BIBLE.books[book][chap];
  const booksEls = [...treeEl.children];

  const bookNames = Object.keys(BIBLE.books);
  const bIdx = bookNames.indexOf(book);
  const bookEl = booksEls[bIdx];
  if(!bookEl) return false;

  const chaptersEls = bookEl.querySelectorAll(':scope > .chapters > details');
  const chapNums = Object.keys(BIBLE.books[book]).map(n=>parseInt(n,10)).sort((a,b)=>a-b);

  const chPos = chapNums.indexOf(chap);
  const chapEl = chaptersEls[chPos];
  if(!chapEl) return false;

  const paraEls = chapEl.querySelectorAll(':scope > .paras > details.para');

  if (READER.btn) READER.btn.textContent = '낭독';

  if (idx < chObj.paras.length - 1){
    const nextEl = paraEls[idx + 1];
    if(nextEl){
      chapEl.open = true;
      nextEl.open = true;
      CURRENT.book = book;
      CURRENT.chap = chap;
      CURRENT.paraIdx = idx + 1;
      READER.scope = nextEl;
      READER.btn = nextEl.querySelector('.speakBtn');
      if (READER.btn) READER.btn.textContent = READER.playing ? '중지' : '낭독';
      return true;
    }
  }

  if (chPos >= 0 && chPos < chapNums.length - 1){
    const nextChap = chapNums[chPos + 1];
    const nextChapEl = chaptersEls[chPos + 1];
    if(nextChapEl){
      const nextParas = (BIBLE.books[book][nextChap].paras || []);
      if(nextParas.length){
        const nextParaEl = nextChapEl.querySelector(':scope > .paras > details.para');
        nextChapEl.open = true;
        if(nextParaEl) nextParaEl.open = true;

        CURRENT.book = book;
        CURRENT.chap = nextChap;
        CURRENT.paraIdx = 0;

        READER.scope = nextParaEl;
        READER.btn = nextParaEl?.querySelector('.speakBtn') || null;
        if (READER.btn) READER.btn.textContent = READER.playing ? '중지' : '낭독';
        return true;
      }
    }
  }

  const bPos = bIdx;
  if (bPos >= 0 && bPos < bookNames.length - 1){
    const nextBook = bookNames[bPos + 1];
    const nextBookEl = booksEls[bPos + 1];
    if(nextBookEl){
      const firstChap = Math.min(...Object.keys(BIBLE.books[nextBook]).map(n=>parseInt(n,10)));
      const nextChapEl = nextBookEl.querySelector(':scope > .chapters > details');
      const nextParaEl = nextChapEl?.querySelector(':scope > .paras > details.para');
      if(nextParaEl){
        nextBookEl.open = true;
        nextChapEl.open = true;
        nextParaEl.open = true;

        CURRENT.book = nextBook;
        CURRENT.chap = firstChap;
        CURRENT.paraIdx = 0;

        READER.scope = nextParaEl;
        READER.btn = nextParaEl.querySelector('.speakBtn');
        if (READER.btn) READER.btn.textContent = READER.playing ? '중지' : '낭독';
        return true;
      }
    }
  }
  return false;
}

/* --------- Sermon / Context Editors --------- */
function getSermonMap(){ try{ return JSON.parse(localStorage.getItem(STORAGE_SERMON)||'{}'); }catch{ return {}; } }
function setSermonMap(o){ localStorage.setItem(STORAGE_SERMON, JSON.stringify(o)); }
function getDocMap(storageKey){ try{ return JSON.parse(localStorage.getItem(storageKey)||'{}'); }catch{ return {}; } }
function setDocMap(storageKey, obj){ localStorage.setItem(storageKey, JSON.stringify(obj)); }

/* ✅ 최초 클릭 시에도 동작하도록 보강 + 중복편집기 제거 전제 */
function openSermonModal(){
  if (!CURRENT.book || !Number.isFinite(CURRENT.chap) || !Number.isFinite(CURRENT.paraIdx)) {
    if (!syncCurrentFromOpen()) {
      alert('단락을 먼저 선택해 주세요.');
      return;
    }
  }

  const para = BIBLE?.books?.[CURRENT.book]?.[CURRENT.chap]?.paras?.[CURRENT.paraIdx];
  if (!para) {
    alert('선택한 단락을 찾을 수 없습니다.');
    return;
  }
  CURRENT.paraId = `${CURRENT.book}|${CURRENT.chap}|${para.ref}`;

  document.getElementById('modalTitle').textContent = '단락 성경';
  sermonEditor.dataset.ctxType = '';
  sermonEditor.dataset.editing = '';
  modalRef.textContent = `${CURRENT.book} ${CURRENT.chap}장 · ${para.title || para.ref} (${para.ref})`;

  sermonList.innerHTML = '';
  sermonEditor.style.display = 'none';
  sermonEditor.classList.add('context-editor');
  modalWrap.style.display = 'flex';
  modalWrap.setAttribute('aria-hidden','false');
  modalFooterNew.style.display = '';

  renderSermonList();
}
el('closeModal').onclick = ()=>{ modalWrap.style.display='none'; modalWrap.setAttribute('aria-hidden','true'); stopEditorSpeak(true); };

function openSingleDocEditor(kind){
  if (!CURRENT.book || !Number.isFinite(CURRENT.chap) || !Number.isFinite(CURRENT.paraIdx)) {
    if (!syncCurrentFromOpen()) { alert('단락을 먼저 선택해 주세요.'); return; }
  }
  if (!BIBLE) { alert('성경 데이터가 로드되지 않았습니다.'); return; }

  const para = BIBLE.books[CURRENT.book][CURRENT.chap].paras[CURRENT.paraIdx];
  const pid  = `${CURRENT.book}|${CURRENT.chap}|${para.ref}`;

  const titlePrefix =
    kind==='unit'       ? '단위성경속 맥락' :
    kind==='whole'      ? '전체성경속 맥락' :
    kind==='commentary' ? '주석' :
                           '내용요약';

  const key =
    kind==='unit'       ? STORAGE_UNIT_CTX :
    kind==='whole'      ? STORAGE_WHOLE_CTX :
    kind==='commentary' ? STORAGE_COMMENTARY :
                           STORAGE_SUMMARY;

  const map = getDocMap(key);
  const doc = map[pid] || {
    body:  (kind==='summary' ? '핵심 내용을 간결하게 요약해 적어주세요.' : ''),
    images: [], date:''
  };
  modalRef.textContent = `${CURRENT.book} ${CURRENT.chap}장 · ${para.title||para.ref} (${para.ref}) — ${titlePrefix}`;
  sermonList.innerHTML = '';
  sermonEditor.style.display = '';
  sermonEditor.classList.add('context-editor');
  modalWrap.style.display = 'flex';
  modalWrap.setAttribute('aria-hidden','false');
  modalFooterNew.style.display = 'none';

  sermonTitle.value = doc.title || '';
  setBodyHTML(doc.body || '');

  sermonEditor.dataset.editing = '';
  sermonEditor.dataset.ctxType = kind;

  const aiBtn = document.getElementById('aiFill');
  if (aiBtn) {
    aiBtn.style.display = (kind === 'unit') ? '' : 'none';
    aiBtn.onclick = null;
    if (kind === 'unit') {
      aiBtn.onclick = async ()=>{ /* 선택: AI 핸들러 */ };
    }
  }
}

function openBookDocEditor(mode, book){
  if (!book) {
    alert('책 정보를 찾을 수 없습니다. 다시 시도해 주세요.');
    return;
  }

  const titlePrefix =
    mode === 'basic'   ? '기본이해' :
    mode === 'struct'  ? '내용구조' :
                         '메세지요약';

  const key =
    mode === 'basic'   ? STORAGE_BOOK_BASIC :
    mode === 'struct'  ? STORAGE_BOOK_STRUCT :
                         STORAGE_BOOK_SUMMARY;

  const map = getDocMap(key);
  const doc = map[book] || {
    title: '',
    body:
      mode === 'basic'
        ? '이 책의 역사적·배경적·신학적 기본 이해를 정리해 주세요.'
      : mode === 'struct'
        ? '이 책의 큰 구조(단락 흐름, 핵심 주제)를 정리해 주세요.'
        : '이 책의 핵심 메시지와 적용 포인트를 간결하게 요약해 주세요.',
    images: [],
    date: ''
  };

  // 🔹 모달/에디터 UI 세팅 (내용흐름 에디터와 동일한 스타일)
  modalRef.textContent = `${book} — ${titlePrefix}`;
  sermonList.innerHTML = '';
  sermonEditor.style.display = '';
  sermonEditor.classList.add('context-editor');
  modalWrap.style.display = 'flex';
  modalWrap.setAttribute('aria-hidden','false');
  modalFooterNew.style.display = 'none';

  sermonTitle.value = doc.title || '';
  setBodyHTML(doc.body || '');

  // 🔹 저장 구분용 메타데이터
  sermonEditor.dataset.editing = '';
  sermonEditor.dataset.ctxType  = `book-${mode}`; // book-basic / book-struct / book-summary
  sermonEditor.dataset.bookName = book;

  // 🔹 AI 버튼은 책 단위에서는 사용 안 함
  const aiBtn = document.getElementById('aiFill');
  if (aiBtn) {
    aiBtn.style.display = 'none';
    aiBtn.onclick = null;
  }
}

/* ✅ 설교목록 렌더링 (제목 → 날짜 → 링크 → 편집 → 삭제 순서) */
function renderSermonList(){
  const map = getSermonMap();
  const arr = map[CURRENT.paraId] || [];
  sermonList.innerHTML = '';

  if(arr.length===0){
    startNewSermon();
    return;
  }

  arr.forEach((it, idx)=>{
    const row = document.createElement('div');
    row.className = 'item'; // 필요시 레이아웃용 CSS를 추가할 수 있어요.

    // 1) 제목
    const colTitle = document.createElement('div');
    colTitle.className = 'col col-title';
    colTitle.textContent = (it.title || '(제목 없음)');

    // 2) 작성날짜
    const colDate = document.createElement('div');
    colDate.className = 'col col-date';
    colDate.textContent = (it.date || '');

    // 3) 링크 (입력 + 미리보기 앵커)
    const colLink = document.createElement('div');
    colLink.className = 'col col-link';

    const linkInput = document.createElement('input');
    linkInput.type = 'url';
    linkInput.placeholder = '링크(URL)';
    linkInput.value = it.link || '';
    linkInput.style.minWidth = '220px';

    const linkAnchor = document.createElement('a');
    linkAnchor.textContent = it.link ? it.link : '';
    if (it.link) {
      linkAnchor.href = it.link;
      linkAnchor.target = '_blank';
      linkAnchor.rel = 'noopener noreferrer';
    } else {
      linkAnchor.style.display = 'none';
    }

    linkInput.addEventListener('change', ()=>{
      const url = linkInput.value.trim();
      const m = getSermonMap();
      const a = m[CURRENT.paraId] || [];
      if (a[idx]) {
        a[idx].link = url;
        setSermonMap(m);
      }
      if (url){
        linkAnchor.href = url;
        linkAnchor.textContent = url;
        linkAnchor.style.display = '';
        linkAnchor.target = '_blank';
        linkAnchor.rel = 'noopener noreferrer';
      } else {
        linkAnchor.removeAttribute('href');
        linkAnchor.textContent = '';
        linkAnchor.style.display = 'none';
      }
    });

    colLink.appendChild(linkInput);
    colLink.appendChild(linkAnchor);

    // 4) 편집 버튼 설교목록화면에서 편집버튼 
    const btnEdit = document.createElement('button');
    btnEdit.textContent = '편집';
    btnEdit.addEventListener('click', ()=>{
      modalWrap.style.display = 'none';
      modalWrap.setAttribute('aria-hidden','true');  // 편집버튼을 누른 후, 나오는 편집기 호출
      openSermonEditorWindow(idx);
    });

    /*
    const btnEdit = document.createElement('button');
    btnEdit.textContent = '편집';
    btnEdit.addEventListener('click', ()=>{ 
      // 🔹 이제 팝업 편집기가 아니라 "새 설교"와 같은 모달 편집기를 사용
      openInlineSermonEditor(idx);
    });
    */

    // 5) 삭제 버튼
    const btnDel = document.createElement('button');
    btnDel.textContent = '삭제';
    btnDel.style.borderColor = 'var(--danger)';
    btnDel.addEventListener('click', ()=>{
      if(!confirm('이 설교를 삭제할까요?')) return;
      const m = getSermonMap();
      const a = m[CURRENT.paraId] || [];
      a.splice(idx,1);
      m[CURRENT.paraId] = a;
      setSermonMap(m);
      renderSermonList();
    });

    const colActions = document.createElement('div');
    colActions.className = 'col col-actions';
    colActions.appendChild(btnEdit);
    colActions.appendChild(btnDel);

    // 👉 순서대로 추가: 제목 → 날짜 → 링크 → 편집/삭제
    row.appendChild(colTitle);
    row.appendChild(colDate);
    row.appendChild(colLink);
    row.appendChild(colActions);

    sermonList.appendChild(row);
  });
}

/* 새 설교 */
el('newSermonBtn').onclick = ()=>{
  sermonEditor.dataset.ctxType = '';
  if (!CURRENT.paraId) {
    if (!syncCurrentFromOpen()) { alert('단락을 먼저 선택하세요.'); return; }
    const para = BIBLE.books[CURRENT.book][CURRENT.chap].paras[CURRENT.paraIdx];
    CURRENT.paraId = `${CURRENT.book}|${CURRENT.chap}|${para.ref}`;
  }
  const map = getSermonMap();
  const arr = map[CURRENT.paraId] || [];
  const newId = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
  arr.unshift({ id: newId, title:'', body:'', images:[], date:'', link:'' });
  map[CURRENT.paraId] = arr;
  setSermonMap(map);

  modalWrap.style.display='none';
  modalWrap.setAttribute('aria-hidden','true');
  openSermonEditorWindow(0);
};

function startNewSermon(){
  sermonList.innerHTML = '<div class="muted" style="padding:0 14px">새 설교를 작성해 저장하면 이 단락에 붙습니다.</div>';
  sermonEditor.classList.add('context-editor');
  sermonEditor.style.display = '';
  sermonTitle.value = '';
  setBodyHTML('');
  sermonEditor.dataset.editing = '';
  stopEditorSpeak(true);
}
function deleteSermon(idx){
  if(!confirm('이 설교를 삭제할까요?')) return;
  const map = getSermonMap(); const arr = map[CURRENT.paraId] || [];
  arr.splice(idx,1); map[CURRENT.paraId] = arr; setSermonMap(map); renderSermonList();
}

el('cancelEdit')?.addEventListener('click', ()=>{
  if(sermonEditor.dataset.ctxType){
    sermonEditor.dataset.ctxType = '';
    modalWrap.style.display = 'none'; 
    modalWrap.setAttribute('aria-hidden','true');
  }else{
    sermonEditor.style.display = 'none'; renderSermonList();
  }
  stopEditorSpeak(true);
});

el('saveSermon').onclick = ()=>{
  const title = (sermonTitle.value||'').trim() || '(제목 없음)';
  let body = getBodyHTML() || '';
  body = body.replace(/^\s+|\s+$/g, '');

  const imgs  = [];
  const now   = new Date();
  const date  = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

  const para  = BIBLE.books[CURRENT.book][CURRENT.chap].paras[CURRENT.paraIdx];
  const pid   = `${CURRENT.book}|${CURRENT.chap}|${para.ref}`;
  const ctxType = sermonEditor.dataset.ctxType || '';

  if(ctxType){
    const key = ctxType==='unit'       ? STORAGE_UNIT_CTX
              : ctxType==='whole'      ? STORAGE_WHOLE_CTX
              : ctxType==='commentary' ? STORAGE_COMMENTARY
              :                          STORAGE_SUMMARY;
    const map = getDocMap(key);
    map[pid] = { title, body, images: imgs, date };
    setDocMap(key, map);

    sermonEditor.dataset.ctxType = '';
    sermonEditor.classList.remove('context-editor');
    modalWrap.style.display = 'none';
    modalWrap.setAttribute('aria-hidden','true');
    status(`저장됨: ${title}`);
    return;
  }

  const map = getSermonMap();
  const arr = map[CURRENT.paraId] || [];
  const editing = sermonEditor.dataset.editing;
  if(editing!==''){ const i=+editing; if(arr[i]) arr[i] = {...arr[i], title, body, images:imgs, date}; }
  else { arr.unshift({ id: crypto.randomUUID(), title, body, images: imgs, date, link:'' }); }
  map[CURRENT.paraId] = arr; setSermonMap(map);
  sermonEditor.style.display = 'none'; renderSermonList(); status('설교가 저장되었습니다.');
};

/* ===== RTE 유틸 ===== */
function isRTE(){ return sermonBody && sermonBody.getAttribute('contenteditable') === 'true'; }
function getBodyHTML(){ return isRTE() ? sermonBody.innerHTML : (sermonBody.value || ''); }
function setBodyHTML(html){ if(isRTE()) sermonBody.innerHTML = html || ''; else sermonBody.value = html || ''; }

function applyColorImmediateToRTE(hex){
  if(!isRTE()) return;
  const sel = window.getSelection();
  if(!sel || sel.rangeCount===0){ sermonBody.focus(); return; }
  const range = sel.getRangeAt(0);
  if(!sermonBody.contains(range.commonAncestorContainer)){ sermonBody.focus(); return; }

  if(range.collapsed){
    const sp = document.createElement('span');
    sp.style.color = hex;
    sp.appendChild(document.createTextNode('\u200B'));
    range.insertNode(sp);
    sel.removeAllRanges();
    const r = document.createRange();
    r.setStart(sp.firstChild, 1); r.collapse(true);
    sel.addRange(r);
    return;
  }
  document.execCommand('foreColor', false, hex);
}
function execFmt(cmd){
  if(isRTE()){
    sermonBody.focus({preventScroll:true});
    document.execCommand(cmd,false,null);
  }
}

/* --------- Editor TTS --------- */
editorSpeakBtn.onclick = ()=> toggleEditorSpeak();
function toggleEditorSpeak(){
  const tmp = document.createElement('div'); tmp.innerHTML = getBodyHTML();
  tmp.querySelectorAll('sup').forEach(s=> s.textContent='['+s.textContent+'] ');
  const plain = (tmp.textContent||'').replace(/\n{2,}/g,' ').replace(/\s+/g,' ').trim();
  const text = [sermonTitle.value.trim(), plain].filter(Boolean).join('. ');
  if(!EDITOR_READER.synth) return alert('이 브라우저는 음성합성을 지원하지 않습니다.');
  if(EDITOR_READER.playing){ stopEditorSpeak(); return; }

  if(!text){ alert('낭독할 내용이 없습니다.'); return; }
  const u = new SpeechSynthesisUtterance(text.replace(/\n{2,}/g, '. ').replace(/\n/g,' '));
  applyVoice(u); u.onend = ()=> stopEditorSpeak(true);
  EDITOR_READER.u = u; EDITOR_READER.synth.cancel(); EDITOR_READER.synth.speak(u);
  EDITOR_READER.playing = true; editorSpeakBtn.textContent = '중지';
}
function stopEditorSpeak(silent){
  if(EDITOR_READER.synth){ try{ EDITOR_READER.synth.cancel(); }catch(e){} }
  EDITOR_READER.playing = false; EDITOR_READER.u = null;
  if(!silent) status('설교 낭독을 중지했습니다.'); editorSpeakBtn.textContent = '낭독';
}

/* --------- Hotkeys --------- */
window.addEventListener('keydown', (e)=>{
  if(e.ctrlKey && e.shiftKey && e.key.toLowerCase()==='s'){
    e.preventDefault();
    downloadBibleJSON();
    return;
  }
  if(e.target && ['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
  const key = e.key.toLowerCase();
  if(key === 's'){
    e.preventDefault();
    syncCurrentFromOpen();
    const openPara = treeEl.querySelector('details.para[open]');
    if(openPara && CURRENT.book!=null){
      const btn = openPara.querySelector('.speakBtn');
      toggleSpeakInline(CURRENT.book, CURRENT.chap, CURRENT.paraIdx, openPara, btn);
    }
    return;
  }
  if(key === 'n'){
    e.preventDefault();
    if(!syncCurrentFromOpen()) return;
    const wasPlaying = !!READER.playing;
    try{ READER.synth && READER.synth.cancel(); }catch(_){}
    if (READER._wd){ clearTimeout(READER._wd); READER._wd = null; }
    READER.playing = wasPlaying;
    const moved = goToNextParagraphInline(CURRENT.book, CURRENT.chap, CURRENT.paraIdx);
    if(!moved) return;
    if (wasPlaying){
      const cb = READER.scope?.querySelector?.('.keepReading');
      if(cb){ cb.checked = READER.continuous; cb.disabled = false; }
      READER.q   = buildQueueFrom(CURRENT.book, CURRENT.chap, CURRENT.paraIdx);
      READER.idx = 0;
      bindKeepReading(READER.scope);
      updateInlineSpeakBtn();
      setTimeout(()=>{ try{ READER.synth && READER.synth.cancel(); }catch(_){}
        playNextInQueueInline(CURRENT.book, CURRENT.chap, CURRENT.paraIdx);
      }, 120);
    }
  }
});

/* === 팝업 편집기 (스크립트 분리 버전) === */
function openSermonEditorWindow(idx){
  const map = getSermonMap();
  const arr = map[CURRENT.paraId] || [];
  const it  = arr[idx];
  if(!it){ alert('편집할 설교를 찾을 수 없습니다.'); return; }

  const para = BIBLE.books[CURRENT.book][CURRENT.chap].paras[CURRENT.paraIdx];
  const versesRaw = Array.isArray(para?.verses) ? para.verses : [];

  const meta = {
    paraId: CURRENT.paraId,
    idx,
    ref: `${CURRENT.book} ${CURRENT.chap}장 · ${(para?.title || para?.ref || '')} (${para?.ref || ''})`,
    title: it.title || '',
    body:  it.body  || '',
    date:  it.date || '',
    verses: versesRaw
  };

  const w = window.open('', '_blank', 'width=1100,height=820');
  if(!w){ alert('팝업이 차단되었습니다. 브라우저 팝업을 허용해주세요.'); return; }
  w.__WBPS_META__ = meta;
  if (w.opener && w.opener.firebase) { w.firebase = w.opener.firebase; }

  let popupHTML = String.raw`<!DOCTYPE html><html lang="ko">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>설교 편집</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;600&family=Nanum+Myeongjo&display=swap" rel="stylesheet">
<style>
:root{--bg:#0f1115;--panel:#161922;--text:#e6e8ef;--muted:#9aa0ab;--border:#252a36;--accent:#6ea8fe;--danger:#ff6b6b}
*{box-sizing:border-box}html,body{height:100%}
body{margin:0;background:var(--bg);color:var(--text);display:grid;grid-template-rows:56px 1fr 56px;gap:8px}
header,footer{display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--panel);border-bottom:1px solid var(--border)}
footer{border-top:1px solid var(--border);border-bottom:none}
.grow{flex:1 1 auto}
main{padding:0 12px 12px}

input[type="text"].title-input{
  width: min(90%, 720px);
  background:#161922;color:#e6e8ef;border:1px solid #2a3040;border-radius:8px;
  padding:10px 12px;font-weight:700;font-size:1.14rem;line-height:1.4;letter-spacing:.01em;
}

button{background:color-mix(in hsl,var(--panel) 65%,black 10%);color:var(--text);
border:1px solid var(--border);border-radius:10px;padding:6px 10px;cursor:pointer;transition:border-color .15s,transform .04s}
button:hover{border-color:color-mix(in hsl,var(--border) 75%,var(--accent) 25%)} button:active{transform:translateY(1px)}
.primary{background:linear-gradient(180deg,color-mix(in srgb,var(--accent) 78%,white 10%),color-mix(in srgb,var(--accent) 72%,black 22%));border-color:color-mix(in srgb,var(--accent) 70%,black 10%)}
.muted{color:var(--muted)}

.context-editor{font-family:"Noto Serif KR","Nanum Myeong고",serif;font-size:1.05rem;line-height:1.85;letter-spacing:.02em;word-break:keep-all}

.notion-header{display:flex;align-items:center;gap:8px;margin-top:8px}
.notion-header .title{flex:1 1 auto;background:#161922;color:#e6e8ef;border:1px solid #2a3040;border-radius:8px;padding:10px 12px;font-weight:700}
.notion-header .meta{display:flex;gap:8px;align-items:center}
.notion-badge{font-size:11px;color:#9aa0ab}

#editorRoot{max-width:880px;margin:12px auto 8px;padding:0 6px}
.editor-block{position:relative;display:flex;gap:10px;padding:2px 0}
.editor-block .handle{user-select:none;cursor:grab;opacity:.5;padding:2px 0 0 0}
.editor-block .content{flex:1;outline:none;white-space:pre-wrap}
.editor-block[data-type="h1"] .content{font-size:28px;font-weight:800}
.editor-block[data-type="h2"] .content{font-size:24px;font-weight:800}
.editor-block[data-type="h3"] .content{font-size:20px;font-weight:700}
.editor-block[data-type="quote"]{border-left:3px solid #5a6; padding-left:10px; opacity:.95}
.editor-block[data-type="callout"]{background:#3a3f4e33;border:1px solid #444;border-radius:12px;padding:10px}
.editor-block[data-type="code"] .content{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;background:#0b0d13;border:1px solid #252a36;border-radius:12px;padding:10px}
.editor-block[data-type="todo"] .content{display:flex;gap:8px}
.editor-block[data-type="divider"] .content{border-bottom:1px solid #333;height:1px}
.editor-block[data-type="toggle"] .content summary{cursor:pointer}
.editor-block .progress{position:absolute;left:0;bottom:-2px;height:2px;background:#6ea8fe;opacity:.9;transition:width .05s linear}

.bubble{position:absolute;padding:6px;border:1px solid #333;border-radius:12px;background:#1c1f2a;display:flex;gap:6px}
.bubble.hidden{display:none}
.bubble button{border:1px solid #333;background:#222;color:#eee;border-radius:8px;padding:2px 6px}

.slash{position:fixed;inset:auto auto 0 0;max-height:260px;overflow:auto;background:#1c1f2a;border:1px solid #333;border-radius:12px;min-width:260px;padding:6px}
.slash.hidden{display:none}
.slash .item{padding:6px 8px;border-radius:8px;display:flex;gap:8px;align-items:center}
.slash .item.active,.slash .item:hover{background:#2a2f3d}

.notion-footer{padding:6px 12px;border-top:1px solid #252a36;background:#161922;position:sticky;bottom:0}
#traceLog{font:12px/1.4 ui-monospace,Menlo,Consolas,monospace;max-height:180px;overflow:auto;white-space:pre-wrap}

#floatingBar{
  position: fixed; right: 16px; bottom: 16px; z-index: 50;
  display:flex; gap:8px; align-items:center;
  background: color-mix(in hsl, var(--panel) 85%, black 6%);
  border:1px solid var(--border); border-radius:999px; padding:8px 10px;
  box-shadow: 0 10px 30px rgba(0,0,0,.35);
}
#floatingBar button{ padding:8px 14px; border-radius:999px }

@media print {
  @page { size: A4; margin: 18mm; }
  body{ background:#fff; color:#000; grid-template-rows:0 1fr 0 }
  header, footer, #floatingBar { display:none !important; }
}

/* === 편집기(main) 스크롤 및 겹침 방지 보정 === */
/* body를 3행 그리드(헤더/메인/푸터)로, 메인은 스크롤 가능 */
body{
  display: grid;
  grid-template-rows: 56px 1fr 56px;
  height: 100vh !important;
  overflow: hidden !important;
}

/* main은 스크롤이 가능해야 함 + footer/floatingBar에 가리지 않도록 하단 여백 */
main{
  position: relative;
  z-index: 1;
  overflow-y: auto !important;
  padding-top: 12px;
  padding-bottom: 140px; /* footer 높이 + 여유 */
  height: calc(100vh - 112px) !important; /* 56(header)+56(footer) */
}

/* 편집 영역 자체 여백 확보(아래쪽 충분히 띄워서 겹침 방지) */
#editorRoot{
  position: relative;
  z-index: 1;
  max-width: 880px;
  margin: 12px auto 100px;  /* 아래 여유 */
  padding: 0 8px 80px;      /* 아래 여유 */
  overflow: visible;
}

/* 플로팅 버튼과의 겹침도 최소화(필요 시) */
#floatingBar{
  z-index: 50;
}
html, body { height:auto !important; overflow:auto !important; }
main { height:auto !important; overflow:visible !important; }

/* === 문장 낭독 하이라이트용 읽기 패널 === */
#readPane{
  position: fixed;
  right: 16px;
  top: 64px;
  bottom: 64px;
  width: 420px;
  overflow-y: auto;
  background: color-mix(in hsl, var(--panel) 92%, black 4%);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 12px 14px;
  box-shadow: 0 10px 28px rgba(0,0,0,.35);
  display: none;
}
#readPane .sent{
  display: block;
  line-height: 1.8;
  margin: 4px 0;
  padding: 2px 6px;
  border-radius: 8px;
}
#readPane .sent.reading{
  background: #2b3242;
  outline: 1px solid #3b4b7a;
}
</style>
</head>
<body class="context-editor">
<header>
  <strong>설교 편집</strong><span class="muted" id="ref"></span>
  <div class="grow"></div>
  <button id="x">닫기</button>
</header>

<main>
  <input id="t" class="title-input" type="text" autocomplete="off" placeholder="설교 제목을 입력하세요">
  <div class="notion-header">
    <input id="neTitle" class="title" placeholder="제목을 입력하세요" />
    <div class="meta">
      <button id="nePublish" class="primary">게시</button>
      <button id="neStt">🎙 STT</button>
    </div>
  </div>

  <div id="neBubble" class="bubble hidden">
    <button data-mark="bold"><b>B</b></button>
    <button data-mark="italic"><i>I</i></button>
    <button data-mark="underline"><u>U</u></button>
    <button data-mark="strike"><s>S</s></button>
    <button data-mark="code">` + '\\`code\\`' + `</button>
    <button data-mark="highlight">HL</button>
    <button data-action="link">🔗</button>
    <button data-action="clearFmt">서식제거</button> <!-- 🔹 추가 -->
  </div>

  <div id="neSlash" class="slash hidden"></div>
  <div id="editorRoot" aria-label="Sermon Editor"></div>

  <div id="readPane" aria-label="Reading Sentences"></div>

  <div class="notion-footer">
    <div class="notion-badge" id="neAutosave">자동저장 대기중…</div>
    <details style="margin-top:6px">
      <summary>🎧 Sermon Tracer 로그/타임라인</summary>
      <div id="traceLog"></div>
    </details>
  </div>
</main>

<div id="floatingBar" aria-label="도구 막대">
  <button id="btnInsertBibleFloating" class="primary">성경구절</button>
</div>

<footer>
  <span class="muted" id="date"></span><div class="grow"></div>
  <button id="print">인쇄(A4)</button>
  <button id="read" class="primary">낭독</button>
  <button id="stop">중지</button>
  <button class="danger" id="d">삭제</button>
  <button class="primary" id="s">저장</button>
</footer>
</body>
</html>`;

  // 템플릿 보간 및 </script> 보호
  popupHTML = popupHTML.replaceAll('${', '\\${');
  popupHTML = popupHTML.replaceAll('</script>', '<\\/script>');

  w.document.open();
  w.document.write(popupHTML);
  w.document.close();

  // 팝업 초기화 실행
  initSermonPopup(w);

  // 부모창 메시지 핸들러 (저장/삭제 반영)
  const onMsg = (ev) => {
    const data = ev?.data || {};
    if (!data.type) return;

    const map2 = getSermonMap();
    const arr2 = map2[CURRENT.paraId] || [];

    if (data.type === 'sermon-save') {
      const now  = new Date();
      const date = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
      if (arr2[idx]) {
        arr2[idx] = { ...arr2[idx], title: data.title, body: data.body, images: [], date };
      }
      map2[CURRENT.paraId] = arr2;
      setSermonMap(map2);
      status('설교가 저장되었습니다.');
      renderSermonList();
      window.removeEventListener('message', onMsg);
    }

    if (data.type === 'sermon-delete') {
      if (arr2[idx]) arr2.splice(idx, 1);
      map2[CURRENT.paraId] = arr2;
      setSermonMap(map2);
      status('설교가 삭제되었습니다.');
      renderSermonList();
      window.removeEventListener('message', onMsg);
    }
  };
  window.addEventListener('message', onMsg);
}

/* ===== 팝업 내부 스크립트 ===== */
function initSermonPopup(win){
  const w = win, d = w.document;

    // ===== 중복 제목 입력 숨기기(팝업 한정) =====
  (function removeDuplicateTitle() {
    const d = win.document;
    // 현재 사용 중인 제목 입력칸
    const mainTitle = d.getElementById('neTitle');
    if (!mainTitle) return;

    // 예전 제목 input(#t 등)이 있다면 숨김
    const dupCandidates = [
      ...d.querySelectorAll('input#t, input[type="text"].title-input')
    ].filter(el => el !== mainTitle);

    dupCandidates.forEach(el => {
      el.style.display = 'none';
      el.setAttribute('aria-hidden', 'true');
    });
  })();


  const $ = id => d.getElementById(id);
  const meta = w.__WBPS_META__ || {};

  $('ref').textContent  = ' — ' + (meta.ref || '');
  $('date').textContent = meta.date ? ('최근 저장: ' + meta.date) : '';

  $('t').value = meta.title || '';
  $('neTitle').value = meta.title || '';

  const N$$= sel => Array.from(d.querySelectorAll(sel));
  const Nuid= () => Math.random().toString(36).slice(2,10);

  const neRoot    = $('editorRoot');
  const neBubble  = $('neBubble');
  const neSlash   = $('neSlash');
  const neAutosave= $('neAutosave');
  const editorMain = neRoot.closest('main') || d.body;


  const NSTATE = { blocks: [], history: [], cursor: -1, docId: null };

  function NwrapToggle(inner){
    const parts = String(inner||'').split(/<br\s*\/?>/);
    const first = parts.shift() || '토글 제목';
    const body  = parts.join('<br>');
    return '<details open><summary>'+first+'</summary><div>'+body+'</div></details>';
  }
  function Nescape(s){ const t=d.createElement('div'); t.textContent=String(s); return t.innerHTML; }
  function NindexById(id){ return NSTATE.blocks.findIndex(b=>b.id===id); }
  function NgetType(block){ return block?.dataset?.type || 'p'; }

  function initBlocksFromHTML(html){
    if(!html || /^\s*$/.test(html)){
      NSTATE.blocks=[{id:Nuid(), type:'p', html:'여기에 설교를 작성하세요.'}];
    }else{
      NSTATE.blocks=[{id:Nuid(), type:'p', html: html}];
    }
  }

  function Nrender(){
    neRoot.innerHTML = '';
    for(const b of NSTATE.blocks){
      const el = d.createElement('div');
      el.className = 'editor-block';
      el.dataset.id = b.id; el.dataset.type = b.type;
      el.innerHTML = `
        <div class="handle">⋮⋮</div>
        <div class="content" contenteditable="true">${b.type==='toggle'? NwrapToggle(b.html) : b.html}</div>
        <div class="progress" style="width:0"></div>
      `;
      neRoot.appendChild(el);
    }
    NbindBlockEvents();
  }

  function NsaveBlockHTML(block){
    const i = NindexById(block.dataset.id);
    if(i<0) return;
    const content = block.querySelector('.content');
    NSTATE.blocks[i].html = content.innerHTML;
  }

  function NsplitBlock(block){
    const i = NindexById(block.dataset.id); if(i<0) return;
    const sel = w.getSelection(); if(!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const text = block.querySelector('.content').textContent || '';
    const off  = range.startOffset;
    const pre  = text.slice(0, off);
    const post = text.slice(off);
    NSTATE.blocks[i].html = Nescape(pre);
    NSTATE.blocks.splice(i+1,0,{id:Nuid(), type:'p', html: Nescape(post||'')});
    Nrender();
    const next = neRoot.querySelector(`.editor-block[data-id="${NSTATE.blocks[i+1].id}"] .content`);
    if(next) { next.focus(); const rr=d.createRange(); rr.selectNodeContents(next); rr.collapse(false); const ss=w.getSelection(); ss.removeAllRanges(); ss.addRange(rr); }
    NpushHistory();
  }

  // 🔁 에디터 블록 이벤트 바인딩
  function NbindBlockEvents(){
    const blocks = neRoot.querySelectorAll('.editor-block');

    blocks.forEach(block =>{
      const content = block.querySelector('.content');
      if (!content) return;

      // 입력 시 블록 HTML 저장 + 자동저장
      content.addEventListener('input', ()=> {
        NsaveBlockHTML(block);
        NscheduleAutosave();
      });

      // 마우스로 드래그 후 선택 → 마우스에서 손 뗄 때 버블 표시
      content.addEventListener('mouseup', ()=> {
        setTimeout(NshowBubbleMaybe, 0);
      });

      // 방향키로 선택 변경 / Shift+방향키 등 → 버블 표시
      content.addEventListener('keyup', ()=> {
        setTimeout(NshowBubbleMaybe, 0);
      });

      // 슬래시 명령(기능 유지)
      content.addEventListener('keydown', e => {
        if (e.key === '/' && !e.shiftKey) {
          NshowSlash(block);
          return;
        }
        if (e.key === 'Enter') {
          if (NgetType(block) === 'code') return;
          e.preventDefault();
          NsplitBlock(block);
        }
        if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
          e.preventDefault();
          Nundo();
        }
        if (((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'z') ||
            ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y')) {
          e.preventDefault();
          Nredo();
        }
      });
    });
  }

  // 🔁 플로팅툴바 표시 (main 기준 좌표로 보정)
  function NshowBubbleMaybe(){
    const sel = w.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      neBubble.classList.add('hidden');
      return;
    }

    const range = sel.getRangeAt(0);
    const node  = range.commonAncestorContainer;
    const el    = (node.nodeType === 1 ? node : node.parentElement);

    // 선택이 에디터 블록 밖이면 숨김
    if (!el || !neRoot.contains(el)) {
      neBubble.classList.add('hidden');
      return;
    }

    // 선택 영역의 윈도우 기준 rect
    let rect = range.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) {
      neBubble.classList.add('hidden');
      return;
    }

    // 🔹 main 기준 좌표로 변환
    const mainRect = editorMain.getBoundingClientRect();
    const left = rect.left - mainRect.left + editorMain.scrollLeft;
    const top  = rect.top  - mainRect.top  + editorMain.scrollTop - 42;

    neBubble.style.left = left + 'px';
    neBubble.style.top  = top  + 'px';
    neBubble.classList.remove('hidden');
  }


  /*
  // 플로팅툴바
  function NshowBubbleMaybe(){
    const sel = w.getSelection();
    if(!sel || sel.isCollapsed){
      neBubble.classList.add('hidden');
      return;
    }
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    neBubble.style.left = (rect.left + w.scrollX) + 'px';
    neBubble.style.top  = (rect.top  + w.scrollY - 42) + 'px';
    neBubble.classList.remove('hidden');
  }
  */

  // 플로팅툴바 
  neBubble.addEventListener('mousedown', e=> e.preventDefault());

  // 플로팅툴바
  neBubble.addEventListener('click', e=>{
    const btn = e.target.closest('button'); 
    if(!btn) return;

    const mark = btn.dataset.mark; 
    const act  = btn.dataset.action;

    if(mark){
      d.execCommand(
        mark==='highlight' ? 'backColor' : mark,
        false,
        mark==='highlight' ? '#6655007a' : null
      );
    } else if(act === 'link'){
      const url = w.prompt('링크 URL');
      if(url) d.execCommand('createLink', false, url);
    } else if(act === 'clearFmt'){          // 🔹 서식제거 추가
      d.execCommand('removeFormat', false, null);
      d.execCommand('unlink', false, null); // 링크도 함께 제거하고 싶으면 유지
    }

    NshowBubbleMaybe();
    NscheduleAutosave();
  });

  const N_SLASH = [
    {type:'p', label:'텍스트'},
    {type:'h1', label:'제목 1'},
    {type:'h2', label:'제목 2'},
    {type:'h3', label:'제목 3'},
    {type:'todo', label:'체크리스트'},
    {type:'ul', label:'불릿 리스트'},
    {type:'ol', label:'번호 리스트'},
    {type:'quote', label:'인용'},
    {type:'callout', label:'콜아웃'},
    {type:'divider', label:'구분선'},
    {type:'code', label:'코드 블록'},
    {type:'toggle', label:'토글 블록'},
    {type:'img', label:'이미지(링크)'},
  ];
  let NslashTarget = null;
  function NshowSlash(block){
    NslashTarget = block;
    const rect = block.getBoundingClientRect();
    neSlash.style.left = (rect.left + w.scrollX + 20) + 'px';
    neSlash.style.top  = (rect.top  + w.scrollY + 20) + 'px';
    neSlash.innerHTML = N_SLASH.map((it,i)=>`<div class="item" data-i="${i}">${it.label}</div>`).join('');
    neSlash.classList.remove('hidden');
  }
  neSlash.addEventListener('click', e=>{
    const item = e.target.closest('.item'); if(!item) return;
    const i = +item.dataset.i; NapplySlash(N_SLASH[i]);
    neSlash.classList.add('hidden');
  });
  d.addEventListener('keydown', e=>{ if(e.key==='Escape') neSlash.classList.add('hidden'); });

  function NapplySlash(it){
    if(!NslashTarget) return;
    const id = NslashTarget.dataset.id; const idx = NindexById(id); if(idx<0) return;
    if(it.type==='divider'){
      NSTATE.blocks[idx] = {id, type:'divider', html:''};
    } else if(it.type==='img'){
      const url = w.prompt('이미지 URL'); if(url){ NSTATE.blocks[idx].html = `<img src="${url}" style="max-width:100%">`; }
    } else if(it.type==='todo'){
      NSTATE.blocks[idx] = {id, type:'todo', html:`<input type="checkbox"> 할 일`};
    } else if(it.type==='ul' || it.type==='ol'){
      NSTATE.blocks[idx] = {id, type:it.type, html:`<${it.type}><li>첫 번째</li></${it.type}>`};
    } else if(it.type==='toggle'){
      NSTATE.blocks[idx] = {id, type:'toggle', html:'토글 제목<br>토글 내용'};
    } else {
      NSTATE.blocks[idx].type = it.type;
    }
    Nrender(); NscheduleAutosave();
  }

  function NpushHistory(){ NSTATE.history = NSTATE.history.slice(0, NSTATE.cursor+1); NSTATE.history.push(JSON.stringify(NSTATE.blocks)); NSTATE.cursor = NSTATE.history.length-1; }
  function Nundo(){ if(NSTATE.cursor>0){ NSTATE.cursor--; NSTATE.blocks = JSON.parse(NSTATE.history[NSTATE.cursor]); Nrender(); } }
  function Nredo(){ if(NSTATE.cursor<NSTATE.history.length-1){ NSTATE.cursor++; NSTATE.blocks = JSON.parse(NSTATE.history[NSTATE.cursor]); Nrender(); } }

  function NblocksToHTML(){
    return NSTATE.blocks.map(b=>{
      switch(b.type){
        case 'h1': return `<h2>${b.html}</h2>`;
        case 'h2': return `<h3>${b.html}</h3>`;
        case 'h3': return `<h4>${b.html}</h4>`;
        case 'quote': return `<blockquote>${b.html}</blockquote>`;
        case 'divider': return '<hr/>';
        default: return `<div>${b.html}</div>`;
      }
    }).join('');
  }

  let NsaveTimer=null;
  function NscheduleAutosave(){
    clearTimeout(NsaveTimer);
    neAutosave.textContent = '입력 중…';
    NsaveTimer = setTimeout(()=>{
      try{
        const key = `wbps.sermon.draft.blocks.${(meta.paraId||'')}.${(meta.idx||0)}`;
        const payload = { title: ($('neTitle').value||''), blocks:NSTATE.blocks, ts: Date.now() };
        w.localStorage.setItem(key, JSON.stringify(payload));
        neAutosave.textContent = '자동저장됨';
      }catch(_){ neAutosave.textContent = '자동저장 실패(용량)'; }
    }, 500);
  }

  (function Ninit(){
    initBlocksFromHTML(meta.body||'');
    Nrender(); NpushHistory();
    setTimeout(()=>{ const last = d.querySelector('#editorRoot .editor-block:last-child .content'); last && last.focus(); }, 60);
  })();

  // STT
  (function(){
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if(!SR){ console.warn('STT 미지원'); return; }
    const rec = new SR(); rec.lang='ko-KR'; rec.interimResults=true; rec.continuous=true;

    let activeBlock=null, accText='', startedAt=null;
    function getActive(){ const sel=w.getSelection(); const n=sel?.anchorNode; const el=(n?.nodeType===1?n:(n?.parentElement)); return el?.closest?.('.editor-block') || d.querySelector('.editor-block'); }
    function setProgress(block, ratio){ const bar=block?.querySelector('.progress'); if(bar) bar.style.width = Math.max(0,Math.min(100,ratio*100)) + '%'; }
    function plain(html){ const t=d.createElement('div'); t.innerHTML=html||''; return t.textContent||''; }
    function sim(a,b){ a=a.replace(/\s+/g,''); b=b.replace(/\s+/g,''); const L=Math.max(a.length,1); let m=0; for(let i=0;i<Math.min(a.length,b.length);i++){ if(a[i]===b[i]) m++; } return m/L; }
    function nextBlock(block){ const nx = block?.nextElementSibling?.classList.contains('editor-block')? block.nextElementSibling : null; return nx; }

    const neSttBtn = d.getElementById('neStt');
    neSttBtn?.addEventListener('click', ()=>{
      if(neSttBtn.dataset.on==='1'){ rec.stop(); neSttBtn.dataset.on='0'; neSttBtn.textContent='🎙 STT'; return; }
      activeBlock = getActive(); if(!activeBlock){ w.alert('블록을 선택하세요'); return; }
      accText=''; startedAt=Date.now(); rec.start(); neSttBtn.dataset.on='1'; neSttBtn.textContent='⏸ 중지';
    });

    rec.onresult = (ev)=>{
      if(!activeBlock) return;
      const r = ev.results[ev.results.length-1]; const txt=r[0].transcript; const isFinal=r.isFinal;
      accText += (isFinal? txt+' ' : txt);
      const base = plain(activeBlock.querySelector('.content').innerHTML);
      const s = sim(base, accText); setProgress(activeBlock, s);

      const t = ((Date.now()-startedAt)/1000).toFixed(1);
      const neTrace = d.getElementById('traceLog');
      neTrace.textContent += `t=${t}s s=${(s*100).toFixed(0)}% : ${txt}\n`;
      neTrace.scrollTop = neTrace.scrollHeight;

      if(isFinal && s>0.95){
        const nb = nextBlock(activeBlock);
        if(nb){ activeBlock = nb; accText=''; startedAt=Date.now(); setProgress(nb, 0); }
      }
    };
    rec.onend   = ()=>{ if(neSttBtn.dataset.on==='1'){ rec.start(); } };
    rec.onerror = (e)=> console.warn('STT 오류', e.error);
  })();

  // 게시(Firebase 옵션)
  const nePubBtn = d.getElementById('nePublish');
  nePubBtn?.addEventListener('click', async ()=>{
    try{
      if(typeof w.firebase === 'undefined'){ w.alert('Firebase 미탑재: 게시 기능을 사용하려면 SDK/초기화가 필요합니다.'); return; }
      const user = w.firebase.auth().currentUser;
      if(!user){ w.alert('로그인 후 게시 가능합니다.'); return; }

      const db = w.firebase.firestore();
      const docRef = NSTATE.docId ? db.collection('sermons').doc(NSTATE.docId) : db.collection('sermons').doc();
      const payload = {
        title: (d.getElementById('neTitle').value||'무제'),
        blocks: NSTATE.blocks,
        owner: user.uid,
        updatedAt: w.firebase.firestore.FieldValue.serverTimestamp(),
        createdAt: w.firebase.firestore.FieldValue.serverTimestamp(),
        status: 'published'
      };
      await docRef.set(payload, {merge:true});
      NSTATE.docId = docRef.id;
      const url = w.location.origin + '/viewer.html?id=' + docRef.id;
      w.alert('게시 완료!\n' + url);
    }catch(err){ console.error(err); w.alert('게시 실패: '+err.message); }
  });

  // 성경구절 삽입
  d.getElementById('btnInsertBibleFloating')?.addEventListener('click', insertBiblePrompt);
  async function insertBiblePrompt(){
    const raw = w.prompt('삽입할 성경구절 (예: 요 3:16, 창세기 1:1-3)');
    if(!raw) return;
    const norm=String(raw).replace(/\s+/g,' ').replace(/[–—－]/g,'-').replace(/[：]/g,':').trim();
    const m=norm.match(/^(.+?)\s+(\d+)\s*:\s*(\d+)(?:\s*-\s*(\d+))?$/);
    if(!m){ w.alert('형식: 성경이름 장:절 또는 장:절-절'); return; }
    const bookRaw=m[1], chap=parseInt(m[2],10), vFrom=parseInt(m[3],10), vTo=m[4]?parseInt(m[4],10):parseInt(m[3],10);

    let BOOKS;
    try{ BOOKS = await getBooksInPopup(); }
    catch(e){ w.alert(e.message || '성경 데이터를 불러올 수 없습니다.'); return; }

    const bookKey=resolveBookKey(bookRaw,BOOKS);
    if(!bookKey){ w.alert(`해당 성경을 찾을 수 없습니다: "${bookRaw}"`); return; }

    const ch=BOOKS[bookKey]?.[chap];
    if(!ch){ w.alert(`"${bookKey}" ${chap}장을 찾을 수 없습니다.`); return; }

    const verses=(ch.paras||[]).flatMap(p=>p.verses||[]).filter(([v])=>v>=vFrom&&v<=vTo);
    if(!verses.length){ w.alert('해당 구절을 찾을 수 없습니다.'); return; }

    const header = `<div class="verse-header">&lt;${bookKey} ${chap}:${vFrom}${vTo!==vFrom?'-'+vTo:''}&gt;</div>`;
    const html = verses.map(([v,t])=>`<span class="verse-line"><sup>${v}</sup>${t}</span>`).join('');
    const blockHTML = header + html;

    NSTATE.blocks.push({ id:Nuid(), type:'p', html: blockHTML });
    Nrender(); NpushHistory(); NscheduleAutosave();
    const last = d.querySelector('#editorRoot .editor-block:last-child .content');
    last && last.focus();
  }

  // 저장/삭제/닫기/인쇄
  // 20251114 12:48 교체
    d.getElementById('s').onclick = ()=>{
    let html = NblocksToHTML();

    // ✅ 1) 내용이 없는 <p>…</p> 빈 줄 제거
    html = html.replace(/<p>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>\s*/gi, '');

    // ✅ 2) 줄바꿈 3개 이상 → 2개로 축소
    html = html.replace(/\n{3,}/g, '\n\n');

    const title =
        (d.getElementById('neTitle').value || d.getElementById('t').value || '').trim()
        || '(제목 없음)';

    const images = [];

    w.opener?.postMessage?.(
        {
        type: 'sermon-save',
        title,
        body: html,
        images,
        },
        '*'
    );

    w.close();
    };
  // 20251114 12:48 교체

  d.getElementById('d').onclick = ()=>{ if(w.confirm('삭제할까요?')){ w.opener?.postMessage?.({ type:'sermon-delete' }, '*'); w.close(); } };
  d.getElementById('x').onclick = ()=> w.close();
  d.getElementById('print').onclick = ()=> w.print();

  /* ========= 문장 단위 낭독 + 하이라이트 + 화면 중앙 정렬 ========= */
  const readBtn = d.getElementById('read');
  const stopBtn = d.getElementById('stop');
  const readPane = d.getElementById('readPane');

  const TTS = {
    sents: [],
    idx: 0,
    playing: false,
    synth: w.speechSynthesis || window.speechSynthesis,
    utter: null
  };

  function htmlToPlain(html){
    const tmp=d.createElement('div'); tmp.innerHTML=html||'';
    tmp.querySelectorAll('sup').forEach(s=> s.textContent='['+s.textContent+'] ');
    return (tmp.textContent||'').replace(/\s+\n/g,'\n').replace(/\n{2,}/g,'\n').replace(/\s+/g,' ').trim();
  }

  // 한국어/영문 종결부호 기준 문장 분할
  function splitToSentences(text){
    const t = String(text||'').trim();
    if(!t) return [];
    // 마침표, 물음표, 느낌표, 말줄임표, 한국어 종결(다.)도 일반 마침표로 처리됨
    const parts = t.split(/(?<=[\.!\?…]|[。！？])\s+/u).filter(s=>s && s.trim().length>0);
    return parts;
  }

  function renderReadPane(){
    readPane.innerHTML = TTS.sents.map((s,i)=>`<span class="sent" data-i="${i}">${escapeHtml(s)}</span>`).join('');
    readPane.style.display = '';
  }

  function clearPaneHighlight(){
    readPane.querySelectorAll('.sent.reading').forEach(el=> el.classList.remove('reading'));
  }

  function highlightIndex(i){
    clearPaneHighlight();
    const span = readPane.querySelector(`.sent[data-i="${i}"]`);
    if(span){
      span.classList.add('reading');
      span.scrollIntoView({block:'center', behavior:'smooth'});
    }
  }

  function speakIdx(i){
    if(!TTS.synth) return;
    if(i<0 || i>=TTS.sents.length){ stopReading(); return; }
    TTS.idx = i;
    try{ TTS.synth.cancel(); }catch(_){}
    const u = new w.SpeechSynthesisUtterance(TTS.sents[i]);
    // 부모창 음성 설정을 그대로 이용하지 못하므로 기본 ko-KR로 설정
    u.lang = 'ko-KR';
    u.onstart = ()=>{
      highlightIndex(i);
    };
    u.onend = ()=>{
      if(!TTS.playing) return;
      const next = i+1;
      if(next < TTS.sents.length){
        speakIdx(next);
      }else{
        stopReading();
      }
    };
    u.onerror = ()=>{ // 오류 시 다음 문장으로 넘어가되 무한루프 방지
      if(!TTS.playing) return;
      const next = i+1;
      if(next < TTS.sents.length) speakIdx(next); else stopReading();
    };
    TTS.utter = u;
    TTS.synth.speak(u);
  }

  function startReading(){
    const html = NblocksToHTML();
    const title = (d.getElementById('neTitle').value || d.getElementById('t').value || '').trim();
    const plain = [title, htmlToPlain(html)].filter(Boolean).join('. ');
    const sents = splitToSentences(plain);
    if(!sents.length){ w.alert('낭독할 내용이 없습니다.'); return; }
    TTS.sents = sents;
    TTS.idx = 0;
    TTS.playing = true;
    renderReadPane();
    readBtn.textContent = '일시정지';
    speakIdx(0);
  }

  function stopReading(){
    TTS.playing = false;
    try{ TTS.synth && TTS.synth.cancel(); }catch(_){}
    clearPaneHighlight();
    readPane.style.display = 'none';
    readBtn.textContent = '낭독';
  }

  readBtn.onclick = ()=>{
    if(!TTS.synth){ w.alert('이 브라우저는 음성합성을 지원하지 않습니다.'); return; }
    if(!TTS.playing){
      startReading();
    }else{
      // 일시정지 토글: 일시정지 -> 재개
      if(TTS.synth.speaking && !TTS.synth.paused){
        TTS.synth.pause();
        readBtn.textContent = '재개';
      }else if(TTS.synth.paused){
        TTS.synth.resume();
        readBtn.textContent = '일시정지';
      }else{
        startReading();
      }
    }
  };

  stopBtn.onclick = ()=> stopReading();

  // 문장 클릭 시 해당 문장부터 재생
  readPane.addEventListener('click', (e)=>{
    const span = e.target.closest('.sent');
    if(!span) return;
    const i = +span.dataset.i;
    if(!Number.isFinite(i)) return;
    if(!TTS.sents.length) return;
    TTS.playing = true;
    readBtn.textContent = '일시정지';
    speakIdx(i);
  });

  // 저장/삭제/닫기/낭독 끝
  /* ========= 문장 단위 낭독 섹션 끝 ========= */

  // 기존 중지 버튼 핸들러는 위에서 대체( stopReading )로 처리됨
  // 기존 단일-문장 전체 낭독 로직은 요구사항에 맞춰 문장 단위로 치환됨

  // 성경 데이터 로드 유틸
  let __BOOKS_CACHE = null;
  async function getBooksInPopup(){
    if (__BOOKS_CACHE) return __BOOKS_CACHE;
    try{
      const P = w.opener || window.opener;
      if (P && P.BIBLE && P.BIBLE.books){
        __BOOKS_CACHE = P.BIBLE.books;
        return __BOOKS_CACHE;
      }
    }catch(_){}
    async function tryLoad(path){
      try{
        const res = await fetch(path, {cache:'no-store'});
        if(!res.ok) return null;
        const j = await res.json();
        return j && j.books ? j.books : null;
      }catch(_){ return null; }
    }
    __BOOKS_CACHE = await tryLoad('bible_paragraphs.json') || await tryLoad('bible-paragraphs.json');
    if(!__BOOKS_CACHE) throw new Error('성경 데이터(BIBLE)를 불러올 수 없습니다.');
    return __BOOKS_CACHE;
  }

  function resolveBookKey(input,BOOKS){
    const s=normalizeBookName(input); const keys=Object.keys(BOOKS||{});
    const byNorm=new Map(keys.map(k=>[normalizeBookName(k),k])); if(byNorm.has(s)) return byNorm.get(s);
    const alias=BOOK_ALIAS_MAP(); if(alias[s] && BOOKS[alias[s]]) return alias[s];
    const startHit=keys.find(k=>normalizeBookName(k).startsWith(s)); if(startHit) return startHit;
    const inclHit=keys.find(k=>normalizeBookName(k).includes(s)); if(inclHit) return inclHit;
    return null;
  }
  function normalizeBookName(x){
    return String(x||'').toLowerCase().replace(/\s+/g,'').replace(/[.\u00B7]/g,'').replace(/서$/,'').replace(/복음서?$/,'복음')
    .replace(/첫째|둘째|셋째/g, m=>({'첫째':'1','둘째':'2','셋째':'3'}[m])).replace(/[일이삼]/g,m=>({'일':'1','이':'2','삼':'3'}[m]))
    .replace(/롬서?$/,'롬').replace(/고린도전서?$/,'고전').replace(/고린도후서?$/,'고후')
    .replace(/데살로니가전서?$/,'살전').replace(/데살로니가후서?$/,'살후')
    .replace(/디모데전서?$/,'딤전').replace(/디모데후서?$/,'딤후')
    .replace(/베드로전서?$/,'벧전').replace(/베드로후서?$/,'벧후')
    .replace(/요한일서?$/,'요1').replace(/요한이서?$/,'요2').replace(/요한삼서?$/,'요3');
  }
  function BOOK_ALIAS_MAP(){
    return {
      // 구약
      '창':'창세기','창세기':'창세기','창세':'창세기','출':'출애굽기','출애굽기':'출애굽기','출애':'출애굽기','레':'레위기','레위기':'레위기','민':'민수기','민수기':'민수기','신':'신명기','신명기':'신명기',
      '수':'여호수아','여호수아':'여호수아','삿':'사사기','사사기':'사사기','룻':'룻기','룻기':'룻기','삼상':'사무엘상','사무엘상':'사무엘상','삼하':'사무엘하','사무엘하':'사무엘하',
      '왕상':'열왕기상','열왕기상':'열왕기상','왕하':'열왕기하','열왕기하':'열왕기하','대상':'역대상','역대상':'역대상','대하':'역대하','역대하':'역대하',
      '스':'에스라','에스라':'에스라','느':'느헤미야','느헤미야':'느헤미야','에':'에스더','에스더':'에스더','욥':'욥기','욥기':'욥기','시':'시편','시편':'시편','잠':'잠언','잠언':'잠언',
      '전':'전도서','전도서':'전도서','아':'아가','아가':'아가','사':'이사야','이사야':'이사야','렘':'예레미야','예레미야':'예레미야','애':'예레미야애가','예레미야애가':'예레미야애가',
      '겔':'에스겔','에스겔':'에스겔','단':'다니엘','다니엘':'다니엘','호':'호세아','호세아':'호세아','욜':'요엘','요엘':'요엘','암':'아모스','아모스':'아모스','옵':'오바댜','오바댜':'오바댜',
      '욘':'요나','요나':'요나','미':'미가','미가':'미가','나':'나훔','나훔':'나훔','합':'하박국','하박국':'하박국','습':'스바냐','스바냐':'스바냐','학':'학개','학개':'학개','슥':'스가랴','스가랴':'스가랴','말':'말라기','말라기':'말라기',
      // 신약
      '마':'마태복음','마태':'마태복음','마태복음':'마태복음','막':'마가복음','마가':'마가복음','마가복음':'마가복음','눅':'누가복음','누가':'누가복음','누가복음':'누가복음',
      '요':'요한복음','요한복음':'요한복음','행':'사도행전','사도행전':'사도행전','롬':'로마서','로마서':'로마서','고전':'고린도전서','고린도전서':'고린도전서','고후':'고린도후서','고린도후서':'고린도후서',
      '갈':'갈라디아서','갈라디아서':'갈라디아서','엡':'에베소서','에베소서':'에베소서','빌':'빌립보서','빌립보서':'빌립보서','골':'골로새서','골로새서':'골로새서',
      '살전':'데살로니가전서','데살로니가전서':'데살로니가전서','살후':'데살로니가후서','데살로니가후서':'데살로니가후서','딤전':'디모데전서','디모데전서':'디모데전서','딤후':'디모데후서','디모데후서':'디모데후서',
      '딛':'디도서','디도서':'디도서','몬':'빌레몬서','빌레몬서':'빌레몬서','히':'히브리서','히브리서':'히브리서','약':'야고보서','야고보서':'야고보서',
      '벧전':'베드로전서','베드로전서':'베드로전서','벧후':'베드로후서','베드로후서':'베드로후서',
      '요1':'요한일서','요일1':'요한일서','요한일':'요한일서','요한일서':'요한일서','요2':'요한이서','요일2':'요한이서','요한이':'요한이서','요한이서':'요한이서',
      '요3':'요한삼서','요일3':'요한삼서','요한삼':'요한삼서','요한삼서':'요한삼서','유':'유다서','유다서':'유다서','계':'요한계시록','계시록':'요한계시록','요한계시록':'요한계시록'
    }
  }
}

/* ===== 모달 RTE 상단 패딩 자동 보정 ===== */
function adjustModalEditorPadding() {
  const wrap = document.getElementById('rteToolbar');
  const body = document.querySelector('#sermonEditor .rte');
  if (!body) return;
  const h = wrap ? (wrap.offsetHeight || 0) : 0;
  body.style.setProperty('--editor-pad-top', (h + 0) + 'px');
}
window.addEventListener('resize', adjustModalEditorPadding);
document.getElementById('sermonTitle')?.addEventListener('input', adjustModalEditorPadding);
window.addEventListener('load', adjustModalEditorPadding);

/* ===== 인라인 제목 편집 더미 ===== */
function startInlineTitleEdit(){ /* 필요 시 실제 구현으로 교체 */ }

/* === 절문장 전용 서식 툴바 === */
(function(){
  const bar = document.getElementById('vbar');
  const color = document.getElementById('vcolor');
  const docEl = document.getElementById('doc');

  // ===== [INIT HOOK] BEGIN =====
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      safeBindFmtButtons(); // 서식저장, 서식화복, 서식내보내기, 서식가져오기 버튼
      // ensureBookChips?.();          // 기본이해, 내용구조, 메세지요약 버튼 옛날에 성경 옆에 만들던 것
      //ensureGlobalBookChips();      // 헤더 최상단 에 기본이해, 내용구조, 메세지요약 버튼
      ensureBookHeadChips();       // 👈 각 성경책 1장 첫단락 설교버튼 오른쪽에 기본이해, 내용구조, 메세지요약 
    });
  } else {
    safeBindFmtButtons();
    // ensureBookChips?.();
    //ensureGlobalBookChips();        // 👈 추가
    ensureBookHeadChips();       // 👈 마지막에 호출 (정착)
  }
  document.addEventListener('wbp:treeBuilt', ()=>{
    const root = document.getElementById('tree') || document;
    WBP_FMT.restoreAll(root);       // (기존 유지)

    document.addEventListener('wbp:treeBuilt', ensureBookHeadChips);

    // ensureBookHeadChips();          // ✅ 각 책 1장 첫 단락 '설교' 오른쪽에 3칩 유지
  });


  // ===== [INIT HOOK] END =====

  if(!bar || !docEl) return;

  let savedRange = null;

  function inVerse(){
    const sel = window.getSelection();
    if(!sel || sel.rangeCount===0) return false;
    const c = sel.getRangeAt(0).commonAncestorContainer;
    const el = (c.nodeType===1 ? c : c.parentElement);
    return !!(el && docEl.contains(el) && el.closest('.verse'));
  }
  function saveSel(){
    const sel = window.getSelection();
    if(sel && sel.rangeCount>0) savedRange = sel.getRangeAt(0).cloneRange();
  }
  function restoreSel(){
    if(!savedRange) return false;
    const sel = window.getSelection();
    sel.removeAllRanges(); sel.addRange(savedRange);
    return true;
  }
  function selRect(){
    const sel = window.getSelection();
    if(!sel || sel.rangeCount===0) return null;
    const r = sel.getRangeAt(0).cloneRange();
    let rect = r.getBoundingClientRect();
    if(!rect || (rect.width===0 && rect.height===0)){
      const span = document.createElement('span');
      span.appendChild(document.createTextNode('\u200b'));
      r.insertNode(span);
      rect = span.getBoundingClientRect();
      span.remove();
    }
    return rect;
  }
  function showBar(){
    const sel = window.getSelection();
    if(!sel || sel.isCollapsed || !inVerse()){ hide(); return; }
    const rect = selRect(); if(!rect){ hide(); return; }
    bar.style.left = (rect.left + rect.width/2) + 'px';
    bar.style.top  = rect.top + 'px';
    bar.hidden = false;
    saveSel();
  }
  function hide(){ bar.hidden = true; }

  bar.addEventListener('mousedown', e=> e.preventDefault());
  bar.addEventListener('click', e=>{
    const btn = e.target.closest('button'); if(!btn) return;
    if(!restoreSel()) return;

    const cmd = btn.dataset.cmd;
    const act = btn.dataset.act;
    if(cmd){
      document.execCommand(cmd,false,null);
      saveSel(); showBar();
      return;
    }
    if(act==='clearColor'){
      try{
        const sel = window.getSelection(); if(!sel || sel.rangeCount===0) return;
        const range = sel.getRangeAt(0);
        const frag  = range.cloneContents();
        const div   = document.createElement('div'); div.appendChild(frag);
        div.querySelectorAll('span, font').forEach(n=>{
          if(n.style?.color) n.style.color = '';
          if(n.hasAttribute?.('color')) n.removeAttribute('color');
        });
        range.deleteContents();
        document.execCommand('insertHTML', false, div.innerHTML);
      }catch(_){}
      saveSel(); showBar();
    }
  });
  color?.addEventListener('input', ()=>{
    if(!restoreSel()) return;
    document.execCommand('foreColor', false, color.value);
    saveSel(); showBar();
  });

  document.addEventListener('selectionchange', ()=>{
    if(inVerse()) showBar(); else hide();
  });
  docEl.addEventListener('mouseup', ()=> setTimeout(showBar, 0));
  docEl.addEventListener('keyup',   ()=> setTimeout(showBar, 0));
  window.addEventListener('scroll', hide, {passive:true});
  window.addEventListener('resize', hide);

  window.addEventListener('keydown', (e)=>{
    if(!inVerse()) return;
    if(!(e.ctrlKey||e.metaKey)) return;
    const k=e.key.toLowerCase();
    if(['b','i','u'].includes(k)){
      e.preventDefault();
      document.execCommand(k==='b'?'bold':k==='i'?'italic':'underline',false,null);
      setTimeout(showBar,0);
    }
  });

// ===== [FORMAT-PERSIST QUICK INSPECTOR] 열린 단락 저장본 바로 보기 =====
window.inspectCurrentFormat = () => {
  const t = document.querySelector('details.para[open] summary .ptitle');
  if(!t){ console.warn('⚠️ 열려있는 단락이 없습니다. 먼저 단락을 여세요.'); return; }

  const key = `WBP3_FMT:${t.dataset.book}:${t.dataset.ch}:${t.dataset.idx}`;
  const raw = localStorage.getItem(key);
  if(!raw){ console.warn('❌ 저장된 서식 데이터가 없습니다.', key); return; }

  try {
    const d = JSON.parse(raw);
    console.group('📘 열린 단락 서식저장 확인');
    console.log('KEY:', key);
    console.log('버전(v):', d.v);
    console.log('저장시각:', new Date(d.savedAt).toLocaleString());
    console.log('절문장 수:', d.lines?.length || 0);

    if (Array.isArray(d.lines) && d.lines.length) {
      const L = d.lines[0];
      console.log('▶ 첫 절문장 HTML:', (L.html||'').slice(0,120) + '...');
      console.log('▶ 첫 절문장 텍스트:', (L.text||'').slice(0,100));
      console.log('▶ 첫 절문장 spans(서식 runs):', L.spans?.slice(0,10) || '(없음)');
    }
    console.groupEnd();
  } catch(e) {
    console.error('⚠️ 저장 데이터 파싱 오류:', e);
  }
};

(function cleanupMiniChipsOnce(){
  document.querySelectorAll('.unit-chips, #unitGlobalChips').forEach(el => el.remove());
  const css = document.createElement('style');
  css.textContent = `.unit-chips, #unitGlobalChips { display:none !important; }`;
  document.head.appendChild(css);
})();

// === [REMOVE HEADER CHIPS] 헤더의 '기본이해·내용구조·메세지요약' 제거 ===
(function removeHeaderChips(){
  const hdr = document.querySelector('header');
  if (!hdr) return;
  const SEL = '.book-chip, .bookhead-chips, .unit-chip, .unit-chips, #unitGlobalChips';
  hdr.querySelectorAll(SEL).forEach(el => el.remove());
  const mo = new MutationObserver(() => {
    hdr.querySelectorAll(SEL).forEach(el => el.remove());
  });
  mo.observe(hdr, { childList:true, subtree:true });
})()

// === [REMOVE HEADER CHIPS - DELAYED] ===
function removeHeaderBookEditors(){
  const labels = ['기본이해','내용구조','메세지요약'];
  const tryRemove = ()=>{
    const header = document.querySelector('header');
    if(!header) return;
    let removed = 0;
    header.querySelectorAll('button, .btn, [role="button"]').forEach(b=>{
      if(labels.includes((b.textContent||'').trim())){
        b.remove();
        removed++;
      }
    });
    if(removed>0) console.log('기본이해·내용구조·메세지요약 제거 완료');
    else setTimeout(tryRemove, 500); // 버튼 생성 지연 대비 반복 시도
  };
  tryRemove();
}
removeHeaderBookEditors();

// === [BOOK-CHIP → FLOW-EDITOR 재사용 바인딩] ===============================
function bindBookHeadChipsToFlowEditor(){
  const tree = document.getElementById('tree');
  if(!tree) return;

  // 여러 권이 동시에 open이면 막기
  const openedBooks = [...tree.querySelectorAll('details.book[open]')];
  if(openedBooks.length > 1){
    alert('2개 이상 성경이 열려 있습니다. 한 권만 연 다음 다시 시도하세요.');
    return;
  }

  // 대상: 현재 열려있는 책(또는 화면상 첫 책)
  const bookEl =
    openedBooks[0] ||
    tree.querySelector('details.book');

  if(!bookEl) return;

  // 이 책의 1장/첫 단락 툴바에서 '내용흐름' 버튼을 찾아 둔다
  const ch1 = bookEl.querySelector(':scope > .chapters > details') || bookEl.querySelector('details');
  const p1  = ch1?.querySelector(':scope > .paras > details.para') || ch1?.querySelector('details.para');
  if(!p1) return;
  const flowBtn = p1.querySelector('.ptoolbar [data-action="flow"], .ptoolbar .btn-flow, .ptoolbar .chip-flow');
  if(!flowBtn) return;

  // 헤더 쪽 3버튼(또는 1장 첫 단락 옆에 추가된 3칩)을 찾아 동일한 편집기 호출로 연결
  const selectors = [
    '.chip-basic',      // 기본이해
    '.chip-structure',  // 내용구조
    '.chip-summary'     // 메세지요약
  ];
  const chips = [
    ...document.querySelectorAll(selectors.join(','))
  ];

  chips.forEach(chip=>{
    // 중복 바인딩 방지
    if(chip.dataset.wbpBind === 'ok') return;
    chip.dataset.wbpBind = 'ok';

    chip.addEventListener('click', (e)=>{
      e.preventDefault();
      e.stopPropagation();

      // 다시 한 번: 다중 오픈 방지
      const openBooksNow = [...tree.querySelectorAll('details.book[open]')];
      if(openBooksNow.length !== 1){
        alert('편집기는 한 권만 열린 상태에서 사용할 수 있습니다.');
        return;
      }

      // 내용흐름 버튼의 편집기를 그대로 사용
      flowBtn.click();

      // 편집기 뜬 뒤, 제목만 해당 칩 텍스트로 교체(동일 UI 유지)
      // (편집기 DOM 클래스는 프로젝트에 맞춰 아래 후보 중 존재하는 것으로 적용)
      requestAnimationFrame(()=>{
        const dlg =
          document.querySelector('.flow-editor-modal')
          || document.querySelector('.editor-modal')
          || document.querySelector('.wbp-editor')
          || document.querySelector('.modal');

        const titleEl =
          dlg?.querySelector('.modal-title, .editor-title, .title');

        if(titleEl){
          titleEl.textContent = chip.textContent.trim();
        }
      });
    });
  });
}
// ===========================================================================

// 초기 바인딩(트리 렌더 이후에 1회)
document.addEventListener('wbp:treeBuilt', ()=>{
  bindBookHeadChipsToFlowEditor();
});

// 초기 로드 직후 한 번 시도(이미 렌더되어 있으면 즉시 연결)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bindBookHeadChipsToFlowEditor);
} else {
  bindBookHeadChipsToFlowEditor();
}

// === [BOOK-CHIPS → FLOW EDITOR 재사용] =====================================
function bindBookChipsToFlowEditor(){
  const tree = document.getElementById('tree');
  if(!tree) return;

  // 현재 열린 책 수 확인 (2권 이상 열려 있으면 중단)
  const openedBooks = [...tree.querySelectorAll('details.book[open]')];
  if (openedBooks.length > 1) {
    alert('2개 이상 성경이 열려 있습니다. 한 권만 연 다음 다시 시도하세요.');
    return;
  }

  // 대상 책: 열려있으면 그 책, 없으면 첫 책
  const bookEl = openedBooks[0] || tree.querySelector('details.book');
  if(!bookEl) return;

  // 이 책의 1장/첫 단락에서 '내용흐름' 버튼(편집기 트리거)을 찾음
  const ch1 = bookEl.querySelector(':scope > .chapters > details') || bookEl.querySelector('details');
  const p1  = ch1?.querySelector(':scope > .paras > details.para') || ch1?.querySelector('details.para');
  if(!p1) return;

  const flowBtn =
    p1.querySelector('.ptoolbar [data-action="flow"]') ||
    p1.querySelector('.ptoolbar .btn-flow') ||
    p1.querySelector('.ptoolbar .chip-flow') ||
    p1.querySelector('.ptoolbar button:contains("내용흐름")'); // 최후 보정(필요시)

  if(!flowBtn) return;

  // 대상 칩(버튼): 각 책 1장 첫 단락 ‘설교’ 오른쪽에 배치된 3개
  // *프로젝트에 따라 클래스가 다를 수 있으므로 아래 셀렉터 중 존재하는 것만 매칭*
  const chips = [
    ...document.querySelectorAll(
      '.bookhead-chips .chip-basic, .bookhead-chips .chip-structure, .bookhead-chips .chip-summary,' +
      '.book-chips .chip-basic, .book-chips .chip-structure, .book-chips .chip-summary,' +
      '.chip-basic, .chip-structure, .chip-summary,' +
      '.bookhead-chips .book-chip[data-type="basic"], .bookhead-chips .book-chip[data-type="structure"], .bookhead-chips .book-chip[data-type="summary"]'
    )
  ];

  chips.forEach(chip=>{
    if(chip.dataset.flowBind === '1') return; // 중복 바인딩 방지
    chip.dataset.flowBind = '1';

    chip.addEventListener('click', (e)=>{
      e.preventDefault();
      e.stopPropagation();

      // 클릭 시점에도 다중 오픈 방지 확인
      const openBooksNow = [...tree.querySelectorAll('details.book[open]')];
      if (openBooksNow.length !== 1 && openedBooks.length !== 1) {
        alert('편집기는 한 권만 열린 상태에서 사용할 수 있습니다.');
        return;
      }

      // ‘내용흐름’ 버튼 클릭을 그대로 위임 → 동일한 편집기/스타일 사용
      flowBtn.click();

      // 편집기 제목을 칩 라벨로 교체 (UI는 내용흐름 편집기를 그대로 사용)
      requestAnimationFrame(()=>{
        const dlg =
          document.querySelector('.flow-editor-modal') ||
          document.querySelector('.editor-modal') ||
          document.querySelector('.wbp-editor') ||
          document.querySelector('.modal');

        const titleEl =
          dlg?.querySelector('.modal-title') ||
          dlg?.querySelector('.editor-title') ||
          dlg?.querySelector('.title');

        if(titleEl){
          titleEl.textContent = (chip.textContent || '').trim();
        }
      });
    });
  });
}
// ============================================================================

// 렌더 완료 후 1회 바인딩
document.addEventListener('wbp:treeBuilt', ()=> {
  bindBookChipsToFlowEditor();
});

// 초기 로드 시점에도 보정
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bindBookChipsToFlowEditor);
} else {
  bindBookChipsToFlowEditor();
}

// 초기/재렌더 훅 연결(중복 호출 허용, 내부에서 자체 가드)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bindFlowEditorToBookChips);
} else {
  bindFlowEditorToBookChips();
}
document.addEventListener('wbp:treeBuilt', bindFlowEditorToBookChips);

// === [BOOK-CHIPS DIRECT BIND → 내용흐름 편집기 동일 기능] ================
function rebindBookChipsToFlowEditor(){
  const tree = document.getElementById('tree');
  if(!tree) return;

  // 열린 책 하나만 허용
  const openedBooks = [...tree.querySelectorAll('details.book[open]')];
  if(openedBooks.length > 1){
    alert('2개 이상 성경이 열려 있습니다. 한 권만 연 다음 시도하세요.');
    return;
  }

  const bookEl = openedBooks[0] || tree.querySelector('#tree > details.book');
  if(!bookEl) return;

  // 1장 첫 단락
  const ch1 = bookEl.querySelector(':scope > .chapters > details') || bookEl.querySelector('details');
  const p1  = ch1?.querySelector(':scope > .paras > details.para') || ch1?.querySelector('details.para');
  if(!p1) return;

  // ‘내용흐름’ 버튼 (편집기 원본 트리거)
  const flowBtn =
    p1.querySelector('.ptoolbar [data-action="flow"]') ||
    p1.querySelector('.ptoolbar .btn-flow') ||
    [...p1.querySelectorAll('.ptoolbar button')].find(b => (b.textContent||'').trim() === '내용흐름');
  if(!flowBtn) return;

  // 기본이해·내용구조·메세지요약 칩 (여러 형태 대응)
  const chips = [
    ...document.querySelectorAll(
      '.chip-basic, .chip-structure, .chip-summary, ' +
      '.book-chip[data-type="basic"], .book-chip[data-type="structure"], .book-chip[data-type="summary"]'
    )
  ];
  if(!chips.length) return;

  chips.forEach(chip=>{
    // 중복 방지
    if(chip.dataset.flowBound==='1') return;
    chip.dataset.flowBound='1';

    // 모든 기존 이벤트 제거 후 새로 바인딩
    const newChip = chip.cloneNode(true);
    chip.parentNode.replaceChild(newChip, chip);

    newChip.addEventListener('click', (e)=>{
      e.preventDefault();
      e.stopPropagation();

      const nowOpen = [...tree.querySelectorAll('details.book[open]')];
      if(nowOpen.length > 1){
        alert('편집기는 한 권만 열린 상태에서 사용할 수 있습니다.');
        return;
      }

      // 내용흐름 편집기 그대로 사용
      flowBtn.click();

      // 편집기 제목 교체
      setTimeout(()=>{
        const dlg =
          document.querySelector('.flow-editor-modal') ||
          document.querySelector('.editor-modal') ||
          document.querySelector('.wbp-editor') ||
          document.querySelector('.modal');
        const titleEl =
          dlg?.querySelector('.modal-title') ||
          dlg?.querySelector('.editor-title') ||
          dlg?.querySelector('.title');
        if(titleEl){
          titleEl.textContent = newChip.textContent.trim();
        }
      },100);
    });
  });
}
// ==========================================================================

// 렌더 완료 후 1회 연결
document.addEventListener('wbp:treeBuilt', rebindBookChipsToFlowEditor);

// 초기 DOM 로드 시점에도 실행
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded', rebindBookChipsToFlowEditor);
}else{
  rebindBookChipsToFlowEditor();
}

})();
