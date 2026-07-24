const COLORS = ['#6c5ce7','#00b894','#0984e3','#fdcb6e','#e17055','#a29bfe','#55efc4','#74b9ff'];
let dashboardData = null, growthChart = null, roleChart = null, stageChart = null;

function $(id) { return document.getElementById(id); }
function setText(id, v) { const e=$(id); if(e) e.textContent=v; }
function formatDate(d) { if(!d) return '-'; const n=new Date(d); return n.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}); }
function formatDateTime(d) { if(!d) return '-'; const n=new Date(d); return n.toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}); }

async function loadDashboard() {
  try {
    dashboardData = await apiRequest('/admin/dashboard');
    updateOverview();
    renderCharts();
    renderCountries();
    renderAuditLogs();
    if($('section-students')?.classList.contains('active')) loadStudents();
    if($('section-consultants')?.classList.contains('active')) loadConsultants();
    if($('section-applications')?.classList.contains('active')) loadApplications();
    if($('section-kyc')?.classList.contains('active')) loadKyc();
    if($('section-roles')?.classList.contains('active')) loadRoles();
    setText('lastUpdated','Updated '+formatDateTime(new Date()));
  } catch(e) { console.error('Dashboard error:',e); }
}

function updateOverview() {
  const o=dashboardData?.overview||{};
  const roles=dashboardData?.roleDistribution||[];
  const apps=dashboardData?.applicationStages||[];
  const appsTotal = apps.reduce((s,a)=>s+a.count,0);
  const sCount=roles.find(r=>r.role==='student')?.count||0;
  const cCount=roles.find(r=>r.role==='consultant')?.count||0;
  setText('statTotalUsers',(o.totalUsers||0).toLocaleString());
  setText('statUniversities',(o.totalUniversities||0).toLocaleString());
  setText('statConsultants',cCount.toLocaleString());
  setText('statApplications',appsTotal.toLocaleString());
  setText('navStudents',sCount); setText('navConsultants',cCount); setText('navApps',appsTotal);
  setText('navKyc',o.pendingKyc||0);
}

function renderCharts() {
  const signups=dashboardData?.monthlySignups?.slice(-6)||[];
  const apps=dashboardData?.monthlyApplications?.slice(-6)||[];
  const roles=dashboardData?.roleDistribution||[];
  const stages=dashboardData?.applicationStages||[];

  if(signups.length||apps.length){
    const labels=signups.length?signups.map(d=>d.month):['Jan','Feb','Mar','Apr','May','Jun'];
    if(growthChart) growthChart.destroy();
    const ctx=document.getElementById('growthChart');
    if(ctx){
      growthChart=new Chart(ctx,{
        type:'bar',data:{labels,
          datasets:[
            {label:'User Signups',data:signups.length?signups.map(d=>d.count):[0,0,0,0,0,0],backgroundColor:'rgba(108,92,231,0.7)',borderRadius:6},
            {label:'Applications',data:apps.length?apps.map(d=>d.count):[0,0,0,0,0,0],backgroundColor:'rgba(0,184,148,0.7)',borderRadius:6}
          ]},
        options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{boxWidth:12,font:{size:11}}}},
          scales:{y:{beginAtZero:true,grid:{color:'rgba(0,0,0,0.04)'},ticks:{font:{size:11}}},x:{grid:{display:false},ticks:{font:{size:11}}}}}
      });
    }
  }

  if(roles.length){
    if(roleChart) roleChart.destroy();
    const ctx2=document.getElementById('roleChart');
    if(ctx2){
      roleChart=new Chart(ctx2,{
        type:'doughnut',data:{labels:roles.map(r=>r.role.charAt(0).toUpperCase()+r.role.slice(1)),datasets:[{data:roles.map(r=>r.count),backgroundColor:COLORS.slice(0,roles.length),borderWidth:0}]},
        options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{boxWidth:12,font:{size:11}}}}}
      });
    }
  }

  if(stages.length){
    if(stageChart) stageChart.destroy();
    const ctx3=document.getElementById('stageChart');
    if(ctx3){
      stageChart=new Chart(ctx3,{
        type:'doughnut',data:{labels:stages.map(s=>s.status.charAt(0).toUpperCase()+s.status.slice(1)),datasets:[{data:stages.map(s=>s.count),backgroundColor:['#6c5ce7','#00b894','#0984e3','#fdcb6e','#e17055'],borderWidth:0}]},
        options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{boxWidth:12,font:{size:11}}}}}
      });
    }
  }
}

