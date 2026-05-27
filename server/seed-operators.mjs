import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'localhost',
  user: process.env.DATABASE_URL?.split('//')[1]?.split(':')[0] || 'root',
  password: process.env.DATABASE_URL?.split(':')[2]?.split('@')[0] || '',
  database: process.env.DATABASE_URL?.split('/').pop() || 'cladding_quote',
});

const operators = [
  { name: 'Manpreet' },
  { name: 'Ginni' },
  { name: 'Roopjit' },
  { name: 'Simar' },
];

try {
  // Clear existing operators
  await connection.execute('DELETE FROM operators');
  
  // Insert new operators
  for (const op of operators) {
    await connection.execute(
      'INSERT INTO operators (name, created_at, updated_at) VALUES (?, NOW(), NOW())',
      [op.name]
    );
  }
  
  console.log('✅ Operators seeded successfully:', operators.map(o => o.name).join(', '));
} catch (error) {
  console.error('❌ Error seeding operators:', error.message);
} finally {
  await connection.end();
}
