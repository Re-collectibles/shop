// Load the CSV and display products
Papa.parse("data/ProductExportTradeMe250817_202019.csv", {
  download: true,
  header: true,
  complete: function(results) {
    // Filter out completely empty rows
    let data = results.data.filter(item => item.title || item.body || item.start_price || item.stock_amount);

    // Convert price to number for sorting
    data.forEach(item => {
      if (item.start_price) {
        item.start_price = parseFloat(item.start_price.toString().replace(/[^0-9.]/g, ""));
      } else {
        item.start_price = 0;
      }
    });

    // Sort by price descending
    data.sort((a, b) => b.start_price - a.start_price);

    // Take top 300
    let top300 = data.slice(0, 300);

    // Shuffle randomly
    top300 = top300.sort(() => Math.random() - 0.5);

    // Show products
    renderProducts(top300);

    // Search handler (filters only within these 300)
    document.getElementById("search").addEventListener("input", (e) => {
      const query = e.target.value.trim().toLowerCase();

      const filtered = top300.filter(item => {
        const title = (item.title || "").toLowerCase();
        const body = (item.body || "").toLowerCase();
        return title.includes(query) || body.includes(query);
      });

      renderProducts(filtered);
    });
  }
});

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
    const price = (p.start_price && !isNaN(p.start_price)) ? p.start_price.toFixed(2) : "N/A";

    // Convert stock to number and round to integer
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
      <em>Stock: ${stock}</em>
    `;
    container.appendChild(div);
  });
}