function renderCountries() {
  const countries=dashboardData?.topCountries||[];
  const c=$('topCountries');if(!c)return;
  c.innerHTML='';
  if(!countries.length){c.innerHTML='<div style="text-align:center;padding:20px;color:var(--text-light)">No nationality data yet</div>';return;}
  countries.forEach(d=>{
    const item=document.createElement('div');item.className='country-item';
    item.innerHTML='<div class="country-info"><div class="name">'+d.name+'</div><div class="count">'+
      d.value.toLocaleString()+' users</div></div><div class="country-bar"><div class="fill" style="width:'+
      Math.min(d.percent,100)+'%;background:'+COLORS[0]+';"></div></div><div class="country-pct">'+d.percent+'%</div>';
    c.appendChild(item);
  });
}

function renderAuditLogs() {
  const logs=dashboardData?.recentAuditLogs||[];
  const c=$('recentActivity');if(!c)return;
  c.innerHTML='';
  if(!logs.length){c.innerHTML='<div style="text-align:center;padding:20px;color:var(--text-light)">No recent activity</div>';return;}
  const icons={'kyc-verified':'✅','kyc-rejected':'❌','user-create':'👤','application':'📋','role':'🔐','payment':'💳','login':'🔑','default':'📝'};
  logs.forEach(l=>{
    const item=document.createElement('div');item.className='list-item';
    const icon=icons[l.action]||icons.default;
    item.innerHTML='<div class="list-icon" style="background:'+COLORS[0]+'20;color:'+COLORS[0]+';">'+icon+
      '</div><div class="list-content"><strong>'+(l.details?.status?l.action+': '+l.details.status:l.action)+
      '</strong><span>'+(l.resource||'')+'</span></div><div class="list-meta">'+formatDateTime(l.createdAt)+'</div>';
    c.appendChild(item);
  });
}

// ── Students ──
async function loadStudents() {
  const role='student',search=$('studentsSearch')?.value||'',status=$('studentsFilter')?.value||'';
  try {
    const res=await apiRequest('/admin/users?role='+role+(search?'&search='+encodeURIComponent(search):'')+(status?'&status='+status:''));
    const tbody=$('studentsTable');if(!tbody)return;
    setText('studentsTotal',res.total+' total');
    tbody.innerHTML='';
    if(!res.users.length){tbody.innerHTML='<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-light)">No students found</td></tr>';return;}
    res.users.forEach(u=>{
      const tr=document.createElement('tr');
      tr.innerHTML='<td><div class="user-cell"><div class="user-avatar" style="background:'+COLORS[0]+';">'+
        (u.displayName||'?').charAt(0).toUpperCase()+'</div><div><strong>'+(u.displayName||'—')+'</strong></div></div></td>'+
        '<td>'+u.email+'</td>'+
        '<td><span class="status-badge status-'+u.status+'">'+(u.status||'pending')+'</span></td>'+
        '<td><span class="status-badge status-kyc-'+u.kycStatus+'">'+(u.kycStatus||'—')+'</span></td>'+
        '<td>'+formatDate(u.createdAt)+'</td>'+
        '<td><select class="status-select" onchange="updateUserStatus(\''+u.id+'\',this.value)">'+
        '<option value="active" '+(u.status==='active'?'selected':'')+'>Active</option>'+
        '<option value="pending" '+(u.status==='pending'?'selected':'')+'>Pending</option>'+
        '<option value="suspended" '+(u.status==='suspended'?'selected':'')+'>Suspended</option>'+
        '</select></td>';
      tbody.appendChild(tr);
    });
  } catch(e) { console.error('Students error:',e); }
}

async function updateUserStatus(id, status) {
  try { await apiRequest('/admin/users/'+id+'/status',{method:'PUT',body:JSON.stringify({status})}); loadStudents(); } catch(e) { alert('Failed to update status'); }
}

