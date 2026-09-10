/* SHABA ERP Google Drive Backup - browser/PWA only. No private Google credential is stored in the app. */
(function(){
  const CLIENT_KEY='shaba_erp_google_client_id_v1';
  const TOKEN_KEY='shaba_erp_google_token_v1';
  const FOLDER_KEY='shaba_erp_google_folder_id_v1';
  const LAST_KEY='shaba_erp_google_last_backup_v1';
  const SCOPE='https://www.googleapis.com/auth/drive.file';
  let tokenClient=null, accessToken='';
  function clientId(){return localStorage.getItem(CLIENT_KEY)||window.SHABA_GOOGLE_CLIENT_ID||'';}
  function status(msg){const el=document.getElementById('erpDriveStatus');if(el)el.textContent=msg;}
  function loadGIS(){return new Promise((resolve,reject)=>{if(window.google?.accounts?.oauth2)return resolve();const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.onload=()=>resolve();s.onerror=reject;document.head.appendChild(s);});}
  async function getToken(interactive=true){
    const cid=clientId(); if(!cid){status('⚠️ Google Drive Client ID সেট করা হয়নি।'); throw new Error('GOOGLE_CLIENT_ID_MISSING');}
    await loadGIS();
    if(!tokenClient) tokenClient=google.accounts.oauth2.initTokenClient({client_id:cid,scope:SCOPE,callback:r=>{}});
    return await new Promise((resolve,reject)=>{
      tokenClient.callback=(r)=>{if(r.error)return reject(new Error(r.error));accessToken=r.access_token;localStorage.setItem(TOKEN_KEY,accessToken);resolve(accessToken);};
      tokenClient.requestAccessToken({prompt:interactive?'consent':''});
    });
  }
  async function driveFetch(url,opts={}){if(!accessToken)await getToken(true);const headers=Object.assign({},opts.headers||{},{Authorization:'Bearer '+accessToken});let r=await fetch(url,Object.assign({},opts,{headers}));if(r.status===401){await getToken(true);headers.Authorization='Bearer '+accessToken;r=await fetch(url,Object.assign({},opts,{headers}));}if(!r.ok){let t='';try{t=await r.text()}catch(e){}throw new Error(t||('Drive HTTP '+r.status));}return r;}
  async function ensureFolder(){
    const cached=localStorage.getItem(FOLDER_KEY); if(cached)return cached;
    const q=encodeURIComponent("name='SHABA ERP Backups' and mimeType='application/vnd.google-apps.folder' and trashed=false");
    const r=await driveFetch('https://www.googleapis.com/drive/v3/files?q='+q+'&fields=files(id,name)&pageSize=10');const d=await r.json();
    if(d.files?.[0]){localStorage.setItem(FOLDER_KEY,d.files[0].id);return d.files[0].id;}
    const cr=await driveFetch('https://www.googleapis.com/drive/v3/files',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'SHABA ERP Backups',mimeType:'application/vnd.google-apps.folder'})});const f=await cr.json();localStorage.setItem(FOLDER_KEY,f.id);return f.id;
  }
  function snapshot(){return typeof getERPDataSnapshot==='function'?getERPDataSnapshot():null;}
  async function uploadSnapshot(snapshotObj,kind){
    const folderId=await ensureFolder();const stamp=new Date().toISOString().replace(/[:.]/g,'-');const name=`SHABA_ERP_${kind||'BACKUP'}_${stamp}.json`;
    const meta={name,parents:[folderId],mimeType:'application/json'};const boundary='-------shabaerp'+Math.random().toString(16).slice(2);const body='--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify(meta)+'\r\n--'+boundary+'\r\nContent-Type: application/json\r\n\r\n'+JSON.stringify(snapshotObj)+'\r\n--'+boundary+'--';
    const r=await driveFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+boundary},body});return r.json();
  }
  async function listBackups(){const folderId=await ensureFolder();const q=encodeURIComponent("'"+folderId+"' in parents and trashed=false");const r=await driveFetch('https://www.googleapis.com/drive/v3/files?q='+q+'&orderBy=modifiedTime desc&fields=files(id,name,modifiedTime,size)&pageSize=50');return (await r.json()).files||[];}
  async function restoreDriveFile(id){const r=await driveFetch('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(id)+'?alt=media');const data=await r.json();if(typeof restoreERPDataSnapshot==='function')return restoreERPDataSnapshot(data);throw new Error('Restore function unavailable');}
  window.configureGoogleDrive=function(){const current=clientId();const id=prompt('Google OAuth Client ID দিন।\nExample: 1234567890-xxxx.apps.googleusercontent.com',current||'');if(id===null)return;localStorage.setItem(CLIENT_KEY,id.trim());localStorage.removeItem(TOKEN_KEY);accessToken='';status('✅ Google Drive Client ID সংরক্ষণ হয়েছে।');};
  window.connectGoogleDrive=async function(){try{await getToken(true);const f=await ensureFolder();status('✅ Google Drive Connected — Backup folder ready.');alert('✅ Google Drive সফলভাবে সংযুক্ত হয়েছে।\nBackup folder: SHABA ERP Backups');return f;}catch(e){console.error(e);status('❌ Google Drive সংযোগ ব্যর্থ: '+e.message);alert('Google Drive সংযোগ করা যায়নি। Client ID/OAuth সেটিং পরীক্ষা করুন।');}};
  window.backupERPToGoogleDrive=async function(){if(!erpCurrentUser||erpCurrentUser.role!=='admin'){alert('শুধু Admin Google Drive Backup নিতে পারবেন।');return;}try{status('⏳ Google Drive Backup হচ্ছে...');await uploadSnapshot(snapshot(),'BACKUP');localStorage.setItem(LAST_KEY,Date.now());status('✅ Google Drive Backup সফল হয়েছে।');alert('✅ ERP Data Google Drive-এ Backup হয়েছে।');}catch(e){console.error(e);status('❌ Google Drive Backup ব্যর্থ: '+e.message);alert('❌ Google Drive Backup ব্যর্থ হয়েছে।\n'+e.message);}};
  window.listGoogleDriveBackups=async function(){try{const files=await listBackups();if(!files.length){alert('Google Drive-এ কোনো SHABA ERP Backup পাওয়া যায়নি।');return;}const lines=files.map((f,i)=>`${i+1}. ${f.name} — ${new Date(f.modifiedTime).toLocaleString()}`).join('\n');const n=prompt('কোন Backup Restore করবেন?\n\n'+lines+'\n\nনম্বর দিন:');if(n===null)return;const idx=parseInt(n,10)-1;if(!files[idx]){alert('সঠিক নম্বর দিন।');return;}if(!confirm('⚠️ নির্বাচিত Google Drive Backup দিয়ে বর্তমান ERP Data প্রতিস্থাপন করবেন? আগে বর্তমান Data-এর Backup নিয়েছেন তো?'))return;await restoreDriveFile(files[idx].id);}catch(e){console.error(e);alert('❌ Google Drive Backup List/Restore ব্যর্থ হয়েছে।\n'+e.message);}};
  window.autoGoogleDriveBackupIfDue=async function(){try{const last=Number(localStorage.getItem(LAST_KEY)||0);if(Date.now()-last<24*60*60*1000)return;if(!clientId()||!erpCurrentUser||erpCurrentUser.role!=='admin'||navigator.onLine===false)return;await uploadSnapshot(snapshot(),'AUTO');localStorage.setItem(LAST_KEY,Date.now());status('☁️ Automatic Google Drive Backup সম্পন্ন হয়েছে।');}catch(e){console.warn('autoGoogleDriveBackupIfDue',e);}};
})();
