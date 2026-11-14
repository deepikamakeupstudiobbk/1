# Update Summary

1. Booking and Daily Customer forms remain in place and use responsive 1/2/4-column layouts.
2. Booking and Daily Customer records now save to Supabase and refresh from Supabase.
3. Existing Google Sheets ledger records are imported into Supabase when missing during the first authenticated refresh; the old Sheet is retained as backup.
4. Owner and staff access now require Supabase Auth. Staff additionally keeps the existing Apps Script login verification and must have a Supabase Auth identity with the matching derived email.
5. Added an Admin-only Drive Media module: upload image files to the Google Drive folder, list images already in that folder, select an image, and copy its link.
6. Added Apps Script `listDriveImages` endpoint for the Drive folder picker.
7. Added Supabase SQL with RLS policies and a Hinglish setup guide.

Before going live:
- Set `.env` from `.env.example`.
- Run `supabase/schema.sql`.
- Create Supabase Auth users and assign trusted `app_metadata.erp_role` values (`owner` / `staff`).
- Deploy updated `apps-script/Code.gs` as a new web app version.
- Verify old Sheet entries have migrated before relying only on Supabase.
