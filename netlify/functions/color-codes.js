import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';

export async function handler(event){
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };
  const db = await getDb();
  
  try {
    // GET - List all saved colors
    if (event.httpMethod === 'GET') {
      const docs = await db.collection('colorCodes').find({}).sort({ name: 1 }).toArray();
      return { 
        statusCode: 200, 
        body: JSON.stringify(docs.map(d => ({ 
          id: d._id.toString(), 
          name: d.name, 
          hex: d.hex,
          createdBy: d.createdBy,
          createdAt: d.createdAt
        }))) 
      };
    }
    
    // POST - Add new color
    if (event.httpMethod === 'POST') {
      const { name, hex } = JSON.parse(event.body || '{}');
      if (!name || !hex) return { statusCode: 400, body: 'Missing name or hex' };
      
      // Validate hex format
      if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) {
        return { statusCode: 400, body: 'Invalid hex color format' };
      }
      
      const doc = {
        name: name.trim(),
        hex: hex.toUpperCase(),
        createdBy: user.username,
        createdAt: new Date().toISOString()
      };
      
      const res = await db.collection('colorCodes').insertOne(doc);
      return { 
        statusCode: 200, 
        body: JSON.stringify({ 
          id: res.insertedId.toString(), 
          name: doc.name, 
          hex: doc.hex,
          createdBy: doc.createdBy,
          createdAt: doc.createdAt
        }) 
      };
    }
    
    // DELETE - Remove a color (any user can delete)
    if (event.httpMethod === 'DELETE') {
      const { id } = JSON.parse(event.body || '{}');
      if (!id) return { statusCode: 400, body: 'Missing id' };
      
      await db.collection('colorCodes').deleteOne({ _id: new ObjectId(id) });
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }
    
    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch(e) { 
    return { statusCode: 500, body: e.message }; 
  }
}
