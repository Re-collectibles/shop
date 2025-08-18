# Re-collectibles Book Shop – Updating Product Catalog

This guide explains how to update your website with new TradeMe product exports using GitHub.  

---

## 1. Export Your CSV from TradeMe

1. Export your products as a CSV file from TradeMe.  
2. Save it to your computer. Example filename: `ProductExportTradeMe250817_202019.csv`.

---

## 2. Open the GitHub Repository

1. Go to your website repository on GitHub.  
2. Navigate to the **`data`** folder. This is where your CSV file is stored.

---

## 3. Upload the New CSV

1. Click **Add file → Upload files**.  
2. Select your new CSV from your computer.  
3. Make sure the CSV is **uploaded to the `data` folder**.  

> Optional: You can delete the old CSV to keep the folder clean, or rename the new file to match the old one (`ProductExportTradeMe250817_202019.csv`) to avoid editing the code.

---

## 4. Edit the JavaScript (if the CSV name changes)

1. Open `script.js` in the repository.  
2. Find this line:

```javascript
Papa.parse("data/ProductExportTradeMe250817_202019.csv", {
