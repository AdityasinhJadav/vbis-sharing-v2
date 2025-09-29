const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function signup({ email, password, role }) {
  const res = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, role })
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Signup failed');
  return res.json();
}

export async function login({ email, password }) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Login failed');
  return res.json();
}

export async function createRoom(name) {
  const res = await fetch(`${API_BASE}/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ name })
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Create room failed');
  return res.json();
}

export async function myRooms() {
  const res = await fetch(`${API_BASE}/rooms/mine`, {
    headers: { ...getAuthHeaders() }
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Fetch rooms failed');
  return res.json();
}

export async function roomByKey(key) {
  const res = await fetch(`${API_BASE}/rooms/by-key/${key}`);
  if (!res.ok) throw new Error((await res.json()).error || 'Room not found');
  return res.json();
}

export async function uploadRoomPhotos(roomId, files) {
  const fd = new FormData();
  for (const f of files) fd.append('photos', f);
  const res = await fetch(`${API_BASE}/uploads/room/${roomId}`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
    body: fd
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Upload failed');
  return res.json();
}

export async function uploadCandidate(roomId, file) {
  const fd = new FormData();
  fd.append('photo', file);
  const res = await fetch(`${API_BASE}/uploads/candidate/${roomId}`, {
    method: 'POST',
    body: fd
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Upload failed');
  return res.json();
}

export async function match(roomId, candidateUrl) {
  const res = await fetch(`${API_BASE}/match/${roomId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ candidateUrl })
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Match failed');
  return res.json();
}


