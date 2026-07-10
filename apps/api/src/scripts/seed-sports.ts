/**
 * NexaMarket Seeder — Sports, Performance & Athletic Wear Edition
 * Nike Performance Perú Oficial Store
 * Authentic athletic products with technical specs (ReactX, ZoomX, Dri-FIT ADV),
 * real sports shoe sizing (US 7.5 to 11.5) & apparel sizing (S to XL),
 * multi-angle photography, and GS1-13 compliant barcodes.
 */
import { Pool } from "pg";
import { cfg } from "../config.js";

function makeGtin13(prefix12: string): string {
  const digits = prefix12.padStart(12, "0").slice(-12).split("").map(Number);
  let sum = 0;
  for (let i = digits.length - 1, weight = 3; i >= 0; i--, weight = weight === 3 ? 1 : 3) {
    sum += digits[i]! * weight;
  }
  const check = (10 - (sum % 10)) % 10;
  return `${prefix12.padStart(12, "0").slice(-12)}${check}`;
}

export type VariantDef = {
  name: string;
  listing_id: string;
  price_minor: number;
  stock: number;
  sku: string;
  image?: string;
  current?: boolean;
};

export type ProductSeed = {
  id: string;
  catId: string;
  sellerId: string;
  title: string;
  description: string;
  image: string;
  gallery: string[];
  brand: string;
  model: string;
  gtinPrefix: string;
  priceMinor: number;
  compareAtMinor: number;
  stock: number;
  badge?: string;
  variants?: VariantDef[];
  specs: Record<string, unknown>;
};

