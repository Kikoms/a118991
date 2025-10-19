const fs = require('fs/promises');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'payment_providers.json');

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
  }
}

async function initializeDatabase() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch (error) {
    await fs.writeFile(
      DATA_FILE,
      JSON.stringify({ providers: [], activeProvider: null }, null, 2),
      'utf8'
    );
  }
}

async function readDatabase() {
  await initializeDatabase();
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    const data = JSON.parse(raw);
    return {
      providers: Array.isArray(data.providers) ? data.providers : [],
      activeProvider: typeof data.activeProvider === 'string' ? data.activeProvider : null
    };
  } catch (error) {
    return { providers: [], activeProvider: null };
  }
}

async function writeDatabase(data) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function decorateProvider(provider, activeProvider) {
  if (!provider) {
    return null;
  }
  return {
    ...provider,
    is_active: provider.provider_code === activeProvider ? 1 : 0
  };
}

async function listProviders() {
  const data = await readDatabase();
  return data.providers.map((provider) => decorateProvider(provider, data.activeProvider));
}

async function getProviderByCode(providerCode) {
  const data = await readDatabase();
  const provider = data.providers.find((item) => item.provider_code === providerCode);
  return decorateProvider(provider, data.activeProvider);
}

async function upsertProvider({ providerCode, storeName, merchantId, apiKey, paymentUrl }) {
  const data = await readDatabase();
  const timestamp = new Date().toISOString();
  const provider = {
    provider_code: providerCode,
    store_name: storeName,
    merchant_id: merchantId,
    api_key: apiKey,
    payment_url: paymentUrl,
    updated_at: timestamp
  };

  const index = data.providers.findIndex((item) => item.provider_code === providerCode);
  if (index >= 0) {
    data.providers[index] = { ...data.providers[index], ...provider, updated_at: timestamp };
  } else {
    data.providers.push(provider);
  }

  await writeDatabase(data);
  return decorateProvider(provider, data.activeProvider);
}

async function setActiveProvider(providerCode) {
  const data = await readDatabase();
  const exists = data.providers.some((provider) => provider.provider_code === providerCode);
  if (!exists) {
    throw new NotFoundError('Provider not found');
  }
  data.activeProvider = providerCode;
  await writeDatabase(data);
}

async function getActiveProvider() {
  const data = await readDatabase();
  const provider = data.providers.find((item) => item.provider_code === data.activeProvider);
  return decorateProvider(provider, data.activeProvider);
}

module.exports = {
  initializeDatabase,
  listProviders,
  getProviderByCode,
  upsertProvider,
  setActiveProvider,
  getActiveProvider,
  NotFoundError
};
