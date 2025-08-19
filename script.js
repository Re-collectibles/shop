let allProducts = [];
let featuredProducts = [];
let cart = [];

// Load CSV
Papa.parse("DATA.csv", {
  download: true,
  header: true,
  complete: function(results) {
    allProducts = results.data.filter(row => row.Title && row.Price); 

    // Convert price string to number for sorting
    allProducts.forEach(p => {
      p.PriceNum = parseFloat(p.Price.replace(/[^0-9.]/g, "")) || 0;
      p.Stock = parseInt(p.Stock || 1);
    });

    // Total stock
    const totalStock = allProducts.reduce((sum, p) => sum + (p.Stock || 0), 0);
    document.getElementById("total-stock").textContent = `Total Stock: ${totalStock}`;

    // Shuffle all products
    shuffle(allProducts);

    // Get top 300 expensive
    featuredProducts = [...allProducts]
      .sort((a, b) => b.PriceNum - a.PriceNum)
      .slice(0, 300);

    renderFeatured();
    renderProducts(allProducts);

    // Rotate featured every 30s
    setInterval(renderFeatured, 30000);
  }
});

// Shuffle helper
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Render featured
function renderFeatured() {
  const featuredList = document.getElementById("featured-list");
  featuredList.innerHTML = "";

  shuffle(featuredProducts);
  const selected = featuredProducts.slice(0, 5);

  selected.forEach(p => {
    const div = document.createElement("div");
    div.className = "product featured";
    div.innerHTML = `
      <h2>${p.Title}</h2>
      <p>${truncateText(p.Description, 65)}</p>
      <p><strong>$${p.PriceNum.toFixed(2)}</strong></p>
      <button onclick="expandFeatured(this, '${p.Title}')">Show More</button>
      <button onclick="addToCart('${p.Title}', ${p.PriceNum})">Add to Cart</button>
    `;
    featuredList.appendChild(div);
  });
}

// Expand featured into full card below featured section
function expandFeatured(btn, title) {
  const product = featuredProducts.find(p => p.Title === title);
  if (!product) return;

  const expandedDiv = document.createElement("div");
  expandedDiv.className = "product featured expanded";
  expandedDiv.innerHTML = `
    <h2>${product.Title}</h2>
    <p>${product.Description}</p>
    <p><strong>$${product.PriceNum.toFixed(2)}</strong></p>
    <button onclick="addToCart('${product.Title}', ${product.PriceNum})">Add to Cart</button>
  `;
  document.getElementById("featured").appendChild(expandedDiv);

  // Replace original with another random featured
  btn.parentElement.remove();
  const replacement = featuredProducts[Math.floor(Math.random() * featuredProducts.length)];
  const div = document.createElement("div");
  div.className = "product featured";
  div.innerHTML = `
    <h2>${replacement.Title}</h2>
    <p>${truncateText(replacement.Description, 65)}</p>
    <p><strong>$${replacement.PriceNum.toFixed(2)}</strong></p>
    <button onclick="expandFeatured(this, '${replacement.Title}')">Show More</button>
    <button onclick="addToCart('${replacement.Title}', ${replacement.PriceNum})">Add to Cart</button>
  `;
  document.getElementById("featured-list").appendChild(div);
}

// Render all stock
function renderProducts(products) {
  const list = document.getElementById("product-list");
  list.innerHTML = "";

  products.forEach(p => {
    const div = document.createElement("div");
    div.className = "product";
    div.innerHTML = `
      <h2>${p.Title}</h2>
      <p>${p.Description}</p>
      <p><strong>$${p.PriceNum.toFixed(2)}</strong></p>
      <button onclick="addToCart('${p.Title}', ${p.PriceNum})">Add to Cart</button>
    `;
    list.appendChild(div);
  });
}

// Truncate helper
function truncateText(text, maxLength) {
  if (!text) return "";
  return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
}

// Search
document.getElementById("search").addEventListener("input", function() {
  const term = this.value.toLowerCase();
  const filtered = allProducts.filter(p =>
    p.Title.toLowerCase().includes(term) ||
    (p.Description && p.Description.toLowerCase().includes(term))
  );
  renderProducts(filtered);
});

// Clear search
document.getElementById("clear-search").addEventListener("click", () => {
  document.getElementById("search").value = "";
  renderProducts(allProducts);
});

// Cart functions
function addToCart(title, price) {
  const existing = cart.find(item => item.title === title);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ title, price, qty: 1 });
  }
  renderCart();
}

function removeFromCart(title) {
  cart = cart.filter(item => item.title !== title);
  renderCart();
}

function renderCart() {
  const cartDiv = document.getElementById("cart-items");
  cartDiv.innerHTML = "";

  let total = 0;

  cart.forEach(item => {
    total += item.price * item.qty;
    const div = document.createElement("div");
    div.className = "cart-item";
    div.innerHTML = `
      ${item.title} (x${item.qty}) - $${(item.price * item.qty).toFixed(2)}
      <button onclick="removeFromCart('${item.title}')">Remove</button>
    `;
    cartDiv.appendChild(div);
  });

  document.getElementById("cart-total").textContent = 
    `Total: $${total.toFixed(2)} (${cart.length} items)`;
}

// Copy cart to email
function copyCartToEmail() {
  let body = "Hello,%0D%0A%0D%0AI would like to order the following:%0D%0A%0D%0A";
  cart.forEach(item => {
    body += `${item.title} (x${item.qty}) - $${(item.price * item.qty).toFixed(2)}%0D%0A`;
  });
  body += "%0D%0AThank you.";

  window.location.href = `mailto:malcparknz@gmail.com?subject=Book Order&body=${body}`;
}
