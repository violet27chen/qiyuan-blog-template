/**
 * Sync resource products from the resource site API into config/resources.yaml
 * Run: npm run sync:resources
 */
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

const API_BASE = process.env.RESOURCES_API_BASE || 'https://resources.qiyuan.icu';
const OUTPUT = path.join(process.cwd(), 'config', 'resources.yaml');

function normalizeProduct(product) {
  const category = product.category && product.category !== 'NULL' ? product.category : '其他';
  return {
    id: product.id,
    name: product.name,
    description: product.description || '',
    category,
    cloudType: product.cloud_type || 'quark',
    link: product.quark_link,
    image: product.image_url || null,
    createdAt: product.created_at,
  };
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.json();
}

const [productsData, categoriesData] = await Promise.all([
  fetchJson(`${API_BASE}/api/products?limit=200`),
  fetchJson(`${API_BASE}/api/categories`),
]);

const products = (productsData.products ?? [])
  .filter((product) => product.is_active !== false && product.quark_link)
  .map(normalizeProduct)
  .sort((a, b) => b.id - a.id);

const categories = [...new Set(products.map((product) => product.category))].sort();

const output = {
  imageBase: API_BASE,
  syncedAt: new Date().toISOString(),
  categories,
  products,
};

fs.writeFileSync(OUTPUT, YAML.stringify(output), 'utf8');
console.log(`Synced ${products.length} resources to ${OUTPUT}`);