// ── Consultants ──
async function loadConsultants() {
  const search=$('consSearch')?.value||'';
  try {
    const res=await apiRequest('/admin/users?role=consultant'+(search?'&search='+encodeURIComponent(search):''));
    const tbody=$('consTable');if(!tbody)return;
    setText('consTotal',res.total+' total');
    tbody.innerHTML='';
    if(!res.users.length){tbody.innerHTML='<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-light)">No consultants found</td></tr>';return;}
    res.users.forEach(u=>{
      const tr=document.createElement('tr');
      tr.innerHTML='<td><div class="user-cell"><div class="user-avatar" style="background:'+COLORS[1]+';">'+
        (u.displayName||'?').charAt(0).toUpperCase()+'</div><div><strong>'+(u.displayName||'—')+'</strong></div></div></td>'+
        '<td>'+u.email+'</td>'+
        '<td><span class="status-badge status-'+u.status+'">'+(u.status||'pending')+'</span></td>'+
        '<td>—</td>'+
        '<td>'+(u.kycStatus==='verified'?'✅ Yes':'❌ No')+'</td>'+
        '<td><select class="status-select" onchange="updateUserStatus(\''+u.id+'\',this.value)">'+
        '<option value="active" '+(u.status==='active'?'selected':'')+'>Active</option>'+
        '<option value="pending" '+(u.status==='pending'?'selected':'')+'>Pending</option>'+
        '<option value="suspended" '+(u.status==='suspended'?'selected':'')+'>Suspended</option>'+
        '</select></td>';
      tbody.appendChild(tr);
    });
  } catch(e) { console.error('Consultants error:',e); }
}

// ── Applications ──
async function loadApplications() {
  const status=$('appsFilter')?.value||'';
  try {
    const res=await apiRequest('/admin/applications'+(status?'?status='+status:''));
    const tbody=$('appsTable');if(!tbody)return;
    setText('appsTotal',(res.applications?.length||0)+' total');
    tbody.innerHTML='';
    if(!res.applications?.length){tbody.innerHTML='<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-light)">No applications found</td></tr>';return;}
    const stageNames=['Profile','Docs','SOP','Shortlist','App','Offer','COE','Visa Docs','Visa App','Interview','Medical','Travel','Ready'];
    res.applications.forEach(a=>{
      const tr=document.createElement('tr');
      tr.innerHTML='<td><strong>'+(a.userDisplayName||'User #'+a.userId?.slice(0,6))+'</strong></td>'+
        '<td>'+a.universityName+'</td>'+
        '<td>'+a.courseName+'</td>'+
        '<td><span class="status-badge status-'+a.status+'">'+(a.status||'draft')+'</span></td>'+
        '<td>'+(stageNames[a.currentStage]||'—')+' ('+((a.currentStage||0))+'/12)</td>'+
        '<td>'+formatDate(a.createdAt)+'</td>';
      tbody.appendChild(tr);
    });
  } catch(e) { console.error('Applications error:',e); }
}

// ── Universities ──
async function loadUniversities() {
  try {
    const res=await apiRequest('/universities');
    const tbody=$('uniTable');if(!tbody)return;
    const list=res.universities||res||[];
    setText('uniTotal',list.length+' total');
    tbody.innerHTML='';
    if(!list.length){tbody.innerHTML='<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-light)">No universities found</td></tr>';return;}
    list.forEach(u=>{
      const tr=document.createElement('tr');
      tr.innerHTML='<td><strong>'+u.name+'</strong></td><td>'+u.country+'</td><td>'+(u.ranking||'—')+'</td>'+
        '<td>'+(u.courses?.length||0)+'</td><td><span class="status-badge status-active">Active</span></td>';
      tbody.appendChild(tr);
    });
  } catch(e) { console.error('Universities error:',e); }
}

