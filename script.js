let top300 = []; 
let allData = [];
let featuredInterval;

Papa.parse("data/ProductExportTradeMe250817_202019.csv", {
  download: true,
  header: true,
  complete: function(results) {
    // Filter out empty rows
    allData = results.data.filter(item => item.title || item.body || item.start_price || item.stock_amount);

    // Convert price
    allData.forEach(item => {
      if (item.start_price) {
        item.start_price = parseFloat(item.start_price.toString().replace(/[^0-9.]/g, ""));
      } else {
        item.start_price = 0;
      }
    });

    // Sort by price, top 300 for featured
    top300 = [...allData].sort((a, b) => b.start_price - a.start_price).slice(0, 300);

    // First featured
    updateFeatured();

    // Auto rotate featured every 30s
    featuredInterval = setInterval(updateFeatured, 30000);

    // Show all products below
    renderProducts(allData, "product-list");

    // Search handler (filters all data)
    document.getElementById("search").addEventListener("input", (e) => {
      const query = e.target.value.trim().toLowerCase();
      const filtered = allData.filter(item => {
        const title = (item.title || "").toLowerCase();
        const body = (item.body || "").toLowerCase();
        return title.includes(query) || body.includes(query);
      });
      renderProducts(filtered, "product-list");
    });
  }
});

// Update featured with fade + random 5
function updateFeatured() {
  const featuredContainer = document.getElementById("featured-list");
  featuredContainer.classList.add("fade-out");

  setTimeout(() => {
    let shuffled = [...top300].sort(() => Math.random() - 0.5);
    let featured = shuffled.slice(0, 5);

    renderProducts(featured, "featured-list", true);
    featuredContainer.classList.remove("fade-out");
  }, 1000);
}

// Render function
function renderProducts(products, containerId = "product-list", isFeatured = false) {
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

    if (isFeatured) {
      // Compact featured card
      div.innerHTML = `
        <h2>${title}</h2>
        <strong>${price}</strong>
        <div class="details" style="display:none;">
          <p>${body}</p>
          <em>Stock: ${stock}</em>
        </div>
      `;

      // Click to expand/collapse
      div.addEventListener("click", () => {
        div.classList.toggle("expanded");
        const details = div.querySelector(".details");
        if (details.style.display === "none") {
          details.style.display = "block";
        } else {
          details.style.display = "none";
        }
      });
    } else {
      // Full card (for all books below)
      div.innerHTML = `
        <h2>${title}</h2>
        <p>${body}</p>
        <strong>${price}</strong><br>
        <em>Stock: ${stock}</em>
      `;
    }

    container.appendChild(div);
  });
}
