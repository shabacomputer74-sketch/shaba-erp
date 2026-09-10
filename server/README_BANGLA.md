# SHABA ERP Cloud API

এই Server আলাদা কম্পিউটারে 24/7 চালিয়ে রাখা বাধ্যতামূলক নয়। এটিকে Render/Railway/Fly.io-এর মতো cloud service-এ deploy করা যাবে।

## Local test

```bash
npm install
npm start
```

তারপর API: `http://localhost:8787`

## গুরুত্বপূর্ণ

- `data/shaba-cloud.json`-এ cloud data থাকে। Production-এ persistent disk/storage ব্যবহার করুন।
- `SHABA_DATA_DIR` environment variable দিয়ে data folder নির্ধারণ করা যায়।
- Existing HTML-এর `shaba_erp_api_base` localStorage setting-এ deployed API URL রাখা যাবে।
- Default Admin ID: `shabacomputer`। প্রথম Online Login-এর পরে Password অবশ্যই পরিবর্তন করুন।
