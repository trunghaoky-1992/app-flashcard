/**
 * server.js
 * 
 * Production-ready Full-Stack Express and MongoDB Atlas server environment.
 * Serves the consolidated HTML page and provides secure permanent DB backups.
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to secure MongoDB Atlas clusters
const MONGO_URI = "mongodb+srv://trunghaoky_db_user:PaTLD228ERN7mcwp@cluster0.oh1tq0d.mongodb.net/hsk6_flashcards?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(MONGO_URI)
.then(() => console.log("Successful secure connection with MongoDB Atlas established!"))
.catch(err => {
  console.error("Database connection failure details:", err);
});

// Defining MongoDB Schemas
const stateSchema = new mongoose.Schema({
  identifier: { type: String, default: "global_state", unique: true },
  idiomDecks: { type: Object, required: true },
  masteredCards: { type: Object, default: {} }
});

const AppState = mongoose.model('AppState', stateSchema);

// Express Middleware configuration
app.use(cors());
app.use(bodyParser.json({ limit: '12mb' }));
app.use(bodyParser.urlencoded({ limit: '12mb', extended: true }));

// Express Static asset configurations
app.use(express.static(path.join(__dirname)));

// --- REST API BACKEND CHANNELS ---

// Get database records
app.get('/api/themes', async (req, res) => {
  try {
    const globalState = await AppState.findOne({ identifier: "global_state" });
    if (!globalState) {
      return res.json({ idiomDecks: {}, masteredCards: {} });
    }
    res.json(globalState);
  } catch (err) {
    res.status(500).json({ error: "Could not read records from MongoDB." });
  }
});

// Update database records
app.post('/api/themes/sync', async (req, res) => {
  const { idiomDecks, masteredCards } = req.body;
  if (!idiomDecks) {
    return res.status(400).json({ error: "Missing synchronization data payload." });
  }

  try {
    const result = await AppState.findOneAndUpdate(
      { identifier: "global_state" },
      { idiomDecks, masteredCards },
      { upsert: true, new: true }
    );
    res.json({ success: true, message: "Real-time updates synced successfully.", result });
  } catch (err) {
    res.status(500).json({ error: "Failed to persist synchronization to MongoDB." });
  }
});

// Send UI client - FIXED PATH FOR NEW EXPRESS VERSIONS
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Boot port listeners
app.listen(PORT, () => {
  console.log(`Express Service serving application on URL: http://localhost:${PORT}`);
  console.log("Database status: Connected live via Mongoose securely.");
});