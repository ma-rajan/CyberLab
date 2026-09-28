export interface ProductSearchResult {
  name: string;
  description: string;
  price: string;
  internal?: boolean;
}

const products: ProductSearchResult[] = [
  { name: 'Signal Backpack', description: 'Weather-resistant everyday pack.', price: '$49.00' },
  { name: 'Cipher Notebook', description: 'Grid paper notebook for field notes.', price: '$12.00' },
  {
    name: 'Access Badge Lanyard',
    description: 'Breakaway lanyard with badge sleeve.',
    price: '$8.00',
  },
];

const internalProduct: ProductSearchResult = {
  name: 'Internal wholesale reconciliation note',
  description: 'Escalation flag: CYBERLAB{product_search_tautology}',
  price: 'Not for sale',
  internal: true,
};

function hasTautology(search: string) {
  return /'\s+or\s+(?:'[^']*'|\d+)\s*=\s*(?:'[^']*'|\d+)/i.test(search);
}

/**
 * This is a deliberately limited SQLi teaching target. It emulates the vulnerable
 * WHERE clause against fixed in-memory target data; it never executes user input
 * as SQL and has no access to the CyberLab platform database.
 */
export function searchProducts(search: string) {
  const queryPreview = `SELECT name, description, price FROM products WHERE name LIKE '%${search}%';`;
  if (hasTautology(search)) return { queryPreview, results: [...products, internalProduct] };
  const normalized = search.trim().toLowerCase();
  return {
    queryPreview,
    results: normalized
      ? products.filter((product) => product.name.toLowerCase().includes(normalized))
      : products,
  };
}
