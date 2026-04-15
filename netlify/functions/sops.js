import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';

/* ──────────────────────────────────────────────
   SOP Library API
   Collection: sops
   Document shape:
   {
     _id,
     sopType: 'company' | 'site',
     property: null | 'Property Name',   // null for company-wide
     title: String,
     category: String,
     department: String,
     content: String (HTML),
     purpose: String,
     steps: String,
     resources: String,
     owner: String,
     lastReviewed: String (ISO date),
     createdAt: Date,
     updatedAt: Date,
     createdBy: String (username)
   }
────────────────────────────────────────────── */

// ─── Seed: preload default SOPs if collection is empty ───
let seeded = false;
async function ensureSeedSops(col) {
  if (seeded) return;
  seeded = true;
  const count = await col.countDocuments();
  if (count > 0) return; // already has data

  const now = new Date();
  const seeds = [
    {
      sopType: 'site',
      property: 'Ivory University House',
      title: 'Sending a Renewal Interview Invitation Email',
      category: 'Resident Services',
      department: 'Leasing Team',
      owner: 'Leasing Manager',
      lastReviewed: '',
      purpose: 'This Standard Operating Procedure outlines the process for sending a Renewal Interview Invitation email to residents who have renewed their lease at Ivory University House. It is intended as an internal training guide for leasing staff using the Entrata platform.',
      steps: '',
      resources: '',
      content: `<h1>Ivory University House – Sending a Renewal Interview Invitation Email</h1>
<p><span class="badge category">Resident Services</span> <span class="badge department">Leasing Team</span></p>
<p><strong>Property:</strong> Ivory University House &nbsp;|&nbsp; <strong>System:</strong> Entrata</p>

<h2>Section 1 – Purpose</h2>
<p>This Standard Operating Procedure outlines the process for sending a <strong>Renewal Interview Invitation</strong> email to residents who have renewed their lease at Ivory University House. It is intended as an internal training guide for leasing staff using the Entrata platform.</p>

<h2>Section 2 – When to Use This Process</h2>
<p>This process should be used <strong>after a resident renews their lease</strong> and needs to receive the Renewal Interview Invitation email. The email invites the resident to participate in a short renewal check-in conversation to ensure a smooth transition into their renewed lease term.</p>

<h2>Section 3 – Step-by-Step Instructions</h2>

<h3><span class="step-number">1</span> Log into Entrata</h3>
<p>Open your browser and navigate to the Entrata login page. Enter your credentials and log in to the system.</p>

<h3><span class="step-number">2</span> Search for the Resident by Name</h3>
<p>Use the <strong>Search bar</strong> at the top of the Entrata dashboard. Type the resident's name and select the correct profile from the search results.</p>

<h3><span class="step-number">3</span> Open the Resident Profile</h3>
<p>Click on the resident's name to open their full profile page. Verify you have the correct resident and unit.</p>

<h3><span class="step-number">4</span> Click the Email Button</h3>
<p>Locate the <strong>Email</strong> button near the resident's name at the top of their profile. Click it to open the email composition window.</p>

<h3><span class="step-number">5</span> Scroll to the Message Editor</h3>
<p>Scroll down within the email window until you reach the message editor area where you can compose or insert email content.</p>

<h3><span class="step-number">6</span> Locate the Responses Button</h3>
<p>In the message toolbar (next to the camera icon), find the <strong>Responses</strong> button. This button provides access to saved email templates.</p>

<h3><span class="step-number">7</span> Click Responses</h3>
<p>Click the <strong>Responses</strong> button to open the list of saved email templates available for your property.</p>

<h3><span class="step-number">8</span> Select "Renewal Interview Invitation"</h3>
<p>From the list of saved templates, locate and select <strong>"Renewal Interview Invitation"</strong>. The template content will automatically populate in the message editor.</p>

<h3><span class="step-number">9</span> Review the Email Content</h3>
<p>Carefully review the populated email to confirm:</p>
<ul>
  <li>The resident's name is correct</li>
  <li>All merge fields populated properly</li>
  <li>The email content reads correctly and is free of errors</li>
  <li>The tone and messaging are appropriate</li>
</ul>

<h3><span class="step-number">10</span> Click Send</h3>
<p>Once you have verified the email content, click the <strong>Send</strong> button to deliver the Renewal Interview Invitation email to the resident.</p>

<h2>Section 4 – Expected Result</h2>
<div class="info-box success">
  <h4>Expected Outcome</h4>
  <p>The resident receives the <strong>Renewal Interview Invitation</strong> email in their inbox, inviting them to participate in a short renewal check-in conversation. This conversation helps ensure resident satisfaction and a smooth transition into their renewed lease term.</p>
</div>

<h2>Section 5 – Best Practices</h2>
<div class="info-box">
  <h4>Recommendations</h4>
  <ul>
    <li><strong>Always verify the resident has renewed their lease</strong> before sending the email. Sending the invitation prematurely may cause confusion.</li>
    <li><strong>Use the Responses template</strong> instead of typing the email manually. This ensures consistency, accuracy, and saves time.</li>
    <li><strong>Review the email before sending.</strong> Double-check all fields, the resident's name, and the overall content to avoid errors.</li>
    <li>If the "Renewal Interview Invitation" template is missing from the Responses list, contact your Property Manager or system administrator.</li>
    <li>Log the communication in the resident's file for record-keeping purposes.</li>
  </ul>
</div>

<hr>
<p><em>Document: Ivory University House – SOP: Sending a Renewal Interview Invitation Email</em></p>
<p><em>System: Entrata &nbsp;|&nbsp; Department: Leasing Team</em></p>`,
      createdAt: now,
      updatedAt: now,
      createdBy: 'system-seed'
    }
  ];

  try {
    await col.insertMany(seeds);
  } catch (e) {
    console.error('SOP seed error:', e.message);
  }
}

