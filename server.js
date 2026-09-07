import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'journal_store.json');
const DATA_TMP_FILE = path.join(DATA_DIR, 'journal_store.tmp.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create data directory:', err);
  }
}

app.use(express.json({ limit: '150mb' }));
app.use(express.urlencoded({ extended: true, limit: '150mb' }));

app.use(express.static(__dirname));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Get persisted journal data
app.get('/api/journal-data', async (req, res) => {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return res.json({ success: true, data: null });
    }
    const raw = await fs.promises.readFile(DATA_FILE, 'utf8');
    if (!raw || !raw.trim()) {
      return res.json({ success: true, data: null });
    }
    const parsed = JSON.parse(raw);
    res.json({ success: true, data: parsed });
  } catch (err) {
    console.error('Error reading journal data from server storage:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Save persisted journal data
app.post('/api/journal-data', async (req, res) => {
  try {
    const payload = req.body;
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid payload' });
    }

    const payloadWithMeta = {
      ...payload,
      _serverLastSaved: Date.now(),
    };

    const jsonString = JSON.stringify(payloadWithMeta);
    await fs.promises.writeFile(DATA_TMP_FILE, jsonString, 'utf8');
    await fs.promises.rename(DATA_TMP_FILE, DATA_FILE);

    res.json({ success: true, timestamp: payloadWithMeta._serverLastSaved });
  } catch (err) {
    console.error('Error saving journal data to server storage:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Reset persisted journal data
app.post('/api/journal-data/reset', async (req, res) => {
  try {
    if (fs.existsSync(DATA_FILE)) {
      await fs.promises.unlink(DATA_FILE);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error resetting journal data:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});

