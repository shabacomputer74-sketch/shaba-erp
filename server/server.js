const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 8787;
const DEFAULT_ADMIN_HASH = '199623a8e5f010cf4f75bd5700eb1585a016ac0723a245161df5fbb27ae56737';
const TRACKED_KEYS = ['company_profile_data','products_tab_data','customers_tab_data','customer_payments_data','sellers_tab_data','seller_payments_data','seller_purchases_data','invoices_tab_data','damage_waste_data','product_warranty_data','purchase_entry_invoice_counter'];
const PERMISSIONS = ['company-section','product-section','stock-report-section','seller-section','customer-section','invoice-section'];

let pgPool = null;
if (process.env.DATABASE_URL) {
  const { Pool } = require('pg');
  pgPool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false } });
}

const DATA_DIR = process.env.SHABA_DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'shaba-cloud.json');
fs.mkdirSync(DATA_DIR, { recursive: true });
let mem = { users:[], data:{}, sessions:{}, audit:[] };
if (!pgPool && fs.existsSync(DB_FILE)) { try { mem = JSON.parse(fs.readFileSync(DB_FILE,'utf8')); } catch {} }
function saveMem(){ if(pgPool)return; const tmp=DB_FILE+'.tmp';fs.writeFileSync(tmp,JSON.stringify(mem,null,2));fs.renameSync(tmp,DB_FILE); }
function sha256(s){return crypto.createHash('sha256').update(String(s)).digest('hex');}
function tokenFor(user){return crypto.randomBytes(32).toString('hex')+'.'+Buffer.from(user.id).toString('base64url');}

