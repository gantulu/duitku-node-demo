require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const crypto = require('crypto');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

const MERCHANT_CODE = process.env.MERCHANT_CODE;
const MERCHANT_KEY = process.env.MERCHANT_KEY;
const DUITKU_API_URL = process.env.DUITKU_API_URL;
const PORT = process.env.PORT || 3000;

function md5hex(input) {
  return crypto.createHash('md5').update(input, 'utf8').digest('hex');
}

function makeOrderId() {
  return 'ORD-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
}

app.post('/create-payment', async (req, res) => {
  try {
    const { amount, productDetails, customerName, returnUrl, callbackUrl } = req.body;
    if (!amount || !returnUrl || !callbackUrl)
      return res.status(400).json({ error: 'Missing required fields' });

    const merchantOrderId = makeOrderId();
    const signature = md5hex(MERCHANT_CODE + amount + merchantOrderId + MERCHANT_KEY);

    const payload = {
      merchantCode: MERCHANT_CODE,
      paymentAmount: amount,
      merchantOrderId,
      productDetails,
      email: "customer@example.com",
      phoneNumber: "08123456789",
      callbackUrl,
      returnUrl,
      signature
    };

    const duitkuRes = await fetch(DUITKU_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const json = await duitkuRes.json();
    res.json({ success: true, data: json });
  } catch (err) {
    console.error('Create Payment Error:', err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

app.post('/callback', (req, res) => {
  try {
    const body = req.body;
    const { merchantCode, paymentAmount, merchantOrderId, signature, resultCode } = body;
    const expected = md5hex(merchantCode + paymentAmount + merchantOrderId + MERCHANT_KEY);

    if (signature !== expected) {
      console.log('❌ Invalid signature callback');
      return res.status(403).send('INVALID SIGNATURE');
    }

    if (resultCode === '00') {
      console.log('✅ Pembayaran sukses:', merchantOrderId);
    } else {
      console.log('❌ Pembayaran gagal:', merchantOrderId, 'code:', resultCode);
    }

    res.send('SUCCESS');
  } catch (err) {
    console.error('Callback Error:', err);
    res.status(500).send('ERROR');
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});
