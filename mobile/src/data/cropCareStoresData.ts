export interface PesticideProduct {
  name: string;
  category: 'Insecticide' | 'Fungicide' | 'Bio-Control' | 'NPK Fertilizer' | 'Micronutrient';
  targetIssue: string;
  price: string;
  packSize: string;
  inStock: boolean;
}

export interface CropCareStore {
  id: string;
  name: string;
  dealerType: string;
  district: 'Madanapalle' | 'Tirupati' | 'Chittoor' | 'Punganur';
  address: string;
  distanceKm: number;
  rating: number;
  reviewsCount: number;
  phone: string;
  latitude: number;
  longitude: number;
  googleMapsUrl: string;
  googleSearchUrl: string;
  isGovtLicensed: boolean;
  isOpen: boolean;
  timing: string;
  products: PesticideProduct[];
}

export const CROP_CARE_STORES_DATA: CropCareStore[] = [
  {
    id: 'store_1',
    name: 'Annapurna Agro-Care & Pesticides',
    dealerType: 'Authorized IFFCO & Syngenta Dealer',
    district: 'Madanapalle',
    address: 'CTM Road, Near APMC Tomato Market Yard, Madanapalle',
    distanceKm: 1.8,
    rating: 4.9,
    reviewsCount: 184,
    phone: '+919848022341',
    latitude: 13.5562,
    longitude: 78.5028,
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Pesticide+Dealers+CTM+Road+Madanapalle',
    googleSearchUrl: 'https://www.google.com/search?q=Annapurna+Agro+Pesticides+Madanapalle',
    isGovtLicensed: true,
    isOpen: true,
    timing: '7:00 AM – 8:30 PM',
    products: [
      {
        name: 'Coragen (Chlorantraniliprole 18.5% SC)',
        category: 'Insecticide',
        targetIssue: 'Tomato Fruit Borer & Shoot Borer',
        price: '₹920',
        packSize: '60 ml',
        inStock: true,
      },
      {
        name: 'Emamectin Benzoate 5% SG (Proclaim)',
        category: 'Insecticide',
        targetIssue: 'Helicoverpa & Caterpillar attack',
        price: '₹340',
        packSize: '100 g',
        inStock: true,
      },
      {
        name: 'Dithane M-45 (Mancozeb 75% WP)',
        category: 'Fungicide',
        targetIssue: 'Early Blight & Leaf Spot in Tomato',
        price: '₹280',
        packSize: '500 g',
        inStock: true,
      },
      {
        name: '19:19:19 NPK 100% Water Soluble',
        category: 'NPK Fertilizer',
        targetIssue: 'Vegetative Canopy & Fast Root Growth',
        price: '₹190',
        packSize: '1 kg',
        inStock: true,
      },
    ],
  },
  {
    id: 'store_2',
    name: 'Sri Balaji Kisan Fertilizers & Crop Care',
    dealerType: 'Govt. Subsidized Agro Service Centre',
    district: 'Tirupati',
    address: 'Renigunta Road, Opp. Rythu Bazaar, Tirupati',
    distanceKm: 3.4,
    rating: 4.8,
    reviewsCount: 230,
    phone: '+919440188920',
    latitude: 13.6385,
    longitude: 79.4312,
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Fertilizers+and+Pesticides+Renigunta+Road+Tirupati',
    googleSearchUrl: 'https://www.google.com/search?q=Sri+Balaji+Kisan+Fertilizers+Crop+Care+Tirupati',
    isGovtLicensed: true,
    isOpen: true,
    timing: '6:30 AM – 9:00 PM',
    products: [
      {
        name: 'Trichoderma Viride Bio-Fungicide',
        category: 'Bio-Control',
        targetIssue: 'Damping Off, Wilt & Root Rot in seedlings',
        price: '₹180',
        packSize: '1 kg',
        inStock: true,
      },
      {
        name: 'Pseudomonas Fluorescens Bio-Pesticide',
        category: 'Bio-Control',
        targetIssue: 'Bacterial Wilt & Leaf Blight',
        price: '₹210',
        packSize: '1 L',
        inStock: true,
      },
      {
        name: 'Neem Oil 10,000 PPM (Azadirachtin)',
        category: 'Bio-Control',
        targetIssue: 'Whitefly, Thrips & Aphids (Organic)',
        price: '₹420',
        packSize: '1 L',
        inStock: true,
      },
      {
        name: 'Chelated Zinc EDTA 12% + Boron 20%',
        category: 'Micronutrient',
        targetIssue: 'Fruit Cracking & Blossom End Rot',
        price: '₹240',
        packSize: '250 g',
        inStock: true,
      },
    ],
  },
  {
    id: 'store_3',
    name: 'Kisan Seva Kendra & Pest Clinic',
    dealerType: 'Bayer & Dhanuka Certified Dealer',
    district: 'Madanapalle',
    address: 'Besant Road, Near Market Junction, Madanapalle',
    distanceKm: 2.3,
    rating: 4.7,
    reviewsCount: 112,
    phone: '+919885544122',
    latitude: 13.5480,
    longitude: 78.5085,
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Kisan+Seva+Kendra+Pesticides+Besant+Road+Madanapalle',
    googleSearchUrl: 'https://www.google.com/search?q=Kisan+Seva+Kendra+Pest+Clinic+Madanapalle',
    isGovtLicensed: true,
    isOpen: true,
    timing: '7:30 AM – 8:00 PM',
    products: [
      {
        name: 'Confidor (Imidacloprid 17.8% SL)',
        category: 'Insecticide',
        targetIssue: 'Sucking Pests & Leaf Curl Virus Vectors',
        price: '₹310',
        packSize: '100 ml',
        inStock: true,
      },
      {
        name: 'Ridomil Gold (Metalaxyl-M + Mancozeb)',
        category: 'Fungicide',
        targetIssue: 'Late Blight & Downy Mildew Protection',
        price: '₹560',
        packSize: '250 g',
        inStock: true,
      },
      {
        name: 'Calcium Nitrate + Boron Granules',
        category: 'NPK Fertilizer',
        targetIssue: 'Firm Fruit Skin & Extended Shelf-Life',
        price: '₹380',
        packSize: '5 kg',
        inStock: true,
      },
    ],
  },
  {
    id: 'store_4',
    name: 'Rythu Mitra Agro Chemicals & Bio-Inputs',
    dealerType: 'FPO Partnered Bulk Supplier',
    district: 'Chittoor',
    address: 'APMC Market Road, Kongareddy Palli, Chittoor',
    distanceKm: 14.5,
    rating: 4.8,
    reviewsCount: 156,
    phone: '+919490332211',
    latitude: 13.2172,
    longitude: 79.1003,
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Agro+Chemicals+APMC+Market+Chittoor',
    googleSearchUrl: 'https://www.google.com/search?q=Rythu+Mitra+Agro+Chemicals+Chittoor',
    isGovtLicensed: true,
    isOpen: true,
    timing: '7:00 AM – 8:30 PM',
    products: [
      {
        name: 'Amistar Top (Azoxystrobin + Difenoconazole)',
        category: 'Fungicide',
        targetIssue: 'Anthracnose & Powdery Mildew',
        price: '₹780',
        packSize: '200 ml',
        inStock: true,
      },
      {
        name: 'Humic Acid 98% Potassium Humate',
        category: 'Bio-Control',
        targetIssue: 'Root Development & Soil Conditioning',
        price: '₹290',
        packSize: '1 kg',
        inStock: true,
      },
      {
        name: 'Spinetoram 11.7% SC (Delegate)',
        category: 'Insecticide',
        targetIssue: 'Severe Thrips & Leafminer Infestation',
        price: '₹890',
        packSize: '100 ml',
        inStock: true,
      },
    ],
  },
  {
    id: 'store_5',
    name: 'Punganur Agro Chemicals & Spray Equipment',
    dealerType: 'Agro Retailer & Battery Sprayer Hub',
    district: 'Punganur',
    address: 'Main Bazaar Road, Near Bus Stand, Punganur',
    distanceKm: 22.0,
    rating: 4.6,
    reviewsCount: 94,
    phone: '+919701223344',
    latitude: 13.3667,
    longitude: 78.5833,
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Agro+Chemicals+Main+Bazaar+Punganur',
    googleSearchUrl: 'https://www.google.com/search?q=Punganur+Agro+Chemicals+Pesticides',
    isGovtLicensed: true,
    isOpen: false,
    timing: '8:00 AM – 7:30 PM',
    products: [
      {
        name: 'Chlorpyrifos 50% + Cypermethrin 5% EC',
        category: 'Insecticide',
        targetIssue: 'Soil Cutworms & Chewing Caterpillars',
        price: '₹460',
        packSize: '1 L',
        inStock: true,
      },
      {
        name: '16L 12V Battery Agro Sprayer (Double Motor)',
        category: 'NPK Fertilizer',
        targetIssue: 'Uniform Foliar Spray Application',
        price: '₹2,650',
        packSize: '1 Unit',
        inStock: true,
      },
    ],
  },
];

