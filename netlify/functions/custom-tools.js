import { getDb, ObjectId } from './_db.js';
import { verifyReqAuth } from './_auth.js';

export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) {
    return { statusCode: 401, body: 'Unauthorized' };
  }

  // Only admins can access custom tools
  if (user.role !== 'admin') {
    return { statusCode: 403, body: 'Forbidden: Admin access required' };
  }

  const db = await getDb();
  const collection = db.collection('customTools');

  // GET: Retrieve all custom tools for the current user
  if (event.httpMethod === 'GET') {
    try {
      const tools = await collection.find({ username: user.sub }).toArray();
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tools),
      };
    } catch (err) {
      return { statusCode: 500, body: 'Failed to fetch custom tools: ' + err.message };
    }
  }

  // POST: Create a new custom tool
  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');
      const { name, url, description, enabled } = body;

      if (!name || !url) {
        return { statusCode: 400, body: 'Name and URL are required' };
      }

      const tool = {
        username: user.sub,
        name,
        url,
        description: description || '',
        enabled: enabled !== false, // default to true
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = await collection.insertOne(tool);
      tool._id = result.insertedId;

      return {
        statusCode: 201,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tool),
      };
    } catch (err) {
      return { statusCode: 500, body: 'Failed to create custom tool: ' + err.message };
    }
  }

  // PUT: Update an existing custom tool
  if (event.httpMethod === 'PUT') {
    try {
      const body = JSON.parse(event.body || '{}');
      const { id, name, url, description, enabled } = body;

      if (!id) {
        return { statusCode: 400, body: 'Tool ID is required' };
      }

      const updates = { updatedAt: new Date().toISOString() };
      if (name !== undefined) updates.name = name;
      if (url !== undefined) updates.url = url;
      if (description !== undefined) updates.description = description;
      if (enabled !== undefined) updates.enabled = enabled;

      const result = await collection.updateOne(
        { _id: new ObjectId(id), username: user.sub },
        { $set: updates }
      );

      if (result.matchedCount === 0) {
        return { statusCode: 404, body: 'Custom tool not found' };
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true }),
      };
    } catch (err) {
      return { statusCode: 500, body: 'Failed to update custom tool: ' + err.message };
    }
  }

  // DELETE: Remove a custom tool
  if (event.httpMethod === 'DELETE') {
    try {
      const body = JSON.parse(event.body || '{}');
      const { id } = body;

      if (!id) {
        return { statusCode: 400, body: 'Tool ID is required' };
      }

      const result = await collection.deleteOne({
        _id: new ObjectId(id),
        username: user.sub,
      });

      if (result.deletedCount === 0) {
        return { statusCode: 404, body: 'Custom tool not found' };
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true }),
      };
    } catch (err) {
      return { statusCode: 500, body: 'Failed to delete custom tool: ' + err.message };
    }
  }

  return { statusCode: 405, body: 'Method not allowed' };
}
