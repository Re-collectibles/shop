// Load the CSV and display products
Papa.parse("data/ProductExportTradeMe250817_202019.csv", {
  download: true,
  header: true,
  complete: function(results) {
    const data = results.data;
    console.log("First row object:", data[0]); // Debug: check the keys
    renderProducts(data);

    // Setup search
    document.getElementById("search").addEventListener("input", (e) => {
      const query = e.target.value.toLowerCase();
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

  products.forEach(p => {
    const title = p.title || "Untitled";
    const body = p.body || "No description available.";
    const price = p.start_price || "N/A";
    const stock = p.stock_amount || "N/A";

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

