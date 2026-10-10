import fs from 'fs';

// 1. Update contact.html
let contactHtml = fs.readFileSync('views/contact.html', 'utf8');

contactHtml = contactHtml.replace(
  /<div class="form-row">\s*<div class="form-group">\s*<label class="form-label">Banana Variety<\/label>[\s\S]*?<div class="form-group">\s*<label class="form-label">Estimated Volume<\/label>[\s\S]*?<\/div>\s*<\/div>\s*<div class="form-group">\s*<label class="form-label">Delivery Destination City &amp; State<\/label>[\s\S]*?<\/div>/,
  `<div class="form-row">
              <div class="form-group">
                <label class="form-label"><span>Banana Variety</span> <span class="required">*</span></label>
                <select name="product_variety" class="form-control" required>
                  <option value="">-- Select Variety --</option>
                  <option value="All Varieties">All Varieties / Mixed Container</option>
                  <option value="Red Banana">Red Banana (Sevvazhai)</option>
                  <option value="Robusta Cavendish">Robusta Cavendish</option>
                  <option value="Nendran Banana">Nendran (Kerala Plantain)</option>
                  <option value="Yelakki Banana">Yelakki / Elakki</option>
                  <option value="Poovan Banana">Poovan</option>
                  <option value="Karpuravalli Banana">Karpuravalli</option>
                  <option value="Rasthali Banana">Rasthali</option>
                  <option value="Monthan Banana">Monthan Cooking Banana</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label"><span>Estimated Volume</span> <span class="required">*</span></label>
                <input type="text" name="quantity" class="form-control" placeholder="e.g. 5 Tons / 500 Crates" maxlength="50" required>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label"><span>Delivery Destination City &amp; State</span> <span class="required">*</span></label>
              <input type="text" name="destination" class="form-control" placeholder="e.g. Chennai, Tamil Nadu / Bengaluru, Karnataka" maxlength="100" required>
            </div>`
);

fs.writeFileSync('views/contact.html', contactHtml, 'utf8');
console.log('✓ Updated views/contact.html with required fields and labels');

// 2. Update products.html
let productsHtml = fs.readFileSync('views/products.html', 'utf8');

// Add data-variety to cards
productsHtml = productsHtml.replace(/<!-- 1\. Red Banana -->\s*<div class="product-card" data-category="superfruit">/, '<!-- 1. Red Banana -->\n        <div class="product-card" data-category="superfruit" data-variety="red-banana" style="cursor: pointer;">');
productsHtml = productsHtml.replace(/<!-- 2\. Poovan Banana -->\s*<div class="product-card" data-category="dessert">/, '<!-- 2. Poovan Banana -->\n        <div class="product-card" data-category="dessert" data-variety="poovan-banana" style="cursor: pointer;">');
productsHtml = productsHtml.replace(/<!-- 3\. Nendran Banana -->\s*<div class="product-card" data-category="cooking">/, '<!-- 3. Nendran Banana -->\n        <div class="product-card" data-category="cooking" data-variety="nendran-banana" style="cursor: pointer;">');
productsHtml = productsHtml.replace(/<!-- 4\. Yelakki Banana -->\s*<div class="product-card" data-category="dessert">/, '<!-- 4. Yelakki Banana -->\n        <div class="product-card" data-category="dessert" data-variety="yelakki-banana" style="cursor: pointer;">');
productsHtml = productsHtml.replace(/<!-- 5\. Karpuravalli Banana -->\s*<div class="product-card" data-category="superfruit">/, '<!-- 5. Karpuravalli Banana -->\n        <div class="product-card" data-category="superfruit" data-variety="karpuravalli-banana" style="cursor: pointer;">');
productsHtml = productsHtml.replace(/<!-- 6\. Rasthali Banana -->\s*<div class="product-card" data-category="dessert">/, '<!-- 6. Rasthali Banana -->\n        <div class="product-card" data-category="dessert" data-variety="rasthali-banana" style="cursor: pointer;">');
productsHtml = productsHtml.replace(/<!-- 7\. Robusta Banana -->\s*<div class="product-card" data-category="dessert">/, '<!-- 7. Robusta Banana -->\n        <div class="product-card" data-category="dessert" data-variety="robusta-cavendish" style="cursor: pointer;">');
productsHtml = productsHtml.replace(/<!-- 8\. Monthan Banana -->\s*<div class="product-card" data-category="cooking">/, '<!-- 8. Monthan Banana -->\n        <div class="product-card" data-category="cooking" data-variety="monthan-banana" style="cursor: pointer;">');

// In quote modal of products.html, ensure required fields
productsHtml = productsHtml.replace(
  /<div class="form-row">\s*<div class="form-group">\s*<label class="form-label">Estimated Quantity<\/label>\s*<input type="text" name="quantity"[^>]*>\s*<\/div>\s*<div class="form-group">\s*<label class="form-label">Destination City<\/label>\s*<input type="text" name="destination"[^>]*>\s*<\/div>\s*<\/div>/,
  `<div class="form-row">
          <div class="form-group">
            <label class="form-label">Estimated Quantity <span class="required">*</span></label>
            <input type="text" name="quantity" class="form-control" placeholder="e.g. 5 Metric Tons" maxlength="50" required>
          </div>
          <div class="form-group">
            <label class="form-label">Destination City &amp; State <span class="required">*</span></label>
            <input type="text" name="destination" class="form-control" placeholder="e.g. Bengaluru / Kochi / Dubai" maxlength="100" required>
          </div>
        </div>`
);

fs.writeFileSync('views/products.html', productsHtml, 'utf8');
console.log('✓ Updated views/products.html with data-variety and required modal fields');
