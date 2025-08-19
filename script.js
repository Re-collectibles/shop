let allData = [];
let cart = {};

Papa.parse("data/ProductExportTradeMe250817_202019.csv", {
  download: true,
  header: true,
  complete: function(results) {
    // Filter valid rows
    allData = results.data.filter(item => item.title || item.body || item.start_price || item.stock_amount);

    // Shuffle products randomly
    allData = allData.sort(() => Math.random() - 0.5);

    // Render all
    renderProducts(allData);

    // Stock count
    const totalStock = allData.reduce((sum, item) => {
      const stockNum = parseFloat(item.stock_amount);
      return sum + (isNaN(stockNum) ? 0 : stockNum);
    }, 0);
    document.getElementById("total-stock").textContent = `Total Stock: ${totalStock}`;

    // Search handler
    document.getElementById("search").addEventListener("input", handleSearch);
    document.getElementById("clear-search").addEventListener("click", () => {
      document.getElementById("search").value = "";
      renderProducts(allData);
    });
  }
});

function handleSearch(e) {
  const query = e.target.value.trim().toLowerCase();
  const filtered = allData.filter(item => {
    const title = (item.title || "").toLowerCase();
    const body = (item.body || "").toLowerCase();
    return title.includes(query) || body.includes(query);
  });
  renderProducts(filtered);
}

function renderProducts(products) {
  const container = document.getElementById("product-list");
  container.innerHTML = "";

  if (!products || products.length === 0) {
    container.innerHTML = "<p>No results found.</p>";
    return;
  }

  products.forEach(p => {
    const title = p.title || "Untitled";
    const body = p.body || "No description available.";
    const price = p.start_price || "N/A";

    let stock = "N/A";
    if (p.stock_amount) {
      const stockNum = parseFloat(p.stock_amount);
      if (!isNaN(stockNum)) stock = Math.round(stockNum).toString();
    }

    const div = document.createElement("div");
    div.className = "product";
    div.innerHTML = `
      <h2>${title}</h2>
      <p>${body}</p>
      <strong>Price: $${price}</strong><br>
      <em>Stock: ${stock}</em><br>
      <button class="add-to-cart">Add to Cart</button>
    `;

    div.querySelector(".add-to-cart").addEventListener("click", () => addToCart(title, price));
    container.appendChild(div);
  });
}

/* ---- CART FUNCTIONS ---- */
function addToCart(title, price) {
  if (cart[title]) {
    cart[title].quantity += 1;
  } else {
    cart[title] = { price: parseFloat(price) || 0, quantity: 1 };
  }
  renderCart();
}

function removeFromCart(title) {
  delete cart[title];
  renderCart();
}

function renderCart() {
  const itemsContainer = document.getElementById("cart-items");
  const summary = document.getElementById("cart-summary");

  itemsContainer.innerHTML = "";

  let totalItems = 0;
  let totalPrice = 0;

  Object.entries(cart).forEach(([title, item]) => {
    totalItems += item.quantity;
    totalPrice += item.price * item.quantity;

    const div = document.createElement("div");
    div.className = "cart-item";
    div.innerHTML = `
      <span>${title} (x${item.quantity}) - $${item.price}</span>
      <button class="remove-item">Remove</button>
    `;
    div.querySelector(".remove-item").addEventListener("click", () => removeFromCart(title));
    itemsContainer.appendChild(div);
  });

  summary.textContent = `Total Items: ${totalItems}, Total Price: $${totalPrice.toFixed(2)}`;
}

/* Toggle cart visibility */
document.getElementById("cart-toggle").addEventListener("click", () => {
  const items = document.getElementById("cart-items");
  if (items.style.display === "block") {
    items.style.display = "none";
    document.getElementById("cart-toggle").textContent = "[Show]";
  } else {
    items.style.display = "block";
    document.getElementById("cart-toggle").textContent = "[Hide]";
  }
});

/* Copy to email */
document.getElementById("copy-email").addEventListener("click", () => {
  let cartText = "My Cart:\n\n";
  Object.entries(cart).forEach(([title, item]) => {
    cartText += `${title} (x${item.quantity}) - $${item.price}\n`;
  });

  const mailto = `mailto:malcparknz@gmail.com?subject=Bookshop Order&body=${encodeURIComponent(cartText)}`;
  window.location.href = mailto;
});
