function $(id){return document.getElementById(id);}
function setText(id,v){const e=$(id);if(e)e.textContent=v;}
function formatDate(d){if(!d)return '-';const n=new Date(d);return n.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});}

async function loadDashboard() {
  try {
    const user=getUser();
    if(!user) return;
    setText('greetingName',user.displayName||'Student');
    setText('studentName',user.displayName||'Student');
    setText('studentEmail',user.email||'');
    const av=$('studentAvatar');
    if(av) av.textContent=(user.displayName||'S').charAt(0).toUpperCase();

    // Load applications for this user
    const appsRes=await apiRequest('/applications');
    const apps=appsRes.applications||[];
    const stageNames=['Profile','Docs','SOP','Shortlist','App','Offer','COE','Visa Docs','Visa App','Interview','Medical','Travel','Ready'];

    // Overview KPIs
    const activeApps=apps.filter(a=>a.status!=='rejected').length;
    const completedApps=apps.filter(a=>a.status==='accepted').length;
    $('studentOverview').innerHTML='<div class="kpi-row">'+
      '<div class="metric-card"><div class="metric-icon" style="background:rgba(108,92,231,0.1);color:#6c5ce7;">📋</div><span class="metric-label">Active Applications</span><div class="metric-value">'+activeApps+'</div></div>'+
      '<div class="metric-card"><div class="metric-icon" style="background:rgba(0,184,148,0.1);color:#00b894;">✅</div><span class="metric-label">Accepted</span><div class="metric-value">'+completedApps+'</div></div>'+
      '<div class="metric-card"><div class="metric-icon" style="background:rgba(116,185,255,0.1);color:#0984e3;">📄</div><span class="metric-label">Documents</span><div class="metric-value">—</div></div>'+
      '<div class="metric-card"><div class="metric-icon" style="background:rgba(253,203,110,0.15);color:#b7950b;">🛂</div><span class="metric-label">Visa</span><div class="metric-value">—</div></div>'+
      '</div>';

    // Applications list
    const appList=$('studentAppList');
    appList.innerHTML='';
    if(!apps.length){appList.innerHTML='<div style="padding:20px;text-align:center;color:var(--text-light)">No applications yet</div>';}
    else {
      apps.slice(0,3).forEach(a=>{
        const item=document.createElement('div');item.className='list-item';
        item.innerHTML='<div class="list-icon" style="background:'+['#6c5ce7','#00b894','#0984e3'][0]+'20;color:'+['#6c5ce7','#00b894','#0984e3'][0]+';">📋</div>'+
          '<div class="list-content"><strong>'+a.universityName+'</strong><span>'+a.courseName+'</span></div>'+
          '<div class="list-meta"><span class="status-badge status-'+a.status+'">'+a.status+'</span></div>';
        appList.appendChild(item);
      });
    }

    // Applications table
    const tbody=$('myAppsTable');
    tbody.innerHTML='';
    if(!apps.length){tbody.innerHTML='<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-light)">No applications. Start by applying to a university!</td></tr>';}
    else {
      apps.forEach(a=>{
        const tr=document.createElement('tr');
        tr.innerHTML='<td><strong>'+a.universityName+'</strong></td><td>'+a.courseName+'</td>'+
          '<td><span class="status-badge status-'+a.status+'">'+a.status+'</span></td>'+
          '<td>'+(stageNames[a.currentStage]||'—')+' ('+((a.currentStage||0))+'/12)</td>'+
          '<td><div class="progress-bar" style="width:80px"><div class="progress-fill" style="width:'+Math.round(((a.currentStage||0)/12)*100)+'%;background:#6c5ce7;"></div></div></td>';
        tbody.appendChild(tr);
      });
    }

    // Docs list placeholder
    const docList=$('studentDocList');
    docList.innerHTML='<div style="padding:20px;text-align:center;color:var(--text-light)">Upload documents to get started</div>';

    setText('lastUpdated','Updated '+new Date().toLocaleTimeString());
  } catch(e) { console.error('Student dashboard error:',e); }
}

// Navigation
document.querySelectorAll('.nav-item').forEach(item=>{
  item.addEventListener('click',e=>{
    e.preventDefault();
    document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
    item.classList.add('active');
    const sec=$('section-'+item.dataset.section);
    if(sec){document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));sec.classList.add('active');}
  });
});

$('mobileToggle')?.addEventListener('click',()=>$('sidebar').classList.toggle('open'));
$('logoutBtn')?.addEventListener('click',logout);
$('refreshBtn')?.addEventListener('click',loadDashboard);
loadDashboard();
