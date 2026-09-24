# Google OAuth 2.0 Setup Guide for Shapeshift

This guide walks you through creating Google OAuth 2.0 credentials so Shapeshift can connect to your Google Drive, Gmail, and Calendar.

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a Project** → **New Project**
3. Name it `Shapeshift` (or anything you like)
4. Click **Create**

## Step 2: Enable APIs

Navigate to **APIs & Services** → **Library** and enable these APIs:
- **Google Drive API**
- **Gmail API**
- **Google Calendar API**

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type → **Create**
3. Fill in:
   - App name: `Shapeshift`
   - User support email: Your email
   - Developer contact: Your email
4. Click **Save and Continue**
5. **Scopes** → Add the following scopes:
   - `https://www.googleapis.com/auth/drive`
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/calendar`
6. Click **Save and Continue**
7. **Test Users** → Add your Google email address
8. Click **Save and Continue**

## Step 4: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **+ Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Name: `Shapeshift Local`
5. **Authorized redirect URIs**: Add `http://localhost:3000/api/auth/google/callback`
6. Click **Create**
7. Copy the **Client ID** and **Client Secret**

## Step 5: Configure Shapeshift

Add the following to your `.env.local` file:

```env
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

## Step 6: Test the Connection

1. Start the dev server (`npm run dev`)
2. Click the **Connected Apps** button (top-right corner)
3. Click **Connect Google Account**
4. Complete the Google OAuth consent flow
5. You should see green "Connected" badges for Drive, Gmail, and Calendar

## Troubleshooting

- **"Access blocked" error**: Make sure you added your email as a Test User in Step 3.7
- **"redirect_uri_mismatch"**: The redirect URI in your Google Cloud Console must exactly match `http://localhost:3000/api/auth/google/callback`
- **Tokens expire**: Shapeshift automatically refreshes tokens using the refresh token. If you see auth errors, disconnect and reconnect.
