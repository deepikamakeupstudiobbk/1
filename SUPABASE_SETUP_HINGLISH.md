# Deepika Studio ERP – Updated Setup (Supabase + Google Drive)

## Data architecture
- **Bookings + Daily Customers:** Supabase `ledger_entries` table (shared database, live sync between devices).
- **Images:** Google Drive folder `Deepika Salon Client Photos`.
- **Drive image picker:** ERP Admin > Drive Media. Upload a new image or select an existing image from the configured Drive folder.
- Google Sheets is no longer the primary database for Booking / Daily Customer entries. Existing Sheets data is not automatically imported.

## 1. Supabase configure karein
1. Supabase project banayein: https://supabase.com/dashboard
2. Project Settings > API se Project URL aur **anon / publishable key** copy karein. `service_role` key kabhi frontend mein na daalein.
3. Project ke root mein `.env` file banayein (`.env.example` ko copy karein) aur ye values set karein:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY
```

4. Supabase Dashboard > SQL Editor > New query mein `supabase/schema.sql` ka poora SQL run karein.
5. Authentication > Users > Add user mein owner account banayein:
   - Email: `engdksmegasoft@gmail.com` (ya code mein `ownerCredentials.email` jo set ho)
   - Password: strong password (admin/admin use na karein)
   - Email confirmation required ho to user ko confirm karein. User ke app_metadata mein `{"erp_role":"owner"}` set karein.
6. App ko restart/build karein. Owner login mein `admin` username dene par app configured owner email use karega; password Supabase Auth wala hoga.

## 2. Staff login (important)
Existing Staff login pehle Google Apps Script se ID/password verify karta hai, phir Supabase Auth session bhi leta hai. Isliye har staff member ke liye Supabase Authentication > Users mein user create karein:
- Email format: `<loginId>@staff.deepika.local` (example `riya@staff.deepika.local`)
- Password: wahi password jo ERP Staff Login mein diya hai.
- Supabase email confirmation ko disable karein for these manually provisioned internal accounts, or confirm each user. Har staff user ke app_metadata mein `{"erp_role":"staff"}` set karein.
Staff account create/change karne par Supabase Auth user bhi manually create/update karna hoga. Staff ko sirf zaroori access dein.

## 3. Google Drive image folder configure karein
1. Google Sheet (jisse existing Apps Script linked hai) > Extensions > Apps Script kholein.
2. `apps-script/Code.gs` ka updated poora code paste karein (outer upload mein diya `Code.gs` bhi old version ho sakta hai; project ke `apps-script/Code.gs` ko use karein).
3. Save karein. Function list se `setupOnce` run karein aur permissions allow karein.
4. Deploy > Manage deployments > Edit > New version > Deploy.
   - Execute as: Me
   - Who has access: Anyone
5. `src/config.ts` mein Apps Script URL aur `DRIVE_UPLOAD_KEY` apne deployment ke saath match hone chahiye.

## 4. ERP image upload / Drive picker
1. ERP mein Supabase owner account se login karein.
2. Dashboard > **Drive Media** kholein.
3. Left side se image choose karke **Upload to Google Drive** karein.
4. Right side par configured Drive folder ki images dikhengi. Kisi image par click karke select karein; selected image ka link Copy kar sakte hain.
5. Drive folder ke private images ki preview browser mein tabhi dikhegi jab Google account ko access ho. AppScript se upload hui images current implementation mein link-view enabled hoti hain.

## 5. Build / deploy
```bash
npm install
npm run dev
npm run build
```
GitHub Pages par deploy karne ke liye GitHub repository ke Actions secrets/variables mein `VITE_SUPABASE_URL` aur `VITE_SUPABASE_ANON_KEY` set karein. Vite build time par env values embed hoti hain; `.env` file GitHub par commit na karein.

## 6. Existing data migration
Purane Google Sheet ke `Bookings` aur `DailyCustomers` tabs ka data pehli successful ERP refresh par missing IDs ke liye automatically Supabase mein import hota hai. Migration ke dauran old rows overwrite nahi hoti. Pehle Google Sheet ka backup rakhein aur migration verify hone tak sheet delete na karein.

## Security notes
- Browser mein sirf Supabase anon/publishable key rakhein; `service_role` key nahi.
- RLS enabled hai; only authenticated Supabase users can read/write ledger entries.
- Default `admin/admin` local login is disabled. Supabase Auth owner account zaroor banayein.
- Apps Script upload key browser bundle mein visible hoti hai; ise production-grade secret na samjhein. Google Apps Script endpoint ko future mein OAuth / signed server-side authorization se harden karna chahiye.
