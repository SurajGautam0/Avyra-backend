const COLORS = ['#6c5ce7','#00b894','#0984e3','#fdcb6e','#e17055','#a29bfe','#55efc4','#74b9ff'];
let dashboardData = null;

function formatDate(d) {
  const n=new Date(d);const now=new Date();const diff=Math.floor((now-n)/1000);
  if(diff<60)return'just now';if(diff<3600)return Math.floor(diff/60)+'m ago';
  if(diff<86400)return Math.floor(diff/3600)+'h ago';
  return Math.floor(diff/86400)+'d ago';
}

async function loadDashboard() {
  try {
    dashboardData = await apiRequest('/admin/dashboard');
    updateKPI();
    renderChart();
    renderCountries();
    renderActivity();
    renderPrograms();
    const el=document.getElementById('lastUpdated');
    if(el) el.textContent='Updated '+formatDate(new Date());
  } catch(e) { console.error('Dashboard error:',e); }
}

function updateKPI() {
  const o=dashboardData?.overview||{};
  const roles=dashboardData?.roleDistribution||[];
  const consultantCount=roles.find(r=>r.role==='consultant')?.count||0;
  setText('statTotalUsers', (o.totalUsers||0).toLocaleString());
  setText('statUniversities', (o.totalUniversities||0).toLocaleString());
  setText('statConsultants', consultantCount.toLocaleString());
  setText('statRevenue', o.monthlyRevenue?'$'+(o.monthlyRevenue).toLocaleString():'—');
}

function setText(id,v) { const e=document.getElementById(id);if(e) e.textContent=v; }

function renderChart() {
  const data=dashboardData?.monthlySignups?.slice(-6)||
    [{month:'Jan',count:18000},{month:'Feb',count:22000},{month:'Mar',count:21000},
     {month:'Apr',count:26000},{month:'May',count:30000},{month:'Jun',count:33500}];
  const c=document.getElementById('signupsChart');if(!c)return;
  c.innerHTML='';const vals=data.map(d=>Number(d.count)||0);const max=Math.max(...vals,1);
  data.forEach((d,i)=>{
    const pct=(Number(d.count)/max)*100;const b=document.createElement('div');
    b.className='bar';b.style.height=Math.max(pct,4)+'%';
    b.style.background=COLORS[i%COLORS.length];
    b.innerHTML='<div class="bar-value">'+d.count.toLocaleString()+'</div><div class="bar-label">'+d.month+'</div>';
    c.appendChild(b);
  });
}

function renderCountries() {
  const countries=dashboardData?.topCountries||
    [{name:'India',value:1840,percent:88},{name:'China',value:1420,percent:68},
     {name:'Nepal',value:980,percent:47},{name:'Pakistan',value:760,percent:36},
     {name:'Bangladesh',value:540,percent:25},{name:'Other',value:2100,percent:100}];
  const c=document.getElementById('topCountries');if(!c)return;
  c.innerHTML='';countries.forEach(d=>{
    const item=document.createElement('div');item.className='country-item';
    item.innerHTML='<div class="country-info"><div class="name">'+d.name+'</div><div class="count">'+
      d.value.toLocaleString()+' users</div></div><div class="country-bar"><div class="fill" style="width:'+
      Math.min(d.percent,100)+'%;background:'+COLORS[0]+';"></div></div><div class="country-pct">'+d.percent+'%</div>';
    c.appendChild(item);
  });
}

function renderActivity() {
  const events=dashboardData?.recentActivity||
    [{title:'Sarah Johnson registered as a new student',time:'2 min ago'},
     {title:'University of Toronto listed 3 new programs',time:'15 min ago'},
     {title:'Payment of $75.00 processed for Dr. Priya Sharma',time:'32 min ago'},
     {title:'Rahul Gupta accepted offer from Univ. of Melbourne',time:'1 hr ago'},
     {title:'James Williams verified as a new consultant',time:'2 hrs ago'}];
  const c=document.getElementById('recentActivity');if(!c)return;
  c.innerHTML='';const icons=['📝','🏛️','💳','🎓','✅'];
  events.forEach((e,i)=>{
    const item=document.createElement('div');item.className='list-item';
    item.innerHTML='<div class="list-icon" style="background:'+COLORS[i%COLORS.length]+'20;color:'+
      COLORS[i%COLORS.length]+';">'+icons[i%icons.length]+'</div><div class="list-content"><strong>'+
      e.title+'</strong></div><div class="list-meta">'+e.time+'</div>';
    c.appendChild(item);
  });
}

function renderPrograms() {
  const programs=dashboardData?.popularPrograms||
    [{name:'MBA Programs',count:312},{name:'MSc Computer Science',count:248},
     {name:'Engineering',count:196},{name:'Data Science',count:184},{name:'Medicine',count:142}];
  const c=document.getElementById('popularPrograms');if(!c)return;
  c.innerHTML='';const max=Math.max(...programs.map(p=>p.count),1);
  programs.forEach((p,i)=>{
    const item=document.createElement('div');item.className='list-item';
    const pct=(p.count/max)*100;
    item.innerHTML='<div class="list-content"><strong>'+p.name+'</strong></div><div class="list-meta"><strong>'+
      p.count+'</strong> apps</div>';
    item.style.background='linear-gradient(90deg,'+COLORS[i%COLORS.length]+
      '10 0%,'+COLORS[i%COLORS.length]+'10 '+pct+'%,transparent '+pct+'%)';
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
  });
});

// Mobile toggle
const mt=document.getElementById('mobileToggle');
if(mt) mt.addEventListener('click',()=>document.getElementById('sidebar').classList.toggle('open'));

document.getElementById('logoutBtn')?.addEventListener('click',logout);
document.getElementById('refreshBtn')?.addEventListener('click',loadDashboard);

const user=getUser();
if(user){
  setText('adminName',user.displayName||'Admin');
  setText('adminEmail',user.email||'');
  const av=document.getElementById('adminAvatar');
  if(av) av.textContent=(user.displayName||'A').charAt(0).toUpperCase();
}
loadDashboard();
