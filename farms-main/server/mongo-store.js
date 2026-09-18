import { MongoClient } from 'mongodb';

export async function createMongoStore(uri = process.env.MONGODB_URI) {
  if (!uri) return null;
  try {
    const client = new MongoClient(uri);
    await client.connect();
    const database = client.db(process.env.MONGODB_DATABASE || 'farmdirect');
    const orders = database.collection('orders');
    const assignments = database.collection('delivery_assignments');
    return {
      async saveOrder(order) {
        await orders.updateOne({ id: order.id }, { $set: { ...order, updatedAt: new Date() } }, { upsert: true });
      },
      async saveAssignment(assignment) {
        await assignments.updateOne({ id: assignment.id }, { $set: { ...assignment, updatedAt: new Date() } }, { upsert: true });
      },
      async close() {
        await client.close();
      }
    };
  } catch (error) {
    console.warn(`MongoDB unavailable; using in-memory delivery state: ${error.message}`);
    return null;
  }
}
