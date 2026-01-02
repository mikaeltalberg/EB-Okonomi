# EB Økonomi

A web-based budget and financial management application for tracking income, expenses, and equity over time.

## Features

- 📊 **Budget Tracking**: Track income and expenses with detailed descriptions and dates
- 📈 **Visual Analytics**: Interactive charts showing financial development and equity over time
- 💰 **Equity Management**: Calculate and track equity based on shares and share values
- 📋 **Accounts Receivable**: Manage customer debts and payment tracking
- 🔐 **Secure Authentication**: Multiple authentication options including Microsoft OAuth and email
- ☁️ **Cloud Storage**: Automatic data sync with OneDrive (when using Microsoft authentication)
- 📄 **Export Options**: Export data to PDF or Excel formats
- 💳 **Subscription Management**: Integrated subscription system with Stripe payments

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Authentication**: 
  - Supabase Auth (Email/Magic Link)
  - Microsoft OAuth (MSAL.js)
- **Backend**: Supabase (Database, Auth, Edge Functions)
- **Storage**: 
  - LocalStorage (fallback)
  - Microsoft OneDrive (when using Microsoft auth)
- **Payments**: Stripe (via Supabase Edge Functions)
- **Charts**: Chart.js
- **PDF Export**: jsPDF
- **Excel Export**: SheetJS (xlsx)

## Getting Started

### Prerequisites

- A modern web browser
- Supabase account (for authentication and database)
- (Optional) Microsoft Azure account (for Microsoft OAuth)
- (Optional) Stripe account (for subscription payments)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/mikaeltalberg/EB-Okonomi.git
   cd EB-Okonomi
   ```

2. Configure the application:
   - Copy `config.js.example` to `config.js`
   - Add your Supabase credentials (see [Configuration](#configuration))

3. Open `index.html` in a web browser or serve it via a local web server:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js (if you have http-server installed)
   npx http-server -p 8000
   ```

4. Navigate to `http://localhost:8000` in your browser

## Configuration

### Supabase Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Get your project URL and anon key from Settings → API
3. Update `config.js` with your credentials:
   ```javascript
   const SUPABASE_CONFIG = {
       url: "https://your-project.supabase.co",
       anonKey: "your-anon-key-here"
   };
   ```

### Microsoft OAuth (Optional)

1. Register an application in Azure Portal
2. Get your Application (client) ID
3. Update `config.js`:
   ```javascript
   const MSAL_CONFIG = {
       clientId: "your-client-id-here",
       authority: "https://login.microsoftonline.com/common",
       // ...
   };
   ```

See the documentation in the `Documents/` folder for detailed setup guides.

## Usage

1. **Login/Signup**: Create an account or sign in with Microsoft
2. **Add Income**: Enter income amounts with descriptions and dates
3. **Add Expenses**: Track expenses with descriptions and dates
4. **Manage Shares**: Set number of shares and share value
5. **Track Debts**: Add accounts receivable with payment status
6. **Calculate Budget**: Click "Beregn Budsjett" to see financial summary
7. **Export Data**: Export to PDF or Excel for external use

## Project Structure

```
EB-Okonomi/
├── index.html          # Main HTML file
├── script.js           # Application logic
├── styles.css         # Styling
├── config.js          # Configuration (not in git)
├── config.js.example  # Configuration template
├── Documents/         # Documentation (not in git)
├── supabase/          # Supabase Edge Functions
└── README.md          # This file
```

## Security

- All sensitive credentials are stored in `config.js` (ignored by git)
- Supabase anon keys are safe to expose (designed for client-side use)
- Security is enforced via Row Level Security (RLS) policies in Supabase
- Service role keys are never exposed in client-side code

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is private and proprietary.

## Author

Mikael Talberg

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

---

**Note**: This application requires an active subscription to access full features. See the subscription management section in the app for details.

