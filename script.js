// ----------------- CART DATA -----------------
let cart = [];

// Utility to update cart display
function updateCart() {
  const cartContainer = document.getElementById("cart-items");
  const cartTotal = document.getElementById("cart-total");
  cartContainer.innerHTML = "";

  if (cart.length === 0) {
    cartContainer.innerHTML = "<p>Your cart is empty.</p>";
    cartTotal.textContent = "";
    return;
  }

  let totalPrice = 0;
  let totalItems = 0;

  cart.forEach((item, index) => {
    totalPrice += item.price * item.quantity;
    totalItems += item.quantity;

    const div = document.createElement("div");
    div.className = "cart-item";
    div.innerHTML = `
      <span><strong>${item.title}</strong> (x${item.quantity}) - $${(item.price * item.quantity).toFixed(2)}</span>
      <button onclick="removeFromCart(${index})">Remove</button>
    `;
    cartContainer.appendChild(div);
  });

  cartTotal.textContent = `Total (${totalItems} items): $${totalPrice.toFixed(2)}`;
}

// Add item to cart
function addToCart(product) {
  const existing = cart.find(c => c.title === product.title);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ title: product.title, price: parseFloat(product.start_price) || 0, quantity: 1 });
  }
  updateCart();
}

// Remove item
function removeFromCart(index) {
  cart.splice(index, 1);
  updateCart();
}

// Copy cart to email
function copyCartToEmail() {
  if (cart.length === 0) {
    alert("Your cart is empty.");
    return;
  }

  let emailBody = "Hello,%0D%0A%0D%0AI would like to order the following:%0D%0A%0D%0A";
  cart.forEach(item => {
    emailBody += `${item.title} (x${item.quantity}) - $${(item.price * item.quantity).toFixed(2)}%0D%0A`;
  });

  let totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  emailBody += `%0D%0ATotal: $${totalPrice.toFixed(2)}%0D%0A`;

  window.location.href = `mailto:malcparknz@gmail.com?subject=Book Order&body=${emailBody}`;
}

// ----------------- CSV + PRODUCTS -----------------
Papa.parse("data/ProductExportTradeMe250817_202019.csv", {
  download: true,
  header: true,
  complete: function (results) {
    const data = results.data.filter(item => item.title || item.body || item.start_price || item.stock_amount);

    // Randomize all stock order
    const randomizedData = data.sort(() => Math.random() - 0.5);

    // Featured top 300 by price
    const top300 = [...data]
      .filter(item => parseFloat(item.start_price))
      .sort((a, b) => parseFloat(b.start_price) - parseFloat(a.start_price))
      .slice(0, 300);

    renderFeatured(top300);
    renderProducts(randomizedData);
    updateTotalStock(data);

    // Search handler
    const searchInput = document.getElementById("search");
    const clearSearch = document.getElementById("clear-search");

    searchInput.addEventListener("input", (e) => {
      const query = e.target.value.trim().toLowerCase();
      const filtered = randomizedData.filter(item => {
        const title = (item.title || "").toLowerCase();
        const body = (item.body || "").toLowerCase();
        return title.includes(query) || body.includes(query);
      });
      renderProducts(filtered);
    });

    clearSearch.addEventListener("click", () => {
      searchInput.value = "";
      renderProducts(randomizedData);
    });
  }
});

// ----------------- RENDERING -----------------
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
      if (!isNaN(stockNum)) {
        stock = Math.round(stockNum).toString();
      }
    }

    const div = document.createElement("div");
    div.className = "product";
    div.innerHTML = `
      <h2>${title}</h2>
      <p>${body}</p>
      <strong>Price: $${price}</strong><br>
      <em>Stock: ${stock}</em><br>
      <button onclick='addToCart(${JSON.stringify(p)})'>Add to Cart</button>
    `;
    container.appendChild(div);
  });
}

function renderFeatured(top300) {
  const featuredContainer = document.getElementById("featured-list");

  function pickRandomFive() {
    const shuffled = [...top300].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 5);
  }

  function displayFeatured() {
    featuredContainer.innerHTML = "";
    const featured = pickRandomFive();

    featured.forEach(p => {
      const title = p.title || "Untitled";
      const body = p.body || "No description available.";
      const price = p.start_price || "N/A";

      let stock = "N/A";
      if (p.stock_amount) {
        const stockNum = parseFloat(p.stock_amount);
        if (!isNaN(stockNum)) {
          stock = Math.round(stockNum).toString();
        }
      }

      const shortText = body.length > 65 ? body.substring(0, 65).replace(/\s+\S*$/, "") + "..." : body;

      const div = document.createElement("div");
      div.className = "product featured";
      div.innerHTML = `
        <h2>${title}</h2>
        <p>${shortText}</p>
        <strong>Price: $${price}</strong><br>
        <em>Stock: ${stock}</em><br>
        <button onclick='addToCart(${JSON.stringify(p)})'>Add to Cart</button>
        <button class="show-more">Show More</button>
      `;

      div.querySelector(".show-more").addEventListener("click", () => {
        const expanded = document.createElement("div");
        expanded.className = "product featured expanded";
        expanded.innerHTML = `
          <h2>${title}</h2>
          <p>${body}</p>
          <strong>Price: $${price}</strong><br>
          <em>Stock: ${stock}</em><br>
          <button onclick='addToCart(${JSON.stringify(p)})'>Add to Cart</button>
        `;
        featuredContainer.insertAdjacentElement("afterend", expanded);
        div.remove();
      });

      featuredContainer.appendChild(div);
    });
  }

  displayFeatured();
  setInterval(displayFeatured, 30000);
}

// ----------------- TOTAL STOCK -----------------
function updateTotalStock(data) {
  const total = data.reduce((sum, p) => {
    const stockNum = parseFloat(p.stock_amount);
    return sum + (isNaN(stockNum) ? 0 : Math.round(stockNum));
  }, 0);

  document.getElementById("total-stock").textContent = `Total Stock: ${total}`;
}
