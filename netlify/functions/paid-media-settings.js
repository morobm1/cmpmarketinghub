import { getDb } from './_db.js';
import { verifyReqAuth } from './_auth.js';

const DEFAULT_SETTINGS = {
  assumptions: {
    targetCPC: 2.00,
    targetCostPerLinkClick: 1.50,
    targetCTR: 2.0,
    targetCostPerLead: 50.00,
    targetCostPerLease: 500.00,
    defaultLeadConversionRate: 0.05,
    defaultTourConversionRate: 0.30,
    defaultApplicationConversionRate: 0.15,
    defaultLeaseConversionRate: 0.10,
    recommendedIncreasePercentage: 25,
    maxSuggestedIncreasePercentage: 50,
    minSpendThreshold: 100,
    minClickThreshold: 100
  },
  scoringWeights: {
    cpcWeight: 25,
    ctrWeight: 20,
    costPerLeadWeight: 30,
    costPerLeaseWeight: 25
  }
};

export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) {
    return { statusCode: 401, body: 'Unauthorized' };
  }

  const db = await getDb();
  const collection = db.collection('paidMediaSettings');

  // GET: Retrieve user's settings (or create defaults if not exist)
  if (event.httpMethod === 'GET') {
    try {
      let settings = await collection.findOne({ username: user.sub });
      
      if (!settings) {
        // Create default settings for user
        settings = {
          username: user.sub,
          ...DEFAULT_SETTINGS,
          updatedAt: new Date().toISOString()
        };
        await collection.insertOne(settings);
      }
      
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      };
    } catch (err) {
      return { statusCode: 500, body: 'Failed to fetch settings: ' + err.message };
    }
  }

  // PUT: Update user's settings
  if (event.httpMethod === 'PUT') {
    try {
      const body = JSON.parse(event.body || '{}');
      const { assumptions, scoringWeights } = body;

      if (!assumptions || !scoringWeights) {
        return { statusCode: 400, body: 'Both assumptions and scoringWeights are required' };
      }

      // Validate scoring weights sum to 100
      const weightSum = Object.values(scoringWeights).reduce((sum, w) => sum + (parseFloat(w) || 0), 0);
      if (Math.abs(weightSum - 100) > 0.01) {
        return { statusCode: 400, body: `Scoring weights must sum to 100 (current sum: ${weightSum})` };
      }

      const updates = {
        assumptions,
        scoringWeights,
        updatedAt: new Date().toISOString()
      };

      const result = await collection.updateOne(
        { username: user.sub },
        { $set: updates },
        { upsert: true }
      );

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true }),
      };
    } catch (err) {
      return { statusCode: 500, body: 'Failed to update settings: ' + err.message };
    }
  }

  return { statusCode: 405, body: 'Method not allowed' };
}
