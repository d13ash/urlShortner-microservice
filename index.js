require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

const dns = require('dns');
const urlParser = require('url');
app.use(express.urlencoded({ extended: false }));


// Mongoose URL schema and model
const urlSchema = new mongoose.Schema({
  original_url: { type: String, required: true },
  short_url: { type: Number, required: true, unique: true }
});
const Url = mongoose.model('Url', urlSchema);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
.then(()=>{console.log("Mongoose connected");
}).catch((err)=>{
  console.log(err);
});

// POST endpoint to create short URL

app.post('/api/shorturl', async (req, res) => {
  const originalUrl = req.body.url;
  let urlObj;
  try {
    urlObj = new URL(originalUrl);
  } catch (err) {
    return res.json({ error: 'invalid url' });
  }
  if (!/^https?:\/\//.test(originalUrl)) {
    return res.json({ error: 'invalid url' });
  }
  dns.lookup(urlObj.hostname, async (err) => {
    if (err) {
      return res.json({ error: 'invalid url' });
    }
    // Check if already exists in DB
    let found = await Url.findOne({ original_url: originalUrl });
    if (found) {
      return res.json({ original_url: found.original_url, short_url: found.short_url });
    }
    // Find max short_url value
    let last = await Url.findOne().sort('-short_url');
    const shortUrl = last ? last.short_url + 1 : 1;
    const newUrl = new Url({ original_url: originalUrl, short_url: shortUrl });
    await newUrl.save();
    res.json({ original_url: originalUrl, short_url: shortUrl });
  });
});

// GET endpoint to redirect

app.get('/api/shorturl/:short_url', async (req, res) => {
  const shortUrl = parseInt(req.params.short_url);
  const entry = await Url.findOne({ short_url: shortUrl });
  if (entry) {
    return res.redirect(entry.original_url);
  } else {
    return res.json({ error: 'invalid url' });
  }
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});