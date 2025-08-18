let top300 = []; // keep in global scope
let featuredInterval;

Papa.parse("data/ProductExportTradeMe250817_202019.csv", {
  download: true,
  header: true,
  complete: function(results) {
    // Filter out empty rows
    let data = results.data.filter(item => item.title || item.body || item.start_price || item.stock_amount);

    // Convert price to number
    data.forEach(item => {
      if (item.start_price) {
        item.start_price = parseFloat(item.start_price.toString().replace(/[^0-9.]/g, ""));
      } else {
        item.start_price = 0;
      }
    });

    // Sort by price (highest first)
    data.sort((a, b) => b.start_price - a.start_price);

    // Take top 300
    top300 = data.slice(0, 300);

    // Shuffle randomly
    top300 = top300.sort(() => Math.random() - 0.5);

    // Pick first featured
    updateFeatured();

    // Start auto-rotation every 30s
    featuredInterval = setInterval(updateFeatured, 30000);

    // Render all 300 below featured
    renderProducts(top300, "product-list");

    // Search within 300
    document.getElementById("search").addEventListener("input", (e) => {
      const query = e.target.value.trim().toLowerCase();
      const filtered = top300.filter(item => {
        const title = (item.title || "").toLowerCase();
        const body = (item.body || "").toLowerCase();
        return title.includes(query) || body.includes(query);
      });
      renderProducts(filtered, "product-list");
    });
  }
});

// Fade + refresh featured books
function updateFeatured() {
  const featuredContainer = document.getElementById("featured-list");

  // Fade out
  featuredContainer.classList.add("fade-out");

  setTimeout(() => {
    // Pick 5 random from top300
    let shuffled = [...top300].sort(() => Math.random() - 0.5);
    let featured = shuffled.slice(0, 5);

    renderProducts(featured, "featured-list");

    // Fade in
    featuredContainer.classList.remove("fade-out");
  }, 1000); // match CSS fade duration
}

// Render function
function renderProducts(products, containerId = "product-list") {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  if (!products || products.length === 0) {
    container.innerHTML = "<p>No results found.</p>";
    return;
  }

  products.forEach(p => {
    const title = p.title || "Untitled";
    const body = p.body || "";
    const price = (p.start_price && !isNaN(p.start_price)) ? `$${p.start_price.toFixed(2)}` : "N/A";

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
      ${containerId !== "featured-list" ? `<p>${body}</p>` : ""}
      <strong>${price}</strong><br>
      ${containerId !== "featured-list" ? `<em>Stock: ${stock}</em>` : ""}
    `;
    container.appendChild(div);
  });
}
