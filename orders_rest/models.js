class Order {
  constructor(id, userId, items, totalAmount, {
    status = "PENDING",
    createdAt = new Date().toISOString(),
    paymentReference = null,
    idempotencyKey = null
  } = {}) {
    this._id = id;
    this.user_id = userId;
    this.items = items;
    this.total_amount = Number(totalAmount.toFixed(2));
    this.status = status;
    this.created_at = createdAt;
    this.payment_reference = paymentReference;
    this.idempotency_key = idempotencyKey;
    this.version = 1;
  }

  asJson() {
    return {
      id: this._id,
      user_id: this.user_id,
      items: this.items,
      total_amount: this.total_amount,
      status: this.status,
      created_at: this.created_at,
      payment_reference: this.payment_reference
    };
  }
}

module.exports = { Order };
