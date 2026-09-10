SHABA COMPUTER ERP - PORTABLE DATA EDITION
===========================================

ব্যবহার:
1) পুরো "SHABA COMPUTER ERP Portable" ফোল্ডারটি একসাথে রাখুন।
2) START_SHABA_ERP.bat চালু করুন।
3) ERP-এর সব browser profile/data এই ফোল্ডারের ERP_DATA\BrowserProfile-এর মধ্যে থাকবে।
4) Firefox-এর cache/cookies clear করলেও এই ERP-এর data মুছে যাবে না, কারণ এটি Firefox-এর profile ব্যবহার করে না।
5) অন্য কম্পিউটারে নিতে হলে পুরো ফোল্ডারটি Pen Drive-এ কপি করে সেই PC-তে START_SHABA_ERP.bat চালান। Chrome বা Microsoft Edge ইনস্টল থাকতে হবে।
6) ERP চলমান অবস্থায় একই ফোল্ডার অন্য PC-তে কপি করবেন না। আগে ERP বন্ধ করুন।
7) নিয়মিত BACKUP_SHABA_ERP.bat চালিয়ে BACKUPS ফোল্ডারে backup রাখুন।

গুরুত্বপূর্ণ:
- SHABA_COMPUTER_ERP.html হলো software/interface।
- ERP_DATA হলো data/profile storage।
- ভবিষ্যতে software update করার সময় ERP_DATA মুছবেন না।
- নতুন software file পুরোনোটির জায়গায় replace করা যাবে, তবে একই data folder রেখে দিতে হবে।
- প্রথমবার পুরোনো Firefox localStorage data এই portable profile-এ স্বয়ংক্রিয়ভাবে চলে আসবে না। পুরোনো data যদি আগে থেকেই মুছে গিয়ে থাকে, এই package তা নিজে থেকে ফিরিয়ে আনতে পারবে না।
