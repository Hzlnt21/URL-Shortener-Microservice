require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser'); // Tambahkan body-parser
const dns = require('dns'); // Tambahkan dns untuk memvalidasi URL
const mongoose = require('mongoose'); // Tambahkan mongoose untuk MongoDB

const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false })); // Middleware body-parser
app.use('/public', express.static(`${process.cwd()}/public`));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// MongoDB Schema dan Model
const urlSchema = new mongoose.Schema({
  original_url: String,
  short_url: Number
});

const Url = mongoose.model('Url', urlSchema);

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

// Endpoint untuk membuat short URL
app.post('/api/shorturl', async (req, res) => {
  const originalUrl = req.body.url;
  const urlPattern = /^(http|https):\/\/[^ "]+$/;

  // Validasi format URL
  if (!urlPattern.test(originalUrl)) {
    return res.json({ error: 'invalid url' });
  }

  try {
    // Gunakan DNS untuk validasi domain
    await dns.promises.lookup(new URL(originalUrl).hostname);

    // Cek apakah URL sudah ada di database
    const existingUrl = await Url.findOne({ original_url: originalUrl });

    if (existingUrl) {
      // Jika sudah ada, kembalikan short URL yang sudah ada
      return res.json({ original_url: existingUrl.original_url, short_url: existingUrl.short_url });
    } else {
      // Jika belum ada, buat short URL baru
      const count = await Url.countDocuments({});
      const newUrl = new Url({
        original_url: originalUrl,
        short_url: count + 1
      });
      const savedData = await newUrl.save();
      return res.json({ original_url: savedData.original_url, short_url: savedData.short_url });
    }
  } catch (err) {
    return res.json({ error: 'invalid url' });
  }
});

// Endpoint untuk redirect dari short URL ke original URL
app.get('/api/shorturl/:short_url', async (req, res) => {
  const shortUrl = req.params.short_url;

  try {
    const data = await Url.findOne({ short_url: shortUrl });

    if (data) {
      return res.redirect(data.original_url); // Redirect ke URL asli
    } else {
      return res.json({ error: 'No short URL found for the given input' });
    }
  } catch (err) {
    return res.send(err);
  }
});

// Start the server
app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
