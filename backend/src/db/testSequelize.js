const db = require('../models');

(async function(){
  try{
    await db.sequelize.authenticate();
    console.log('Sequelize connected.');
    // optional: list models
    console.log('Models:', Object.keys(db).filter(k => typeof db[k] === 'function' || db[k]?.name).join(', '));
    process.exit(0);
  }catch(err){
    console.error('Sequelize connection failed:', err.message || err);
    process.exit(2);
  }
})();
