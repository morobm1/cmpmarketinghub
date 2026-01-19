import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';

// Default catalog items from CommonSKU Vendor Catalog
// Catalog Reference: https://login.commonsku.com/present.php?id=4b97bf5b-e3f5-4d5e-9e73-2419f0ae678c
const DEFAULT_CATALOG = [
  // ===== T-SHIRTS =====
  {
    id: 'nike-swoosh-tee',
    name: 'Nike Swoosh Sleeve rLegend Tee',
    sku: 'NKDX8730',
    description: 'This is the stuff of which legends are made. Made of 4-ounce, 100% recycled polyester jersey. The all-new Swoosh Sleeve rLegend Tee is built from sustainable recycled polyester and powered by Dri-FIT technology-so you\'ll get peak performance with a lower environmental impact. Heat-transfer label for tag-free comfort. Neck tape for durability. A contrast heat transfer Swoosh logo on left sleeve.',
    price: 32.11,
    category: 'T-Shirts',
    image: 'https://cdnm.sanmar.com/imglib/mresjpg/2023/f4/NKDX8730_darksmokeheather_model_front.jpg',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Apple Green', 'Black', 'College Navy', 'Court Purple', 'Dark Smoke Heather', 'Deep Maroon', 'Desert Orange', 'Game Royal', 'Gorge Green', 'Team Maroon', 'University Red', 'Valor Blue', 'White']
  },
  {
    id: 'nike-womens-swoosh-tee',
    name: 'Nike Women\'s Swoosh Sleeve rLegend Tee',
    sku: 'NKDX8734',
    description: 'This is the stuff of which legends are made. Neck tape for durability. The all-new Swoosh Sleeve rLegend Tee is built from sustainable recycled polyester and powered by Dri-FIT technology-so you\'ll get peak performance with a lower environmental impact. Made of 4-ounce, 100% recycled polyester jersey. Heat-transfer label for tag-free comfort. A contrast heat transfer Swoosh logo on left sleeve.',
    price: 32.11,
    category: 'T-Shirts',
    image: 'https://cdnm.sanmar.com/imglib/mresjpg/2023/f4/NKDX8734_collegenavy_model_front.jpg',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Apple Green', 'Black', 'College Navy', 'Court Purple', 'Dark Smoke Heather', 'Deep Maroon', 'Desert Orange', 'Game Royal', 'Gorge Green', 'Team Maroon', 'University Red', 'Valor Blue', 'White']
  },
  {
    id: 'nike-drifit-cotton-tee',
    name: 'Nike Dri-FIT Cotton/Poly Tee',
    sku: 'NKBQ5231',
    description: 'This Nike performance tee features sweat-wicking fabric to help keep you dry and comfortable. Durable rib knit crew neck. Contrast heat transfer Swoosh design trademark on left sleeve. Double-needle stitching throughout. Heat transfer label for tag-free comfort. Made of 4.7-ounce, 60/40 cotton/poly Dri-FIT fabric.',
    price: 28.11,
    category: 'T-Shirts',
    image: 'https://files.commonsku.com/large/408e1338-5e44-4306-b5a4-9b7cbc221619',
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'],
    colors: ['Anthracite', 'Black', 'Brilliant Orange', 'College Navy', 'Game Royal', 'Gym Red', 'Rush Blue', 'University Red', 'White']
  },
  {
    id: 'comfort-colors-tee',
    name: 'COMFORT COLORS Heavyweight Ring Spun Tee',
    sku: '1717',
    description: 'COMFORT COLORS Heavyweight Ring Spun Tee - Garment-dyed for a soft, lived-in feel',
    price: 18.00,
    category: 'T-Shirts',
    image: 'https://files.commonsku.com/large/903c54f6-e107-49c5-9f2a-ef02e44c3755',
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
    colors: ['Pepper', 'Ivory', 'Blue Jean', 'Seafoam', 'Chambray']
  },
  {
    id: 'gildan-softstyle-tee',
    name: 'Gildan Softstyle T-Shirt',
    sku: '64000',
    description: 'Gildan Softstyle T-Shirt - Lightweight, soft cotton tee for everyday comfort',
    price: 12.00,
    category: 'T-Shirts',
    image: 'https://files.commonsku.com/large/d4f47db1-3bb9-4da8-8011-4b0025814aff',
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
    colors: ['Black', 'White', 'Navy', 'Sport Grey', 'Charcoal']
  },
  {
    id: 'bella-canvas-tee',
    name: 'BELLA+CANVAS Unisex Jersey Short Sleeve Tee',
    sku: '3001',
    description: 'BELLA+CANVAS Unisex Jersey Short Sleeve Tee - Premium soft cotton with modern fit',
    price: 14.00,
    category: 'T-Shirts',
    image: 'https://files.commonsku.com/large/412f6e78-ef01-4f65-8c74-12b7ee788fd2',
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
    colors: ['Black', 'White', 'Navy', 'Heather Grey', 'Athletic Heather']
  },

  // ===== OXFORD SHIRTS =====
  {
    id: 'port-authority-untucked-oxford',
    name: 'Port Authority Untucked Fit SuperPro Oxford',
    sku: 'S651',
    description: 'Look your best in a tried-and-true oxford that performs. Designed to release stains, our wrinkle-resistant SuperPro Oxford has a soft hand to keep you looking neat and professional all day long. Pearlized buttons. Shortened front and back hem for balanced, untucked wear. A slim (but not tight) fit that sits closer to the body. Rounded adjustable cuffs. Button-down collar. Left chest pocket. 4.6-ounce, 60/40 cotton/poly.',
    price: 31.62,
    category: 'Shirts',
    image: 'https://cdnm.sanmar.com/imglib/mresjpg/2025/f4/S651_oxfordblue_model_front.jpg',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: ['Black', 'Navy', 'Oxford Blue', 'White']
  },
  {
    id: 'port-authority-superpro-oxford',
    name: 'Port Authority SuperPro Oxford Shirt',
    sku: 'S658',
    description: 'Look your best in a tried-and-true oxford that performs. Designed to release stains, our wrinkle-resistant SuperPro Oxford has a soft hand to keep you looking neat and professional all day long. Rounded adjustable cuffs. Back shoulder pleats. Button-down collar. Left chest pocket. Rental-friendly. Pearlized buttons. 4.6-ounce, 60/40 cotton/poly.',
    price: 30.69,
    category: 'Shirts',
    image: 'https://cdnm.sanmar.com/imglib/mresjpg/2016/f12/S658_black_model_GA17.jpg',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: ['Black', 'Green', 'Gusty Grey', 'Navy', 'Oxford Blue', 'Soft Purple', 'White']
  },
  {
    id: 'port-authority-womens-superpro-oxford',
    name: 'Port Authority Women\'s SuperPro Oxford Shirt',
    sku: 'L658',
    description: 'Look your best in a tried-and-true oxford that performs. Designed to release stains, our wrinkle-resistant SuperPro Oxford has a soft hand to keep you looking neat and professional all day long. Bust darts. Open collar. Rounded adjustable cuffs. Pearlized buttons. Back shoulder pleats. Rental-friendly. 4.6-ounce, 60/40 cotton/poly.',
    price: 31.62,
    category: 'Shirts',
    image: 'https://cdnm.sanmar.com/imglib/mresjpg/2016/f12/L658_softpurple_model_GA17.jpg',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: ['Black', 'Green', 'Navy', 'Oxford Blue', 'Soft Purple', 'White']
  },
  {
    id: 'mercer-mettle-womens-oxford',
    name: 'Mercer+Mettle Women\'s Long Sleeve Modern Oxford Shirt',
    sku: 'MM2001',
    description: 'Updating the classic oxford, this modern shirt blends crispness with casual flair. Precisely tailored for an impeccable look, it has stretch to give it effortless confidence in any corporate environment. Open collar. Deep back yoke with inverted pleat. Easy care. Popover design with button placket. Rounded hem with slight drop. Drop shoulder. Locker loop. Pearlized buttons. Square single-button cuffs. 4.1-ounce, 56/25/15/4 cotton/Lyocell/polyester/spandex.',
    price: 41.38,
    category: 'Shirts',
    image: 'https://files.commonsku.com/large/39137b1a-e7a4-4e4b-ab9a-377214486bbf',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: ['Light Blue', 'White']
  },
  {
    id: 'mercer-mettle-oxford',
    name: 'Mercer+Mettle Long Sleeve Modern Oxford Shirt',
    sku: 'MM2000',
    description: 'Updating the classic oxford, this modern shirt blends crispness with casual flair. Precisely tailored for an impeccable look, it has stretch to give it effortless confidence in any corporate environment. Stretch. Pearlized buttons. Center back box pleat. Adjustable rounded cuffs. Easy care. Button-down collar. 4.1-ounce, 56/25/15/4 cotton/Lyocell/polyester/spandex.',
    price: 41.38,
    category: 'Shirts',
    image: 'https://files.commonsku.com/large/24ec4f29-3c97-4c17-ab4c-0c00add81def',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: ['Cobalt', 'Gusty Grey', 'Light Blue', 'White']
  },

  // ===== HATS =====
  {
    id: 'port-authority-easy-care-cap',
    name: 'Port Authority Easy Care Cap',
    sku: 'C608',
    description: 'Structured mid-profile cap. Self-fabric adjustable slide closure with brushed nickel buckle and grommet. 65/35 poly/cotton fabric.',
    price: 5.78,
    category: 'Hats',
    image: 'https://files.commonsku.com/large/01d6216a-7da0-41a2-9a39-6515311a8493',
    sizes: ['OSFA'],
    colors: ['Black', 'Burgundy', 'Navy', 'Red', 'Royal', 'Steel Grey', 'Stone', 'White']
  },
  {
    id: 'new-era-perforated-snapback',
    name: 'New Era 9SEVENTY Perforated Snapback Cap',
    sku: 'NE407',
    description: 'Featuring MICROERA odor-controlling technology and COOLERA sweat-wicking technology, this cap features a stretch snap construction for size customization. Mid-profile structured cap with precurved visor. 9SEVENTY FIT merges the crown of a 9FIFTY with the contour of a 9FORTY for a one-of-a-kind fit. Stretch sweatband. Embroidered New Era flag on left side. 7-position snapback closure. Perforated mid and back panels. 100% polyester.',
    price: 23.58,
    category: 'Hats',
    image: 'https://files.commonsku.com/large/ef02bd99-6fbf-4d56-a28d-55db5c79c6f8',
    sizes: ['OSFA'],
    colors: ['Black', 'Deep Navy', 'Graphite', 'Royal', 'Sky Blue', 'White']
  },
  {
    id: 'nike-unstructured-cap',
    name: 'Nike Unstructured Cotton/Poly Twill Cap',
    sku: '580087',
    description: 'The perfect classic look with a contrast underbill as engineered by Nike. This cap has an unstructured, mid-profile design and a self-fabric closure with buckle. The contrast Swoosh logo is embroidered on the center back. Made of 58/42 cotton/poly twill. One Size Fits All (OSFA).',
    price: 27.32,
    category: 'Hats',
    image: 'https://files.commonsku.com/large/20e91587-9c3f-4e5b-8e04-a9b279c95cf4',
    sizes: ['M/L'],
    colors: ['Black', 'Dark Grey', 'Game Royal', 'Gym Red', 'Khaki', 'Navy', 'Vivid Pink', 'White']
  },
  {
    id: 'carhartt-rugged-pro-cap',
    name: 'Carhartt Rugged Professional Series Cap',
    sku: 'CT106687',
    description: 'This all-star canvas hat has stretch technology and a sweat-fighting band. Structured mid profile with pre-curved visor. Adjustable fit with plastic closure. Carhartt Force sweatband fights odors; FastDry technology wicks away sweat for comfort. Carhartt label sewn on side. 59/39/2 cotton/poly/spandex with 100% polyester mesh back.',
    price: 24.84,
    category: 'Hats',
    image: 'https://cdnm.sanmar.com/imglib/mresjpg/2024/f4/CT106687_darkkhaki_hat_right.jpg',
    sizes: ['OSFA'],
    colors: ['Black', 'Dark Khaki', 'Navy', 'Shadow Grey']
  },
  {
    id: 'nike-sphere-cap',
    name: 'Nike Sphere Performance Cap',
    sku: '247077',
    description: 'Nike Sphere Dry technology ensures maximum moisture control and quick-drying performance. This cap has an unstructured, low-profile design with a hook and loop closure. The contrast Swoosh logo is embroidered on the bill and center back. Made of 100% polyester. One Size Fits All (OSFA).',
    price: 29.80,
    category: 'Hats',
    image: 'https://files.commonsku.com/large/65cef7d7-9d00-4021-8e2d-d3b144436b50',
    sizes: ['M/L'],
    colors: ['Anthracite', 'Birch', 'Black', 'Black/ Gym Red', 'Black/ White', 'Game Royal/ White', 'Navy', 'White', 'White/ Black']
  },
  {
    id: 'port-authority-flexfit-mesh',
    name: 'Port Authority Flexfit Mesh Back Cap',
    sku: 'C812',
    description: 'An ultra-breathable cap with the Flexfit stretch for a comfortable fit. A silver contrast underbill adds character to this trucker-style cap. Structured mid-profile with Permacurv bill to maintain proper shape and curve. Stretch fit closure. 60/40 cotton/poly front panels, 95/5 poly/spandex mesh mid and back panels.',
    price: 11.36,
    category: 'Hats',
    image: 'https://files.commonsku.com/large/2a16d4da-5a06-4e79-b467-606a02b65cf7',
    sizes: ['S/M', 'L/XL'],
    colors: ['Black/ Black', 'Black/ White', 'Brown/ Khaki', 'Forest Green/ White', 'Graphite/ Black', 'Graphite/ Graphite', 'Graphite/ White', 'Heather Grey/ Black', 'Heather Grey/ White', 'Silver/ Black', 'True Navy/ True Navy', 'True Navy/ White', 'True Red/ White', 'True Royal/ White', 'White/ White']
  },
  {
    id: 'sport-tek-dry-zone-cap',
    name: 'Sport-Tek Dry Zone Nylon Cap',
    sku: 'STC10',
    description: 'All the Dry Zone moisture-wicking performance you love in Sport-Tek apparel in caps designed for adults and youth. Structured mid-profile with hook and loop closure. 91/9 nylon/cotton twill fabric.',
    price: 10.32,
    category: 'Hats',
    image: 'https://files.commonsku.com/large/5deb0099-3173-43e9-8a23-2a87981d5d32',
    sizes: ['OSFA'],
    colors: ['Black', 'Forest Green', 'Kelly Green', 'Maroon', 'Purple', 'True Navy', 'True Red', 'True Royal', 'White']
  },

  // ===== PANTS =====
  {
    id: 'wink-workflex-cargo',
    name: 'Wink Unisex WorkFlex Cargo Pant',
    sku: '5555',
    description: 'Wink Unisex WorkFlex Cargo Pant - Functional cargo pant with stretch comfort',
    price: 32.00,
    category: 'Pants',
    image: 'https://files.commonsku.com/large/7b92e1bb-4fe1-4159-a830-71378f24e01c',
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
    colors: ['Navy', 'Black', 'Pewter']
  },
  {
    id: 'wink-mens-premiere-cargo',
    name: 'Wink Men\'s Premiere Flex Cargo Pant',
    sku: '5535',
    description: 'Wink Men\'s Premiere Flex Cargo Pant - Premium cargo pant with flexible waistband',
    price: 36.00,
    category: 'Pants',
    image: 'https://files.commonsku.com/large/5673ca7d-ab4e-4eab-815a-b72748a34c08',
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
    colors: ['Navy', 'Black', 'Pewter']
  },
  {
    id: 'wink-womens-jogger',
    name: 'Wink Women\'s Premiere Flex Jogger Pant',
    sku: 'WW4258',
    description: 'Wink Women\'s Premiere Flex Jogger Pant - Comfortable jogger style with professional look',
    price: 34.00,
    category: 'Pants',
    image: 'https://cdnm.sanmar.com/imglib/mresjpg/2021/f1/WW4258_navy_model_front.jpg',
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
    colors: ['Navy', 'Black', 'Pewter']
  },
  {
    id: 'sport-tek-womens-travel-pant',
    name: 'Sport-Tek Women\'s Travel Pant',
    sku: 'LST479',
    description: 'Sport-Tek Women\'s Travel Pant - Wrinkle-resistant travel pant with stretch comfort',
    price: 42.00,
    category: 'Pants',
    image: 'https://files.commonsku.com/large/ad0289e5-21c6-4ed9-90ec-7187754eafd7',
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'],
    colors: ['Black', 'True Navy']
  },
  {
    id: 'sport-tek-tricot-jogger',
    name: 'Sport-Tek Tricot Track Jogger',
    sku: 'JST99',
    description: 'Sport-Tek Tricot Track Jogger - Classic track jogger with side stripes',
    price: 38.00,
    category: 'Pants',
    image: 'https://files.commonsku.com/large/1ff23898-42ec-4185-b24e-68fe5e6c187c',
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'],
    colors: ['Black', 'True Navy', 'True Royal']
  },
  {
    id: 'sport-tek-womens-tricot-jogger',
    name: 'Sport-Tek Women\'s Tricot Track Jogger',
    sku: 'LST99',
    description: 'Sport-Tek Women\'s Tricot Track Jogger - Women\'s classic track jogger with side stripes',
    price: 38.00,
    category: 'Pants',
    image: 'https://files.commonsku.com/large/9b5ddc92-49c3-4dd0-bfd6-58904be8c135',
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'],
    colors: ['Black', 'True Navy']
  },
  {
    id: 'sport-tek-travel-pant',
    name: 'Sport-Tek Travel Pant',
    sku: 'ST479',
    description: 'Sport-Tek Travel Pant - Men\'s wrinkle-resistant travel pant with stretch comfort',
    price: 42.00,
    category: 'Pants',
    image: 'https://files.commonsku.com/large/2a2d7825-960a-4df1-b962-825089c23d19',
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'],
    colors: ['Black', 'True Navy']
  },
  {
    id: 'carhartt-canvas-dungaree',
    name: 'Carhartt Canvas Work Dungaree',
    sku: 'CTB151',
    description: 'Carhartt Canvas Work Dungaree - Durable canvas work pant built for tough jobs',
    price: 52.00,
    category: 'Pants',
    image: 'https://files.commonsku.com/large/ea17b4ef-2074-4102-87e3-2e143bb5dbff',
    sizes: ['30x30', '32x30', '32x32', '34x30', '34x32', '36x30', '36x32', '38x30', '38x32', '40x30', '40x32'],
    colors: ['Dark Khaki', 'Black', 'Carhartt Brown']
  },
  {
    id: 'carhartt-rugged-flex-cargo',
    name: 'Carhartt Rugged Flex Rigby Cargo Pant',
    sku: 'CT102802',
    description: 'Carhartt Rugged Flex Rigby Cargo Pant - Flexible cargo pant with rugged durability',
    price: 58.00,
    category: 'Pants',
    image: 'https://files.commonsku.com/large/ed17aa92-545d-4d0b-b6ef-6240d624c3cf',
    sizes: ['30x30', '32x30', '32x32', '34x30', '34x32', '36x30', '36x32', '38x30', '38x32', '40x30', '40x32'],
    colors: ['Dark Khaki', 'Black', 'Shadow']
  },
  {
    id: 'carhartt-rugged-flex-jean',
    name: 'Carhartt Rugged Flex Utility Jean',
    sku: 'CT102804',
    description: 'Carhartt Rugged Flex Utility Jean - Durable work jean with stretch flexibility',
    price: 56.00,
    category: 'Pants',
    image: 'https://files.commonsku.com/large/5838d73f-45b1-4cbd-85e3-021ffe6032aa',
    sizes: ['30x30', '32x30', '32x32', '34x30', '34x32', '36x30', '36x32', '38x30', '38x32', '40x30', '40x32'],
    colors: ['Superior', 'Freight']
  },

  // ===== POLOS =====
  {
    id: 'sport-tek-competitor-polo',
    name: 'Sport-Tek PosiCharge Competitor Polo',
    sku: 'ST550',
    description: 'Sport-Tek PosiCharge Competitor Polo - Moisture-wicking performance polo',
    price: 24.00,
    category: 'Polos',
    image: 'https://files.commonsku.com/large/edd4baf7-90fb-4d98-96e2-18f2aae93a2b',
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'],
    colors: ['Black', 'True Navy', 'True Royal', 'Iron Grey', 'White']
  },
  {
    id: 'sport-tek-womens-competitor-polo',
    name: 'Sport-Tek Women\'s PosiCharge Competitor Polo',
    sku: 'LST550',
    description: 'Sport-Tek Women\'s PosiCharge Competitor Polo - Women\'s moisture-wicking performance polo',
    price: 24.00,
    category: 'Polos',
    image: 'https://files.commonsku.com/large/a1fc59cf-5a07-43f1-8489-5a45ff5ad1dd',
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'],
    colors: ['Black', 'True Navy', 'True Royal', 'Iron Grey', 'White']
  },
  {
    id: 'port-authority-womens-pique-polo',
    name: 'Port Authority Women\'s Core Classic Pique Polo',
    sku: 'L100',
    description: 'Port Authority Women\'s Core Classic Pique Polo - Classic pique polo with feminine fit',
    price: 22.00,
    category: 'Polos',
    image: 'https://files.commonsku.com/large/4fa12212-3010-4a9f-84a9-7c78c799354d',
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'],
    colors: ['Black', 'Navy', 'White', 'Deep Smoke']
  },
  {
    id: 'port-authority-pique-polo',
    name: 'Port Authority Core Classic Pique Polo',
    sku: 'K100',
    description: 'Port Authority Core Classic Pique Polo - Classic pique polo with traditional fit',
    price: 22.00,
    category: 'Polos',
    image: 'https://files.commonsku.com/large/8aff6599-647e-41df-9a92-296a6d074fa6',
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL'],
    colors: ['Black', 'Navy', 'White', 'Deep Smoke']
  },
  {
    id: 'nike-womens-victory-polo',
    name: 'Nike Women\'s Victory Solid Polo',
    sku: '746100',
    description: 'Nike Women\'s Victory Solid Polo - Premium Nike golf polo with Dri-FIT technology',
    price: 52.00,
    category: 'Polos',
    image: 'https://files.commonsku.com/large/802057c4-ac6f-4caf-b2a9-069882b0b3ff',
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL'],
    colors: ['Black', 'College Navy', 'White', 'University Red']
  },
  {
    id: 'nike-victory-polo',
    name: 'Nike Victory Solid Polo',
    sku: '838956',
    description: 'Nike Victory Solid Polo - Premium Nike golf polo with Dri-FIT technology',
    price: 52.00,
    category: 'Polos',
    image: 'https://files.commonsku.com/large/01a17484-c0fe-4200-9173-d31028ec9451',
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'],
    colors: ['Black', 'College Navy', 'White', 'University Red']
  },
  {
    id: 'nike-womens-legacy-polo',
    name: 'Nike Women\'s Dri-FIT Legacy Polo',
    sku: '453419',
    description: 'Nike Women\'s Dri-FIT Legacy Polo - Classic Nike polo with moisture management',
    price: 48.00,
    category: 'Polos',
    image: 'https://files.commonsku.com/large/91f0b863-6679-4d16-919c-f1af7f3cb60b',
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL'],
    colors: ['Black', 'Navy', 'White']
  },
  {
    id: 'nike-legacy-polo',
    name: 'Nike Dri-FIT Legacy Polo',
    sku: '883681',
    description: 'Nike Dri-FIT Legacy Polo - Classic Nike polo with moisture management',
    price: 48.00,
    category: 'Polos',
    image: 'https://files.commonsku.com/large/c0db2ba0-e568-42a7-8e3d-436843c5b4d7',
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'],
    colors: ['Black', 'Navy', 'White']
  },
  {
    id: 'nike-classic-polo',
    name: 'Nike Dri-FIT Classic Polo',
    sku: '746099',
    description: 'Nike Dri-FIT Classic Polo - Timeless Nike polo with Dri-FIT moisture-wicking',
    price: 50.00,
    category: 'Polos',
    image: 'https://files.commonsku.com/large/11b0a723-5a70-4f70-a4d7-f04ceeeedc2d',
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'],
    colors: ['Black', 'Navy', 'White', 'Varsity Red']
  },

  // ===== JACKETS - SOFT SHELL & RAIN =====
  {
  id: 'carhartt-womens-softshell',
  name: 'Carhartt Women\'s Rain Defender Soft Shell Jacket',
  sku: 'CT102538',
  description: 'Rugged Flex stretch technology for ease of movement. Wind Fighter technology tames wind. Adjustable drop tail hem for added coverage. Rain Defender durable water repellent (DWR). Mock neck collar, adjustable cuffs with hook and loop closures, 100% polyester lining, relaxed fit. Interior pocket with hook and loop closure, two lower front zippered pockets. 10-ounce, 87/13 nylon/elastane with reverse coil center front zipper with chin protector.',
  price: 105.00,
  category: 'Jackets',
  image: 'https://files.commonsku.com/large/6180eea0-0ad1-4693-b4db-43b4891f1ec3',
  sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL'],
  colors: ['Black', 'Navy', 'Shadow']
  },
  {
    id: 'carhartt-softshell',
    name: 'Carhartt Rain Defender Soft Shell Jacket',
    sku: 'CT102199',
    description: 'Carhartt Rain Defender Soft Shell Jacket - Water-repellent soft shell with durable protection',
    price: 95.00,
    category: 'Jackets',
    image: 'https://files.commonsku.com/large/d497ba2f-85de-4ec4-be5f-2e48a57e7a4f',
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'],
    colors: ['Black', 'Navy', 'Shadow']
  },
  {
    id: 'eddie-bauer-womens-rain',
    name: 'Eddie Bauer Women\'s Rain Jacket',
    sku: 'EB551',
    description: 'Eddie Bauer Women\'s Rain Jacket - Waterproof protection with packable design',
    price: 72.00,
    category: 'Jackets',
    image: 'https://files.commonsku.com/large/db80bc95-b880-4014-ab19-182b2194339c',
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL'],
    colors: ['Black', 'River Blue Navy', 'Deep Sea Blue']
  },
  {
    id: 'eddie-bauer-rain',
    name: 'Eddie Bauer Rain Jacket',
    sku: 'EB550',
    description: 'Eddie Bauer Rain Jacket - Waterproof protection with packable design',
    price: 72.00,
    category: 'Jackets',
    image: 'https://files.commonsku.com/large/49de2979-e962-4a62-8610-ead663dcbf81',
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'],
    colors: ['Black', 'River Blue Navy', 'Deep Sea Blue']
  },
  {
    id: 'eddie-bauer-womens-weatheredge',
    name: 'Eddie Bauer Women\'s WeatherEdge Plus Jacket',
    sku: 'EB559',
    description: 'Eddie Bauer Women\'s WeatherEdge Plus Jacket - Premium waterproof jacket with seam-sealed protection',
    price: 98.00,
    category: 'Jackets',
    image: 'https://files.commonsku.com/large/73e3a442-9689-4a51-87ac-7e3c1e2ddd2b',
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL'],
    colors: ['Black', 'River Blue Navy']
  },
  {
    id: 'eddie-bauer-weatheredge',
    name: 'Eddie Bauer WeatherEdge Plus Jacket',
    sku: 'EB558',
    description: 'Eddie Bauer WeatherEdge Plus Jacket - Premium waterproof jacket with seam-sealed protection',
    price: 98.00,
    category: 'Jackets',
    image: 'https://files.commonsku.com/large/eb918edd-848d-4a26-8c96-c88921741ecb',
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'],
    colors: ['Black', 'River Blue Navy']
  },
  {
    id: 'port-authority-womens-rain',
    name: 'Port Authority Women\'s Essential Rain Jacket',
    sku: 'L407',
    description: 'Port Authority Women\'s Essential Rain Jacket - Lightweight waterproof rain jacket',
    price: 48.00,
    category: 'Jackets',
    image: 'https://files.commonsku.com/large/b2509b06-eae2-4a26-bc99-baa5e7c42459',
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'],
    colors: ['Black', 'True Navy', 'Slicker Yellow']
  },
  {
    id: 'port-authority-rain',
    name: 'Port Authority Essential Rain Jacket',
    sku: 'J407',
    description: 'Port Authority Essential Rain Jacket - Lightweight waterproof rain jacket',
    price: 48.00,
    category: 'Jackets',
    image: 'https://files.commonsku.com/large/3c950869-c479-4a44-8ff6-28e4c805cdd2',
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'],
    colors: ['Black', 'True Navy', 'Slicker Yellow']
  },
  {
    id: 'port-authority-womens-tech-softshell',
    name: 'Port Authority Women\'s Collective Tech Soft Shell Jacket',
    sku: 'L921',
    description: 'Port Authority Women\'s Collective Tech Soft Shell Jacket - Modern soft shell with tech fabric',
    price: 68.00,
    category: 'Jackets',
    image: 'https://files.commonsku.com/large/efbde60f-bc0e-4733-832b-d9550d93b833',
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'],
    colors: ['Deep Black', 'River Blue Navy']
  },
  {
    id: 'port-authority-tech-softshell',
    name: 'Port Authority Collective Tech Soft Shell Jacket',
    sku: 'J921',
    description: 'Port Authority Collective Tech Soft Shell Jacket - Modern soft shell with tech fabric',
    price: 68.00,
    category: 'Jackets',
    image: 'https://files.commonsku.com/large/80249985-68e2-424b-bbe1-2cd96fdf7682',
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'],
    colors: ['Deep Black', 'River Blue Navy']
  },

  // ===== OUTERWEAR - HEAVY COATS =====
  {
    id: 'carhartt-womens-montana',
    name: 'Carhartt Women\'s Montana Insulated Hooded Coat',
    sku: 'CT104053',
    description: 'Carhartt Women\'s Montana Insulated Hooded Coat - Heavy-duty insulated coat for extreme cold',
    price: 165.00,
    category: 'Outerwear',
    image: 'https://files.commonsku.com/large/309c375d-48be-4303-a92e-4339618fcf9a',
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL'],
    colors: ['Black', 'Carhartt Brown']
  },
  {
    id: 'carhartt-montana',
    name: 'Carhartt Montana Insulated Hooded Jacket',
    sku: 'CT104050',
    description: 'Carhartt Montana Insulated Hooded Jacket - Heavy-duty insulated jacket for extreme cold',
    price: 165.00,
    category: 'Outerwear',
    image: 'https://files.commonsku.com/large/f182ea7c-f08e-4ae4-8d8a-c64221717052',
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'],
    colors: ['Black', 'Carhartt Brown']
  },
  {
    id: 'carhartt-duck-coat',
    name: 'Carhartt Duck Traditional Coat',
    sku: 'CTC003',
    description: 'Carhartt Duck Traditional Coat - Classic duck canvas coat with quilted lining',
    price: 145.00,
    category: 'Outerwear',
    image: 'https://files.commonsku.com/large/90921902-7cbb-4124-b892-24aca714152b',
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'],
    colors: ['Carhartt Brown', 'Black']
  },
  {
    id: 'port-authority-heavyweight-parka',
    name: 'Port Authority Heavyweight Parka',
    sku: 'J799',
    description: 'Port Authority Heavyweight Parka - Extreme cold weather parka with removable hood',
    price: 125.00,
    category: 'Outerwear',
    image: 'https://files.commonsku.com/large/3551de16-e604-468d-a6db-bdb73391f353',
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'],
    colors: ['Black', 'True Navy']
  },
  {
    id: 'carhartt-womens-gilliam',
    name: 'Carhartt Women\'s Gilliam Jacket',
    sku: 'CT102248',
    description: 'Carhartt Women\'s Gilliam Jacket - Lightweight insulated jacket with Rain Defender',
    price: 115.00,
    category: 'Outerwear',
    image: 'https://files.commonsku.com/large/41b17932-3e5b-4a23-bc83-c11a504b5d1d',
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL'],
    colors: ['Black', 'Shadow']
  },
  {
    id: 'port-authority-womens-ripstop',
    name: 'Port Authority Women\'s Insulated Heavy Ripstop Jacket',
    sku: 'L320',
    description: 'Port Authority Women\'s Insulated Heavy Ripstop Jacket - Durable ripstop with warm insulation',
    price: 85.00,
    category: 'Outerwear',
    image: 'https://files.commonsku.com/large/8f08fb96-d862-4bca-9c8b-4ff14f1be3a9',
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'],
    colors: ['Black', 'True Navy']
  },
  {
    id: 'port-authority-ripstop',
    name: 'Port Authority Insulated Heavy Ripstop Jacket',
    sku: 'J320',
    description: 'Port Authority Insulated Heavy Ripstop Jacket - Durable ripstop with warm insulation',
    price: 85.00,
    category: 'Outerwear',
    image: 'https://files.commonsku.com/large/7d319524-8803-4706-bec4-aae6e2a6c169',
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'],
    colors: ['Black', 'True Navy']
  },
  {
    id: 'eddie-bauer-womens-quilted',
    name: 'Eddie Bauer Women\'s Quilted Jacket',
    sku: 'EB511',
    description: 'Eddie Bauer Women\'s Quilted Jacket - Lightweight quilted jacket with modern style',
    price: 78.00,
    category: 'Outerwear',
    image: 'https://files.commonsku.com/large/047d92e5-ba26-4a22-bf9f-f74f7c83a3fd',
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL'],
    colors: ['Black', 'River Blue Navy']
  },
  {
    id: 'eddie-bauer-quilted',
    name: 'Eddie Bauer Quilted Jacket',
    sku: 'EB510',
    description: 'Eddie Bauer Quilted Jacket - Lightweight quilted jacket with modern style',
    price: 78.00,
    category: 'Outerwear',
    image: 'https://files.commonsku.com/large/a35fce99-d02c-4a28-89c1-f06736d4b00f',
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
    colors: ['Black', 'River Blue Navy']
  },
  {
    id: 'port-authority-womens-softshell-parka',
    name: 'Port Authority Women\'s Collective Outer Soft Shell Parka',
    sku: 'L919',
    description: 'Port Authority Women\'s Collective Outer Soft Shell Parka - Long soft shell parka for extra coverage',
    price: 92.00,
    category: 'Outerwear',
    image: 'https://files.commonsku.com/large/9805ab96-7a09-437f-ba14-e91ee62da49c',
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'],
    colors: ['Deep Black', 'River Blue Navy']
  },
  {
    id: 'port-authority-softshell-parka',
    name: 'Port Authority Collective Outer Soft Shell Parka',
    sku: 'J919',
    description: 'Port Authority Collective Outer Soft Shell Parka - Long soft shell parka for extra coverage',
    price: 92.00,
    category: 'Outerwear',
    image: 'https://files.commonsku.com/large/f5b4f1f8-d7c3-439c-8fe7-33b3eb79338c',
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'],
    colors: ['Deep Black', 'River Blue Navy']
  },

  // ===== ACCESSORIES =====
  {
    id: 'webbed-belt',
    name: 'Webbed Adjustable Belt',
    sku: 'AB14',
    description: 'Webbed Adjustable Belt - Durable webbed belt with adjustable buckle',
    price: 14.00,
    category: 'Accessories',
    image: 'https://files.commonsku.com/large/b9eecbbc-b884-4002-8591-d92212f4b2c7',
    sizes: ['One Size'],
    colors: ['Black', 'Navy', 'Khaki']
  },
  {
    id: 'leather-belt',
    name: 'No-Scratch Leather Belt',
    sku: 'AB12',
    description: 'No-Scratch Leather Belt - Premium leather belt with no-scratch buckle',
    price: 22.00,
    category: 'Accessories',
    image: 'https://files.commonsku.com/large/bf039c31-076d-4f51-b405-6c882546da82',
    sizes: ['S', 'M', 'L', 'XL', '2XL'],
    colors: ['Black', 'Brown']
  },

  // ===== QUARTER-ZIPS =====
  {
    id: 'adidas-shoulder-stripe-qz',
    name: 'Men\'s Ultimate365 Lightweight Shoulder Stripe Quarter-Zip Pullover',
    sku: 'A520',
    description: 'Adidas Men\'s Ultimate365 Lightweight Shoulder Stripe Quarter-Zip Pullover - Premium golf pullover with signature stripes',
    price: 85.00,
    category: 'Jackets',
    image: 'https://files.commonsku.com/large/8b91fdde-0769-45e1-a132-71edb717403a',
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
    colors: ['Black', 'Navy', 'Grey Three']
  },
  {
    id: 'adidas-lightweight-qz',
    name: 'Men\'s Ultimate365 Lightweight Quarter-Zip Pullover',
    sku: 'A401',
    description: 'Adidas Men\'s Ultimate365 Lightweight Quarter-Zip Pullover - Versatile golf pullover for layering',
    price: 78.00,
    category: 'Jackets',
    image: 'https://files.commonsku.com/large/eab50ed0-3af9-4142-827c-1b106e397410',
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
    colors: ['Black', 'Navy', 'Grey Three']
  },
  {
    id: 'vineyard-vines-shep-qz',
    name: 'Men\'s Collegiate Shep Quarter-Zip Sweatshirt',
    sku: 'K002712',
    description: 'Vineyard Vines Men\'s Collegiate Shep Quarter-Zip Sweatshirt - Classic preppy quarter-zip',
    price: 125.00,
    category: 'Jackets',
    image: 'https://files.commonsku.com/large/cae5a364-29d2-4108-a7ec-8ab1491be0f4',
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL'],
    colors: ['Navy', 'Grey Heather']
  },
  {
    id: 'under-armour-storm-qz',
    name: 'Men\'s Storm Sweater Fleece Quarter-Zip Pullover',
    sku: '1383256',
    description: 'Under Armour Men\'s Storm Sweater Fleece Quarter-Zip Pullover - Water-resistant fleece with Storm technology',
    price: 95.00,
    category: 'Jackets',
    image: 'https://files.commonsku.com/large/c477e2e9-c57a-4445-9035-dc8072bce7dd',
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
    colors: ['Black', 'Midnight Navy', 'Pitch Gray']
  }
];

