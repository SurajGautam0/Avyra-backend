const COLORS = ['#6c5ce7','#00b894','#0984e3','#fdcb6e','#e17055','#a29bfe'];
let dashboardData = null;

function setText(id,v) { const e=document.getElementById(id);if(e) e.textContent=v; }

async function loadDashboard() {
  try {
    const students = await apiRequest('/consultant/crm/students');
    const insights = await apiRequest('/consultant/insights');
    const pendingDocs = await apiRequest('/consultant/documents/pending');
    dashboardData = { students, insights, pendingDocs };
    updateKPI();
    renderRevenueChart();
    renderSchedule();
    renderRequests();
    renderProgress();
    const pending = getPendingCount();
    setText('pendingCount',pending+' Pending');
    setText('sidebarPending',pending);
    const el=document.getElementById('lastUpdated');
    if(el) el.textContent='Updated just now';
  } catch(e) { console.error('Dashboard error:',e); }
}

function updateKPI() {
  const s=dashboardData.students?.students||[];
  const active=s.filter(x=>x.status==='active').length;
  const pending=dashboardData.pendingDocs?.queue?.length||0;
  const ins=dashboardData.insights||{};
  setText('statMeetings',ins.todayMeetings??5);
  setText('statRevenue','$'+((ins.monthlyRevenue||5800).toLocaleString()));
  setText('statPendingRequests',pending);
  setText('statActiveStudents',active);
}

function getPendingCount() { return dashboardData?.pendingDocs?.queue?.length||0; }

function renderRevenueChart() {
  const data=dashboardData.insights?.revenueHistory||
    [{month:'Jan',count:3200},{month:'Feb',count:3400},{month:'Mar',count:3600},
     {month:'Apr',count:4200},{month:'May',count:4600},{month:'Jun',count:5800}];
  const c=document.getElementById('revenueChart');if(!c)return;
  c.innerHTML='';const vals=data.map(d=>Number(d.count)||0);const max=Math.max(...vals,1);
  data.forEach((d,i)=>{
    const pct=(Number(d.count)/max)*100;const b=document.createElement('div');
    b.className='bar';b.style.height=Math.max(pct,4)+'%';
    b.style.background=COLORS[i%COLORS.length];
    b.innerHTML='<div class="bar-value">$'+d.count.toLocaleString()+'</div><div class="bar-label">'+d.month+'</div>';
    c.appendChild(b);
  });
}

function renderSchedule() {
  const sched=dashboardData.insights?.schedule||
    [{title:'Sarah Johnson',time:'10:00 AM',type:'Video Call',status:'upcoming'},
     {title:'Rahul Gupta',time:'12:00 PM',type:'Online',status:'upcoming'},
     {title:'Emma Clarke',time:'2:00 PM',type:'In-Person',status:'pending'},
     {title:'Li Wei',time:'4:00 PM',type:'Video Call',status:'upcoming'},
     {title:'Fatima Al-Zahra',time:'5:30 PM',type:'Online',status:'upcoming'}];
  const c=document.getElementById('scheduleList');if(!c)return;
  c.innerHTML='';const icons=['📹','💻','🤝','📹','💻'];
  sched.forEach((s,i)=>{
    const item=document.createElement('div');item.className='schedule-item';
    const st=s.status||'upcoming';
    item.innerHTML='<div class="schedule-time">'+s.time+'</div><div class="schedule-info"><strong>'+
      s.title+'</strong><small>'+s.type+'</small></div><span class="status-chip '+st+'">'+st+'</span>';
    c.appendChild(item);
  });
}

function renderRequests() {
  const reqs=dashboardData.students?.requests||
    [{name:'Alex Thompson',detail:'MBA in Australia',time:'2h ago',color:'#6c5ce7'},
     {name:'Ananya Singh',detail:'UK Student Visa',time:'4h ago',color:'#00b894'},
     {name:'Carlos Reyes',detail:'Canada PR Pathway',time:'1d ago',color:'#0984e3'}];
  const c=document.getElementById('newRequests');if(!c)return;
  c.innerHTML='';reqs.forEach(r=>{
    const item=document.createElement('div');item.className='request-item';
    const initial=(r.name||'?').charAt(0).toUpperCase();
    item.innerHTML='<div class="request-avatar" style="background:'+(r.color||COLORS[0])+';">'+
      initial+'</div><div class="request-info"><strong>'+r.name+'</strong><span>'+
      r.detail+'</span></div><div class="request-meta">'+r.time+'</div>';
    c.appendChild(item);
  });
}

function renderProgress() {
  const students=dashboardData.students?.students||
    [{name:'Sarah Johnson',detail:'Univ. of Melbourne',progress:80,status:'In Review'},
     {name:'Rahul Gupta',detail:'UCL London',progress:92,status:'Offer Received'},
     {name:'Emma Clarke',detail:'Univ. of Toronto',progress:62,status:'Docs Pending'},
     {name:'Li Wei',detail:'ETH Zurich',progress:100,status:'Visa Applied'}];
  const c=document.getElementById('progressList');if(!c)return;
  c.innerHTML='';const colors=['#6c5ce7','#00b894','#0984e3','#fdcb6e'];
  students.slice(0,4).forEach((s,i)=>{
    const item=document.createElement('div');item.className='progress-item';
    const pct=Math.min(s.progress||0,100);
    item.innerHTML='<div class="progress-info"><strong>'+s.name+'</strong><small>'+
      (s.status||'')+'</small></div><span>'+s.detail+'</span><div class="progress-bar"><div class="progress-fill" style="width:'+
      pct+'%;background:'+colors[i%colors.length]+';"></div></div>';
    c.appendChild(item);
  });
}

// Navigation
document.querySelectorAll('.nav-item').forEach(item=>{
  item.addEventListener('click',e=>{
    e.preventDefault();
    document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
    item.classList.add('active');
    const sec=document.getElementById('section-'+item.dataset.section);
    if(sec){ document.querySelectorAll('.section').forEach(s=>s.classList.remove('active')); sec.classList.add('active'); }
    if (item.dataset.section === 'chat' && typeof ChatApp !== 'undefined' && !ChatApp.socket) {
      const user = getUser();
      if (user) ChatApp.init(user);
    }
  });
});

// Mobile toggle
const mt=document.getElementById('mobileToggle');
if(mt) mt.addEventListener('click',()=>document.getElementById('sidebar').classList.toggle('open'));

document.getElementById('logoutBtn')?.addEventListener('click',logout);
document.getElementById('refreshBtn')?.addEventListener('click',loadDashboard);

const user=getUser();
if(user){
  setText('consultantName',user.displayName||'Consultant');
  setText('consultantEmail',user.email||'');
  setText('greetingName',user.displayName||'Dr. Priya');
  const av=document.getElementById('consultantAvatar');
  if(av) av.textContent=(user.displayName||'P').charAt(0).toUpperCase();
}
loadDashboard();
