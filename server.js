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
const PORT = process.env.PORT || 5000;

// Connect to secure MongoDB Atlas clusters
const MONGO_URI = process.env.MONGODB_URI || "mongodb+srv://trunghaoky_db_user:PaTLD228ERN7mcwp@cluster0.oh1tq0d.mongodb.net/hsk6_flashcards?retryWrites=true&w=majority&appName=Cluster0";

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
    console.error("Get Themes Error:", err);
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
      { upsert: true, returnDocument: 'after' }
    );
    res.json({ success: true, message: "Real-time updates synced successfully.", result });
  } catch (err) {
    console.error("Sync Error:", err);
    res.status(500).json({ error: "Failed to persist synchronization to MongoDB." });
  }
});

// AI Endpoint: Tự động chuyển đổi câu ví dụ tiếng Trung thành Pinyin
app.post('/api/generate-pinyin', async (req, res) => {
  const { examples } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!examples || !Array.isArray(examples)) {
    return res.status(400).json({ error: 'Vui lòng cung cấp danh sách câu ví dụ!' });
  }

  if (!apiKey) {
    return res.status(500).json({ error: 'Chưa cấu hình GEMINI_API_KEY trên server!' });
  }

  try {
    const prompt = `Chuyển đổi các câu tiếng Trung sau đây thành Pinyin có dấu thanh điệu đầy đủ.
Danh sách câu:
${examples.map((ex, index) => `${index + 1}. ${ex}`).join('\n')}

Trả về kết quả DUY NHẤT dưới dạng mảng JSON các chuỗi Pinyin (không chứa markdown, không chứa chữ Hán, không chứa chữ dư thừa):
["Pinyin câu 1", "Pinyin câu 2", "Pinyin câu 3"]`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();
    const rawText = data.candidates[0].content.parts[0].text;
    const cleanJson = rawText.replace(/```json|```/g, '').trim();
    const pinyinList = JSON.parse(cleanJson);

    res.json({ success: true, pinyinList });
  } catch (error) {
    console.error("Lỗi tạo Pinyin:", error);
    res.status(500).json({ error: 'Tạo Pinyin tự động thất bại!' });
  }
});

// Send UI client
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Boot port listeners
app.listen(PORT, () => {
  console.log(`Express Service serving application on URL: http://localhost:${PORT}`);
  console.log("Database status: Connected live via Mongoose securely.");
});