export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };

  const db = await getDb();
  const collection = db.collection('uniform_catalog');

  try {
    // GET - Retrieve catalog
    if (event.httpMethod === 'GET') {
      let items = await collection.find({}).toArray();
      
      // If no items in DB, seed with default catalog
      if (items.length === 0) {
        await collection.insertMany(DEFAULT_CATALOG.map(item => ({ ...item })));
        items = await collection.find({}).toArray();
      }
      
      // Map _id to id for frontend compatibility
      const catalog = items.map(item => ({
        ...item,
        id: item.id || item._id.toString(),
        _id: undefined
      }));
      
      return { 
        statusCode: 200, 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(catalog) 
      };
    }

    // POST - Add new item (admin only)
    if (event.httpMethod === 'POST') {
      if (user.role !== 'admin') return { statusCode: 403, body: 'Forbidden - Admin only' };
      
      const item = JSON.parse(event.body || '{}');
      if (!item.name || !item.sku) {
        return { statusCode: 400, body: 'Missing required fields: name, sku' };
      }
      
      // Generate ID if not provided
      if (!item.id) {
        item.id = item.sku.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now();
      }
      
      await collection.insertOne(item);
      return { 
        statusCode: 200, 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item) 
      };
    }

    // PUT - Update item (admin only)
    if (event.httpMethod === 'PUT') {
      if (user.role !== 'admin') return { statusCode: 403, body: 'Forbidden - Admin only' };
      
      const item = JSON.parse(event.body || '{}');
      if (!item.id) {
        return { statusCode: 400, body: 'Missing item id' };
      }
      
      const { id, ...updateData } = item;
      await collection.updateOne(
        { id: id },
        { $set: updateData }
      );
      
      return { 
        statusCode: 200, 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item) 
      };
    }

    // DELETE - Remove item (admin only)
    if (event.httpMethod === 'DELETE') {
      if (user.role !== 'admin') return { statusCode: 403, body: 'Forbidden - Admin only' };
      
      const { id } = JSON.parse(event.body || '{}');
      if (!id) {
        return { statusCode: 400, body: 'Missing item id' };
      }
      
      await collection.deleteOne({ id: id });
      return { 
        statusCode: 200, 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, id }) 
      };
    }

    // PATCH - Reset catalog to defaults or import (admin only)
    if (event.httpMethod === 'PATCH') {
      if (user.role !== 'admin') return { statusCode: 403, body: 'Forbidden - Admin only' };
      
      const { action, items } = JSON.parse(event.body || '{}');
      
      if (action === 'reset') {
        await collection.deleteMany({});
        await collection.insertMany(DEFAULT_CATALOG.map(item => ({ ...item })));
        const newItems = await collection.find({}).toArray();
        return { 
          statusCode: 200, 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newItems) 
        };
      }
      
      if (action === 'import' && Array.isArray(items)) {
        await collection.deleteMany({});
        await collection.insertMany(items.map(item => ({ ...item })));
        const newItems = await collection.find({}).toArray();
        return { 
          statusCode: 200, 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newItems) 
        };
      }
      
      return { statusCode: 400, body: 'Invalid action' };
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (e) {
    console.error('Catalog API error:', e);
    return { statusCode: 500, body: e.message };
  }
}
