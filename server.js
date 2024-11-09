import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import getDefinition from './api/get-definition.js'; // No changes needed here
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Get the __dirname value for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// API route for calling the Gemini API
app.post('/api/get-definition', getDefinition);

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
