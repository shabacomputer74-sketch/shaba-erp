# SHABA COMPUTER ERP — Computer + Mobile + Online + Offline

এই সংস্করণে ৩টি স্তর রাখা হয়েছে:

1. **Local Offline ERP** — বর্তমান Browser/Portable data আগের মতোই থাকবে।
2. **PWA Mobile App** — HTTPS-এ host করলে Android Chrome থেকে Install করে App-এর মতো চালানো যাবে এবং Service Worker দিয়ে Offline app shell কাজ করবে।
3. **Cloud Sync API** — `server/`-এ Node/Express API আছে; এটি কোনো নির্দিষ্ট PC-তে 24/7 চালিয়ে রাখা বাধ্যতামূলক নয়। Render-এর মতো cloud service-এ deploy করা যাবে। `server/render.yaml`-এ Web Service + PostgreSQL database-এর blueprint আছে।

## 1) Computer

বর্তমান `START_SHABA_ERP.bat` দিয়ে Desktop/Computer ERP চালানো যাবে। Local data `ERP_DATA`-তে থাকে।

## 2) Mobile

PWA অংশটি HTTPS website থেকে চালাতে হবে। তারপর Android Chrome → menu → **Add to Home screen / Install app**।

`manifest.webmanifest`, `sw.js`, `icons/` এবং `drive-backup.js` ইতোমধ্যে package-এ আছে।

## 3) Cloud API

`server/` folder-টি cloud deployment-এর জন্য। Production-এ PostgreSQL ব্যবহার করুন। Render Blueprint ব্যবহার করলে `server/render.yaml` অনুযায়ী API + PostgreSQL তৈরি করা যায়।

Deploy হওয়ার পরে API URL হবে এরকম:

`https://YOUR-SHABA-ERP-API.onrender.com`

ERP-এর **Backup & Restore → Google Drive Backup → Cloud API** থেকে এই URL সেট করুন।

## 4) Google Drive Backup

Google Drive Backup আলাদা; এটি Cloud Sync database নয়। ERP JSON backup `SHABA ERP Backups` folder-এ রাখা হবে এবং Restore করা যাবে।

Google Drive Connect-এর জন্য Google Cloud Console-এ একটি **Web application OAuth Client ID** তৈরি করতে হবে এবং আপনার deployed HTTPS website origin Authorized JavaScript origins-এ যোগ করতে হবে। Google Drive API enable করতে হবে। তারপর ERP-এর Backup & Restore → **Drive Client ID**-তে Client ID একবার সেট করুন।

## 5) Automatic Backup

Admin Login করার পরে, Internet থাকলে এবং Google Drive Client ID/permission আগে সেট করা থাকলে ERP 24 ঘণ্টা পার হলে automatic backup করার চেষ্টা করবে। এছাড়া **Backup Now** দিয়ে যেকোনো সময় manual backup নেওয়া যাবে।

## 6) Restore

- Local JSON: Backup & Restore → Restore Data
- Google Drive: Backup & Restore → Restore from Drive

Restore করলে বর্তমান local ERP data প্রতিস্থাপিত হবে এবং ERP reload হবে। Restore-এর আগে বর্তমান data-এর backup নিন।

## গুরুত্বপূর্ণ

- Offline অবস্থায় local data চলবে। Internet না থাকলে cloud sync হবে না; pending queue পরে Internet এলে sync করার চেষ্টা করবে।
- একই data একই সময়ে দুই device-এ offline edit করলে conflict হতে পারে। ERP conflict-এ overwrite না করে warning দেখাবে।
- Cloud server-এর database অবশ্যই persistent/managed PostgreSQL ব্যবহার করা উচিত; ephemeral filesystem-এ production data রাখবেন না।
