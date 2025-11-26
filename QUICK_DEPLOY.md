# QUICK DEPLOY INSTRUCTIONS

## The new parcel form is built and ready!

### To see it locally (FASTEST):
1. Open terminal in this folder
2. Run: `npm run dev`
3. Open browser: `http://localhost:3000`
4. Navigate to "Send a Parcel"
5. **Hard refresh**: Press `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)

### To deploy to Firebase:

**Step 1: Login to Firebase**
```bash
firebase login --reauth
```
(This will open a browser - login there)

**Step 2: Deploy**
```bash
npm run deploy:hosting
```

Or manually:
```bash
npm run build
firebase deploy --only hosting
```

**Step 3: View**
- Go to: https://vcanship-onestop-logistics.web.app
- Navigate to "Send a Parcel"
- **Clear cache** or use incognito mode

## What you should see:

✅ **Progress indicator** with 5 steps at the top
✅ **Step 1: Sender Information** - Full form with name, email, phone, address
✅ **Step 2: Recipient Information** - Full form
✅ **Step 3: Parcel Details** - Type, description, weight, dimensions, value
✅ **Step 4: Options** - Insurance, signature, fragile
✅ **Step 5: Review** - Summary of everything
✅ **Support card** in sidebar
✅ **Drop-off finder** in sidebar

## If you still don't see it:

1. **Clear browser cache completely**
2. **Use incognito/private mode**
3. **Check console** (F12) for errors
4. **Verify URL** - Make sure you're on the Parcel service page

