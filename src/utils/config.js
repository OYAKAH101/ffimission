// Central place for settings that may change between environments.

// Where the API lives. "/api" works with the Vite dev proxy (vite.config.js) and when the
// server serves the built site itself, so the session cookie stays first-party.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Change school details here once; every page reads from this object.
export const SCHOOL = {
  name: 'Mission of the Immaculate Nursery and Primary School',
  crestName: 'Mission of the Immaculate Nursery and Primary School',
  town: 'Sagamu',
  portalName: 'Mission of the Immaculate Nursery and Primary School Portal',
  motto: "Start by doing what's necessary",
  // Shows the pupils' photograph on the login page. Switch off if the school
  // prefers not to show children's images on a page anyone can open.
  showLoginPhoto: true,
};