async function init(){
  if(pgPool){
    await pgPool.query(`CREATE TABLE IF NOT EXISTS erp_users (id TEXT PRIMARY KEY,name TEXT NOT NULL,role TEXT NOT NULL,password_hash TEXT NOT NULL,permissions JSONB NOT NULL DEFAULT '[]',active BOOLEAN NOT NULL DEFAULT TRUE)`);
    await pgPool.query(`CREATE TABLE IF NOT EXISTS erp_data (key TEXT PRIMARY KEY,value JSONB,version INTEGER NOT NULL DEFAULT 0,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_by TEXT,device_id TEXT)`);
    await pgPool.query(`CREATE TABLE IF NOT EXISTS erp_sessions (token TEXT PRIMARY KEY,user_id TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pgPool.query(`CREATE TABLE IF NOT EXISTS erp_audit (id TEXT PRIMARY KEY,time TIMESTAMPTZ NOT NULL DEFAULT NOW(),user_id TEXT,action TEXT,details TEXT)`);
    const x=await pgPool.query('SELECT id FROM erp_users WHERE lower(id)=lower($1)', ['shabacomputer']);
    if(!x.rowCount) await pgPool.query('INSERT INTO erp_users(id,name,role,password_hash,permissions,active) VALUES($1,$2,$3,$4,$5,true)', ['shabacomputer','Administrator','admin',DEFAULT_ADMIN_HASH,JSON.stringify(PERMISSIONS)]);
  } else {
    if(!mem.users?.some(u=>String(u.id).toLowerCase()==='shabacomputer')){mem.users.unshift({id:'shabacomputer',name:'Administrator',role:'admin',passwordHash:DEFAULT_ADMIN_HASH,permissions:PERMISSIONS,active:true});saveMem();}
  }
}
async function getUser(id){
  if(pgPool){const r=await pgPool.query('SELECT id,name,role,password_hash,permissions,active FROM erp_users WHERE lower(id)=lower($1)',[id]);if(!r.rowCount)return null;const u=r.rows[0];return {id:u.id,name:u.name,role:u.role,passwordHash:u.password_hash,permissions:u.permissions||[],active:u.active};}
  return mem.users.find(u=>String(u.id).toLowerCase()===String(id).toLowerCase())||null;
}
async function listUsers(){if(pgPool){const r=await pgPool.query('SELECT id,name,role,permissions,active FROM erp_users ORDER BY id');return r.rows;}return mem.users.map(u=>({id:u.id,name:u.name,role:u.role,permissions:u.permissions||[],active:u.active!==false}));}
async function saveUser(u){if(pgPool){await pgPool.query(`INSERT INTO erp_users(id,name,role,password_hash,permissions,active) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,role=EXCLUDED.role,password_hash=EXCLUDED.password_hash,permissions=EXCLUDED.permissions,active=EXCLUDED.active`,[u.id,u.name,u.role,u.passwordHash,JSON.stringify(u.permissions||[]),u.active!==false]);}else{const i=mem.users.findIndex(x=>x.id===u.id);if(i<0)mem.users.push(u);else mem.users[i]=u;saveMem();}}
async function saveSession(token,userId){if(pgPool)await pgPool.query('INSERT INTO erp_sessions(token,user_id) VALUES($1,$2)',[token,userId]);else{mem.sessions[token]={userId,createdAt:new Date().toISOString()};saveMem();}}
async function getSessionUser(token){if(pgPool){const r=await pgPool.query(`SELECT u.id,u.name,u.role,u.password_hash,u.permissions,u.active FROM erp_sessions s JOIN erp_users u ON lower(u.id)=lower(s.user_id) WHERE s.token=$1 AND u.active=true`,[token]);if(!r.rowCount)return null;const u=r.rows[0];return {id:u.id,name:u.name,role:u.role,passwordHash:u.password_hash,permissions:u.permissions||[],active:u.active};}const s=mem.sessions?.[token];return s?getUser(s.userId):null;}
async function deleteSession(token){if(pgPool)await pgPool.query('DELETE FROM erp_sessions WHERE token=$1',[token]);else{delete mem.sessions[token];saveMem();}}
async function pullData(){if(pgPool){const r=await pgPool.query('SELECT key,value,version,updated_at,updated_by,device_id FROM erp_data WHERE key=ANY($1)',[TRACKED_KEYS]);return r.rows.map(x=>({key:x.key,value:x.value,version:x.version,updatedAt:x.updated_at,updatedBy:x.updated_by,deviceId:x.device_id}));}return TRACKED_KEYS.map(k=>mem.data[k]).filter(Boolean);}
async function pushData(changes,user,deviceId){const applied=[],conflicts=[];if(pgPool){const client=await pgPool.connect();try{await client.query('BEGIN');for(const c of changes){if(!TRACKED_KEYS.includes(c.key))continue;const cur=await client.query('SELECT version FROM erp_data WHERE key=$1 FOR UPDATE',[c.key]);const current=cur.rowCount?Number(cur.rows[0].version):0;if(cur.rowCount && Number(c.version||0)!==current){conflicts.push({key:c.key,serverVersion:current,clientVersion:Number(c.version||0)});continue;}const next=current+1;await client.query(`INSERT INTO erp_data(key,value,version,updated_at,updated_by,device_id) VALUES($1,$2,$3,NOW(),$4,$5) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,version=EXCLUDED.version,updated_at=NOW(),updated_by=EXCLUDED.updated_by,device_id=EXCLUDED.device_id`,[c.key,c.value,next,user.id,deviceId||'']);applied.push({key:c.key,version:next});}await client.query('COMMIT');}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}}else{for(const c of changes){if(!TRACKED_KEYS.includes(c.key))continue;const cur=mem.data[c.key];const current=cur?.version||0;if(cur && Number(c.version||0)!==Number(current)){conflicts.push({key:c.key,serverVersion:current,clientVersion:Number(c.version||0)});continue;}const next=current+1;mem.data[c.key]={key:c.key,value:c.value,version:next,updatedAt:new Date().toISOString(),updatedBy:user.id,deviceId:deviceId||''};applied.push({key:c.key,version:next});}saveMem();}return {applied,conflicts};}
async function audit(action,details,userId){if(pgPool)await pgPool.query('INSERT INTO erp_audit(id,user_id,action,details) VALUES($1,$2,$3,$4)',[Date.now()+'-'+Math.random().toString(36).slice(2,8),userId,action,details]);else{mem.audit.push({id:Date.now()+'-'+Math.random().toString(36).slice(2,8),time:new Date().toISOString(),userId,action,details});mem.audit=mem.audit.slice(-5000);saveMem();}}

const app=express();app.set('trust proxy',1);app.use(cors({origin:true}));app.use(express.json({limit:'20mb'}));
app.get('/api/health',(req,res)=>res.json({ok:true,service:'SHABA ERP Cloud API',database:pgPool?'postgres':'json',time:new Date().toISOString()}));
async function auth(req,res,next){try{const raw=String(req.headers.authorization||'');const token=raw.startsWith('Bearer ')?raw.slice(7):'';const user=token?await getSessionUser(token):null;if(!user)return res.status(401).json({error:'UNAUTHORIZED',message:'Login required'});req.user=user;req.token=token;next();}catch(e){res.status(500).json({error:'AUTH_ERROR',message:e.message});}}
function admin(req,res,next){if(req.user.role!=='admin')return res.status(403).json({error:'ADMIN_ONLY',message:'Admin only'});next();}

app.post('/api/auth/login',async(req,res)=>{const id=String(req.body?.id||'').trim(),password=String(req.body?.password||'');const user=await getUser(id);if(!user||user.active===false||sha256(password)!==user.passwordHash)return res.status(401).json({error:'INVALID_LOGIN',message:'User ID or Password is incorrect'});const token=tokenFor(user);await saveSession(token,user.id);await audit('Online Login',`User ${user.id} logged in`,user.id);res.json({token,user:{id:user.id,name:user.name,role:user.role,permissions:user.permissions||[],active:true}});});
app.post('/api/auth/logout',auth,async(req,res)=>{await deleteSession(req.token);res.json({ok:true});});
app.post('/api/auth/change-password',auth,async(req,res)=>{const cur=String(req.body?.currentPassword||''),next=String(req.body?.newPassword||'');if(next.length<8)return res.status(400).json({error:'WEAK_PASSWORD',message:'Password must be at least 8 characters'});if(sha256(cur)!==req.user.passwordHash)return res.status(401).json({error:'INVALID_PASSWORD',message:'Current password is incorrect'});req.user.passwordHash=sha256(next);await saveUser(req.user);res.json({ok:true});});
app.get('/api/users',auth,admin,async(req,res)=>res.json({users:await listUsers()}));
app.post('/api/users',auth,admin,async(req,res)=>{const id=String(req.body?.id||'').trim().toLowerCase(),name=String(req.body?.name||'').trim(),password=String(req.body?.password||'');if(!id||!name||password.length<8)return res.status(400).json({error:'INVALID_USER',message:'id, name and password (8+) are required'});if(await getUser(id))return res.status(409).json({error:'DUPLICATE_USER',message:'User already exists'});await saveUser({id,name,role:'employee',passwordHash:sha256(password),permissions:Array.isArray(req.body.permissions)?req.body.permissions:[],active:true});res.json({ok:true});});
app.put('/api/users/:id',auth,admin,async(req,res)=>{const u=await getUser(req.params.id);if(!u)return res.status(404).json({error:'NOT_FOUND'});if(req.body.name!==undefined)u.name=String(req.body.name);if(Array.isArray(req.body.permissions))u.permissions=req.body.permissions;if(req.body.active!==undefined)u.active=!!req.body.active;await saveUser(u);res.json({ok:true});});
app.post('/api/users/:id/reset-password',auth,admin,async(req,res)=>{const u=await getUser(req.params.id);if(!u)return res.status(404).json({error:'NOT_FOUND'});const p=String(req.body?.password||'');if(p.length<8)return res.status(400).json({error:'WEAK_PASSWORD'});u.passwordHash=sha256(p);await saveUser(u);res.json({ok:true});});
app.get('/api/sync/pull',auth,async(req,res)=>res.json({data:await pullData()}));
app.post('/api/sync/push',auth,async(req,res)=>{const result=await pushData(Array.isArray(req.body?.changes)?req.body.changes:[],req.user,String(req.body?.deviceId||''));await audit('Cloud Sync',`Applied ${result.applied.length}; conflicts ${result.conflicts.length}`,req.user.id);res.json({ok:true,...result});});
app.post('/api/admin/reset-test-data',auth,admin,async(req,res)=>{const changes=TRACKED_KEYS.filter(k=>k!=='company_profile_data').map(k=>({key:k,value:k==='purchase_entry_invoice_counter'?'1009':'[]',version:0}));const result=await pushData(changes,req.user,String(req.body?.deviceId||''));await audit('Cloud Reset','Business test data reset',req.user.id);res.json({ok:true,...result});});
app.get('/api/admin/export-backup',auth,admin,async(req,res)=>{const data=await pullData();const keys={};for(const x of data)keys[x.key]=typeof x.value==='string'?x.value:JSON.stringify(x.value);res.json({format:'SHABA_COMPUTER_ERP_BACKUP',version:2,createdAt:new Date().toISOString(),keys});});

init().then(()=>app.listen(PORT,'0.0.0.0',()=>console.log(`SHABA ERP Cloud API listening on ${PORT}`))).catch(e=>{console.error(e);process.exit(1)});
