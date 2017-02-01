let id = 0;
const instances = {};

module.exports = {
  setInstance(instance) {
    instances[id] = instance;
    id += 1;
    return id - 1;
  },
  getInstance(instanceId) {
    return instances[instanceId];
  }
};
