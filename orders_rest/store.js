const orders = new Map();
const idempotency = new Map();
let nextId = 1;

function createOrder(order) {
  order._id = nextId++;
  orders.set(order._id, order);
  return order;
}

function getOrder(orderId) {
  return orders.get(Number(orderId));
}

function listOrders(status) {
  let values = [...orders.values()];
  if (status) values = values.filter(o => o.status === status);
  return values;
}

function save(order) {
  order.version += 1;
  orders.set(order._id, order);
  return order;
}

function deleteOrder(orderId) {
  return orders.delete(Number(orderId));
}

function getIdempotent(key) {
  return idempotency.get(key);
}

function saveIdempotent(key, result) {
  idempotency.set(key, result);
}

function reset() {
  orders.clear();
  idempotency.clear();
  nextId = 1;
}

module.exports = {
  createOrder,
  getOrder,
  listOrders,
  save,
  deleteOrder,
  getIdempotent,
  saveIdempotent,
  reset
};
