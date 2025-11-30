# HS Code API Integration Guide

## Overview
This document explains how to integrate the HS Code lookup functionality with your Google API backend.

## Frontend Implementation
The FCL service now includes:
- HS Code input field with validation
- Auto-lookup functionality with debouncing
- Manual lookup button
- HS Code description display
- Integration with PDF generation and booking confirmation

## Backend API Endpoint Required

### Endpoint: `/api/hs-code-lookup`
**Method:** POST
**Content-Type:** application/json

### Request Body
```json
{
  "hsCode": "8517.12.00"
}
```

### Response Format
```json
{
  "success": true,
  "hsCode": "8517.12.00",
  "description": "Telephones for cellular networks or for other wireless networks",
  "commodityDescription": "Mobile phones and smartphones",
  "tariffRate": "0%",
  "restrictions": [],
  "additionalInfo": {
    "chapter": "85",
    "heading": "8517",
    "subheading": "851712"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "HS Code not found",
  "message": "The provided HS Code does not exist in the database"
}
```

## Google API Integration Example

### Node.js/Express Backend Example
```javascript
const express = require('express');
const { GoogleAuth } = require('google-auth-library');
const app = express();

app.use(express.json());

// Initialize Google Auth (configure with your credentials)
const auth = new GoogleAuth({
  keyFile: 'path/to/your/service-account-key.json',
  scopes: ['https://www.googleapis.com/auth/cloud-platform']
});

app.post('/api/hs-code-lookup', async (req, res) => {
  try {
    const { hsCode } = req.body;
    
    if (!hsCode) {
      return res.status(400).json({
        success: false,
        error: 'Missing HS Code',
        message: 'HS Code is required'
      });
    }

    // Validate HS Code format (4-10 digits)
    if (!/^\d{4,10}$/.test(hsCode)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid HS Code format',
        message: 'HS Code must be 4-10 digits'
      });
    }

    // Call your Google API service here
    const hsCodeData = await lookupHsCodeWithGoogle(hsCode);
    
    if (hsCodeData) {
      res.json({
        success: true,
        hsCode: hsCode,
        description: hsCodeData.description,
        commodityDescription: hsCodeData.commodityDescription,
        tariffRate: hsCodeData.tariffRate || '0%',
        restrictions: hsCodeData.restrictions || [],
        additionalInfo: hsCodeData.additionalInfo || {}
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'HS Code not found',
        message: 'The provided HS Code does not exist in the database'
      });
    }
    
  } catch (error) {
    console.error('HS Code lookup error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to lookup HS Code'
    });
  }
});

async function lookupHsCodeWithGoogle(hsCode) {
  // Implement your Google API call here
  // This could be Google Sheets API, Firestore, or custom Google Cloud service
  
  // Example using Google Sheets API
  const authClient = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: authClient });
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: 'your-spreadsheet-id',
    range: 'HSCodes!A:D', // Adjust range as needed
  });
  
  const rows = response.data.values;
  const hsCodeRow = rows.find(row => row[0] === hsCode);
  
  if (hsCodeRow) {
    return {
      description: hsCodeRow[1],
      commodityDescription: hsCodeRow[2],
      tariffRate: hsCodeRow[3]
    };
  }
  
  return null;
}
```

## Frontend Integration Details

### Auto-lookup Feature
- Triggers after user types 6+ digits
- 1-second debounce to prevent excessive API calls
- Shows loading state during lookup

### Manual Lookup
- Button click triggers immediate lookup
- Validates HS Code format before API call
- Shows success/error toast messages

### Form Integration
- HS Code fields are included in form submission
- Data is stored in `fclFormData` object
- Integrated with quote generation and PDF export

## Security Considerations

1. **Rate Limiting**: Implement rate limiting on the API endpoint
2. **Authentication**: Add proper authentication if needed
3. **Input Validation**: Validate HS Code format on both frontend and backend
4. **Error Handling**: Provide meaningful error messages
5. **Caching**: Consider caching frequently looked up HS Codes

## Testing

### Test HS Codes for Development
- `8517.12.00` - Mobile phones
- `6203.42.40` - Men's trousers
- `8471.30.01` - Portable computers
- `9403.10.00` - Office furniture

### Frontend Testing
1. Enter valid HS Code and verify auto-lookup
2. Test manual lookup button
3. Verify error handling for invalid codes
4. Check PDF generation includes HS Code info
5. Confirm booking confirmation shows HS Code details

## Deployment Notes

1. Update your backend to include the `/api/hs-code-lookup` endpoint
2. Configure Google API credentials
3. Set up your HS Code database (Google Sheets, Firestore, etc.)
4. Test the integration thoroughly
5. Monitor API usage and performance

The frontend is ready and will automatically work once you implement the backend endpoint following this specification.