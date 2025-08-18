// Load the CSV and display products
Papa.parse("data/products.csv", {
  download: true,
  header: true,
  complete: function(results) {
    const data = results.data;
    renderProducts(data);

    // Setup search
    document.getElementById("search").addEventListener("input", (e) => {
      const query = e.target.value.toLowerCase();
      const filtered = data.filter(item => 
        item.title.toLowerCase().includes(query) ||
        item.desc.toLowerCase().includes(query)
      );
      renderProducts(filtered);
    });
  }
});

function renderProducts(products) {
  const container = document.getElementById("product-list");
  container.innerHTML = "";

  products.forEach(p => {
    const div = document.createElement("div");
    div.className = "product";
    div.innerHTML = `
      <h2>${p.title}</h2>
      <p>${p.desc}</p>
      <strong>Price: $${p.price}</strong><br>
      <em>Stock: ${p.stock}</em>
    `;
    container.appendChild(div);
  });
}
