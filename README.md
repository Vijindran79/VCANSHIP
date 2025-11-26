# VCanShip - One-Stop Logistics Platform

A comprehensive shipping and logistics platform that provides live rates from multiple carriers including Sendcloud and SeaRates.

## Features

- **Multi-Service Support**: Parcel, FCL, LCL, Air Freight, and more
- **Live Rate Quotes**: Real-time shipping rates from integrated carriers
- **Address Autocomplete**: Powered by Geoapify for accurate address entry
- **Multi-Language Support**: Available in multiple languages
- **User Authentication**: Firebase-based authentication
- **Payment Integration**: Stripe payment processing
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Frontend**: TypeScript, Vite, HTML/CSS
- **Backend**: Firebase Cloud Functions (Node.js)
- **APIs**: Sendcloud, SeaRates, Geoapify, Google Gemini
- **Payment**: Stripe
- **Hosting**: Firebase Hosting

## Setup

### Prerequisites

- Node.js (v18 or higher)
- Firebase CLI
- Valid API keys for:
  - Sendcloud (public and secret keys)
  - SeaRates
  - Geoapify
  - Google Gemini
  - Stripe

### Installation

1. Clone the repository
2. Install frontend dependencies:
   ```bash
   npm install
   ```

3. Install backend dependencies:
   ```bash
   cd functions
   npm install
   cd ..
   ```

4. Configure environment variables:
   - Create `functions/.env` with your API keys:
     ```
     SENDCLOUD_PUBLIC_KEY=your_key_here
     SENDCLOUD_SECRET_KEY=your_key_here
     SEARATES_API_KEY=your_key_here
     GEOAPIFY_KEY=your_key_here
     GEMINI_API_KEY=your_key_here
     ```
   - Create `.env` for frontend:
     ```
     VITE_GEOAPIFY_KEY=your_key_here
     VITE_GEMINI_API_KEY=your_key_here
     ```

### Development

Run the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Deployment

Deploy to Firebase:
```bash
npm run build
firebase deploy
```

## Project Structure

```
├── functions/          # Firebase Cloud Functions (backend)
│   ├── index.js       # Main backend logic
│   └── .env           # Backend API keys
├── src/               # Frontend source files
│   ├── *.ts           # TypeScript modules
│   ├── index.html     # Main HTML
│   └── index.css      # Styles
├── firebase.json      # Firebase configuration
└── package.json       # Dependencies
```

## API Integration

### Sendcloud
Used for parcel shipping rates. Requires public and secret API keys.

### SeaRates
Used for FCL (Full Container Load) shipping rates. Requires API key.

### Geoapify
Provides address autocomplete functionality.

### Google Gemini
Powers the AI chatbot and HS code suggestions.

## License

Proprietary - All rights reserved

## Support

For support, please contact: vg@vcnresources.com
