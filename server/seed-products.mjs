import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL || "";

if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}

async function seed() {
  console.log("🌱 Starting product seeding...");

  let connection;
  try {
    connection = await mysql.createConnection(DATABASE_URL);

    // Create product types
    console.log("📦 Creating product types...");

    const [claddingResult] = await connection.execute(
      "INSERT INTO product_types (name, slug, description, is_active) VALUES (?, ?, ?, ?)",
      ["Cladding", "cladding", "Wall cladding panels", 1]
    );
    const claddingTypeId = claddingResult.insertId;

    const [acousticResult] = await connection.execute(
      "INSERT INTO product_types (name, slug, description, is_active) VALUES (?, ?, ?, ?)",
      ["Acoustic Panels", "acoustic-panels", "Sound-absorbing acoustic panels", 1]
    );
    const acousticTypeId = acousticResult.insertId;

    const [marbleResult] = await connection.execute(
      "INSERT INTO product_types (name, slug, description, is_active) VALUES (?, ?, ?, ?)",
      ["UV Panel (Marble Sheet)", "marble-sheet", "PVC marble sheet panels with UV lighting", 1]
    );
    const marbleTypeId = marbleResult.insertId;

    const [mirrorResult] = await connection.execute(
      "INSERT INTO product_types (name, slug, description, is_active) VALUES (?, ?, ?, ?)",
      ["Mirrors", "mirrors", "Designer LED mirrors", 1]
    );
    const mirrorTypeId = mirrorResult.insertId;

    const [fireplaceResult] = await connection.execute(
      "INSERT INTO product_types (name, slug, description, is_active) VALUES (?, ?, ?, ?)",
      ["Fireplace", "fireplace", "Premium designer fireplaces", 1]
    );
    const fireplaceTypeId = fireplaceResult.insertId;

    console.log("✅ Product types created");

    // Create products
    console.log("📦 Creating products...");

    // Cladding products
    await connection.execute(
      "INSERT INTO products (product_type_id, name, design, width_mm, height_mm, price_per_unit, description, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [claddingTypeId, "Timber Look 300x600", "Timber", 300, 600, 5000, "Natural timber look cladding", 1]
    );

    await connection.execute(
      "INSERT INTO products (product_type_id, name, design, width_mm, height_mm, price_per_unit, description, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [claddingTypeId, "Stone Look 300x600", "Stone", 300, 600, 5500, "Stone finish cladding", 1]
    );

    // Acoustic Panels - 7 color options
    const acousticColors = [
      "Light Grey",
      "Dark Grey",
      "Oak",
      "Walnut",
      "Coffee",
      "Black",
      "Natural Wood",
    ];

    for (const color of acousticColors) {
      await connection.execute(
        "INSERT INTO products (product_type_id, name, design, width_mm, height_mm, depth_mm, price_per_unit, description, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [acousticTypeId, `Acoustic Panel ${color}`, color, 600, 2900, 21, 7500, `Acoustic panel in ${color}`, 1]
      );
    }

    // UV Panel (Marble Sheet)
    await connection.execute(
      "INSERT INTO products (product_type_id, name, design, width_mm, height_mm, depth_mm, price_per_unit, description, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [marbleTypeId, "UV Panel (PVC Marble Sheet)", "Marble", 1220, 2900, 3, 8000, "PVC marble sheet with UV lighting capability", 1]
    );

    // Mirrors - LED Designer Mirrors
    const mirrors = [
      ["Full Moon (Round) 1200mm", "Full Moon Round", 1200, 1200, 35000, "Frameless 3 colour LED, Dimmable"],
      ["Full Moon (Round) 1500mm", "Full Moon Round", 1500, 1500, 45000, "Frameless 3 colour LED, Dimmable"],
      ["Half Moon (900×1800mm)", "Half Moon", 900, 1800, 37000, "Frameless 3 colour LED, Dimmable"],
      ["Half Moon (750×1500mm)", "Half Moon", 750, 1500, 32000, "Frameless 3 colour LED, Dimmable"],
    ];

    for (const [name, design, width, height, price, desc] of mirrors) {
      await connection.execute(
        "INSERT INTO products (product_type_id, name, design, width_mm, height_mm, price_per_unit, description, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [mirrorTypeId, name, design, width, height, price, desc, 1]
      );
    }

    // Fireplace
    const fireplaces = [
      ["Fireplace 50 inch", "Premium", 60000, "Premium designer fireplace 50 inch"],
      ["Fireplace 60 inch", "Premium", 70000, "Premium designer fireplace 60 inch"],
      ["Fireplace 72 inch", "Premium", 85000, "Premium designer fireplace 72 inch"],
    ];

    for (const [name, design, price, desc] of fireplaces) {
      await connection.execute(
        "INSERT INTO products (product_type_id, name, design, price_per_unit, description, is_active) VALUES (?, ?, ?, ?, ?, ?)",
        [fireplaceTypeId, name, design, price, desc, 1]
      );
    }

    console.log("✅ Products created");

    // Create volume discounts
    console.log("📦 Creating volume discounts...");

    const discountTiers = [
      { minQuantity: 1, discountPercent: 0 },
      { minQuantity: 5, discountPercent: 5 },
      { minQuantity: 10, discountPercent: 10 },
      { minQuantity: 20, discountPercent: 15 },
    ];

    for (const tier of discountTiers) {
      for (const typeId of [claddingTypeId, acousticTypeId, marbleTypeId]) {
        await connection.execute(
          "INSERT INTO volume_discounts (product_type_id, min_quantity, discount_percent) VALUES (?, ?, ?)",
          [typeId, tier.minQuantity, tier.discountPercent]
        );
      }
    }

    console.log("✅ Volume discounts created");
    console.log("🎉 Seeding completed successfully!");
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    if (connection) await connection.end();
    process.exit(1);
  }
}

seed();
