/**
 * Creative Studio — Property Registry
 *
 * Maps a property's display name (as stored on the user record, e.g. "The Harbour at Occ")
 * and slug to its configuration folder under /properties/<id>/.
 *
 * To onboard a new property:
 *   1. Create /properties/<id>/property.config.js (copy harbour-occ as a starting point)
 *   2. Add templates.js + communications.js under that folder
 *   3. Add an entry below. Nothing else in the app should need Harbour-specific logic.
 */
(function (global) {
  const PROPERTIES = [
    {
      id: 'harbour-occ',
      name: 'The Harbour at OCC',
      aliases: ['the harbour at occ', 'the harbour', 'harbour at occ', 'the-harbour-at-occ', 'harbour-occ'],
      basePath: '/properties/harbour-occ/',
      files: ['property.config.js', 'templates/templates.js', 'examples/communications.js'],
    },
  ];

  const norm = s => String(s || '').trim().toLowerCase();

  function resolvePropertyId(nameOrId) {
    const n = norm(nameOrId);
    const hit = PROPERTIES.find(p => p.id === n || norm(p.name) === n || p.aliases.includes(n));
    return hit ? hit.id : null;
  }

  /**
   * Decide which properties a user may open in Creative Studio.
   * Standard Reslife users: only their assigned (and registered) properties.
   * Admins (role 'admin' or properties '*'): every registered property (portfolio access).
   */
  function propertiesForUser(user) {
    if (!user) return [];
    const isPortfolio = user.role === 'admin' || user.properties === '*' || (Array.isArray(user.properties) && user.properties.includes('*'));
    if (isPortfolio) return PROPERTIES.map(p => p.id);
    const list = Array.isArray(user.properties) ? user.properties : [];
    if (user.propertyId) list.unshift(user.propertyId);
    return [...new Set(list.map(resolvePropertyId).filter(Boolean))];
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.onload = resolve; s.onerror = () => reject(new Error('Failed to load ' + src));
      document.head.appendChild(s);
    });
  }

  /** Loads a property's config, templates and communication library into window.CS_PROPERTY_DATA[id]. */
  async function loadProperty(id) {
    const p = PROPERTIES.find(x => x.id === id);
    if (!p) throw new Error('Unknown property ' + id);
    global.CS_PROPERTY_DATA = global.CS_PROPERTY_DATA || {};
    global.CS_PROPERTY_DATA[id] = global.CS_PROPERTY_DATA[id] || {};
    for (const f of p.files) await loadScript(p.basePath + f);
    return global.CS_PROPERTY_DATA[id];
  }

  global.CSRegistry = { PROPERTIES, resolvePropertyId, propertiesForUser, loadProperty };
})(window);
