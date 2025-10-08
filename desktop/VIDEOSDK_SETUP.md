# VideoSDK Token Setup Guide

## ❌ Current Issue
Your VideoSDK token is returning a 401 "Token is invalid" error. This means:
1. The token has expired
2. The token format is incorrect
3. The API key used to generate the token is invalid

## ✅ How to Fix This

### Step 1: Get a VideoSDK Account
1. Go to [https://videosdk.live](https://videosdk.live)
2. Click "Sign Up" and create a free account
3. Verify your email address

### Step 2: Access Dashboard
1. Login to your VideoSDK account
2. You'll be taken to the dashboard
3. Look for "API Keys" or "Developers" section

### Step 3: Get Your API Key
1. In the dashboard, find your **API Key**
2. Copy this API key (it looks like: `8c27e1d1-2718-485d-ace3-02e9ff4f37e0`)
3. Also find your **Secret Key** (if shown)

### Step 4: Generate a Token
You have two options:

#### Option A: Use Dashboard Token Generator (Quick)
1. In the dashboard, look for "Generate Token" or "Token Generator"
2. Select permissions: `allow_join`, `allow_mod`
3. Set expiry to maximum time available
4. Click "Generate"
5. Copy the generated token

#### Option B: Generate Programmatically (Recommended)
Create a simple Node.js script:

```javascript
const jwt = require('jsonwebtoken');

const apiKey = 'YOUR_API_KEY_HERE'; // From dashboard
const secretKey = 'YOUR_SECRET_KEY_HERE'; // From dashboard

const payload = {
  apikey: apiKey,
  permissions: ['allow_join', 'allow_mod'],
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days
};

const token = jwt.sign(payload, secretKey, { algorithm: 'HS256' });
console.log('VideoSDK Token:', token);
```

### Step 5: Update Your Code
1. Open `src/config/videosdk.ts`
2. Replace the `token` value with your new token:

```typescript
export const VIDEOSDK_CONFIG = {
  token: 'YOUR_NEW_TOKEN_HERE', // Paste your new token here
  // ... rest of config
};
```

### Step 6: Test
1. Save the file
2. Restart your application
3. The 401 error should be resolved

## 🔍 Debugging Tips

### Check Token Expiry
Your current token expires on: **2024-12-05** (if the one in code is accurate)

### Verify Token Format
A valid VideoSDK token should:
- Be a JWT (3 parts separated by dots)
- Start with `eyJ`
- Be quite long (200+ characters)

### Common Issues
1. **Expired Token**: Generate a new one with longer expiry
2. **Wrong API Key**: Make sure you're using the correct API key from your account
3. **Missing Permissions**: Ensure token has `allow_join` and `allow_mod` permissions
4. **Wrong Secret**: Use the correct secret key for signing

## 📞 Need Help?
- VideoSDK Documentation: [https://docs.videosdk.live](https://docs.videosdk.live)
- VideoSDK Support: Contact through their dashboard
- Check their Discord/community for quick help

Once you have a valid token, your streaming application should work without the 401 errors!