export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };

  const db = await getDb();
  const col = db.collection('sops');
  const method = event.httpMethod;

  // Auto-seed on first access
  await ensureSeedSops(col);

  try {
    // ─── GET: list / read SOPs ───
    if (method === 'GET') {
      const qs = event.queryStringParameters || {};

      // Single SOP by id
      if (qs.id) {
        const doc = await col.findOne({ _id: new ObjectId(qs.id) });
        if (!doc) return { statusCode: 404, body: 'Not found' };
        // Access check: company SOPs visible to all; site SOPs only to admin or assigned users
        if (doc.sopType === 'site' && user.role !== 'admin') {
          const userProps = user.properties === '*' ? null : (user.properties || []);
          if (userProps && !userProps.includes(doc.property)) {
            return { statusCode: 403, body: 'Forbidden' };
          }
        }
        doc.id = doc._id.toString();
        delete doc._id;
        return { statusCode: 200, body: JSON.stringify(doc) };
      }

      // List SOPs
      const filter = {};

      // sopType filter: 'company' or 'site'
      if (qs.sopType) {
        filter.sopType = qs.sopType;
      }

      // property filter (for site SOPs)
      if (qs.property) {
        filter.property = qs.property;
      }

      // For non-admin users requesting site SOPs, restrict to their assigned properties
      if (user.role !== 'admin' && (!qs.sopType || qs.sopType === 'site')) {
        const userProps = user.properties === '*' ? null : (user.properties || []);
        if (userProps) {
          if (qs.sopType === 'site') {
            // Only show site SOPs for their properties
            if (qs.property) {
              if (!userProps.includes(qs.property)) {
                return { statusCode: 200, body: JSON.stringify([]) };
              }
            } else {
              filter.property = { $in: userProps };
            }
          } else if (!qs.sopType) {
            // No sopType filter: show company + their site SOPs
            filter.$or = [
              { sopType: 'company' },
              { sopType: 'site', property: { $in: userProps } }
            ];
            // Remove sopType/property from filter since $or handles it
            delete filter.sopType;
            delete filter.property;
          }
        }
      }

      const docs = await col.find(filter).sort({ sopType: 1, category: 1, title: 1 }).toArray();
      const result = docs.map(d => {
        d.id = d._id.toString();
        delete d._id;
        return d;
      });
      return { statusCode: 200, body: JSON.stringify(result) };
    }

    // ─── POST: create new SOP (admin only) ───
    if (method === 'POST') {
      if (user.role !== 'admin') return { statusCode: 403, body: 'Admin only' };

      const body = JSON.parse(event.body || '{}');
      const { sopType, property, title, category, department, system, content, purpose, whenToUse, stepsData, expectedResults, bestPractices, trainingUrl, relatedDocs, steps, resources, owner, lastReviewed } = body;

      if (!title) return { statusCode: 400, body: 'Title is required' };
      if (!sopType || !['company', 'site'].includes(sopType)) {
        return { statusCode: 400, body: 'sopType must be "company" or "site"' };
      }
      if (sopType === 'site' && !property) {
        return { statusCode: 400, body: 'property is required for site SOPs' };
      }

      const doc = {
        sopType,
        property: sopType === 'company' ? null : property,
        title: title.trim(),
        category: (category || 'General').trim(),
        department: (department || '').trim(),
        system: (system || '').trim(),
        content: content || '',
        purpose: (purpose || '').trim(),
        whenToUse: (whenToUse || '').trim(),
        stepsData: stepsData || [],
        relatedDocs: relatedDocs || [],
        expectedResults: (expectedResults || '').trim(),
        bestPractices: (bestPractices || '').trim(),
        trainingUrl: (trainingUrl || '').trim(),
        steps: (steps || '').trim(),
        resources: (resources || '').trim(),
        owner: (owner || '').trim(),
        lastReviewed: lastReviewed || '',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: user.sub
      };

      const res = await col.insertOne(doc);
      doc.id = res.insertedId.toString();
      delete doc._id;
      return { statusCode: 200, body: JSON.stringify(doc) };
    }

    // ─── PUT: update SOP (admin only) ───
    if (method === 'PUT') {
      if (user.role !== 'admin') return { statusCode: 403, body: 'Admin only' };

      const body = JSON.parse(event.body || '{}');
      const { id, sopType, property, title, category, department, system, content, purpose, whenToUse, stepsData, expectedResults, bestPractices, trainingUrl, relatedDocs, steps, resources, owner, lastReviewed } = body;

      if (!id) return { statusCode: 400, body: 'id is required' };
      if (!title) return { statusCode: 400, body: 'Title is required' };

      const updates = {
        title: title.trim(),
        category: (category || 'General').trim(),
        department: (department || '').trim(),
        system: (system || '').trim(),
        content: content || '',
        purpose: (purpose || '').trim(),
        whenToUse: (whenToUse || '').trim(),
        stepsData: stepsData || [],
        relatedDocs: relatedDocs || [],
        expectedResults: (expectedResults || '').trim(),
        bestPractices: (bestPractices || '').trim(),
        trainingUrl: (trainingUrl || '').trim(),
        steps: (steps || '').trim(),
        resources: (resources || '').trim(),
        owner: (owner || '').trim(),
        lastReviewed: lastReviewed || '',
        updatedAt: new Date()
      };

      // Allow changing sopType and property
      if (sopType && ['company', 'site'].includes(sopType)) {
        updates.sopType = sopType;
        updates.property = sopType === 'company' ? null : (property || null);
      }

      await col.updateOne({ _id: new ObjectId(id) }, { $set: updates });

      const updated = await col.findOne({ _id: new ObjectId(id) });
      if (updated) {
        updated.id = updated._id.toString();
        delete updated._id;
      }
      return { statusCode: 200, body: JSON.stringify(updated) };
    }

    // ─── DELETE: remove SOP (admin only) ───
    if (method === 'DELETE') {
      if (user.role !== 'admin') return { statusCode: 403, body: 'Admin only' };

      const body = JSON.parse(event.body || '{}');
      const { id } = body;
      if (!id) return { statusCode: 400, body: 'id is required' };

      await col.deleteOne({ _id: new ObjectId(id) });
      return { statusCode: 200, body: JSON.stringify({ deleted: true }) };
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
}
