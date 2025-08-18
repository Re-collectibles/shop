// Load the CSV and display products
Papa.parse("data/ProductExportTradeMe250817_202019.csv", {
  download: true,
  header: true,
  complete: function(results) {
    const data = results.data;

    // Show all products at first
    renderProducts(data);

    // Search handler
    document.getElementById("search").addEventListener("input", (e) => {
      const query = e.target.value.trim().toLowerCase();

      // Filter across both title + body
      const filtered = data.filter(item => {
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
    const price = p.start_price || "N/A";

    // Round stock to whole number properly
    let stock = "N/A";
    if (p.stock_amount) {
        const stockNum = Number(p.stock_amount); // Convert string to number
        if (!isNaN(stockNum)) {
            stock = Math.round(stockNum); // Round to nearest integer
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
