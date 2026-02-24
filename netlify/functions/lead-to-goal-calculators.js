import { getDb, ObjectId } from './_db.js';
import { verifyReqAuth } from './_auth.js';

export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) {
    return { statusCode: 401, body: 'Unauthorized' };
  }

  // Only admins can access this tool
  if (user.role !== 'admin') {
    return { statusCode: 403, body: 'Forbidden: Admin access required' };
  }

  const db = await getDb();
  const collection = db.collection('leadToGoalCalculators');

  // GET: Retrieve all calculators for the current user
  if (event.httpMethod === 'GET') {
    try {
      const calculators = await collection
        .find({ username: user.sub })
        .sort({ createdAt: -1 })
        .toArray();
      
      // Map _id to id for frontend compatibility
      const mapped = calculators.map(calc => ({
        ...calc,
        id: calc._id.toString()
      }));
      
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mapped),
      };
    } catch (err) {
      return { statusCode: 500, body: 'Failed to fetch calculators: ' + err.message };
    }
  }

  // POST: Create a new calculator
  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');
      const { propertyId, propertyName, date, plGoal, bedsLeft, leaseConversion, leadToLeaseRatio, totalLeadsNeeded } = body;

      if (!propertyId || !date) {
        return { statusCode: 400, body: 'Property and date are required' };
      }

      const calculator = {
        username: user.sub,
        propertyId,
        propertyName,
        date,
        plGoal: plGoal || '',
        bedsLeft: bedsLeft || '',
        leaseConversion: leaseConversion || '',
        leadToLeaseRatio: leadToLeaseRatio || '',
        totalLeadsNeeded: totalLeadsNeeded || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = await collection.insertOne(calculator);
      calculator._id = result.insertedId;
      calculator.id = result.insertedId.toString();

      return {
        statusCode: 201,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(calculator),
      };
    } catch (err) {
      return { statusCode: 500, body: 'Failed to create calculator: ' + err.message };
    }
  }

  // PUT: Update an existing calculator
  if (event.httpMethod === 'PUT') {
    try {
      const body = JSON.parse(event.body || '{}');
      const { id, propertyId, propertyName, date, plGoal, bedsLeft, leaseConversion, leadToLeaseRatio, totalLeadsNeeded } = body;

      if (!id) {
        return { statusCode: 400, body: 'Calculator ID is required' };
      }

      const updates = { 
        updatedAt: new Date().toISOString(),
        propertyId,
        propertyName,
        date,
        plGoal: plGoal || '',
        bedsLeft: bedsLeft || '',
        leaseConversion: leaseConversion || '',
        leadToLeaseRatio: leadToLeaseRatio || '',
        totalLeadsNeeded: totalLeadsNeeded || '',
      };

      const result = await collection.updateOne(
        { _id: new ObjectId(id), username: user.sub },
        { $set: updates }
      );

      if (result.matchedCount === 0) {
        return { statusCode: 404, body: 'Calculator not found' };
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true }),
      };
    } catch (err) {
      return { statusCode: 500, body: 'Failed to update calculator: ' + err.message };
    }
  }

  // DELETE: Remove a calculator
  if (event.httpMethod === 'DELETE') {
    try {
      const body = JSON.parse(event.body || '{}');
      const { id } = body;

      if (!id) {
        return { statusCode: 400, body: 'Calculator ID is required' };
      }

      const result = await collection.deleteOne({
        _id: new ObjectId(id),
        username: user.sub,
      });

      if (result.deletedCount === 0) {
        return { statusCode: 404, body: 'Calculator not found' };
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true }),
      };
    } catch (err) {
      return { statusCode: 500, body: 'Failed to delete calculator: ' + err.message };
    }
  }

  return { statusCode: 405, body: 'Method not allowed' };
}
