const { connect, config } = require('./connection');

(async function(){
  console.log('Connecting to', config.server, config.database);
  let pool;
  try{
    pool = await connect();

    console.log('\nTables and column counts:');
    const tables = await pool.request().query(`
      SELECT TABLE_SCHEMA, TABLE_NAME, COUNT(*) AS column_count
      FROM INFORMATION_SCHEMA.COLUMNS
      GROUP BY TABLE_SCHEMA, TABLE_NAME
      ORDER BY TABLE_SCHEMA, TABLE_NAME
    `);
    tables.recordset.forEach(t => {
      console.log(`- ${t.TABLE_SCHEMA}.${t.TABLE_NAME} (${t.column_count} cols)`);
    });

    console.log('\nColumns for each table:');
    const cols = await pool.request().query(`
      SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      ORDER BY TABLE_SCHEMA, TABLE_NAME, ORDINAL_POSITION
    `);
    let currentTable = '';
    cols.recordset.forEach(c => {
      const table = `${c.TABLE_SCHEMA}.${c.TABLE_NAME}`;
      if(table !== currentTable){
        currentTable = table;
        console.log(`\n${table}:`);
      }
      console.log(`  - ${c.COLUMN_NAME} : ${c.DATA_TYPE} ${c.IS_NULLABLE==='NO' ? 'NOT NULL' : 'NULL'}`);
    });

    console.log('\nForeign Keys:');
    const fks = await pool.request().query(`
      SELECT fk.name AS fk_name,
        OBJECT_SCHEMA_NAME(fk.parent_object_id) AS parent_schema,
        OBJECT_NAME(fk.parent_object_id) AS parent_table,
        COL_NAME(fkc.parent_object_id, fkc.parent_column_id) AS parent_column,
        OBJECT_SCHEMA_NAME(fk.referenced_object_id) AS ref_schema,
        OBJECT_NAME(fk.referenced_object_id) AS ref_table,
        COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) AS ref_column
      FROM sys.foreign_keys fk
      JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
      ORDER BY fk.name
    `);
    if(fks.recordset.length===0) console.log('  (no foreign keys found)');
    else fks.recordset.forEach(r => {
      console.log(`- ${r.fk_name}: ${r.parent_schema}.${r.parent_table}(${r.parent_column}) -> ${r.ref_schema}.${r.ref_table}(${r.ref_column})`);
    });

    await pool.close();
    console.log('\nDone.');
    process.exit(0);
  }catch(err){
    console.error('Error reading schema:', err.message || err);
    if(pool && pool.close) await pool.close();
    process.exit(2);
  }
})();
