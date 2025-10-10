export default (sequelize, DataTypes) => {
  const SysDiagram = sequelize.define('SysDiagram', {
    name: {
      type: DataTypes.STRING,
      primaryKey: true
    },
    principal_id: {
      type: DataTypes.INTEGER
    },
    diagram_id: {
      type: DataTypes.INTEGER
    },
    version: {
      type: DataTypes.INTEGER
    },
    definition: {
      type: DataTypes.BLOB
    }
  }, {
    tableName: 'sysdiagrams',
    timestamps: false
  });

  return SysDiagram;
};
