const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;
const OUTPUT_DIR = path.join(__dirname, '../app-showcase');

const ROUTES = [
  { path: '/', name: 'dashboard' },
  { path: '/invoices', name: 'invoices' },
  { path: '/invoices/new', name: 'invoice-create' },
  { path: '/records', name: 'records' },
  { path: '/settings', name: 'settings' },
  { path: '/clients', name: 'clients' },
  { path: '/expenses', name: 'expenses' },
  { path: '/products', name: 'products' },
  // Additional routes requested
  { path: '/receipts', name: 'receipts' },
  { path: '/receipts/new', name: 'receipt-create' },
  { path: '/estimates', name: 'estimates' },
  { path: '/purchase-orders', name: 'purchase-orders' },
  { path: '/reports', name: 'reports' },
  { path: '/company', name: 'company' },
];

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
];

const THEMES = ['light', 'dark'];

async function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

async function capture() {
  console.log('Starting screenshot capture...');
  
  // Ensure output directories exist
  for (const theme of THEMES) {
    for (const viewport of VIEWPORTS) {
      await ensureDir(path.join(OUTPUT_DIR, theme, viewport.name));
    }
  }

  const browser = await puppeteer.launch({
    headless: "new",
    defaultViewport: null
  });

  const page = await browser.newPage();
  
  // Initial check to ensure dev server is running (with longer timeout for Next.js cold start)
  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch (err) {
    console.error(`\n❌ Could not connect to ${BASE_URL}. Ensure your Next.js dev server is running (npm run dev)!\n`);
    await browser.close();
    process.exit(1);
  }

  for (const route of ROUTES) {
    console.log(`\nNavigating to ${route.name} (${route.path})...`);
    try {
      await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      
      // Wait an extra moment for complex layouts or Framer Motion to settle
      await new Promise(resolve => setTimeout(resolve, 500));

      for (const viewport of VIEWPORTS) {
        await page.setViewport({ width: viewport.width, height: viewport.height });
        
        for (const theme of THEMES) {
          // Toggle theme
          await page.evaluate((t) => {
            document.documentElement.setAttribute('data-theme', t);
            localStorage.setItem('theme', t);
          }, theme);
          
          // Wait for CSS transitions
          await new Promise(resolve => setTimeout(resolve, 300));
          
          const filename = `${route.name}.png`;
          const filepath = path.join(OUTPUT_DIR, theme, viewport.name, filename);
          
          await page.screenshot({ path: filepath });
          console.log(`  📸 Captured ${theme} ${viewport.name} view.`);
        }
      }
    } catch (err) {
      console.warn(`  ⚠️ Failed to capture ${route.name}: ${err.message}`);
    }
  }

  await browser.close();
  console.log('\n✅ All screenshots captured successfully in /app-showcase!');
}

capture().catch(console.error);
