# How to See the New Parcel Form Updates

## Option 1: View Locally (Recommended for Testing)

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Open your browser:**
   - Go to: `http://localhost:3000`
   - Navigate to "Send a Parcel" service
   - **Important:** Do a hard refresh (Ctrl+F5 or Cmd+Shift+R) to clear cache

3. **You should now see:**
   - ✅ Step-by-step progress indicator (5 steps)
   - ✅ Step 1: Sender Information (with name, email, phone, full address)
   - ✅ Step 2: Recipient Information
   - ✅ Step 3: Parcel Details (type, description, weight, dimensions, value)
   - ✅ Step 4: Additional Options (insurance, signature, fragile)
   - ✅ Step 5: Review all details
   - ✅ Support card in sidebar
   - ✅ Drop-off point finder in sidebar

## Option 2: Deploy to Firebase

1. **Authenticate with Firebase:**
   ```bash
   firebase login --reauth
   ```
   (This will open a browser window for authentication)

2. **Build the project:**
   ```bash
   npm run build
   ```

3. **Deploy to Firebase Hosting:**
   ```bash
   firebase deploy --only hosting
   ```

4. **View the deployed site:**
   - Go to: `https://vcanship-onestop-logistics.web.app`
   - Navigate to "Send a Parcel"
   - **Important:** Clear browser cache or use incognito mode

## What's New in the Parcel Form

### ✨ Major Improvements:

1. **5-Step Process:**
   - Step 1: Sender Information (complete contact details)
   - Step 2: Recipient Information (complete contact details)
   - Step 3: Parcel Details (type, description, weight, dimensions, declared value)
   - Step 4: Additional Options (insurance, signature required, fragile handling)
   - Step 5: Review & Confirm

2. **Enhanced Features:**
   - ✅ Progress indicator showing current step
   - ✅ All fields have proper labels with required indicators (*)
   - ✅ Tooltips on hover for help
   - ✅ Field hints explaining format requirements
   - ✅ Real-time validation with error messages
   - ✅ Parcel type selector (Document, Envelope, Box, Pallet, Other)
   - ✅ Item value field for customs and insurance
   - ✅ Insurance option with cost calculation
   - ✅ Signature required option
   - ✅ Fragile handling option
   - ✅ Delivery instructions field
   - ✅ Support card with FAQ and Contact buttons
   - ✅ Integrated drop-off point finder

3. **Better UX:**
   - Previous/Next navigation between steps
   - Form data persists as you navigate
   - Complete review before getting quotes
   - Clear error messages
   - Responsive design for mobile

## Troubleshooting

**If you don't see the updates:**

1. **Clear browser cache:**
   - Chrome/Edge: Ctrl+Shift+Delete → Clear cached images and files
   - Or use Incognito/Private mode

2. **Hard refresh:**
   - Windows: Ctrl+F5
   - Mac: Cmd+Shift+R

3. **Check the console:**
   - Press F12 → Console tab
   - Look for any JavaScript errors

4. **Verify the build:**
   - Check that `dist/locales/en.json` contains the "parcel" section
   - Check that `dist/assets/index-*.js` was recently updated

## Need Help?

If you still don't see the updates after following these steps, please let me know and I'll help troubleshoot further.

