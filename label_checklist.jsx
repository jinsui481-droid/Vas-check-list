import { useState, useEffect, useRef } from "react";

/* ── Firebase 설정 ── */
const FB_CONFIG = {
  apiKey: "AIzaSyCRXUeFzVpKheSYGierBQABrdusz5864q4",
  authDomain: "vas-checklist.firebaseapp.com",
  databaseURL: "https://vas-checklist-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "vas-checklist",
  storageBucket: "vas-checklist.firebasestorage.app",
  messagingSenderId: "30911495604",
  appId: "1:30911495604:web:1a1c36a2ad4f13fc7b86e1"
};
const SHEET_URL = "https://script.google.com/macros/s/AKfycbwEyfVDxR_oUVAfdBjHmlLyiAXLo31Mv14auWR4B95pP0z0gLyvutzTMMyTJJzo3OfD/exec";

/* ── Firebase SDK 동적 로드 ── */
let _db = null;
async function getDB() {
  if (_db) return _db;
  const { initializeApp, getApps } = await import("https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js");
  const { getDatabase } = await import("https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js");
  const app = getApps().length ? getApps()[0] : initializeApp(FB_CONFIG);
  _db = getDatabase(app);
  return _db;
}

/* ── Firebase 쓰기 ── */
async function fbSet(path, data) {
  try {
    const db = await getDB();
    const { ref, set } = await import("https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js");
    await set(ref(db, path), data);
  } catch(e) { console.error("fbSet error:", e); }
}
async function fbPush(path, data) {
  try {
    const db = await getDB();
    const { ref, push } = await import("https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js");
    await push(ref(db, path), data);
  } catch(e) { console.error("fbPush error:", e); }
}

/* ── Firebase 실시간 구독 ── */
async function fbOn(path, cb) {
  try {
    const db = await getDB();
    const { ref, onValue } = await import("https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js");
    onValue(ref(db, path), snap => {
      const val = snap.val();
      cb(val ? Object.values(val) : []);
    });
  } catch(e) { console.error("fbOn error:", e); }
}
async function fbOnRaw(path, cb) {
  try {
    const db = await getDB();
    const { ref, onValue } = await import("https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js");
    onValue(ref(db, path), snap => cb(snap.val()));
  } catch(e) { console.error("fbOnRaw error:", e); }
}

/* ── 구글 시트 전송 ── */
async function toSheet(type, data) {
  if (!SHEET_URL || SHEET_URL === "__SHEET_URL__") return;
  try {
    await fetch(SHEET_URL, {
      method: "POST",
      body: JSON.stringify({ type, ...data }),
      headers: { "Content-Type": "text/plain" }
    });
  } catch(e) { console.error("toSheet error:", e); }
}


const DEFAULT_PIN = "7742";
const MASTER_CODE = "dw790202@@"; // 분실 대비 복구 코드 (진수님만 보관, 변경 불가)
const BK=[[1030,1045],[1145,1245],[1430,1445],[1600,1615],[1745,1800]];
const NET_WORK_HOURS=7;

/* ── 색상 ── */
const C={
  bg:"#0f1117",sur:"#1a1d27",card:"#22263a",bor:"#2e3350",
  acc:"#f5a623",red:"#e74c3c",grn:"#2ecc71",orn:"#f39c12",blu:"#3498db",
  txt:"#e8eaf0",mut:"#7a7f9a"
};

/* ── 체크리스트 기본 데이터 ── */
const CL0={
s1:[
  {t:"작업가이드 라벨이미지·피킹지 품명·로트 3종 일치 확인",d:"작업가이드의 라벨이미지, 피킹지의 품명·로트번호, 실제 부착할 라벨이 모두 일치하는지 확인한다.",r:true},
  {t:"작업대 위 라벨은 1개 품목만 비치",d:"외관이 유사한 화장품·생활용품 라벨은 혼입 위험이 높다. 반드시 1종만 올려놓는다.",r:true},
  {t:"품목 전환 시 이전 라벨 전량 수거 후 다음 작업 시작",d:"이전 품목 라벨을 지정 보관함에 넣은 것을 눈으로 확인한 후 다음 품목 라벨을 꺼낸다.",r:true},
  {t:"피킹지와 부착 라벨 시간당 1회 재대조",d:"피킹지의 품명·로트·유효일자와 부착 중인 라벨을 시간당 1회 이상 재확인한다.",r:false},
  {t:"작업 완료 후 샘플 1개 품명·로트·유효일자 최종 확인",d:"샘플 1개를 꺼내 라벨의 품명, 로트번호, 유효일자를 피킹지와 대조한다.",r:false}
],
s2:[
  {t:"작업 전 피킹지 수량과 라벨 매수 일치 확인",d:"피킹지 작업 수량과 준비된 라벨 매수가 일치하는지 사전에 확인한다.",r:true},
  {t:"부착 완료품 즉시 별도 구역 이동",d:"외관 유사 제품이 많아 미완료품과 섞이면 재확인이 어렵다. 즉시 분리한다.",r:false},
  {t:"광택·투명 용기 라벨 부착 여부 각도 바꿔 이중 확인",d:"반사·투명 소재가 많아 정면에서만 보면 미부착을 놓칠 수 있다. 측면 각도에서 재확인한다.",r:false},
  {t:"작업 종료 후 잔여 라벨 + 완성품 = 피킹지 수량 대조",d:"세 수량의 합이 맞지 않으면 미부착이 있다는 신호다. 전수 재확인 후 관리자 보고.",r:false},
  {t:"60분 이상 연속 작업 시 교대·휴식 요청",d:"집중력 저하는 미부착의 주원인. 교대 인력 활용을 적극 요청한다.",r:false}
],
s3:[
  {t:"위치 기준 샘플 작업대 정면 비치 확인",d:"기준 샘플 또는 위치 도식이 작업대 정면에 있는지 확인한다.",r:true},
  {t:"로트번호·유효일자 인쇄 위치 가리지 않게 부착",d:"화장품법 필수 표기사항이다. 라벨이 해당 인쇄 부위를 절대 가리지 않도록 확인한다.",r:true},
  {t:"첫 5개 부착 후 위치·방향·로트 노출 여부 자체 검사",d:"기준 샘플과 위치·방향 비교 후 로트번호·유효일자가 가려지지 않았는지 확인한다.",r:false},
  {t:"라벨 방향(상하·좌우) 확인 후 부착",d:"라벨 상단 방향을 제품 기준으로 정렬 후 부착. 거꾸로·옆으로 부착 주의.",r:false},
  {t:"부착 후 들뜸·기포·접힘 확인 및 재압착",d:"곡면 용기는 가장자리 들뜸이 발생하기 쉽다. 부착 후 전체 면을 눌러 밀착 확인.",r:false}
],
s4:[
  {t:"작업 시작 전 피킹지·작업가이드 수령 확인",d:"품목명, 수량, 로트번호, 유효일자, 부착 위치 지침을 피킹지와 작업가이드에서 확인한다.",r:false},
  {t:"작업대 청결 및 이전 라벨 잔여물 완전 제거",d:"이전 품목 라벨 잔여물, 먼지가 없는지 확인한다. 유사 외관 화장품 혼입 특히 주의.",r:false},
  {t:"재작업 발생 시 유형 구분하여 즉시 관리자 보고",d:"교차부착·미부착·오부착 중 유형을 구분하고 수량을 파악하여 즉시 보고한다.",r:false}
]};

const SECS=[
  {id:"s1",label:"위험",lc:C.red,bc:"#3d1a1a",title:"① 라벨 교차부착 방지"},
  {id:"s2",label:"주의",lc:C.orn,bc:"#3a2d0f",title:"② 라벨 미부착 방지"},
  {id:"s3",label:"주의",lc:C.orn,bc:"#3a2d0f",title:"③ 오부착 방지"},
  {id:"s4",label:"기본",lc:C.grn,bc:"#0f3020",title:"④ 공통 점검"}
];

const TYPES=["교차부착","미부착","오부착"];
const T_COLOR={"교차부착":"#ff6b6b","미부착":C.orn,"오부착":C.blu};
const T_BG={"교차부착":"#3d1a1a","미부착":"#3a2d0f","오부착":"#0d2535"};

const EDU=[
  {icon:"🔄",title:"교차부착 — 왜 일어나나?",
   items:["작업대에 2종 이상 라벨이 동시에 올라가 있는 경우","이전 품목 라벨 수거 안 하고 다음 품목 작업 시작","외관이 비슷한 라벨을 확인 없이 집어 부착","피킹지·작업가이드 미확인 상태로 라벨 개봉"],
   tip:"작업대에는 지금 작업하는 품목 라벨 1종만. 품목이 바뀌면 수거 먼저."},
  {icon:"⬜",title:"미부착 — 왜 일어나나?",
   items:["부착 완료품·미완료품이 같은 공간에 섞임","광택·투명 용기에서 라벨이 눈에 띄지 않음","단순 반복 장시간 지속으로 집중력 저하","수량 대조 없이 작업 마감"],
   tip:"부착 즉시 완료 구역으로 이동. 작업 끝나면 잔여라벨+완성품=피킹지 수량 확인."},
  {icon:"📍",title:"오부착 — 왜 일어나나?",
   items:["위치 기준 샘플이 없거나 잘 안 보이는 곳에 있음","처음 5개 확인 없이 대량 작업 진행","라벨 방향 혼동 (상하 반전, 좌우 오류)","로트번호·유효일자 인쇄 위치 인지 부족"],
   tip:"기준 샘플은 항상 작업대 정면에. 처음 5개 붙이고 로트·유효일자 노출 여부 함께 확인."},
  {icon:"📦",title:"세트화·기획화 작업 주의사항",
   items:["구성 품목별 로트를 피킹지와 1:1 개별 대조","품목별 구역 분리로 혼입 방지","세트 라벨이 로트·유효일자 가리지 않는지 확인","완성품 샘플 1개 전 구성 품목·라벨 최종 검수"],
   tip:"세트화·기획화는 단품 라벨 부착보다 확인 단계가 더 많다. 빠르게 하려다 재작업이 발생하면 오히려 더 느려진다."}
];