export async function seedSports(externalPool?: Pool) {
  const pool = externalPool ?? new Pool({ connectionString: cfg.DATABASE_URL });
  const c = await pool.connect();

  const sellerUserId = "99999999-9999-4999-8999-000000000008";
  const sellerId = "88888888-8888-4888-8888-000000000008";

  const categories: [string, string, string, string | null, string, string][] = [
    // Top-level Department
    [
      "99999999-2222-4999-8999-000000000001",
      "deportes-fitness",
      "Deportes, Fitness & Running",
      null,
      "truck",
      "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1200&q=80",
    ],
    // Subcategories
    [
      "99999999-2222-4999-8999-000000000002",
      "zapatillas-running",
      "Zapatillas de Running & Maratón",
      "99999999-2222-4999-8999-000000000001",
      "truck",
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80",
    ],
    [
      "99999999-2222-4999-8999-000000000003",
      "polos-dri-fit",
      "Polos Dri-FIT & Compresión Pro",
      "99999999-2222-4999-8999-000000000001",
      "spark",
      "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80",
    ],
    [
      "99999999-2222-4999-8999-000000000004",
      "leggings-shorts-training",
      "Leggings Pro & Shorts 2-en-1 Training",
      "99999999-2222-4999-8999-000000000001",
      "tag",
      "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80",
    ],
    [
      "99999999-2222-4999-8999-000000000005",
      "casacas-cortavientos",
      "Casacas Cortavientos & Polerones Therma",
      "99999999-2222-4999-8999-000000000001",
      "shield",
      "https://images.unsplash.com/photo-1578768079052-aa76e520028b?auto=format&fit=crop&w=800&q=80",
    ],
    [
      "99999999-2222-4999-8999-000000000006",
      "mochilas-accesorios-gym",
      "Mochilas Brasilia 30L & Accesorios Training",
      "99999999-2222-4999-8999-000000000001",
      "package",
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80",
    ],
  ];

  const catRunning = "99999999-2222-4999-8999-000000000002";
  const catPolos = "99999999-2222-4999-8999-000000000003";
  const catLeggings = "99999999-2222-4999-8999-000000000004";
  const catCasacas = "99999999-2222-4999-8999-000000000005";
  const catMochilas = "99999999-2222-4999-8999-000000000006";

  const products: ProductSeed[] = [
    {
      id: "b8000001-0001-4000-8000-000000000001",
      catId: catRunning,
      sellerId,
      title: "Nike Air Zoom Pegasus 41 Zapatillas de Running ReactX",
      description:
        "La amortiguación reactiva del Pegasus 41 proporciona una zancada con retorno de energía superior para tus entrenamientos diarios en asfalto. Cuenta con la innovadora espuma ReactX Foam, que ofrece un 13% más de respuesta y reduce la huella de carbono un 43% comparado con la espuma React anterior, combinada con dos unidades Air Zoom en el antepié y el talón.",
      image:
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1000&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=1000&q=80",
      ],
      brand: "Nike",
      model: "Pegasus 41 ReactX Air Zoom",
      gtinPrefix: "775002000001",
      priceMinor: 54900,
      compareAtMinor: 62900,
      stock: 55,
      badge: "OFICIAL NIKE RUNNING",
      specs: {
        Tecnología: "Espuma Nike ReactX + Doble cápsula Air Zoom",
        Drop: "10 mm (antepié 27 mm, talón 37 mm)",
        Peso: "285 gramos (talla 9 US)",
        Superficie: "Asfalto, pista atlética y cinta",
        Garantía: "Oficial Nike Perú 6 meses por fallas de fábrica",
      },
      variants: [
        {
          name: "US 8.0 / University Red",
          listing_id: "c8000001-0001-4000-8000-000000000001",
          price_minor: 54900,
          stock: 12,
          sku: "NIKE-PEG41-80-RED",
          current: true,
        },
        {
          name: "US 8.5 / University Red",
          listing_id: "c8000001-0001-4000-8000-000000000002",
          price_minor: 54900,
          stock: 15,
          sku: "NIKE-PEG41-85-RED",
        },
        {
          name: "US 9.0 / Triple Black",
          listing_id: "c8000001-0001-4000-8000-000000000003",
          price_minor: 54900,
          stock: 18,
          sku: "NIKE-PEG41-90-BLK",
          image: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=1000&q=80",
        },
        {
          name: "US 9.5 / Triple Black",
          listing_id: "c8000001-0001-4000-8000-000000000004",
          price_minor: 54900,
          stock: 10,
          sku: "NIKE-PEG41-95-BLK",
        },
      ],
    },
    {
      id: "b8000001-0001-4000-8000-000000000002",
      catId: catRunning,
      sellerId,
      title: "Nike Invincible 3 Zapatillas de Amortiguación Máxima ZoomX",
      description:
        "Con una amortiguación excepcional para soportar cada kilómetro de tus fondos largos, el Nike Invincible 3 te brinda el mayor nivel de comodidad bajo el pie con su suela sobredimensionada de espuma ZoomX. Su parte superior de Flyknit evolucionado ofrece transpirabilidad y bloqueo seguro.",
      image:
        "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?auto=format&fit=crop&w=1000&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=1000&q=80",
      ],
      brand: "Nike",
      model: "Invincible Run 3 ZoomX",
      gtinPrefix: "775002000002",
      priceMinor: 69900,
      compareAtMinor: 79900,
      stock: 40,
      badge: "MÁXIMA AMORTIGUACIÓN",
      specs: {
        Mediasuela: "100% Espuma Nike ZoomX ultra elástica",
        Upper: "Flyknit zonal de alta ventilación y sujeción",
        Uso: "Fondos de 21K, maratón y recuperación",
        Estabilidad: "Base ancha geométrica antitorsión",
      },
      variants: [
        {
          name: "US 8.5 / Pure Platinum Volt",
          listing_id: "c8000001-0001-4000-8000-000000000005",
          price_minor: 69900,
          stock: 14,
          sku: "NIKE-INV3-85-PLT",
          current: true,
        },
        {
          name: "US 9.0 / Pure Platinum Volt",
          listing_id: "c8000001-0001-4000-8000-000000000006",
          price_minor: 69900,
          stock: 16,
          sku: "NIKE-INV3-90-PLT",
        },
        {
          name: "US 10.0 / Black White",
          listing_id: "c8000001-0001-4000-8000-000000000007",
          price_minor: 69900,
          stock: 10,
          sku: "NIKE-INV3-100-BLK",
        },
      ],
    },
    {
      id: "b8000001-0001-4000-8000-000000000003",
      catId: catPolos,
      sellerId,
      title: "Nike Dri-FIT ADV Camiseta de Running Ultraligera Transpirable",
      description:
        "Diseñada para los días más calurosos y las carreras de alta intensidad, esta camiseta combina tecnología Dri-FIT ADV avanzada de secado ultra rápido con mapas de ventilación corporal basados en datos de atletas profesionales. Costuras planas antifricción.",
      image:
        "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=1000&q=80",
      ],
      brand: "Nike",
      model: "Dri-FIT ADV Race Elite",
      gtinPrefix: "775002000003",
      priceMinor: 16900,
      compareAtMinor: 21900,
      stock: 48,
      badge: "DRI-FIT ADV",
      specs: {
        Tecnología: "Nike Dri-FIT ADV con mapeo térmico",
        Composición: "100% Poliéster Reciclado Knit",
        Reflectivos: "Logotipo Swoosh y barras reflectivas 360°",
      },
      variants: [
        {
          name: "Talla S / Volt Reflectivo",
          listing_id: "c8000001-0001-4000-8000-000000000008",
          price_minor: 16900,
          stock: 14,
          sku: "NIKE-ADV-S-VLT",
          current: true,
        },
        {
          name: "Talla M / Volt Reflectivo",
          listing_id: "c8000001-0001-4000-8000-000000000009",
          price_minor: 16900,
          stock: 18,
          sku: "NIKE-ADV-M-VLT",
        },
        {
          name: "Talla L / Negro Anthracite",
          listing_id: "c8000001-0001-4000-8000-000000000010",
          price_minor: 16900,
          stock: 16,
          sku: "NIKE-ADV-L-BLK",
        },
      ],
    },
    {
      id: "b8000001-0001-4000-8000-000000000004",
      catId: catPolos,
      sellerId,
      title: "Nike Pro Camiseta de Compresión Muscular Dri-FIT Tight Fit",
      description:
        "La capa base definitiva para tus entrenamientos de alta exigencia, crossfit y levantamiento de pesas. El tejido ligero elástico abraza el torso con una compresión graduada que reduce la vibración muscular y acelera la evaporación del sudor.",
      image:
        "https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=1000&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80",
      ],
      brand: "Nike",
      model: "Nike Pro Compression Top",
      gtinPrefix: "775002000004",
      priceMinor: 13900,
      compareAtMinor: 17900,
      stock: 60,
      specs: {
        Ajuste: "Tight fit compresivo segunda piel",
        Malla: "Paneles de mesh en espalda y axilas para máxima ventilación",
        Bajo: "Corte extendido para no salirse del pantalón o short",
      },
      variants: [
        {
          name: "Talla S / Triple Black",
          listing_id: "c8000001-0001-4000-8000-000000000011",
          price_minor: 13900,
          stock: 20,
          sku: "NIKE-PRO-S-BLK",
          current: true,
        },
        {
          name: "Talla M / Triple Black",
          listing_id: "c8000001-0001-4000-8000-000000000012",
          price_minor: 13900,
          stock: 25,
          sku: "NIKE-PRO-M-BLK",
        },
        {
          name: "Talla L / Smoke Grey",
          listing_id: "c8000001-0001-4000-8000-000000000013",
          price_minor: 13900,
          stock: 15,
          sku: "NIKE-PRO-L-GRY",
        },
      ],
    },
    {
      id: "b8000001-0001-4000-8000-000000000005",
      catId: catLeggings,
      sellerId,
      title: "Nike Zenvy Leggings Gentle-Support de Cintura Alta con Bolsillo",
      description:
        "Diseñados para moverte con total libertad en yoga, running o el gimnasio. El tejido InfinaSoft es increíblemente suave y proporciona una sujeción suave y adaptable que se mantiene en su sitio sin apretar. Cintura extra ancha que no se enrolla y bolsillo trasero central para smartphone.",
      image:
        "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1000&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1000&q=80",
      ],
      brand: "Nike",
      model: "Zenvy InfinaSoft 7/8 Legging",
      gtinPrefix: "775002000005",
      priceMinor: 28900,
      compareAtMinor: 34900,
      stock: 45,
      badge: "TEJIDO INFINASOFT",
      specs: {
        Tejido: "Nike InfinaSoft a prueba de sentadillas (squat-proof)",
        Tiro: "High-Rise con pretina reductora anatómica",
        Largo: "7/8 tobillero (25 pulgadas entrepierna)",
      },
      variants: [
        {
          name: "Talla XS / Negro Mate",
          listing_id: "c8000001-0001-4000-8000-000000000014",
          price_minor: 28900,
          stock: 12,
          sku: "NIKE-ZNV-XS-BLK",
          current: true,
        },
        {
          name: "Talla S / Negro Mate",
          listing_id: "c8000001-0001-4000-8000-000000000015",
          price_minor: 28900,
          stock: 18,
          sku: "NIKE-ZNV-S-BLK",
        },
        {
          name: "Talla M / Verde Oliva",
          listing_id: "c8000001-0001-4000-8000-000000000016",
          price_minor: 28900,
          stock: 15,
          sku: "NIKE-ZNV-M-OLV",
        },
      ],
    },
    {
      id: "b8000001-0001-4000-8000-000000000006",
      catId: catLeggings,
      sellerId,
      title: "Nike Stride Shorts de Running 2 en 1 con Forro Compresivo 5\"",
      description:
        "Diseñados para una libertad de movimiento absoluta, los shorts Nike Stride cuentan con un tejido elástico ultraligero y un forro interior ergonómico que ofrece soporte muscular y previene roces. Bolsillo trasero con cremallera a prueba de sudor para tu teléfono.",
      image:
        "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?auto=format&fit=crop&w=1000&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1000&q=80",
      ],
      brand: "Nike",
      model: "Stride 2-in-1 Running Shorts 5\"",
      gtinPrefix: "775002000006",
      priceMinor: 18900,
      compareAtMinor: 23900,
      stock: 50,
      specs: {
        Tiro: "5 pulgadas (13 cm entrepierna exterior)",
        Forro: "Short interior compresivo con bolsillo para llaves",
        Bolsillo: "Bolsillo trasero central con barrera contra el vapor",
      },
      variants: [
        {
          name: "Talla S / Negro Reflectivo",
          listing_id: "c8000001-0001-4000-8000-000000000017",
          price_minor: 18900,
          stock: 15,
          sku: "NIKE-STR-S-BLK",
          current: true,
        },
        {
          name: "Talla M / Negro Reflectivo",
          listing_id: "c8000001-0001-4000-8000-000000000018",
          price_minor: 18900,
          stock: 20,
          sku: "NIKE-STR-M-BLK",
        },
        {
          name: "Talla L / Gris Cemento",
          listing_id: "c8000001-0001-4000-8000-000000000019",
          price_minor: 18900,
          stock: 15,
          sku: "NIKE-STR-L-GRY",
        },
      ],
    },
    {
      id: "b8000001-0001-4000-8000-000000000007",
      catId: catCasacas,
      sellerId,
      title: "Nike Windrunner Chaqueta Cortavientos Repelente al Agua",
      description:
        "La legendaria chaqueta con diseño chevron de 26 grados regresa con protección impermeable mejorada y tejido antidesgarro ripstop 100% reciclado. Capucha ajustable con visera, aberturas de ventilación trasera y bolsillos laterales con cremallera.",
      image:
        "https://images.unsplash.com/photo-1578768079052-aa76e520028b?auto=format&fit=crop&w=1000&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1578768079052-aa76e520028b?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1000&q=80",
      ],
      brand: "Nike",
      model: "Windrunner Hooded Jacket",
      gtinPrefix: "775002000007",
      priceMinor: 36900,
      compareAtMinor: 44900,
      stock: 35,
      badge: "ICÓNICO NIKE",
      specs: {
        Material: "Ripstop de poliéster 100% reciclado hidrófugo",
        Protección: "Resistente a ráfagas de viento y lluvia ligera",
        Plegabilidad: "Se empaca dentro de su propio bolsillo",
      },
      variants: [
        {
          name: "Talla S / Colorblock Negro y Humo",
          listing_id: "c8000001-0001-4000-8000-000000000020",
          price_minor: 36900,
          stock: 10,
          sku: "NIKE-WND-S-CBK",
          current: true,
        },
        {
          name: "Talla M / Colorblock Negro y Humo",
          listing_id: "c8000001-0001-4000-8000-000000000021",
          price_minor: 36900,
          stock: 15,
          sku: "NIKE-WND-M-CBK",
        },
        {
          name: "Talla L / All Black Stealth",
          listing_id: "c8000001-0001-4000-8000-000000000022",
          price_minor: 37900,
          stock: 10,
          sku: "NIKE-WND-L-BLK",
        },
      ],
    },
    {
      id: "b8000001-0001-4000-8000-000000000008",
      catId: catCasacas,
      sellerId,
      title: "Nike Therma-FIT Polerón Deportivo con Capucha y Forro Térmico",
      description:
        "Mantén el calor en tus calentamientos invernales sin perder transpirabilidad. La tecnología Nike Therma-FIT gestiona el calor natural del cuerpo para mantener la calidez, mientras que el forro polar cepillado brinda suavidad extrema en contacto con la piel.",
      image:
        "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1000&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1578768079052-aa76e520028b?auto=format&fit=crop&w=1000&q=80",
      ],
      brand: "Nike",
      model: "Therma-FIT Training Pullover Hoodie",
      gtinPrefix: "775002000008",
      priceMinor: 24900,
      compareAtMinor: 31900,
      stock: 40,
      specs: {
        Tecnología: "Nike Therma-FIT retenedora de temperatura corporal",
        Bolsillos: "Bolsillo canguro frontal con bolsillo interior con cierre",
        Puños: "Puños y cintura de canalé elástico",
      },
      variants: [
        {
          name: "Talla S / Gris Jaspeado Heather",
          listing_id: "c8000001-0001-4000-8000-000000000023",
          price_minor: 24900,
          stock: 12,
          sku: "NIKE-THM-S-GRY",
          current: true,
        },
        {
          name: "Talla M / Gris Jaspeado Heather",
          listing_id: "c8000001-0001-4000-8000-000000000024",
          price_minor: 24900,
          stock: 18,
          sku: "NIKE-THM-M-GRY",
        },
        {
          name: "Talla L / Negro Profundo",
          listing_id: "c8000001-0001-4000-8000-000000000025",
          price_minor: 24900,
          stock: 10,
          sku: "NIKE-THM-L-BLK",
        },
      ],
    },
    {
      id: "b8000001-0001-4000-8000-000000000009",
      catId: catMochilas,
      sellerId,
      title: "Nike Brasilia 9.5 Mochila de Entrenamiento 30L con Porta Calzado",
      description:
        "La mochila de gimnasio por excelencia. Compartimento principal con funda acolchada para laptop de 15 pulgadas, compartimento inferior ventilado independiente para zapatillas o ropa húmeda, y múltiples bolsillos exteriores con cremallera. Fondo recubierto impermeable resistente al roce.",
      image:
        "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1000&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?auto=format&fit=crop&w=1000&q=80",
      ],
      brand: "Nike",
      model: "Brasilia 9.5 Training Backpack 30L",
      gtinPrefix: "775002000009",
      priceMinor: 15900,
      compareAtMinor: 19900,
      stock: 45,
      badge: "MÁS VENDIDO GYM",
      specs: {
        Capacidad: "30 Litros de almacenamiento",
        Dimensiones: "46 cm alto x 30 cm ancho x 18 cm profundidad",
        Material: "100% Poliéster denso de alta durabilidad",
        Correas: "Acolchadas con malla transpirable y clip de pecho",
      },
      variants: [
        {
          name: "Color Negro Clásico",
          listing_id: "c8000001-0001-4000-8000-000000000026",
          price_minor: 15900,
          stock: 20,
          sku: "NIKE-BRA-BLK",
          current: true,
        },
        {
          name: "Color Camo Urbano",
          listing_id: "c8000001-0001-4000-8000-000000000027",
          price_minor: 16900,
          stock: 15,
          sku: "NIKE-BRA-CAMO",
        },
        {
          name: "Color Azul Medianoche",
          listing_id: "c8000001-0001-4000-8000-000000000028",
          price_minor: 15900,
          stock: 10,
          sku: "NIKE-BRA-NVY",
        },
      ],
    },
    {
      id: "b8000001-0001-4000-8000-000000000010",
      catId: catMochilas,
      sellerId,
      title: "Nike HyperCharge Botella Térmica de Acero Inoxidable 24oz",
      description:
        "Botella térmica con aislamiento al vacío de doble pared que mantiene tus bebidas frías durante 24 horas continuas. Tapa ergonómica abatible con bloqueo a prueba de derrames y boquilla rápida. Asa de transporte integrada de agarre suave.",
      image:
        "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=1000&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=1000&q=80",
      ],
      brand: "Nike",
      model: "HyperCharge Stainless Steel Bottle 24oz",
      gtinPrefix: "775002000010",
      priceMinor: 12900,
      compareAtMinor: 15900,
      stock: 50,
      specs: {
        Capacidad: "709 ml (24 oz)",
        Material: "Acero Inoxidable 18/8 de Grado Alimenticio Libre de BPA",
        Aislamiento: "Vacío de doble pared ColdLock",
      },
      variants: [
        {
          name: "Color Negro Mate Stealth",
          listing_id: "c8000001-0001-4000-8000-000000000029",
          price_minor: 12900,
          stock: 22,
          sku: "NIKE-HYP-BLK",
          current: true,
        },
        {
          name: "Color Acero Inox Natural",
          listing_id: "c8000001-0001-4000-8000-000000000030",
          price_minor: 12900,
          stock: 18,
          sku: "NIKE-HYP-STN",
        },
        {
          name: "Color Volt Neón",
          listing_id: "c8000001-0001-4000-8000-000000000031",
          price_minor: 13900,
          stock: 10,
          sku: "NIKE-HYP-VLT",
        },
      ],
    },
  ];

  try {
    await c.query("BEGIN");

    // 1. Ensure verified Seller & Profile
    await c.query(
      `INSERT INTO user_profiles(id, subject, email, display_name, role)
       VALUES($1, 'nikesports-pe-seller', 'ventas@nikeperu.invalid', 'Nike Sports Performance Perú S.A.C.', 'BUYER')
       ON CONFLICT (id) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         email = EXCLUDED.email`,
      [sellerUserId],
    );

    await c.query(
      `INSERT INTO sellers(id, owner_user_id, display_name, status)
       VALUES($1, $2, 'Nike Performance Perú Oficial', 'APPROVED')
       ON CONFLICT (id) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         status = 'APPROVED'`,
      [sellerId, sellerUserId],
    );

    // 2. Categories
    for (const [id, slug, name, parent_id, icon, image_url] of categories) {
      await c.query(
        `INSERT INTO categories(id, slug, name, parent_id, icon, image_url)
         VALUES($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           slug = EXCLUDED.slug,
           name = EXCLUDED.name,
           parent_id = EXCLUDED.parent_id,
           icon = EXCLUDED.icon,
           image_url = EXCLUDED.image_url`,
        [id, slug, name, parent_id, icon, image_url],
      );
    }

    // 3. Products & Variants
    let totalListings = 0;
    for (const item of products) {
      const gtin = makeGtin13(item.gtinPrefix);
      const enhancedSpecs = {
        gallery: item.gallery,
        compare_at_minor: item.compareAtMinor,
        badge: item.badge,
        variants: item.variants || [],
        ...item.specs,
      };

      await c.query(
        `INSERT INTO products(id, category_id, title, description, image_url, brand, model, gtin, specifications)
         VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
         ON CONFLICT (id) DO UPDATE SET
           category_id = EXCLUDED.category_id,
           title = EXCLUDED.title,
           description = EXCLUDED.description,
           image_url = EXCLUDED.image_url,
           brand = EXCLUDED.brand,
           model = EXCLUDED.model,
           gtin = EXCLUDED.gtin,
           specifications = EXCLUDED.specifications`,
        [
          item.id,
          item.catId,
          item.title,
          item.description,
          item.image,
          item.brand,
          item.model,
          gtin,
          JSON.stringify(enhancedSpecs),
        ],
      );

      // Primary Listing
      const primaryListingId = item.id.replace(/^b/, "c");
      await c.query(
        `INSERT INTO seller_listings(id, seller_id, product_id, price_minor, currency, status)
         VALUES($1, $2, $3, $4, 'PEN', 'PUBLISHED')
         ON CONFLICT (id) DO UPDATE SET
           seller_id = EXCLUDED.seller_id,
           product_id = EXCLUDED.product_id,
           price_minor = EXCLUDED.price_minor,
           status = 'PUBLISHED'`,
        [primaryListingId, item.sellerId, item.id, item.priceMinor],
      );

      await c.query(
        `INSERT INTO inventory_stock(listing_id, on_hand, reserved, version)
         VALUES($1, $2, 0, 1)
         ON CONFLICT (listing_id) DO UPDATE SET
           on_hand = EXCLUDED.on_hand`,
        [primaryListingId, item.stock],
      );
      totalListings++;

      // Variants
      if (item.variants && item.variants.length > 0) {
        for (const v of item.variants) {
          if (v.listing_id !== primaryListingId) {
            await c.query(
              `INSERT INTO seller_listings(id, seller_id, product_id, price_minor, currency, status)
               VALUES($1, $2, $3, $4, 'PEN', 'PUBLISHED')
               ON CONFLICT (id) DO UPDATE SET
                 seller_id = EXCLUDED.seller_id,
                 product_id = EXCLUDED.product_id,
                 price_minor = EXCLUDED.price_minor,
                 status = 'PUBLISHED'`,
              [v.listing_id, item.sellerId, item.id, v.price_minor],
            );
            await c.query(
              `INSERT INTO inventory_stock(listing_id, on_hand, reserved, version)
               VALUES($1, $2, 0, 1)
               ON CONFLICT (listing_id) DO UPDATE SET
                 on_hand = EXCLUDED.on_hand`,
              [v.listing_id, v.stock],
            );
            totalListings++;
          }
        }
      }
    }

    await c.query("COMMIT");
    console.log(
      `✓ Nike Performance Perú Store seeded successfully:
      - Store: Nike Performance Perú Oficial (${sellerId})
      - ${categories.length} athletic departments & subcategories
      - ${products.length} technical running & performance products
      - ${totalListings} published listings with real shoe/apparel sizes`,
    );
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
    if (!externalPool) await pool.end();
  }
}

// Runnable standalone
if (process.argv[1]?.endsWith("seed-sports.ts") || process.argv[1]?.endsWith("seed-sports.js")) {
  seedSports().catch((err) => {
    console.error("Sports seeder failed:", err);
    process.exit(1);
  });
}
