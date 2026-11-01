import { apiRequest } from './apiClient';
import { API_BASE_URL } from '../utils/config';

// Every screen gets its data through these functions. The server decides what the signed-in
// person may see: the browser never says "give me pupil X's data" without the server
// checking that X really belongs to this account.

const DATE_FIELDS = new Set(['due', 'dueDate', 'postedAt', 'at']);

// JSON has no dates, so turn the known date fields back into Date objects.
function reviveDates(value) {
  if (Array.isArray(value)) return value.map(reviveDates);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        DATE_FIELDS.has(key) && typeof item === 'string' ? new Date(item) : reviveDates(item),
      ]),
    );
  }
  return value;
}

const get = async (path) => reviveDates(await apiRequest(path));

export const getMyPupils = async () => (await get('/me/pupils')).pupils;
export const getPupilOverview = async (pupilId) =>
  (await get(`/pupils/${encodeURIComponent(pupilId)}/overview`)).pupil;
export const getAnnouncements = async () => (await get('/announcements')).announcements;
export const getAdminSummary = () => get('/admin/summary');
export const getTeacherOverview = () => get('/teacher/overview');
export const getCurrentTerm = async () => (await get('/term')).term;

// The photograph is served by the API only to people allowed to see that pupil.
export const pupilPhotoUrl = (pupilId, version) =>
  `${API_BASE_URL}/pupils/${encodeURIComponent(pupilId)}/photo${version ? `?v=${version}` : ''}`;

// ---- administrator: pupils, classes and logins
export const getAdminPupils = async () => (await get('/admin/pupils')).pupils;
export const getAdminClasses = async () => (await get('/admin/classes')).classes;
export const createClass = (name) => apiRequest('/admin/classes', { method: 'POST', body: { name } });
export const addStandardClasses = () => apiRequest('/admin/classes/standard', { method: 'POST' });
// Returns { pupil, credentials: { username, password } }.
export const createPupil = (details) => apiRequest('/admin/pupils', { method: 'POST', body: details });
export const updatePupil = async (id, changes) =>
  (await apiRequest(`/admin/pupils/${encodeURIComponent(id)}`, { method: 'PATCH', body: changes })).pupil;
export const resetPupilPassword = async (id) =>
  (await apiRequest(`/admin/pupils/${encodeURIComponent(id)}/reset-password`, { method: 'POST' })).credentials;
export const uploadPupilPhoto = (id, file) =>
  apiRequest(`/admin/pupils/${encodeURIComponent(id)}/photo`, { method: 'POST', file });
export const getAdminCredentials = async () => (await get('/admin/credentials')).credentials;

// ---- administrator: send notices (to everyone, a group, one class or one pupil)
// `target` is { audience } or { classId } or { pupilId }.
export const sendAnnouncement = (title, body, target) =>
  apiRequest('/admin/announcements', { method: 'POST', body: { title, body, ...target } });
export const deleteAnnouncement = (id) => apiRequest(`/admin/announcements/${encodeURIComponent(id)}`, { method: 'DELETE' });

// ---- administrators and teachers: enter results, take the register, notices to a class
export const getRecordClasses = () => get('/records/classes'); // { term, classes: [{ id, name, subjects, canRegister, canManage }] }
export const setCurrentTerm = (session, term) => apiRequest('/records/term', { method: 'PUT', body: { session, term } });
export const addClassSubjects = async (classId, body) =>
  (await apiRequest(`/records/classes/${encodeURIComponent(classId)}/subjects`, { method: 'POST', body })).subjects;
export const getResultSheet = (classId, subject) =>
  get(`/records/results?classId=${encodeURIComponent(classId)}&subject=${encodeURIComponent(subject)}`);
export const saveResultSheet = (classId, subject, scores) =>
  apiRequest('/records/results', { method: 'PUT', body: { classId, subject, scores } });
export const getRegister = (classId, date) =>
  get(`/records/attendance?classId=${encodeURIComponent(classId)}&date=${encodeURIComponent(date)}`);
export const saveRegister = (classId, date, marks) =>
  apiRequest('/records/attendance', { method: 'PUT', body: { classId, date, marks } });
export const sendClassNotice = (classId, title, body) =>
  apiRequest('/records/notices', { method: 'POST', body: { classId, title, body } });