/* ── 유틸 ── */
function gs(k){try{const v=localStorage.getItem(k);return v?JSON.parse(v):null;}catch(e){return null;}}
function ss(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
function toMin(v){const s=String(parseInt(v)||0).padStart(4,"0");return parseInt(s.slice(0,2))*60+parseInt(s.slice(2));}
function calcNet(sv,ev){
  const s=toMin(sv),e=toMin(ev);
  if(e<=s)return null;
  let tot=e-s,bm=0;
  BK.forEach(([b0,b1])=>{
    const bs=Math.floor(b0/100)*60+(b0%100),be=Math.floor(b1/100)*60+(b1%100);
    const ov=Math.min(e,be)-Math.max(s,bs);
    if(ov>0)bm+=ov;
  });
  return {tot,bm,net:tot-bm};
}
function todayStr(){const n=new Date();return `${n.getFullYear()}.${n.getMonth()+1}.${n.getDate()}.`;}

function exportCSV(type,data,showToastFn,setCsvViewFn){
  if(!data.length){showToastFn&&showToastFn("데이터가 없습니다","#f39c12");return;}
  var hdr=type==="rw"
    ?["날짜","작업자","품목","유형","수량","원인","상태"]
    :["날짜","작업자","품목","작업명","투입인원","시작","종료","완료","전체","결과","순수작업분","총공수"];
  var rows=type==="rw"
    ?data.map(function(x){return [x.dt,x.w,x.it,x.type,x.qty,x.note,x.st];})
    :data.map(function(x){return [x.dt,x.w,x.it,x.job||"",x.hc||"",x.ws||"",x.we||"",x.d,x.a,x.f?"완료":"미완료",x.net||"",x.mm?Math.round(x.mm/60*10)/10:""];});
  function esc(c){
    var s=String(c==null?"":c);
    if(s.indexOf(",")>=0||s.indexOf('"')>=0||s.indexOf("\n")>=0){
      return '"'+s.split('"').join('""')+ '"';
    }
    return s;
  }
  var csv=hdr.map(esc).join(",")+"\n"+rows.map(function(r){return r.map(esc).join(",");}).join("\n");
  var fname=(type==="rw"?"rework":"checklist")+"_"+Date.now()+".csv";
  var downloaded=false;
  try{
    var blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
    if(window.navigator&&window.navigator.msSaveBlob){
      window.navigator.msSaveBlob(blob,fname);downloaded=true;
    }else{
      var url=URL.createObjectURL(blob);
      var a=document.createElement("a");
      a.href=url;a.download=fname;a.style.display="none";
      document.body.appendChild(a);a.click();
      setTimeout(function(){document.body.removeChild(a);URL.revokeObjectURL(url);},100);
      downloaded=true;
    }
  }catch(e){downloaded=false;}
  // Claude 인앱 브라우저 등 다운로드가 막힌 환경 대비: 항상 텍스트 뷰어도 제공
  setCsvViewFn&&setCsvViewFn({title:fname,content:csv,downloaded:downloaded});
}

/* ── 공통 컴포넌트 ── */
function Row({children,style={}}){
  return <div style={{display:"flex",alignItems:"center",gap:8,...style}}>{children}</div>;
}
function Lbl({children}){
  return <span style={{fontSize:10,color:C.mut,width:56,flexShrink:0}}>{children}</span>;
}
function Inp({value,onChange,placeholder,type="text",maxLength,inputMode,readOnly,style={}}){
  return <input value={value} onChange={onChange} placeholder={placeholder} type={type}
    maxLength={maxLength} inputMode={inputMode} readOnly={readOnly}
    style={{background:C.sur,border:`1px solid ${C.bor}`,borderRadius:7,padding:"7px 10px",
      color:C.txt,fontFamily:"inherit",fontSize:12,outline:"none",width:"100%",...style}}/>;
}
function Btn({children,onClick,bg,color="#000",disabled,style={}}){
  return <button onClick={onClick} disabled={disabled}
    style={{padding:12,fontFamily:"inherit",fontSize:12,fontWeight:900,border:"none",borderRadius:10,
      cursor:disabled?"not-allowed":"pointer",width:"100%",marginTop:6,background:bg,color,
      opacity:disabled?0.3:1,...style}}>{children}</button>;
}
function Card({children,style={}}){
  return <div style={{background:C.card,border:`1px solid ${C.bor}`,borderRadius:12,
    marginBottom:12,overflow:"hidden",...style}}>{children}</div>;
}
function CardH({children,style={}}){
  return <div style={{display:"flex",alignItems:"center",gap:8,padding:"11px 14px",
    background:C.sur,borderBottom:`1px solid ${C.bor}`,...style}}>{children}</div>;
}
function Badge({label,lc,bc}){
  return <span style={{fontSize:9,fontWeight:900,padding:"3px 7px",borderRadius:99,
    background:bc,color:lc,border:`1px solid ${lc}`,flexShrink:0}}>{label}</span>;
}
function SmallBtn({children,onClick,bg,color="#fff",style={}}){
  return <button onClick={onClick} style={{padding:"4px 9px",fontSize:9,fontWeight:700,
    borderRadius:6,cursor:"pointer",border:"none",background:bg,color,fontFamily:"inherit",...style}}>
    {children}</button>;
}
function Modal({open,onClose,title,titleColor=C.txt,children}){
  if(!open)return null;
  return <div onClick={e=>e.target===e.currentTarget&&onClose()}
    style={{position:"fixed",inset:0,background:"rgba(0,0,0,.82)",zIndex:500,
      display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
    <div style={{background:C.sur,borderRadius:"16px 16px 0 0",width:"100%",maxWidth:640,
      padding:"20px 16px 32px",maxHeight:"88vh",overflowY:"auto"}}>
      <div style={{fontSize:14,fontWeight:900,marginBottom:12,color:titleColor}}>{title}</div>
      {children}
    </div>
  </div>;
}
function MbtnsRow({onCancel,onOk,okLabel="확인",okBg=C.blu}){
  return <Row style={{marginTop:12,gap:8}}>
    <Btn onClick={onCancel} bg={C.card} color={C.mut}
      style={{flex:1,border:`1px solid ${C.bor}`,marginTop:0}}>취소</Btn>
    <Btn onClick={onOk} bg={okBg} color="#fff" style={{flex:2,marginTop:0}}>{okLabel}</Btn>
  </Row>;
}
function Toast({msg,color}){
  if(!msg)return null;
  return <div style={{position:"fixed",bottom:140,left:"50%",transform:"translateX(-50%)",
    background:color,color:"#000",fontWeight:700,fontSize:12,padding:"10px 20px",
    borderRadius:99,boxShadow:"0 4px 20px rgba(0,0,0,.5)",zIndex:999,whiteSpace:"nowrap"}}>
    {msg}</div>;
}
function Fab({children,onClick,bg,color="#fff",bottom}){
  return <button onClick={onClick} style={{position:"fixed",bottom,right:18,zIndex:150,
    border:"none",borderRadius:99,padding:"11px 16px",fontFamily:"inherit",fontSize:11,
    fontWeight:900,cursor:"pointer",boxShadow:"0 4px 16px rgba(0,0,0,.4)",background:bg,color}}>
    {children}</button>;
}
function PinModal({open,onClose,onOk,title="PIN 확인"}){
  const [v,setV]=useState("");
  return <Modal open={open} onClose={()=>{setV("");onClose();}} title={title} titleColor={C.blu}>
    <Inp value={v} onChange={e=>setV(e.target.value)} placeholder="••••" type="password"
      maxLength={4} style={{textAlign:"center",letterSpacing:8,fontSize:16,marginBottom:4}}/>
    <MbtnsRow onCancel={()=>{setV("");onClose();}} onOk={()=>{onOk(v);setV("");}}/>
  </Modal>;
}

/* ── 메인 앱 ── */
export default function App(){
  const now=todayStr();
  const [tab,setTab]=useState("cl");

  /* 체크리스트 state */
  const initSecs=()=>{
    const saved=gs("clData");
    const base=saved||CL0;
    const mk=arr=>(arr||[]).map(i=>({...i,checked:false,id:Math.random()}));
    return {s1:mk(base.s1),s2:mk(base.s2),s3:mk(base.s3),s4:mk(base.s4)};
  };
  const [secs,setSecs]=useState(initSecs);
  const [col,setCol]=useState({s1:false,s2:false,s3:false,s4:false});
  // PIN (관리자 기기 localStorage에 저장, 기본값 7742)
  const [pin,setPin]=useState(()=>gs("adminPin")||DEFAULT_PIN);
  const savePin=p=>{setPin(p);ss("adminPin",p);};
  const [pinChgOpen,setPinChgOpen]=useState(false);
  const [pinCur,setPinCur]=useState("");
  const [pinNew,setPinNew]=useState("");
  const [pinNew2,setPinNew2]=useState("");
  // PIN 검증: 현재 PIN 또는 마스터 복구 코드 둘 다 통과
  const checkPin=v=>v===pin||v===MASTER_CODE;

  const [editMode,setEditMode]=useState(false);
  const editModeRef=useRef(false);
  useEffect(()=>{editModeRef.current=editMode;},[editMode]);

  /* 교육 탭 편집 */
  const [edu,setEdu]=useState(()=>gs("eduData")||EDU);
  const [eduEdit,setEduEdit]=useState(false);
  const eduEditRef=useRef(false);
  useEffect(()=>{eduEditRef.current=eduEdit;},[eduEdit]);
  const [eduPinOpen,setEduPinOpen]=useState(false);
  const [eduModal,setEduModal]=useState(null); // {idx} 또는 {add:true}
  const [emIcon,setEmIcon]=useState("📌");
  const [emTitle,setEmTitle]=useState("");
  const [emItems,setEmItems]=useState("");
  const [emTip,setEmTip]=useState("");
  const ICONS=["📌","🔄","⬜","📍","📦","⚠️","✅","🏷️","🔍","📋","💡","🚫","👀","🎯","⏱️","🧷","📐","🧴","♻️","🔔"];
  const saveEdu=n=>{setEdu(n);ss("eduData",n);fbSet("eduData/current",n);};
  const [editPinOpen,setEditPinOpen]=useState(false);

  /* 항목 편집 모달 */
  const [ciModal,setCiModal]=useState(null);
  const [ciT,setCiT]=useState("");
  const [ciD,setCiD]=useState("");

  /* 서명 폼 */
  const [form,setForm]=useState({name:"",item:"",job:"",hc:"",ws:"",date:now});

  /* 재작업 */
  const [rwOpen,setRwOpen]=useState(false);
  const [rwType,setRwType]=useState(-1);
  const [rwF,setRwF]=useState({w:"",it:"",qty:"",note:""});

  /* 작업 마감 */
  const [closeOpen,setCloseOpen]=useState(false);
  const [closeTarget,setCloseTarget]=useState(null);
  const [closeEnd,setCloseEnd]=useState("");
  const [closeQty,setCloseQty]=useState("");
  const [closeInfo,setCloseInfo]=useState("");

  /* 이력 */
  const [hist,setHist]=useState(()=>gs("lh")||[]);
  const [rwhist,setRwhist]=useState(()=>gs("rw")||[]);

  // Firebase 실시간 구독 (마운트 시 1회)
  useEffect(()=>{
    fbOn("checklist",(data)=>{
      const sorted=[...data].sort((a,b)=>b.ts-a.ts);
      setHist(sorted);
      ss("lh",sorted);
    });
    fbOn("rework",(data)=>{
      const sorted=[...data].sort((a,b)=>b.ts-a.ts);
      setRwhist(sorted);
      ss("rw",sorted);
    });
    fbOn("pace",(data)=>{
      if(data&&data[0])setPace(data[0]);
    });
    // 체크리스트 항목 정의 실시간 구독
    fbOnRaw("clData/current",(data)=>{
      if(data&&!editModeRef.current){
        ss("clData",data);
        const mk=arr=>(arr||[]).map(i=>({...i,checked:false,id:Math.random()}));
        setSecs({s1:mk(data.s1),s2:mk(data.s2),s3:mk(data.s3),s4:mk(data.s4)});
      }
    });
    // 교육 내용 실시간 구독
    fbOnRaw("eduData/current",(data)=>{
      if(data&&!eduEditRef.current){
        ss("eduData",data);
        setEdu(Array.isArray(data)?data:Object.values(data));
      }
    });
  },[]);

  /* 관리자 */
  const [mgrPinOpen,setMgrPinOpen]=useState(false);
  const [mgrIn,setMgrIn]=useState(false);
  // 작업별 목표 설정: { "품목::작업명": {wage:일당, price:단가} } - 관리자 기기에만 저장
  // 작업 목표 설정 모달: 제출된 작업(hist) 1건을 선택해 wage/price/completed 입력
  const [cfgModal,setCfgModal]=useState(null); // 선택된 작업 ts
  const [cfgWage,setCfgWage]=useState("");
  const [cfgPrice,setCfgPrice]=useState("");
  const [cfgDone,setCfgDone]=useState("");
  // 목표 UPD = 일당 ÷ 단가 (손익분기)
  const targetUPDof=rec=>{
    if(!rec||!rec.wage||!rec.price)return 0;
    return Math.round((parseFloat(rec.wage)||0)/(parseFloat(rec.price)||1));
  };
  // 현재 페이스 = 현재완료 ÷ 경과순수작업h × 7h (현재시각 기준)
  const livePaceOf=rec=>{
    if(!rec||!rec.ws||rec.completed==null||rec.completed==="")return null;
    const endRef=rec.we||nowHHMM();
    const r=calcNet(rec.ws,endRef);
    if(!r||r.net<=0)return null;   // 시작 전이면 페이스 계산 불가(완료수량 있어도)
    const cmp=parseInt(rec.completed)||0;
    const pacePerHour=cmp/(r.net/60);
    const projUPD=Math.round(pacePerHour*NET_WORK_HOURS);
    return {netMin:r.net,breakMin:r.bm,pacePerHour,projUPD};
  };
  // 목표 페이스 기준, 현재 시각까지 나와야 할 기대 수량
  const expectedOf=rec=>{
    const tgt=targetUPDof(rec);
    if(!rec||!rec.ws||tgt<=0)return null;
    const endRef=rec.we||nowHHMM();
    const r=calcNet(rec.ws,endRef);
    const totalNet=NET_WORK_HOURS*60;
    // 아직 시작 전이거나 경과 0이면 기대 0개로 표시 (null로 빠지지 않게)
    const netMin=(r&&r.net>0)?r.net:0;
    const expected=Math.round(tgt*(netMin/totalNet));
    return {netMin,expected,totalNet};
  };
  const nowHHMM=()=>{const n=new Date();return String(n.getHours()).padStart(2,"0")+String(n.getMinutes()).padStart(2,"0");};

  /* 토스트 */
  const [toast,setToast]=useState({msg:"",color:""});
  const [csvView,setCsvView]=useState(null);
  const showToast=(msg,color=C.grn)=>{
    setToast({msg,color});
    setTimeout(()=>setToast({msg:"",color:""}),3000);
  };

  /* 진행률 */
  const allItems=Object.values(secs).flat();
  const done=allItems.filter(i=>i.checked).length;
  const total=allItems.length;

  /* 체크리스트 저장 */
  const saveSecs=n=>{
    const data={
      s1:n.s1.map(({t,d,r})=>({t,d,r})),
      s2:n.s2.map(({t,d,r})=>({t,d,r})),
      s3:n.s3.map(({t,d,r})=>({t,d,r})),
      s4:n.s4.map(({t,d,r})=>({t,d,r}))
    };
    ss("clData",data);
    // Firebase에 항목 정의 저장 → 전체 기기 실시간 반영
    fbSet("clData/current",data);
  };

  const toggle=(sid,id)=>setSecs(s=>({...s,[sid]:s[sid].map(i=>i.id===id?{...i,checked:!i.checked}:i)}));

  /* 제출 */
  const submitCL=()=>{
    if(!form.name||!form.item){showToast("이름과 품목을 입력하세요",C.red);return;}
    const rec={w:form.name,it:form.item,job:form.job,hc:form.hc||"N/A",
      ws:form.ws,we:"",dt:form.date,d:done,a:total,f:done===total,ts:Date.now()};
    // localStorage (오프라인 대비)
    const h=[rec,...hist];setHist(h);ss("lh",h);
    // Firebase 저장
    fbPush("checklist",rec);
    // 구글 시트 전송
    toSheet("체크리스트제출",rec);
    setForm({name:"",item:"",job:"",hc:"",ws:"",date:now});
    setSecs(initSecs());
    showToast("✅ 제출 완료! 안전한 작업 시작하세요.");
  };

  /* 마감 */
  const openClose=()=>{
    const pending=hist.filter(x=>!x.we);
    if(!pending.length){showToast("미마감 작업이 없습니다",C.orn);return;}
    setCloseTarget(pending[0].ts);
    setCloseEnd("");setCloseInfo("");
    setCloseOpen(true);
  };

  const calcClose=(ev,ts)=>{
    const rec=hist.find(x=>x.ts===(ts||closeTarget));
    if(!rec||!rec.ws||ev.length<3){setCloseInfo("");return;}
    const r=calcNet(rec.ws,ev);
    if(!r){setCloseInfo("종료시간이 시작시간보다 빠릅니다");return;}
    const hc=parseInt(rec.hc)||1;
    const mm=r.net*hc;
    setCloseInfo(`시작 ${rec.ws} → 종료 ${ev} | 총근무 ${Math.floor(r.tot/60)}h${r.tot%60}m | 휴게 ${r.bm}m 제외 | 순수작업 ${Math.floor(r.net/60)}h${r.net%60}m | ${hc}명 × ${Math.round(mm/60*10)/10}인·시간`);
  };

  const submitClose=()=>{
    if(!closeTarget){showToast("마감할 작업을 선택하세요",C.red);return;}
    if(closeEnd.length<3){showToast("종료시간을 입력하세요",C.red);return;}
    const h=[...hist];
    const idx=h.findIndex(x=>x.ts===closeTarget);
    if(idx>=0){
      const rec=h[idx];
      const r=rec.ws?calcNet(rec.ws,closeEnd):null;
      const hc=parseInt(rec.hc)||1;
      const updated={...rec,we:closeEnd,completed:closeQty!==""?closeQty:rec.completed,closeQty:closeQty,net:r?r.net:0,mm:r?r.net*hc:0};
      h[idx]=updated;
      setHist(h);ss("lh",h);
      // Firebase 업데이트
      (async()=>{
        const db=await getDB();
        const {ref,get,update}=await import("https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js");
        const snap=await get(ref(db,"checklist"));
        if(snap.exists()){
          snap.forEach(child=>{
            if(child.val().ts===closeTarget){
              update(ref(db,"checklist/"+child.key),{we:updated.we,completed:updated.completed,net:updated.net,mm:updated.mm});
            }
          });
        }
      })();
      // 구글 시트 전송
      toSheet("작업마감",updated);
    }
    setCloseOpen(false);setCloseTarget(null);setCloseEnd("");setCloseQty("");setCloseInfo("");
    showToast("🏁 작업 마감 완료!");
  };

  /* 재작업 */
  const submitRW=()=>{
    if(rwType<0){showToast("유형을 선택하세요",C.red);return;}
    if(!rwF.w||!rwF.it){showToast("이름과 품목을 입력하세요",C.red);return;}
    const rec={w:rwF.w,it:rwF.it,qty:rwF.qty||"N/A",note:rwF.note||"-",
      rtype:TYPES[rwType],dt:now,st:"대기",ts:Date.now()};
    const rw=[rec,...rwhist];setRwhist(rw);ss("rw",rw);
    // Firebase 저장
    fbPush("rework",rec);
    // 구글 시트 전송
    toSheet("재작업신고",rec);
    setRwOpen(false);setRwType(-1);setRwF({w:"",it:"",qty:"",note:""});
    showToast("📋 재작업 신고 완료",C.blu);
  };

  /* 관리자 - 재작업 승인/반려 */
  const mgrAct=(ts,approve)=>{
    const st=approve?"승인":"반려";
    const rw=rwhist.map(x=>x.ts===ts?{...x,st}:x);
    setRwhist(rw);ss("rw",rw);
    // Firebase 업데이트
    (async()=>{
      const db=await getDB();
      const {ref,get,update}=await import("https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js");
      const snap=await get(ref(db,"rework"));
      if(snap.exists()){
        snap.forEach(child=>{
          if(child.val().ts===ts) update(ref(db,"rework/"+child.key),{st});
        });
      }
    })();
    showToast(approve?"승인 처리":"반려 처리",approve?C.grn:C.red);
  };

  const TABS=[["cl","✅ 체크"],["goal","🎯 목표"],["edu","📚 교육"],["rw","⚠️ 재작업"],["mgr","🔑 관리자"]];

  /* ── 렌더 ── */
  return <div style={{background:C.bg,minHeight:"100vh",color:C.txt,fontFamily:"sans-serif",paddingBottom:80}}>

    {/* 헤더 */}
    <div style={{background:C.sur,borderBottom:`2px solid ${C.acc}`,padding:"14px 18px",
      display:"flex",alignItems:"center",gap:12,position:"sticky",top:0,zIndex:200}}>
      <div style={{width:36,height:36,background:C.acc,borderRadius:8,display:"flex",
        alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>🏷</div>
      <div>
        <div style={{fontSize:15,fontWeight:900}}>라벨 부착 작업 관리</div>
        <div style={{fontSize:10,color:C.mut,marginTop:2}}>유통가공 현장</div>
      </div>
    </div>

    {/* 진행바 */}
    <div style={{background:C.sur,padding:"10px 18px 12px",borderBottom:`1px solid ${C.bor}`}}>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.mut,marginBottom:5}}>
        <span>체크리스트 진행률</span>
        <b style={{color:C.acc}}>{done}/{total}</b>
      </div>
      <div style={{height:5,background:C.bor,borderRadius:99,overflow:"hidden"}}>
        <div style={{height:"100%",background:`linear-gradient(90deg,${C.acc},#f7c948)`,
          borderRadius:99,transition:"width .4s",width:total?`${Math.round(done/total*100)}%`:"0%"}}/>
      </div>
    </div>

    {/* 탭 */}
    <div style={{display:"flex",background:C.sur,borderBottom:`1px solid ${C.bor}`,overflowX:"auto"}}>
      {TABS.map(([t,label])=>(
        <div key={t} onClick={()=>setTab(t)}
          style={{flex:1,minWidth:72,padding:"10px 3px",textAlign:"center",fontSize:10,fontWeight:700,
            color:tab===t?C.acc:C.mut,cursor:"pointer",borderBottom:`3px solid ${tab===t?C.acc:"transparent"}`,
            whiteSpace:"nowrap"}}>
          {label}
        </div>
      ))}
    </div>

    {/* ── 체크리스트 탭 ── */}
    {tab==="cl"&&<div style={{padding:12,maxWidth:640,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:10}}>
        <button onClick={()=>{
            if(editMode){setEditMode(false);}
            else{setEditPinOpen(true);}
          }}
          style={{padding:"6px 12px",background:editMode?"rgba(52,152,219,.15)":C.card,
            border:`1px solid ${C.blu}`,borderRadius:99,fontSize:10,fontWeight:700,
            color:C.blu,cursor:"pointer"}}>
          {editMode?"✅ 편집 완료":"✏️ 항목 편집"}
        </button>
      </div>

      {SECS.map(sec=>{
        const items=secs[sec.id];
        const ck=items.filter(i=>i.checked).length;
        const collapsed=col[sec.id];
        return <Card key={sec.id}>
          <CardH style={{cursor:"pointer",userSelect:"none"}}
            onClick={()=>setCol(c=>({...c,[sec.id]:!c[sec.id]}))}>
            <Badge label={sec.label} lc={sec.lc} bc={sec.bc}/>
            <span style={{fontSize:13,fontWeight:700,flex:1,color:C.txt}}>{sec.title}</span>
            <span style={{fontSize:10,color:C.mut}}>{ck}/{items.length}</span>
            <span style={{fontSize:11,color:C.mut,transition:"transform .2s",
              transform:collapsed?"rotate(-90deg)":"none"}}>▼</span>
          </CardH>
          {!collapsed&&<div>
            {items.map((item,idx)=>(
              <div key={item.id}
                onClick={()=>!editMode&&toggle(sec.id,item.id)}
                style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 14px",
                  borderBottom:`1px solid ${C.bor}`,
                  cursor:editMode?"default":"pointer",
                  opacity:item.checked?0.5:1}}>
                <div style={{width:22,height:22,flexShrink:0,
                  border:`2px solid ${item.checked?C.grn:C.bor}`,
                  borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:13,marginTop:1,
                  background:item.checked?C.grn:"transparent",color:"#000"}}>
                  {item.checked?"✓":""}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:700,lineHeight:1.4,color:C.txt}}>
                    {item.t}
                    {item.r&&<span style={{fontSize:9,fontWeight:700,padding:"2px 5px",
                      borderRadius:99,marginLeft:4,background:"#3d1a1a",color:"#ff6b6b",
                      verticalAlign:"middle"}}>필수</span>}
                  </div>
                  <div style={{fontSize:10,color:C.mut,marginTop:3,lineHeight:1.5}}>{item.d}</div>
                </div>
                {editMode&&<div style={{display:"flex",gap:4,flexShrink:0}}>
                  <SmallBtn bg={C.blu} onClick={e=>{e.stopPropagation();
                    setCiModal({sid:sec.id,idx});setCiT(item.t);setCiD(item.d);}}>수정</SmallBtn>
                  <SmallBtn bg={C.red} onClick={e=>{e.stopPropagation();
                    const n={...secs,[sec.id]:secs[sec.id].filter((_,i)=>i!==idx)};
                    setSecs(n);saveSecs(n);}}>삭제</SmallBtn>
                </div>}
              </div>
            ))}
            {editMode&&<button onClick={()=>{setCiModal({sid:sec.id,add:true});setCiT("");setCiD("");}}
              style={{width:"100%",padding:8,background:"rgba(46,204,113,.1)",
                border:`1px solid ${C.grn}`,borderRadius:8,color:C.grn,
                fontFamily:"inherit",fontSize:11,fontWeight:700,cursor:"pointer"}}>
              + 항목 추가</button>}
          </div>}
        </Card>;
      })}

      {/* 서명란 */}
      <Card style={{padding:"16px 14px"}}>
        <div style={{fontSize:12,fontWeight:700,marginBottom:10,color:C.acc}}>📝 작업자 확인 서명</div>
        {[["name","작업자","이름 입력","text"],["item","작업 품목","품목명 입력","text"],
          ["job","작업명","라벨부착, 세트구성 등","text"],["hc","투입인원","명","number"],
          ["ws","시작시간","0900","text"]].map(([id,lbl,ph,type])=>(
          <Row key={id} style={{marginBottom:8}}>
            <Lbl>{lbl}</Lbl>
            <Inp value={form[id]||""} onChange={e=>setForm(f=>({...f,[id]:e.target.value}))}
              placeholder={ph} type={type}
              maxLength={id==="ws"?4:undefined}
              inputMode={id==="ws"?"numeric":undefined}/>
          </Row>
        ))}
        <Row style={{marginBottom:8}}>
          <Lbl>날짜</Lbl>
          <Inp value={form.date} readOnly style={{opacity:.7}}/>
        </Row>
        <Btn onClick={submitCL} bg={C.acc} disabled={done<total}>
          ✅ 체크리스트 제출 및 작업 시작</Btn>
      </Card>
    </div>}

    {/* ── 목표 현황 탭 (전체 공개) ── */}
    {tab==="goal"&&(()=>{
      // 오늘 작업 = 마감 안 됐거나 오늘 제출된 작업 중 목표(wage/price) 설정된 것 우선 노출
      const _today=(()=>{const n=new Date();return `${n.getFullYear()}.${n.getMonth()+1}.${n.getDate()}.`;})();
      const jobs=hist.filter(x=>x.wage&&x.price&&x.dt===_today);
      return <div style={{padding:12,maxWidth:640,margin:"0 auto"}}>
        {jobs.length===0
          ?<Card style={{padding:"24px 14px",textAlign:"center"}}>
            <div style={{fontSize:13,fontWeight:700,color:C.txt,marginBottom:6}}>설정된 목표가 없습니다</div>
            <div style={{fontSize:11,color:C.mut,lineHeight:1.6}}>오늘 목표가 등록되면<br/>여기에 표시됩니다.</div>
          </Card>
          :jobs.map(x=>{
            const tgt=targetUPDof(x);
            const lp=livePaceOf(x);
            const ex=expectedOf(x);
            const cur=lp?lp.projUPD:null;            // 현재 페이스(완료수량 있을 때)
            const expected=ex?ex.expected:null;       // 현재 시각 기대 수량
            const actual=(x.completed!=null&&x.completed!=="")?parseInt(x.completed)||0:null;
            const rate=(tgt>0&&cur!=null)?Math.round(cur/tgt*100):null;
            const col=rate==null?C.acc:(rate>=100?C.grn:rate>=90?C.orn:C.red);
            const ended=!!x.we;
            // 실제 vs 기대 비교 색상
            return <Card key={x.ts}>
              <CardH style={{justifyContent:"space-between"}}>
                <span style={{fontSize:13,fontWeight:700,color:C.txt}}>{x.it}{x.job?` · ${x.job}`:""}</span>
                <span style={{fontSize:10,color:C.mut}}>{x.w} · {ended?"마감":"진행중"}</span>
              </CardH>
              <div style={{padding:"14px"}}>
                {/* 핵심: 지금 시각 기준 페이스 안내 (D+C: 초반 측정중 / 이후 담담한 정보형) */}
                {expected!=null
                  ?(expected<10
                    ?<div style={{background:C.sur,borderRadius:10,padding:"14px",marginBottom:12,textAlign:"center"}}>
                      <div style={{fontSize:13,fontWeight:700,color:C.acc,marginBottom:3}}>페이스 측정 중</div>
                      <div style={{fontSize:11,color:C.mut}}>작업이 진행되면 이 시각 기준 페이스가 표시됩니다</div>
                    </div>
                    :<div style={{background:C.sur,borderRadius:10,padding:"12px 14px",marginBottom:12}}>
                      <div style={{fontSize:10,color:C.mut,marginBottom:4}}>이 시각({nowHHMM().slice(0,2)}:{nowHHMM().slice(2)}) 페이스 기준</div>
                      <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                        <span style={{fontSize:32,fontWeight:900,color:C.acc,lineHeight:1}}>약 {expected}</span>
                        <span style={{fontSize:13,color:C.mut}}>개 진행</span>
                      </div>
                      {actual!=null&&(()=>{
                        const ratio=expected>0?actual/expected:1;
                        // 경고색은 기대보다 한참(80% 미만) 적을 때만, 그 외엔 중립/긍정
                        const barCol=ratio>=1?C.grn:ratio>=0.8?C.acc:C.orn;
                        const msg=ratio>=1?"순항 중":ratio>=0.8?"좋은 페이스":"조금만 더";
                        return <div style={{marginTop:10}}>
                          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:4}}>
                            <span style={{color:C.mut}}>실제 완료</span>
                            <span style={{fontWeight:700,color:barCol}}>{actual}개</span>
                          </div>
                          <div style={{height:10,background:C.bor,borderRadius:99,overflow:"hidden"}}>
                            <div style={{height:"100%",width:`${Math.min(100,ratio*100)}%`,background:barCol,borderRadius:99,transition:"width .4s"}}/>
                          </div>
                          <div style={{fontSize:11,color:barCol,fontWeight:700,textAlign:"right",marginTop:4}}>{msg}</div>
                        </div>;
                      })()}
                    </div>)
                  :<div style={{fontSize:11,color:C.mut,marginBottom:12}}>목표 UPD가 설정되면 시각별 페이스가 표시됩니다.</div>}

                {/* 페이스 (완료수량 있을 때) */}
                <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:4}}>
                  <span style={{fontSize:28,fontWeight:900,color:col,lineHeight:1}}>{cur!=null?cur:"—"}</span>
                  <span style={{fontSize:15,fontWeight:700,color:C.mut}}>/ {tgt} UPD</span>
                </div>
                <div style={{fontSize:10,color:C.mut,marginBottom:rate!=null?8:10}}>예상 마감 페이스 / 목표 페이스</div>
                {rate!=null&&<>
                  <div style={{height:8,background:C.bor,borderRadius:99,overflow:"hidden",marginBottom:6}}>
                    <div style={{height:"100%",width:`${Math.min(100,rate)}%`,background:col,borderRadius:99,transition:"width .4s"}}/>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:11,fontWeight:700,color:col,marginBottom:10}}>
                    <span>이 페이스로 마감 시 {rate}%</span>
                    <span>{rate>=100?"목표 달성 ✓":rate>=90?"근접":"분발 필요"}</span>
                  </div>
                </>}

                {/* 시간 정보 */}
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.mut,borderTop:`1px solid ${C.bor}`,paddingTop:8}}>
                  <span>시작 {x.ws||"-"}{ended?` → ${x.we}`:""}</span>
                  <span>{(()=>{const nm=lp?lp.netMin:(ex?ex.netMin:0);return nm>0?`순수작업 ${Math.floor(nm/60)}h${nm%60}m`:"작업 시작 전";})()}</span>
                  <span>{actual!=null?`완료 ${actual}개`:"수량 미입력"}</span>
                </div>
              </div>
            </Card>;
          })}


      </div>;
    })()}

    {/* ── 교육 탭 ── */}
    {tab==="edu"&&<div style={{padding:12,maxWidth:640,margin:"0 auto"}}>
      {/* 편집 모드 토글 */}
      <button onClick={()=>{
        if(eduEdit){setEduEdit(false);}
        else{setEduPinOpen(true);}
      }} style={{width:"100%",padding:"10px",marginBottom:12,borderRadius:8,border:"none",
        background:eduEdit?C.grn:C.card,color:eduEdit?"#000":C.mut,
        fontSize:12,fontWeight:700,cursor:"pointer"}}>
        {eduEdit?"✅ 편집 완료":"✏️ 교육 내용 편집 (관리자)"}
      </button>

      {edu.map((e,i)=>(
        <Card key={i}>
          <CardH style={{justifyContent:"space-between"}}>
            <span style={{fontSize:13,fontWeight:700,color:C.txt}}>{e.icon?e.icon+" ":""}{e.title}</span>
            {eduEdit&&<div style={{display:"flex",gap:4,flexShrink:0}}>
              <SmallBtn bg={C.blu} onClick={()=>{
                setEduModal({idx:i});setEmIcon(e.icon||"📌");setEmTitle(e.title);
                setEmItems((e.items||[]).join("\n"));setEmTip(e.tip||"");
              }}>수정</SmallBtn>
              <SmallBtn bg={C.red} onClick={()=>{
                saveEdu(edu.filter((_,j)=>j!==i));showToast("카드 삭제됨",C.red);
              }}>삭제</SmallBtn>
            </div>}
          </CardH>
          <div style={{padding:"12px 14px"}}>
            <ul style={{listStyle:"none",marginBottom:10}}>
              {(e.items||[]).map((it,j)=>(
                <li key={j} style={{display:"flex",gap:8,padding:"6px 0",
                  borderBottom:`1px solid ${C.bor}`,fontSize:11,lineHeight:1.5,color:C.txt}}>
                  <div style={{background:C.acc,color:"#000",fontSize:9,fontWeight:900,width:17,height:17,
                    borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",
                    flexShrink:0,marginTop:1}}>{j+1}</div>
                  <div>{it}</div>
                </li>
              ))}
            </ul>
            <div style={{background:"rgba(245,166,35,.08)",border:"1px solid rgba(245,166,35,.3)",
              borderRadius:8,padding:"9px 11px",fontSize:11,lineHeight:1.6,color:C.txt}}>
              <strong style={{color:C.acc}}>✔ 핵심:</strong> {e.tip}
            </div>
          </div>
        </Card>
      ))}

      {eduEdit&&<button onClick={()=>{
        setEduModal({add:true});setEmIcon("📌");setEmTitle("");setEmItems("");setEmTip("");
      }} style={{width:"100%",padding:"12px",borderRadius:8,border:`1px dashed ${C.bor}`,
        background:"transparent",color:C.acc,fontSize:12,fontWeight:700,cursor:"pointer"}}>
        + 교육 카드 추가
      </button>}
    </div>}

    {/* ── 재작업 이력 탭 (작업자용) ── */}
    {tab==="rw"&&<div style={{padding:12,maxWidth:640,margin:"0 auto"}}>
      <Card>
        <CardH style={{justifyContent:"space-between"}}>
          <span style={{fontSize:13,fontWeight:700,color:C.txt}}>재작업 신고 이력</span>
          <SmallBtn bg={C.red} onClick={()=>exportCSV("rw",rwhist,showToast,setCsvView)}>CSV</SmallBtn>
        </CardH>
        {rwhist.length?rwhist.map((x,i)=>(
          <div key={i} style={{padding:"10px 14px",borderBottom:`1px solid ${C.bor}`}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
              <span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:99,
                background:T_BG[x.type]||"#3d1a1a",color:T_COLOR[x.type]||"#ff6b6b"}}>{x.type}</span>
              <Row style={{gap:6}}>
                <span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:99,
                  background:x.st==="승인"?"#0f3020":x.st==="반려"?"#3d1a1a":"#3a2d0f",
                  color:x.st==="승인"?C.grn:x.st==="반려"?C.red:C.orn}}>{x.st}</span>
                <SmallBtn bg="#3d1a1a" color={C.red} onClick={()=>{
                  const rw=rwhist.filter((_,j)=>j!==i);setRwhist(rw);ss("rw",rw);}}>삭제</SmallBtn>
              </Row>
            </div>
            <div style={{fontSize:11,color:C.mut}}>{x.w} / {x.it} / {x.qty}개 / {x.dt}</div>
            <div style={{fontSize:11,marginTop:4,color:C.txt}}>{x.note}</div>
          </div>
        )):<div style={{padding:"18px 14px",fontSize:11,color:C.mut,textAlign:"center"}}>신고 이력이 없습니다.</div>}
      </Card>
    </div>}

    {/* ── 관리자 탭 ── */}
    {tab==="mgr"&&<div style={{padding:12,maxWidth:640,margin:"0 auto"}}>
      {!mgrIn
        ?<Card style={{padding:24,textAlign:"center"}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:6,color:C.txt}}>관리자 전용</div>
          <div style={{fontSize:11,color:C.mut,marginBottom:16}}>PIN을 입력하세요</div>
          <Btn onClick={()=>setMgrPinOpen(true)} bg={C.acc}>로그인</Btn>
        </Card>
        :<>
          {/* PIN 관리 */}
          <Card style={{padding:"14px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.acc}}>관리자 PIN</div>
                <div style={{fontSize:9,color:C.mut,marginTop:2}}>현재 PIN: {pin.replace(/./g,"•")} (이 기기 저장)</div>
              </div>
              <SmallBtn bg={C.blu} color="#fff" onClick={()=>{setPinCur("");setPinNew("");setPinNew2("");setPinChgOpen(true);}}>변경</SmallBtn>
            </div>
          </Card>

          <Card style={{padding:"14px"}}>
            <div style={{fontSize:11,fontWeight:700,color:C.acc,marginBottom:4}}>작업별 목표·페이스 설정</div>
            <div style={{fontSize:9,color:C.mut,marginBottom:10,lineHeight:1.5}}>작업자가 제출한 작업을 선택해 인건비·작업단가·현재 완료수량을 입력하세요. 목표 UPD(= 일당 ÷ 단가)와 현재 페이스가 [목표] 탭에 자동 표시됩니다. 재무 정보는 이 기기에만 저장됩니다.</div>
            {hist.length===0
              ?<div style={{fontSize:11,color:C.mut,padding:"10px 0",textAlign:"center"}}>제출된 작업이 없습니다. 작업자가 체크리스트를 제출하면 여기에 표시됩니다.</div>
              :hist.map(x=>{
                const tgt=targetUPDof(x);
                const set=x.wage&&x.price;
                return <div key={x.ts} style={{background:C.sur,border:`1px solid ${set?C.grn:C.bor}`,borderRadius:8,padding:"11px",marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:700,color:C.txt}}>{x.it}{x.job?` · ${x.job}`:""}</div>
                      <div style={{fontSize:10,color:C.mut,marginTop:2}}>{x.w} · {x.dt} · 시작 {x.ws||"-"}{x.we?` → ${x.we}`:" (진행중)"}</div>
                      {set&&<div style={{fontSize:10,color:C.grn,marginTop:3}}>목표 {tgt} UPD · 완료 {x.completed!=null&&x.completed!==""?x.completed+"개":"미입력"}</div>}
                    </div>
                    <div style={{display:"flex",gap:4,flexShrink:0}}>
                      <SmallBtn bg={set?C.blu:C.acc} color={set?"#fff":"#000"}
                        onClick={()=>{setCfgModal(x.ts);setCfgWage(x.wage||"");setCfgPrice(x.price||"");setCfgDone(x.completed!=null?String(x.completed):"");}}>
                        {set?"수정":"설정"}</SmallBtn>
                      {set&&<SmallBtn bg="#3d1a1a" color={C.orn}
                        onClick={()=>{
                          const h=hist.map(r=>{if(r.ts!==x.ts)return r;const n={...r};delete n.wage;delete n.price;delete n.completed;return n;});
                          setHist(h);ss("lh",h);showToast("목표 설정 해제",C.orn);
                        }}>해제</SmallBtn>}
                      <SmallBtn bg="#3d1a1a" color={C.red}
                        onClick={()=>{
                          const h=hist.filter(r=>r.ts!==x.ts);
                          setHist(h);ss("lh",h);showToast("작업 삭제됨",C.red);
                        }}>삭제</SmallBtn>
                    </div>
                  </div>
                </div>;
              })}
          </Card>
          {/* 요약 */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
            {[[hist.length,"총 제출",C.txt],
              [hist.filter(x=>x.f).length,"100% 완료",C.grn],
              [hist.filter(x=>!x.f).length,"일부 미완료",C.orn],
              [rwhist.length,"재작업 신고",C.red],
              [rwhist.filter(x=>x.st==="대기").length,"미승인 대기",C.orn],
              [hist.filter(x=>x.mm).reduce((a,x)=>a+Math.round(x.mm/60*10)/10,0),"총 공수(인·시간)",C.blu]
            ].map(([n,l,c],i)=>(
              <div key={i} style={{background:C.card,border:`1px solid ${C.bor}`,
                borderRadius:10,padding:12,textAlign:"center"}}>
                <div style={{fontSize:22,fontWeight:900,color:c}}>{n}</div>
                <div style={{fontSize:10,color:C.mut,marginTop:3}}>{l}</div>
              </div>
            ))}
          </div>

          {/* 체크리스트 이력 (관리자만) */}
          <Card>
            <CardH style={{justifyContent:"space-between"}}>
              <span style={{fontSize:13,fontWeight:700,color:C.txt}}>체크리스트 제출 이력</span>
              <SmallBtn bg={C.grn} color="#000" onClick={()=>exportCSV("cl",hist,showToast,setCsvView)}>CSV</SmallBtn>
            </CardH>
            {hist.length?hist.map((x,i)=>(
              <div key={i} style={{padding:"10px 14px",borderBottom:`1px solid ${C.bor}`,
                display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,color:C.txt}}>
                    <b>{x.w}</b> / {x.it}{x.job?` / ${x.job}`:""}
                  </div>
                  <div style={{fontSize:10,color:C.mut,marginTop:2}}>
                    {x.dt}
                    {x.ws?` | ${x.ws}→${x.we||"미마감"}`:""}
                    {x.hc&&x.hc!=="N/A"?` | ${x.hc}명`:""}
                    {x.mm?` | ${Math.round(x.mm/60*10)/10}인·시간`:""}
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4,flexShrink:0}}>
                  <span style={{fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:99,
                    background:x.f?"#0f3020":"#3a2d0f",color:x.f?C.grn:C.orn}}>{x.d}/{x.a}</span>
                  <SmallBtn bg="#3d1a1a" color={C.red} onClick={()=>{
                    const h=hist.filter((_,j)=>j!==i);setHist(h);ss("lh",h);}}>삭제</SmallBtn>
                </div>
              </div>
            )):<div style={{padding:"18px 14px",fontSize:11,color:C.mut,textAlign:"center"}}>이력이 없습니다.</div>}
          </Card>

          {/* 재작업 승인 대기 */}
          <Card>
            <CardH style={{justifyContent:"space-between"}}>
              <span style={{fontSize:13,fontWeight:700,color:C.txt}}>승인 대기</span>
              <span style={{background:C.red,color:"#fff",fontSize:10,fontWeight:900,
                padding:"2px 8px",borderRadius:99}}>
                {rwhist.filter(x=>x.st==="대기").length}</span>
            </CardH>
            {rwhist.filter(x=>x.st==="대기").length
              ?rwhist.filter(x=>x.st==="대기").map(x=>(
                <div key={x.ts} style={{padding:"11px 14px",borderBottom:`1px solid ${C.bor}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                    <div>
                      <div style={{fontSize:12,fontWeight:700,color:C.txt}}>{x.w} / {x.it}</div>
                      <div style={{fontSize:10,color:C.mut,marginTop:2}}>{x.dt} / {x.qty}개</div>
                    </div>
                    <span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:99,
                      background:T_BG[x.type]||"#3d1a1a",color:T_COLOR[x.type]||"#ff6b6b"}}>{x.type}</span>
                  </div>
                  <div style={{fontSize:11,color:C.mut,marginBottom:8}}>{x.note}</div>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>mgrAct(x.ts,true)}
                      style={{flex:1,padding:7,background:C.grn,color:"#000",border:"none",
                        borderRadius:8,fontFamily:"inherit",fontSize:11,fontWeight:700,cursor:"pointer"}}>✅ 승인</button>
                    <button onClick={()=>mgrAct(x.ts,false)}
                      style={{flex:1,padding:7,background:C.card,color:C.red,
                        border:`1px solid ${C.red}`,borderRadius:8,fontFamily:"inherit",
                        fontSize:11,fontWeight:700,cursor:"pointer"}}>❌ 반려</button>
                  </div>
                </div>
              ))
              :<div style={{padding:"18px 14px",fontSize:11,color:C.mut,textAlign:"center"}}>대기 항목 없음</div>}
          </Card>

          {/* 처리 이력 */}
          <Card>
            <CardH style={{justifyContent:"space-between"}}>
              <span style={{fontSize:13,fontWeight:700,color:C.txt}}>재작업 처리 이력</span>
              <SmallBtn bg={C.orn} color="#000" onClick={()=>exportCSV("rw",rwhist,showToast,setCsvView)}>CSV</SmallBtn>
            </CardH>
            {rwhist.filter(x=>x.st!=="대기").length
              ?rwhist.filter(x=>x.st!=="대기").map((x,i)=>(
                <div key={i} style={{padding:"10px 14px",borderBottom:`1px solid ${C.bor}`,
                  display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontSize:12,color:C.txt}}>
                    <b>{x.w}</b> / {x.it} / {x.type}
                    <div style={{fontSize:10,color:C.mut,marginTop:2}}>{x.dt}</div>
                  </div>
                  <span style={{fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:99,
                    background:x.st==="승인"?"#0f3020":"#3d1a1a",
                    color:x.st==="승인"?C.grn:C.red,flexShrink:0}}>{x.st}</span>
                </div>
              ))
              :<div style={{padding:"18px 14px",fontSize:11,color:C.mut,textAlign:"center"}}>처리 이력 없음</div>}
          </Card>

          <button onClick={()=>setMgrIn(false)}
            style={{width:"100%",padding:10,background:C.card,color:C.mut,fontFamily:"inherit",
              fontSize:11,fontWeight:700,border:`1px solid ${C.bor}`,borderRadius:10,cursor:"pointer",marginTop:4}}>
            로그아웃</button>
        </>}
    </div>}

    {/* FAB */}
    <Fab onClick={openClose} bg={C.grn} color="#000" bottom={74}>🏁 작업 마감</Fab>
    <Fab onClick={()=>{setRwOpen(true);setRwType(-1);setRwF({w:"",it:"",qty:"",note:""},);}}
      bg={C.red} bottom={20}>⚠️ 재작업 신고</Fab>

    {/* ── 모달: 항목 편집 PIN ── */}
    <PinModal open={editPinOpen} onClose={()=>setEditPinOpen(false)}
      title="항목 편집 PIN"
      onOk={v=>{
        if(checkPin(v)){setEditMode(true);setEditPinOpen(false);}
        else showToast("PIN이 올바르지 않습니다",C.red);
      }}/>

    {/* ── 모달: 항목 내용 편집 ── */}
    <Modal open={!!ciModal} onClose={()=>setCiModal(null)} title="항목 편집" titleColor={C.blu}>
      <div style={{marginBottom:10}}>
        <div style={{fontSize:10,color:C.mut,marginBottom:4,fontWeight:700}}>항목명</div>
        <Inp value={ciT} onChange={e=>setCiT(e.target.value)}/>
      </div>
      <div style={{marginBottom:10}}>
        <div style={{fontSize:10,color:C.mut,marginBottom:4,fontWeight:700}}>설명</div>
        <textarea value={ciD} onChange={e=>setCiD(e.target.value)}
          style={{background:C.sur,border:`1px solid ${C.bor}`,borderRadius:7,
            padding:"7px 10px",color:C.txt,fontFamily:"inherit",fontSize:12,
            outline:"none",width:"100%",height:60,resize:"none"}}/>
      </div>
      <MbtnsRow onCancel={()=>setCiModal(null)} onOk={()=>{
        if(!ciT.trim()){showToast("항목명을 입력하세요",C.red);return;}
        if(ciModal.add){
          const n={...secs,[ciModal.sid]:[...secs[ciModal.sid],
            {t:ciT.trim(),d:ciD.trim(),r:false,checked:false,id:Math.random()}]};
          setSecs(n);saveSecs(n);
        } else {
          const n={...secs,[ciModal.sid]:secs[ciModal.sid].map((it,i)=>
            i===ciModal.idx?{...it,t:ciT.trim(),d:ciD.trim()}:it)};
          setSecs(n);saveSecs(n);
        }
        setCiModal(null);
      }} okLabel="저장"/>
    </Modal>

    {/* ── 모달: 재작업 신고 ── */}
    <Modal open={rwOpen} onClose={()=>setRwOpen(false)} title="재작업 발생 신고" titleColor={C.red}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
        {TYPES.map((t,i)=>(
          <div key={i} onClick={()=>setRwType(i)}
            style={{background:rwType===i?"#2a1212":C.card,
              border:`2px solid ${rwType===i?C.red:C.bor}`,
              borderRadius:10,padding:"10px 6px",textAlign:"center",cursor:"pointer"}}>
            <div style={{fontSize:20,marginBottom:3}}>{["🔄","⬜","📍"][i]}</div>
            <div style={{fontSize:10,fontWeight:700,color:C.txt}}>{t}</div>
          </div>
        ))}
      </div>
      {[["w","작업자","이름"],["it","품목","품목명"],["qty","수량","수량"]].map(([id,lbl,ph])=>(
        <Row key={id} style={{marginBottom:8}}>
          <Lbl>{lbl}</Lbl>
          <Inp value={rwF[id]} onChange={e=>setRwF(f=>({...f,[id]:e.target.value}))} placeholder={ph}/>
        </Row>
      ))}
      <Row style={{marginBottom:8,alignItems:"flex-start"}}>
        <Lbl style={{marginTop:8}}>원인</Lbl>
        <textarea value={rwF.note} onChange={e=>setRwF(f=>({...f,note:e.target.value}))}
          style={{background:C.sur,border:`1px solid ${C.bor}`,borderRadius:7,
            padding:"7px 10px",color:C.txt,fontFamily:"inherit",fontSize:12,
            outline:"none",width:"100%",height:56,resize:"none"}}/>
      </Row>
      <MbtnsRow onCancel={()=>setRwOpen(false)} onOk={submitRW}
        okLabel="신고 제출" okBg={C.red}/>
    </Modal>

    {/* ── 모달: 작업 마감 ── */}
    <Modal open={closeOpen} onClose={()=>setCloseOpen(false)} title="작업 마감" titleColor={C.grn}>
      <div style={{fontSize:11,color:C.mut,marginBottom:12}}>마감할 작업을 선택하고 종료시간을 입력하세요.</div>

      {/* 미마감 작업 목록 */}
      <div style={{marginBottom:12}}>
        <div style={{fontSize:10,color:C.mut,marginBottom:6,fontWeight:700}}>미마감 작업 선택</div>
        {hist.filter(x=>!x.we).length===0
          ?<div style={{fontSize:11,color:C.mut}}>미마감 작업이 없습니다.</div>
          :hist.filter(x=>!x.we).map(x=>(
            <div key={x.ts} onClick={()=>{setCloseTarget(x.ts);setCloseInfo("");}}
              style={{padding:"10px 12px",borderRadius:8,marginBottom:6,cursor:"pointer",
                border:`2px solid ${closeTarget===x.ts?C.grn:C.bor}`,
                background:closeTarget===x.ts?"rgba(46,204,113,.08)":C.card}}>
              <div style={{fontSize:12,fontWeight:700,color:C.txt}}>
                {x.w} · {x.it}{x.job?` · ${x.job}`:""}
              </div>
              <div style={{fontSize:10,color:C.mut,marginTop:2}}>
                {x.dt}{x.ws?` | 시작 ${x.ws}`:" | 시작시간 미기재"}
              </div>
            </div>
          ))
        }
      </div>

      {/* 종료시간 */}
      <div style={{marginBottom:10}}>
        <div style={{fontSize:10,color:C.mut,marginBottom:4,fontWeight:700}}>종료시간</div>
        <Inp value={closeEnd}
          onChange={e=>{setCloseEnd(e.target.value);calcClose(e.target.value,closeTarget);}}
          placeholder="1800" maxLength={4} inputMode="numeric"/>
      </div>

      {/* 완료 수량 (현장 입력 → 관리자와 더블체크) */}
      <div style={{marginBottom:10}}>
        <div style={{fontSize:10,color:C.mut,marginBottom:4,fontWeight:700}}>최종 완료 수량</div>
        <Inp value={closeQty} onChange={e=>setCloseQty(e.target.value)}
          placeholder="실제 처리한 개수" type="number" inputMode="numeric"/>
      </div>

      {/* 공수 계산 결과 */}
      {closeInfo&&<div style={{fontSize:11,padding:"10px 12px",lineHeight:1.8,
        background:"rgba(46,204,113,.08)",border:"1px solid rgba(46,204,113,.25)",
        borderRadius:8,marginBottom:4,color:C.txt}}>{closeInfo}</div>}

      <MbtnsRow onCancel={()=>setCloseOpen(false)} onOk={submitClose}
        okLabel="마감 저장" okBg={C.grn}/>
    </Modal>

    {/* ── 모달: 관리자 PIN ── */}
    <PinModal open={mgrPinOpen} onClose={()=>setMgrPinOpen(false)}
      title="관리자 PIN"
      onOk={v=>{
        if(checkPin(v)){setMgrIn(true);setMgrPinOpen(false);}
        else showToast("PIN이 올바르지 않습니다",C.red);
      }}/>

    {/* 작업 목표·페이스 설정 모달 */}
    {cfgModal!=null&&(()=>{
      const rec=hist.find(x=>x.ts===cfgModal);
      if(!rec)return null;
      const upd=(cfgWage&&cfgPrice)?Math.round(parseFloat(cfgWage)/parseFloat(cfgPrice)):0;
      // 미리보기 현재 페이스
      const endRef=rec.we||nowHHMM();
      const r=rec.ws?calcNet(rec.ws,endRef):null;
      const cmp=parseInt(cfgDone)||0;
      const curUPD=(r&&r.net>0&&cmp>0)?Math.round(cmp/(r.net/60)*NET_WORK_HOURS):null;
      return <Modal open={true} onClose={()=>setCfgModal(null)} title="작업 목표·페이스 설정" titleColor={C.blu}>
        <div style={{background:C.card,borderRadius:8,padding:"10px 12px",marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:700,color:C.txt}}>{rec.it}{rec.job?` · ${rec.job}`:""}</div>
          <div style={{fontSize:10,color:C.mut,marginTop:2}}>{rec.w} · {rec.dt} · 시작 {rec.ws||"-"}{rec.we?` → ${rec.we}`:" (진행중)"}</div>
        </div>
        <Row style={{marginBottom:8}}><Lbl>1인 일당</Lbl>
          <Inp value={cfgWage} onChange={e=>setCfgWage(e.target.value)} placeholder="원" type="number"/></Row>
        <Row style={{marginBottom:8}}><Lbl>작업단가</Lbl>
          <Inp value={cfgPrice} onChange={e=>setCfgPrice(e.target.value)} placeholder="개당 원" type="number"/></Row>
        <div style={{fontSize:11,fontWeight:700,color:upd>0?C.grn:C.mut,textAlign:"right",marginBottom:12}}>
          목표 UPD: {upd>0?upd:"-"} {upd>0?"(일당 ÷ 단가)":""}</div>
        <Row><Lbl>현재완료</Lbl>
          <Inp value={cfgDone} onChange={e=>setCfgDone(e.target.value)} placeholder="현재까지 완료 개수 (가끔 갱신)" type="number"/></Row>
        {curUPD!=null&&<div style={{fontSize:11,fontWeight:700,color:C.acc,textAlign:"right",marginTop:6}}>
          현재 페이스: {curUPD} UPD {upd>0?`(달성률 ${Math.round(curUPD/upd*100)}%)`:""}</div>}
        <div style={{fontSize:9,color:C.mut,marginTop:8,lineHeight:1.5}}>※ 현재 페이스는 점심·휴식 제외한 순수 작업시간과 현재 시각 기준으로 자동 계산됩니다. 완료 수량을 가끔 갱신하면 페이스가 실시간 반영됩니다.</div>
        <Row style={{marginTop:12,gap:8}}>
          <Btn onClick={()=>{
            const h=hist.map(x=>x.ts===cfgModal?{...x}:x);
            const i=h.findIndex(x=>x.ts===cfgModal);
            delete h[i].wage;delete h[i].price;delete h[i].completed;
            setHist(h);ss("lh",h);setCfgModal(null);showToast("목표 설정 해제",C.orn);
          }} bg={C.card} color={C.red} style={{flex:1,border:`1px solid ${C.red}`,marginTop:0}}>해제</Btn>
          <Btn onClick={()=>{
            const h=hist.map(x=>x.ts===cfgModal
              ?{...x,wage:cfgWage,price:cfgPrice,completed:cfgDone}:x);
            setHist(h);ss("lh",h);
            // Firebase 해당 레코드 업데이트
            (async()=>{
              const db=await getDB();
              const {ref,get,update}=await import("https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js");
              const snap=await get(ref(db,"checklist"));
              if(snap.exists()){
                snap.forEach(child=>{
                  if(child.val().ts===cfgModal) update(ref(db,"checklist/"+child.key),{wage:cfgWage,price:cfgPrice,completed:cfgDone});
                });
              }
            })();
            setCfgModal(null);showToast("저장 완료",C.grn);
          }} bg={C.blu} color="#fff" style={{flex:2,marginTop:0}}>저장</Btn>
        </Row>
      </Modal>;
    })()}

    {/* ── 모달: PIN 변경 ── */}
    <Modal open={pinChgOpen} onClose={()=>setPinChgOpen(false)} title="관리자 PIN 변경" titleColor={C.blu}>
      <div style={{marginBottom:10}}>
        <div style={{fontSize:10,color:C.mut,marginBottom:4,fontWeight:700}}>현재 PIN (또는 복구 코드)</div>
        <Inp value={pinCur} onChange={e=>setPinCur(e.target.value)} placeholder="현재 PIN" type="password"/>
      </div>
      <div style={{marginBottom:10}}>
        <div style={{fontSize:10,color:C.mut,marginBottom:4,fontWeight:700}}>새 PIN</div>
        <Inp value={pinNew} onChange={e=>setPinNew(e.target.value)} placeholder="새 PIN (숫자 4자리 권장)" inputMode="numeric"/>
      </div>
      <div style={{marginBottom:10}}>
        <div style={{fontSize:10,color:C.mut,marginBottom:4,fontWeight:700}}>새 PIN 확인</div>
        <Inp value={pinNew2} onChange={e=>setPinNew2(e.target.value)} placeholder="새 PIN 다시 입력" inputMode="numeric"/>
      </div>
      <div style={{fontSize:9,color:C.mut,lineHeight:1.5,background:C.sur,borderRadius:7,padding:"8px 10px"}}>
        PIN을 잊으면 복구 코드로 로그인 후 재설정할 수 있습니다. 복구 코드는 관리자가 별도 보관하세요. 변경된 PIN은 이 기기에만 저장됩니다.
      </div>
      <MbtnsRow onCancel={()=>setPinChgOpen(false)} onOk={()=>{
        if(!checkPin(pinCur)){showToast("현재 PIN이 올바르지 않습니다",C.red);return;}
        if(pinNew.length<4){showToast("새 PIN은 4자리 이상 입력하세요",C.red);return;}
        if(pinNew!==pinNew2){showToast("새 PIN이 일치하지 않습니다",C.red);return;}
        savePin(pinNew);
        setPinChgOpen(false);
        showToast("PIN이 변경되었습니다",C.grn);
      }} okLabel="변경" okBg={C.blu}/>
    </Modal>

    {/* ── 모달: 교육 편집 PIN ── */}
    <PinModal open={eduPinOpen} onClose={()=>setEduPinOpen(false)}
      title="교육 편집 PIN"
      onOk={v=>{
        if(checkPin(v)){setEduEdit(true);setEduPinOpen(false);}
        else showToast("PIN이 올바르지 않습니다",C.red);
      }}/>

    {/* ── 모달: 교육 카드 편집 ── */}
    <Modal open={!!eduModal} onClose={()=>setEduModal(null)} title="교육 카드 편집" titleColor={C.blu}>
      {/* 아이콘 선택 */}
      <div style={{marginBottom:10}}>
        <div style={{fontSize:10,color:C.mut,marginBottom:6,fontWeight:700}}>아이콘</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {ICONS.map(ic=>(
            <button key={ic} onClick={()=>setEmIcon(ic)}
              style={{width:38,height:38,borderRadius:8,fontSize:18,cursor:"pointer",
                background:emIcon===ic?C.acc:C.sur,
                border:`1px solid ${emIcon===ic?C.acc:C.bor}`}}>{ic}</button>
          ))}
        </div>
      </div>
      <div style={{marginBottom:10}}>
        <div style={{fontSize:10,color:C.mut,marginBottom:4,fontWeight:700}}>제목</div>
        <Inp value={emTitle} onChange={e=>setEmTitle(e.target.value)} placeholder="예: 교차부착 — 왜 일어나나?"/>
      </div>
      <div style={{marginBottom:10}}>
        <div style={{fontSize:10,color:C.mut,marginBottom:4,fontWeight:700}}>원인/내용 (한 줄에 하나씩)</div>
        <textarea value={emItems} onChange={e=>setEmItems(e.target.value)}
          placeholder={"줄바꿈으로 항목 구분\n예:\n작업대에 2종 이상 라벨 혼재\n이전 라벨 미수거"}
          style={{background:C.sur,border:`1px solid ${C.bor}`,borderRadius:7,
            padding:"7px 10px",color:C.txt,fontFamily:"inherit",fontSize:12,
            outline:"none",width:"100%",height:100,resize:"none"}}/>
      </div>
      <div style={{marginBottom:10}}>
        <div style={{fontSize:10,color:C.mut,marginBottom:4,fontWeight:700}}>핵심 팁</div>
        <textarea value={emTip} onChange={e=>setEmTip(e.target.value)}
          placeholder="✔ 핵심 으로 표시될 한 줄 요약"
          style={{background:C.sur,border:`1px solid ${C.bor}`,borderRadius:7,
            padding:"7px 10px",color:C.txt,fontFamily:"inherit",fontSize:12,
            outline:"none",width:"100%",height:50,resize:"none"}}/>
      </div>
      <MbtnsRow onCancel={()=>setEduModal(null)} onOk={()=>{
        if(!emTitle.trim()){showToast("제목을 입력하세요",C.red);return;}
        const card={icon:emIcon,title:emTitle.trim(),
          items:emItems.split("\n").map(s=>s.trim()).filter(Boolean),
          tip:emTip.trim()};
        if(eduModal.add){
          saveEdu([...edu,card]);showToast("카드 추가됨",C.grn);
        }else{
          saveEdu(edu.map((c,i)=>i===eduModal.idx?card:c));showToast("저장 완료",C.grn);
        }
        setEduModal(null);
      }} okLabel="저장" okBg={C.blu}/>
    </Modal>

    {csvView&&<Modal open={!!csvView} onClose={()=>setCsvView(null)} title="CSV 내보내기" titleColor={C.grn}>
      <div style={{fontSize:11,color:csvView.downloaded?C.grn:C.orn,marginBottom:8,lineHeight:1.5}}>
        {csvView.downloaded
          ?"✅ 다운로드를 시도했습니다. 파일이 안 보이면 아래 텍스트를 복사해 사용하세요."
          :"⚠️ 이 환경은 자동 다운로드가 제한됩니다. 아래 텍스트를 길게 눌러 전체 복사 후 메모장·엑셀에 붙여넣으세요."}
      </div>
      <div style={{fontSize:9,color:C.mut,marginBottom:6}}>파일명: {csvView.title}</div>
      <textarea readOnly value={csvView.content}
        onFocus={e=>e.target.select()}
        style={{background:C.bg,border:`1px solid ${C.bor}`,borderRadius:7,padding:"8px 10px",
          color:C.txt,fontFamily:"monospace",fontSize:10,width:"100%",height:200,resize:"none"}}/>
      <Btn onClick={()=>{
        try{
          if(navigator.clipboard&&navigator.clipboard.writeText){
            navigator.clipboard.writeText(csvView.content);
            showToast("클립보드에 복사됨",C.grn);
          }else{showToast("텍스트를 길게 눌러 복사하세요",C.orn);}
        }catch(e){showToast("텍스트를 길게 눌러 복사하세요",C.orn);}
      }} bg={C.blu} color="#fff" style={{marginTop:8}}>📋 클립보드 복사</Btn>
      <Btn onClick={()=>setCsvView(null)} bg={C.card} color={C.mut}
        style={{border:`1px solid ${C.bor}`,marginTop:6}}>닫기</Btn>
    </Modal>}
    <Toast {...toast}/>
  </div>;
}
