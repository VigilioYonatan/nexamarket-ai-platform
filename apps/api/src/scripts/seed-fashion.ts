/**
 * NexaMarket Seeder — Women's Fashion & Haute Couture Edition
 * Aura Studio & Moda Femenina Oficial Store
 * Realistic Peruvian store with authentic lookbook multi-angle photography,
 * real apparel sizing variants (XS, S, M, L, XL), GS1-13 compliant barcodes,
 * and high-end fashion editorial categories.
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

export async function seedFashion(externalPool?: Pool) {
  const pool = externalPool ?? new Pool({ connectionString: cfg.DATABASE_URL });
  const c = await pool.connect();

  const sellerUserId = "99999999-9999-4999-8999-000000000007";
  const sellerId = "88888888-8888-4888-8888-000000000007";

  const categories: [string, string, string, string | null, string, string][] = [
    // Top-level Department
    [
      "77777777-1111-4777-8777-000000000001",
      "moda-femenina",
      "Moda Femenina & Tendencias",
      null,
      "spark",
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=80",
    ],
    // Subcategories
    [
      "77777777-1111-4777-8777-000000000002",
      "vestidos-mujer",
      "Vestidos Elegantes & Casuales Midi",
      "77777777-1111-4777-8777-000000000001",
      "spark",
      "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=800&q=80",
    ],
    [
      "77777777-1111-4777-8777-000000000003",
      "blusas-tops-mujer",
      "Blusas Satinadas & Tops de Lino",
      "77777777-1111-4777-8777-000000000001",
      "tag",
      "https://images.unsplash.com/photo-1551163943-3f6a855d1153?auto=format&fit=crop&w=800&q=80",
    ],
    [
      "77777777-1111-4777-8777-000000000004",
      "pantalones-palazzo-mujer",
      "Pantalones Palazzo & Mom Jeans",
      "77777777-1111-4777-8777-000000000001",
      "tag",
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=800&q=80",
    ],
    [
      "77777777-1111-4777-8777-000000000005",
      "blazers-sastreria-mujer",
      "Blazers Sastre & Abrigos Estructurados",
      "77777777-1111-4777-8777-000000000001",
      "shield",
      "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=800&q=80",
    ],
    [
      "77777777-1111-4777-8777-000000000006",
      "calzado-femenino",
      "Calzado de Cuero & Tacones Bloque",
      "77777777-1111-4777-8777-000000000001",
      "check",
      "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=800&q=80",
    ],
    [
      "77777777-1111-4777-8777-000000000007",
      "bolsos-carteras-mujer",
      "Carteras Tote de Piel & Minibags",
      "77777777-1111-4777-8777-000000000001",
      "package",
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80",
    ],
  ];

  const catVestidos = "77777777-1111-4777-8777-000000000002";
  const catBlusas = "77777777-1111-4777-8777-000000000003";
  const catPantalones = "77777777-1111-4777-8777-000000000004";
  const catBlazers = "77777777-1111-4777-8777-000000000005";
  const catCalzado = "77777777-1111-4777-8777-000000000006";
  const catBolsos = "77777777-1111-4777-8777-000000000007";

  const products: ProductSeed[] = [
    {
      id: "a7000001-0001-4000-8000-000000000001",
      catId: catVestidos,
      sellerId,
      title: "Vestido Midi Satinado Escote Drapeado Aura Studio",
      description:
        "Vestido midi confeccionado en satén sedoso de caída fluida con escote drapeado cowl neck y tirantes regulables cruzados en la espalda. Corte al bies que abraza la silueta de manera elegante y abertura lateral para mayor movimiento. Perfecto para eventos de gala, cócteles o cenas exclusivas.",
      image:
        "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=1000&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1000&q=80",
      ],
      brand: "Aura Studio",
      model: "Satin Cowl Midi Dress",
      gtinPrefix: "775001000001",
      priceMinor: 18990,
      compareAtMinor: 25900,
      stock: 45,
      badge: "TENDENCIA VIRAL",
      specs: {
        Composición: "97% Poliéster Satinado Premium, 3% Elastano",
        Corte: "Midi al bies con abertura lateral",
        Escote: "Cowl neck drapeado",
        Cuidados: "Lavado a mano en frío o tintorería ecológica",
        Origen: "Hecho en Lima, Perú",
      },
      variants: [
        {
          name: "Talla XS / Verde Esmeralda",
          listing_id: "b7000001-0001-4000-8000-000000000001",
          price_minor: 18990,
          stock: 10,
          sku: "AURA-VES-01-XS-GRN",
          current: true,
        },
        {
          name: "Talla S / Verde Esmeralda",
          listing_id: "b7000001-0001-4000-8000-000000000002",
          price_minor: 18990,
          stock: 15,
          sku: "AURA-VES-01-S-GRN",
        },
        {
          name: "Talla M / Terracota Cálido",
          listing_id: "b7000001-0001-4000-8000-000000000003",
          price_minor: 19990,
          stock: 12,
          sku: "AURA-VES-01-M-TER",
          image: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=1000&q=80",
        },
        {
          name: "Talla L / Negro Azabache",
          listing_id: "b7000001-0001-4000-8000-000000000004",
          price_minor: 18990,
          stock: 8,
          sku: "AURA-VES-01-L-BLK",
          image: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=1000&q=80",
        },
      ],
    },
    {
      id: "a7000001-0001-4000-8000-000000000002",
      catId: catVestidos,
      sellerId,
      title: "Vestido Camisero de Lino Puro con Cinturón a Tono Aura",
      description:
        "Vestido camisero confeccionado en 100% lino orgánico pre-lavado para una textura suave y transpirable. Cuello solapa, botones frontales efecto carey y cinturón en el mismo tejido para ceñir la cintura. Manga 3/4 con trabilla y bolsillos funcionales en costuras.",
      image:
        "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1000&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=1000&q=80",
      ],
      brand: "Aura Studio",
      model: "Pure Linen Shirt Dress",
      gtinPrefix: "775001000002",
      priceMinor: 21900,
      compareAtMinor: 28900,
      stock: 38,
      badge: "LINO 100% ORGÁNICO",
      specs: {
        Material: "100% Lino Natural de Grado Europeo",
        Manga: "3/4 convertible con presilla y botón",
        Detalles: "Bolsillos laterales ocultos y cinturón lazada",
        Transpirabilidad: "Máxima frescura para clima cálido y templado",
      },
      variants: [
        {
          name: "Talla S / Blanco Crudo",
          listing_id: "b7000001-0001-4000-8000-000000000005",
          price_minor: 21900,
          stock: 12,
          sku: "AURA-VES-02-S-WHT",
          current: true,
        },
        {
          name: "Talla M / Beige Almendra",
          listing_id: "b7000001-0001-4000-8000-000000000006",
          price_minor: 21900,
          stock: 16,
          sku: "AURA-VES-02-M-BGE",
        },
        {
          name: "Talla L / Verde Salvia",
          listing_id: "b7000001-0001-4000-8000-000000000007",
          price_minor: 22900,
          stock: 10,
          sku: "AURA-VES-02-L-SAGE",
        },
      ],
    },
    {
      id: "a7000001-0001-4000-8000-000000000003",
      catId: catBlusas,
      sellerId,
      title: "Blusa Camisera de Satén de Seda con Botones de Nácar",
      description:
        "Blusa de vestir confeccionada en satén de seda pesado con brillo sutil. Cuello camisero estructurado, manga larga con puño francés y auténticos botones de nácar natural. Ideal para estilismos de oficina de alto impacto o looks sofisticados con jeans palazzo.",
      image:
        "https://images.unsplash.com/photo-1551163943-3f6a855d1153?auto=format&fit=crop&w=1000&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1551163943-3f6a855d1153?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1000&q=80",
      ],
      brand: "Aura Studio",
      model: "Silk Satin Shirt Pearl",
      gtinPrefix: "775001000003",
      priceMinor: 14900,
      compareAtMinor: 19900,
      stock: 50,
      specs: {
        Material: "Satén de Seda Premium y Algodón Pima",
        Puños: "Puño doble con botones gemelos de nácar",
        Calce: "Regular fit estructurado",
      },
      variants: [
        {
          name: "Talla XS / Marfil Perla",
          listing_id: "b7000001-0001-4000-8000-000000000008",
          price_minor: 14900,
          stock: 14,
          sku: "AURA-BLU-01-XS-IVR",
          current: true,
        },
        {
          name: "Talla M / Azul Medianoche",
          listing_id: "b7000001-0001-4000-8000-000000000009",
          price_minor: 14900,
          stock: 20,
          sku: "AURA-BLU-01-M-NVY",
        },
        {
          name: "Talla L / Terracota",
          listing_id: "b7000001-0001-4000-8000-000000000010",
          price_minor: 15500,
          stock: 16,
          sku: "AURA-BLU-01-L-TER",
        },
      ],
    },
    {
      id: "a7000001-0001-4000-8000-000000000004",
      catId: catBlusas,
      sellerId,
      title: "Top Asimétrico de Lino y Algodón Pima con Nudo Lateral",
      description:
        "Top moderno de un solo hombro con detalle de nudo drapeado en la cintura. Confeccionado en mezcla de lino fresco y algodón pima peruano certificado. Estilo versátil y contemporáneo que eleva cualquier pantalón o falda.",
      image:
        "https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?auto=format&fit=crop&w=1000&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1000&q=80",
      ],
      brand: "Aura Studio",
      model: "One-Shoulder Pima Top",
      gtinPrefix: "775001000004",
      priceMinor: 8990,
      compareAtMinor: 12900,
      stock: 40,
      specs: {
        Tejido: "60% Algodón Pima Peruano, 40% Lino Orgánico",
        Diseño: "Hombro asimétrico con nudo lateral ajustable",
        Tacto: "Ultra suave y fresco",
      },
      variants: [
        {
          name: "Talla S / Blanco Nube",
          listing_id: "b7000001-0001-4000-8000-000000000011",
          price_minor: 8990,
          stock: 15,
          sku: "AURA-TOP-01-S-WHT",
          current: true,
        },
        {
          name: "Talla M / Negro Carbón",
          listing_id: "b7000001-0001-4000-8000-000000000012",
          price_minor: 8990,
          stock: 15,
          sku: "AURA-TOP-01-M-BLK",
        },
        {
          name: "Talla L / Arena Caliza",
          listing_id: "b7000001-0001-4000-8000-000000000013",
          price_minor: 8990,
          stock: 10,
          sku: "AURA-TOP-01-L-SND",
        },
      ],
    },
    {
      id: "a7000001-0001-4000-8000-000000000005",
      catId: catPantalones,
      sellerId,
      title: "Pantalón Palazzo Sastrería Fluido Wide Leg de Tiro Alto",
      description:
        "Pantalón palazzo de pernera ancha con pinzas frontales profundas y tiro alto favorecedor. Caída impecable con tejido sastre fluido que no se arruga. Bolsillos laterales al bies y cierre frontal invisible. El básico definitivo de fondo de armario para siluetas estilizadas.",
      image:
        "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1000&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1000&q=80",
      ],
      brand: "Aura Studio",
      model: "High-Waist Tailored Palazzo",
      gtinPrefix: "775001000005",
      priceMinor: 17990,
      compareAtMinor: 23900,
      stock: 60,
      badge: "BEST SELLER SASTRERO",
      specs: {
        Tejido: "Crepé Sastrero Elástico Antiarrugas",
        Tiro: "Alto (31 cm en talle medio)",
        Largo: "Pernera ancha wide-leg con dobladillo reforzado",
      },
      variants: [
        {
          name: "Talla S / Gris Perla Melange",
          listing_id: "b7000001-0001-4000-8000-000000000014",
          price_minor: 17990,
          stock: 18,
          sku: "AURA-PAL-01-S-GRY",
          current: true,
        },
        {
          name: "Talla M / Negro Sastre",
          listing_id: "b7000001-0001-4000-8000-000000000015",
          price_minor: 17990,
          stock: 24,
          sku: "AURA-PAL-01-M-BLK",
        },
        {
          name: "Talla L / Beige Tostado",
          listing_id: "b7000001-0001-4000-8000-000000000016",
          price_minor: 18990,
          stock: 18,
          sku: "AURA-PAL-01-L-BGE",
        },
      ],
    },
    {
      id: "a7000001-0001-4000-8000-000000000006",
      catId: catPantalones,
      sellerId,
      title: "Jeans Wide Leg Tiro Alto Denim 100% Algodón Rígido",
      description:
        "Jeans de tiro súper alto y pierna ancha recta confeccionados en denim 100% algodón de 12.5 oz. Lavado vintage suave con bigotes sutiles y remaches metálicos de latón envejecido. Efecto moldeador en cintura y cadera con la comodidad de un corte amplio.",
      image:
        "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=1000&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1000&q=80",
      ],
      brand: "Aura Studio",
      model: "Vintage Rigid Wide Leg Denim",
      gtinPrefix: "775001000006",
      priceMinor: 16900,
      compareAtMinor: 21900,
      stock: 44,
      specs: {
        Composición: "100% Algodón Denim Premium Rígido",
        Tiro: "Super High Rise",
        Lavado: "Ecológico con ahorro del 70% de agua",
      },
      variants: [
        {
          name: "Talla 26 / Celeste Vintage",
          listing_id: "b7000001-0001-4000-8000-000000000017",
          price_minor: 16900,
          stock: 12,
          sku: "AURA-JNS-01-26-BLU",
          current: true,
        },
        {
          name: "Talla 28 / Celeste Vintage",
          listing_id: "b7000001-0001-4000-8000-000000000018",
          price_minor: 16900,
          stock: 16,
          sku: "AURA-JNS-01-28-BLU",
        },
        {
          name: "Talla 30 / Blanco Crudo",
          listing_id: "b7000001-0001-4000-8000-000000000019",
          price_minor: 16900,
          stock: 16,
          sku: "AURA-JNS-01-30-WHT",
        },
      ],
    },
    {
      id: "a7000001-0001-4000-8000-000000000007",
      catId: catBlazers,
      sellerId,
      title: "Blazer Oversize Estructurado Doble Botonadura Aura",
      description:
        "Blazer icónico de corte oversize estructurado con hombreras marcadas y solapa de muesca ancha. Confeccionado en paño sastre liviano con forro satinado interior y bolsillos con solapa. Una pieza clave de sastrería contemporánea que transforma cualquier look informal en elegancia pura.",
      image:
        "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1000&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1000&q=80",
      ],
      brand: "Aura Studio",
      model: "Power Shoulder Double-Breasted Blazer",
      gtinPrefix: "775001000007",
      priceMinor: 29900,
      compareAtMinor: 38900,
      stock: 35,
      badge: "PIEZA ICÓNICA AURA",
      specs: {
        Estructura: "Hombreras anatómicas y forro interior completo",
        Botonadura: "Doble cruzada con 4 botones de asta",
        Bolsillos: "Dos bolsillos con solapa y bolsillo de ojal en pecho",
      },
      variants: [
        {
          name: "Talla XS / Camel Dorado",
          listing_id: "b7000001-0001-4000-8000-000000000020",
          price_minor: 29900,
          stock: 8,
          sku: "AURA-BLZ-01-XS-CAM",
          current: true,
        },
        {
          name: "Talla S / Camel Dorado",
          listing_id: "b7000001-0001-4000-8000-000000000021",
          price_minor: 29900,
          stock: 12,
          sku: "AURA-BLZ-01-S-CAM",
        },
        {
          name: "Talla M / Negro Smoking",
          listing_id: "b7000001-0001-4000-8000-000000000022",
          price_minor: 29900,
          stock: 15,
          sku: "AURA-BLZ-01-M-BLK",
        },
      ],
    },
    {
      id: "a7000001-0001-4000-8000-000000000008",
      catId: catBlazers,
      sellerId,
      title: "Gabardina Trench Coat Clásica Doble Abotonado Repelente",
      description:
        "Trench coat largo en gabardina de algodón hidrófugo. Diseño atemporal con bavolet delantero, trabillas en hombros y puños, y cinturón ancho con hebilla forrada a tono. Forro interior de tartán sutil. Protección contra el viento y llovizna con distinción urbana.",
      image:
        "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1000&q=80",
      ],
      brand: "Aura Studio",
      model: "Heritage Trench Coat",
      gtinPrefix: "775001000008",
      priceMinor: 38900,
      compareAtMinor: 48900,
      stock: 25,
      specs: {
        Tejido: "Gabardina 100% Algodón con Acabado Water-Repellent",
        Largo: "Midi por debajo de la rodilla",
        Abertura: "Abertura trasera con botón de fuelle",
      },
      variants: [
        {
          name: "Talla S / Beige Miel Clásico",
          listing_id: "b7000001-0001-4000-8000-000000000023",
          price_minor: 38900,
          stock: 10,
          sku: "AURA-TRN-01-S-BGE",
          current: true,
        },
        {
          name: "Talla M / Beige Miel Clásico",
          listing_id: "b7000001-0001-4000-8000-000000000024",
          price_minor: 38900,
          stock: 15,
          sku: "AURA-TRN-01-M-BGE",
        },
      ],
    },
    {
      id: "a7000001-0001-4000-8000-000000000009",
      catId: catCalzado,
      sellerId,
      title: "Sandalias de Tiras de Cuero Natural con Tacón Bloque 6cm",
      description:
        "Sandalias artesanales confeccionadas en cuero de ternera suave con tiras tubulares acolchadas y plantilla memory foam para confort prolongado todo el día. Tacón bloque geométrico estable de 6 cm forrado en cuero. Hebilla metálica dorada ajustable al tobillo.",
      image:
        "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=1000&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&w=1000&q=80",
      ],
      brand: "Aura Studio",
      model: "Block Heel Leather Sandal 60",
      gtinPrefix: "775001000009",
      priceMinor: 22900,
      compareAtMinor: 29900,
      stock: 36,
      badge: "CUERO LEGÍTIMO",
      specs: {
        Capellada: "100% Cuero Vacuno Plena Flor",
        Plantilla: "Memory foam ergonómica forrada en piel",
        Tacón: "6 cm bloque forrado",
        Suela: "Cuero antideslizante con inserto de caucho",
      },
      variants: [
        {
          name: "Talla 36 / Cuero Nude Almendra",
          listing_id: "b7000001-0001-4000-8000-000000000025",
          price_minor: 22900,
          stock: 8,
          sku: "AURA-SAN-01-36-NDE",
          current: true,
        },
        {
          name: "Talla 37 / Cuero Nude Almendra",
          listing_id: "b7000001-0001-4000-8000-000000000026",
          price_minor: 22900,
          stock: 14,
          sku: "AURA-SAN-01-37-NDE",
        },
        {
          name: "Talla 38 / Cuero Negro",
          listing_id: "b7000001-0001-4000-8000-000000000027",
          price_minor: 22900,
          stock: 14,
          sku: "AURA-SAN-01-38-BLK",
        },
      ],
    },
    {
      id: "a7000001-0001-4000-8000-000000000010",
      catId: catBolsos,
      sellerId,
      title: "Bolso Tote de Cuero Italiano Genuino con Pouch Interior",
      description:
        "Bolso tote espacioso confeccionado en cuero granulado de origen italiano con tacto sedoso y resistente a los arañazos. Asas dobles para llevar cómodamente al hombro o en mano, base con tachuelas metálicas protectoras y necessaire extraíble con cremallera. Capacidad para laptop de hasta 15 pulgadas y esenciales diarios.",
      image:
        "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1000&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1000&q=80",
      ],
      brand: "Aura Studio",
      model: "Italian Leather Everyday Tote",
      gtinPrefix: "775001000010",
      priceMinor: 34900,
      compareAtMinor: 45000,
      stock: 30,
      badge: "EDICIÓN LIMITADA",
      specs: {
        Material: "100% Cuero Vacuno Grano Fino Italiano",
        Dimensiones: "38 cm ancho x 30 cm alto x 14 cm profundidad",
        Compartimentos: "Interior espacioso con pouch desmontable de seguridad",
        Compatibilidad: "MacBook Pro 14\" / 16\" y documentos A4",
      },
      variants: [
        {
          name: "Color Caramelo Toscana",
          listing_id: "b7000001-0001-4000-8000-000000000028",
          price_minor: 34900,
          stock: 12,
          sku: "AURA-TOT-01-CAR",
          current: true,
        },
        {
          name: "Color Negro Ónix",
          listing_id: "b7000001-0001-4000-8000-000000000029",
          price_minor: 34900,
          stock: 10,
          sku: "AURA-TOT-01-BLK",
        },
        {
          name: "Color Verde Oliva Bosque",
          listing_id: "b7000001-0001-4000-8000-000000000030",
          price_minor: 35900,
          stock: 8,
          sku: "AURA-TOT-01-OLV",
        },
      ],
    },
  ];

  try {
    await c.query("BEGIN");

    // 1. Ensure verified Seller & Profile
    await c.query(
      `INSERT INTO user_profiles(id, subject, email, display_name, role)
       VALUES($1, 'auramoda-pe-seller', 'ventas@auramoda.pe.invalid', 'Aura Studio & Moda Femenina S.A.C.', 'BUYER')
       ON CONFLICT (id) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         email = EXCLUDED.email`,
      [sellerUserId],
    );

    await c.query(
      `INSERT INTO sellers(id, owner_user_id, display_name, status)
       VALUES($1, $2, 'Aura Moda Femenina Oficial', 'APPROVED')
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
      const primaryListingId = item.id.replace(/^a/, "b");
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
      `✓ Aura Moda Femenina Store seeded successfully:
      - Store: Aura Moda Femenina Oficial (${sellerId})
      - ${categories.length} categories & fashion subdepartments
      - ${products.length} lookbook editorial products
      - ${totalListings} published listings with active sizes & colors`,
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
if (process.argv[1]?.endsWith("seed-fashion.ts") || process.argv[1]?.endsWith("seed-fashion.js")) {
  seedFashion().catch((err) => {
    console.error("Fashion seeder failed:", err);
    process.exit(1);
  });
}
