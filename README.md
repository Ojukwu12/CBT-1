# Backend - Phase 0 Day 1

Production-ready Node.js backend foundation with Express, MongoDB, and centralized error handling.

## Quick Start

### Prerequisites
- Node.js 14+
- MongoDB running locally or remote connection string

### Installation

```bash
npm install
```

### Environment Setup

Update `.env` file:
```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/mydb
NODE_ENV=development
```

### Running the Server

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

## API Endpoints

### Health Check
```
GET /api/health
```

Response:
```json
{
  "status": "ok",
  "environment": "development"
}
```

## Architecture

```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── app.js           # Express app setup
│   ├── server.js        # Entry point
│   ├── routes/          # API routes
│   ├── middleware/      # Global middleware
│   ├── utils/           # Utilities
│   └── modules/         # Feature modules (future)
├── .env                 # Environment variables
└── package.json         # Dependencies
```

## Features

✅ Express.js server  
✅ MongoDB with Mongoose  
✅ Global error handling  
✅ Environment validation  
✅ CORS support  
✅ Request logging (Morgan)  
✅ Production-ready structure  

## Error Handling

All errors are handled globally through centralized middleware. Responses follow this format:

```json
{
  "success": false,
  "message": "error message"
}
```
