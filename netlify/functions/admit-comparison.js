import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';

export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) {
    return { statusCode: 401, body: 'Unauthorized' };
  }

  const db = await getDb();
  const collection = db.collection('admit_comparisons');

  try {
    // GET - Retrieve user's comparison history
    if (event.httpMethod === 'GET') {
      const history = await collection
        .find({ username: user.username })
        .sort({ timestamp: -1 })
        .limit(50)
        .toArray();
      
      return {
        statusCode: 200,
        body: JSON.stringify(history),
      };
    }

    // POST - Save a new comparison
    if (event.httpMethod === 'POST') {
      const data = JSON.parse(event.body);
      
      const comparison = {
        username: user.username,
        weekProcessed: data.weekProcessed,
        prevFileDate: data.prevFileDate,
        currFileDate: data.currFileDate,
        prevFileName: data.prevFileName,
        currFileName: data.currFileName,
        prevTotal: data.prevTotal,
        currTotal: data.currTotal,
        newThisWeek: data.newThisWeek,
        newAdmits: data.newAdmits,
        timestamp: new Date().toISOString(),
        createdAt: new Date(),
      };

      const result = await collection.insertOne(comparison);
      
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          _id: result.insertedId,
          ...comparison 
        }),
      };
    }

    // DELETE - Delete a specific comparison
    if (event.httpMethod === 'DELETE') {
      const { id } = JSON.parse(event.body);
      
      const result = await collection.deleteOne({
        _id: new ObjectId(id),
        username: user.username, // Ensure user can only delete their own
      });

      if (result.deletedCount === 0) {
        return {
          statusCode: 404,
          body: 'Comparison not found or unauthorized',
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true }),
      };
    }

    return {
      statusCode: 405,
      body: 'Method not allowed',
    };
  } catch (err) {
    console.error('Admit comparison error:', err);
    return {
      statusCode: 500,
      body: err.message,
    };
  }
}
