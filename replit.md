# HTTPS Backend Server

## Overview
A Node.js Express backend server providing various API endpoints including:
- RSA decryption
- Image manipulation (PNG generation and size parsing)
- Proxy requests to external APIs
- MongoDB user insertion
- Puppeteer-based page testing
- WordPress mock endpoint

## Project Structure
- `index.js` - Main Express server application
- `_decypher/` - Sample RSA keys and encrypted files for testing
- `_size2json/` - Test PNG file for image size parsing

## Setup
The server runs on port 5000 bound to 0.0.0.0 for Replit compatibility.

```bash
npm install
npm run start
```

## API Endpoints
- `GET /` - Returns UUID
- `GET /health` - Health check
- `GET /login/` - Returns UUID
- `GET /sample/` - Returns sample function code
- `GET /fetch/` - Returns HTML page for fetch testing
- `ALL /result4/` - Returns JSON with headers and body
- `GET /hour/` - Returns current Moscow hour
- `POST /decypher/` - RSA decryption endpoint
- `GET /id/:n/` - Proxy to nd.kodaktor.ru
- `POST /size2json/` - Parse PNG dimensions
- `GET /makeimage/` - Generate PNG image
- `POST /insert/` - Insert user to MongoDB
- `GET /wordpress/wp-json/wp/v2/posts/1` - Mock WordPress API
- `POST /render/` - Template rendering
- `GET /test/` - Puppeteer page testing

## Dependencies
- express - Web framework
- mongoose - MongoDB ODM
- multer - File upload handling
- node-fetch - HTTP client
- pngjs - PNG manipulation
- puppeteer - Browser automation
- pug - Template engine

## Recent Changes
- 2026-01-08: Initial import and Replit environment setup