// ── KYC ──
async function loadKyc() {
  try {
    const res=await apiRequest('/admin/kyc/pending');
    const tbody=$('kycTable');if(!tbody)return;
    setText('kycTotal',res.total+' pending');
    tbody.innerHTML='';
    if(!res.queue?.length){tbody.innerHTML='<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-light)">No pending KYC verifications</td></tr>';return;}
    res.queue.forEach(item=>{
      const u=item.user||{};
      const tr=document.createElement('tr');
      tr.innerHTML='<td><div class="user-cell"><div class="user-avatar" style="background:'+COLORS[0]+';">'+
        (u.displayName||'?').charAt(0).toUpperCase()+'</div><div><strong>'+(u.displayName||'—')+'</strong></div></div></td>'+
        '<td>'+(u.email||'')+'</td>'+
        '<td>'+(item.documents?.length||0)+' docs</td>'+
        '<td>'+formatDate(item.documents?.[0]?.uploadedAt||null)+'</td>'+
        '<td><button class="btn btn-sm btn-success" onclick="verifyKyc(\''+u.id+'\',\'verified\')">✅ Verify</button> '+
        '<button class="btn btn-sm btn-danger" onclick="verifyKyc(\''+u.id+'\',\'rejected\')">❌ Reject</button></td>';
      tbody.appendChild(tr);
    });
  } catch(e) { console.error('KYC error:',e); }
}

async function verifyKyc(userId, status) {
  try {
    await apiRequest('/admin/kyc/verify/'+userId,{method:'PUT',body:JSON.stringify({status,notes:'Verified by admin'})});
    loadKyc(); loadDashboard();
  } catch(e) { alert('Verification failed'); }
}

// ── Roles ──
async function loadRoles() {
  try {
    const res=await apiRequest('/admin/roles');
    const tbody=$('rolesTable');if(!tbody)return;
    tbody.innerHTML='';
    if(!res.roles?.length){tbody.innerHTML='<tr><td colspan="3" style="text-align:center;padding:40px;color:var(--text-light)">No roles found</td></tr>';return;}
    res.roles.forEach(r=>{
      const perms=r.permissions||['read'];
      const tr=document.createElement('tr');
      tr.innerHTML='<td><strong>'+(r.name||'—')+'</strong></td><td>'+(r.userCount||0)+'</td><td>'+
        perms.map(p=>'<span class="role-badge admin">'+p+'</span>').join(' ')+'</td>';
      tbody.appendChild(tr);
    });
  } catch(e) { console.error('Roles error:',e); }
}

// ── Navigation ──
document.querySelectorAll('.nav-item').forEach(item=>{
  item.addEventListener('click',e=>{
    e.preventDefault();
    document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
    item.classList.add('active');
    const sec=document.getElementById('section-'+item.dataset.section);
    if(sec){
      document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
      sec.classList.add('active');
      const secName=item.dataset.section;
      if(secName==='students') loadStudents();
      else if(secName==='consultants') loadConsultants();
      else if(secName==='applications') loadApplications();
      else if(secName==='universities') loadUniversities();
      else if(secName==='kyc') loadKyc();
      else if(secName==='roles') loadRoles();
    }
  });
});

// ── Filters ──
$('studentsSearch')?.addEventListener('input',debounce(loadStudents,300));
$('studentsFilter')?.addEventListener('change',loadStudents);
$('consSearch')?.addEventListener('input',debounce(loadConsultants,300));
$('appsFilter')?.addEventListener('change',loadApplications);

function debounce(fn,ms){let t;return function(){clearTimeout(t);t=setTimeout(fn,ms);};}

// Mobile
$('mobileToggle')?.addEventListener('click',()=>$('sidebar').classList.toggle('open'));

// Export CSV
$('exportBtn')?.addEventListener('click',()=>{
  if(!dashboardData)return;
  const o=dashboardData.overview||{};
  let csv='Metric,Value\n';
  csv+=`Total Users,${o.totalUsers||0}\nUniversities,${o.totalUniversities||0}\n`;
  csv+=`Pending KYC,${o.pendingKyc||0}\n`;
  const roles=dashboardData.roleDistribution||[];
  roles.forEach(r=>{csv+=`${r.role}s,${r.count}\n`;});
  const blob=new Blob([csv],{type:'text/csv'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='avyra-report.csv';a.click();
});

$('logoutBtn')?.addEventListener('click',logout);
$('refreshBtn')?.addEventListener('click',loadDashboard);

const user=getUser();
if(user){
  setText('adminName',user.displayName||'Admin');
  setText('adminEmail',user.email||'');
  const av=$('adminAvatar');
  if(av) av.textContent=(user.displayName||'A').charAt(0).toUpperCase();
}
loadDashboard();
