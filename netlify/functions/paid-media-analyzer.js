import { getDb, ObjectId } from './_db.js';
import { verifyReqAuth } from './_auth.js';

export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) {
    return { statusCode: 401, body: 'Unauthorized' };
  }

  const db = await getDb();
  const collection = db.collection('paidMediaAnalyses');

  // GET: Retrieve all analyses for the current user
  if (event.httpMethod === 'GET') {
    try {
      const analyses = await collection
        .find({ username: user.sub })
        .sort({ updatedAt: -1 })
        .toArray();
      
      // Map _id to id for frontend compatibility
      const mapped = analyses.map(analysis => ({
        ...analysis,
        id: analysis._id.toString()
      }));
      
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mapped),
      };
    } catch (err) {
      return { statusCode: 500, body: 'Failed to fetch analyses: ' + err.message };
    }
  }

  // POST: Create a new analysis
  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');
      const {
        propertyId,
        propertyName,
        reportingStartDate,
        reportingEndDate,
        campaigns,
        calculatedSummary,
        recommendation,
        predictions,
        narrativeGenerated,
        narrativeCustom
      } = body;

      if (!propertyId || !reportingStartDate || !reportingEndDate) {
        return { statusCode: 400, body: 'Property and date range are required' };
      }

      if (!Array.isArray(campaigns) || campaigns.length === 0) {
        return { statusCode: 400, body: 'At least one campaign is required' };
      }

      const analysis = {
        username: user.sub,
        propertyId,
        propertyName,
        reportingStartDate,
        reportingEndDate,
        campaigns,
        calculatedSummary: calculatedSummary || {},
        recommendation: recommendation || {},
        predictions: predictions || {},
        narrativeGenerated: narrativeGenerated || '',
        narrativeCustom: narrativeCustom || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = await collection.insertOne(analysis);
      analysis._id = result.insertedId;
      analysis.id = result.insertedId.toString();

      return {
        statusCode: 201,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analysis),
      };
    } catch (err) {
      return { statusCode: 500, body: 'Failed to create analysis: ' + err.message };
    }
  }

  // PUT: Update an existing analysis
  if (event.httpMethod === 'PUT') {
    try {
      const body = JSON.parse(event.body || '{}');
      const {
        id,
        propertyId,
        propertyName,
        reportingStartDate,
        reportingEndDate,
        campaigns,
        calculatedSummary,
        recommendation,
        predictions,
        narrativeGenerated,
        narrativeCustom
      } = body;

      if (!id) {
        return { statusCode: 400, body: 'Analysis ID is required' };
      }

      const updates = {
        updatedAt: new Date().toISOString()
      };

      if (propertyId !== undefined) updates.propertyId = propertyId;
      if (propertyName !== undefined) updates.propertyName = propertyName;
      if (reportingStartDate !== undefined) updates.reportingStartDate = reportingStartDate;
      if (reportingEndDate !== undefined) updates.reportingEndDate = reportingEndDate;
      if (campaigns !== undefined) updates.campaigns = campaigns;
      if (calculatedSummary !== undefined) updates.calculatedSummary = calculatedSummary;
      if (recommendation !== undefined) updates.recommendation = recommendation;
      if (predictions !== undefined) updates.predictions = predictions;
      if (narrativeGenerated !== undefined) updates.narrativeGenerated = narrativeGenerated;
      if (narrativeCustom !== undefined) updates.narrativeCustom = narrativeCustom;

      const result = await collection.updateOne(
        { _id: new ObjectId(id), username: user.sub },
        { $set: updates }
      );

      if (result.matchedCount === 0) {
        return { statusCode: 404, body: 'Analysis not found' };
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true }),
      };
    } catch (err) {
      return { statusCode: 500, body: 'Failed to update analysis: ' + err.message };
    }
  }

  // DELETE: Remove an analysis
  if (event.httpMethod === 'DELETE') {
    try {
      const body = JSON.parse(event.body || '{}');
      const { id } = body;

      if (!id) {
        return { statusCode: 400, body: 'Analysis ID is required' };
      }

      const result = await collection.deleteOne({
        _id: new ObjectId(id),
        username: user.sub,
      });

      if (result.deletedCount === 0) {
        return { statusCode: 404, body: 'Analysis not found' };
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true }),
      };
    } catch (err) {
      return { statusCode: 500, body: 'Failed to delete analysis: ' + err.message };
    }
  }

  return { statusCode: 405, body: 'Method not allowed' };
}
