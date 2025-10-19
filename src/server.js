require('dotenv').config();
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const {
  initializeDatabase,
  listProviders,
  getProviderByCode,
  upsertProvider,
  setActiveProvider,
  getActiveProvider,
  NotFoundError
} = require('./db');

const PORT = process.env.PORT || 3000;

const SUPPORTED_PROVIDERS = {
  omg: { label: '歐買尬金流' },
  newebpay: { label: '藍新金流' },
  ecpay: { label: '綠界金流' }
};

async function bootstrap() {
  await initializeDatabase();

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.get('/api/providers', async (_req, res) => {
    try {
      const providers = await listProviders();
      res.json({ providers, supportedProviders: SUPPORTED_PROVIDERS });
    } catch (error) {
      console.error('Failed to fetch providers', error);
      res.status(500).json({ message: '無法取得金流設定' });
    }
  });

  app.post('/api/providers', async (req, res) => {
    const { providerCode, storeName, merchantId, apiKey, paymentUrl, makeActive = false } = req.body;

    if (!providerCode || !SUPPORTED_PROVIDERS[providerCode]) {
      return res.status(400).json({ message: '不支援的金流代號' });
    }
    if (!storeName || !merchantId || !apiKey || !paymentUrl) {
      return res.status(400).json({ message: '請完整填寫所有欄位' });
    }

    try {
      const provider = await upsertProvider({ providerCode, storeName, merchantId, apiKey, paymentUrl });

      if (makeActive) {
        await setActiveProvider(providerCode);
      }

      const result = await getProviderByCode(providerCode);
      res.status(201).json({ provider: result || provider });
    } catch (error) {
      console.error('Failed to upsert provider', error);
      res.status(500).json({ message: '儲存金流設定失敗' });
    }
  });

  app.post('/api/active-provider', async (req, res) => {
    const { providerCode } = req.body;
    if (!providerCode || !SUPPORTED_PROVIDERS[providerCode]) {
      return res.status(400).json({ message: '不支援的金流代號' });
    }

    try {
      await setActiveProvider(providerCode);
      res.json({ message: '已更新預設金流' });
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({ message: '請先建立此金流設定' });
      }
      console.error('Failed to activate provider', error);
      res.status(500).json({ message: '設定預設金流失敗' });
    }
  });

  app.get('/api/active-provider', async (_req, res) => {
    try {
      const provider = await getActiveProvider();
      if (!provider) {
        return res.status(404).json({ message: '尚未設定預設金流' });
      }
      res.json({ provider });
    } catch (error) {
      console.error('Failed to fetch active provider', error);
      res.status(500).json({ message: '取得預設金流失敗' });
    }
  });

  app.post('/api/payments', async (req, res) => {
    const { amount, description = '', customerEmail = '' } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: '請輸入有效的金額' });
    }

    try {
      const provider = await getActiveProvider();
      if (!provider) {
        return res.status(400).json({ message: '尚未設定預設金流，請聯絡管理員' });
      }

      const orderId = crypto.randomUUID();
      const url = new URL(provider.payment_url);
      url.searchParams.set('merchantId', provider.merchant_id);
      url.searchParams.set('storeName', provider.store_name);
      url.searchParams.set('orderId', orderId);
      url.searchParams.set('amount', String(amount));
      if (description) {
        url.searchParams.set('description', description);
      }
      if (customerEmail) {
        url.searchParams.set('email', customerEmail);
      }

      res.json({
        redirectUrl: url.toString(),
        orderId,
        provider: {
          code: provider.provider_code,
          name: SUPPORTED_PROVIDERS[provider.provider_code]?.label || provider.provider_code
        }
      });
    } catch (error) {
      console.error('Failed to create payment', error);
      res.status(500).json({ message: '建立付款連結失敗' });
    }
  });

  app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  });

  app.get('/admin', (_req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));
  });

  app.use((err, _req, res, _next) => {
    console.error('Unhandled error', err);
    res.status(500).json({ message: '伺服器發生錯誤' });
  });

  app.listen(PORT, () => {
    console.log(`Payment demo server listening on http://localhost:${PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
