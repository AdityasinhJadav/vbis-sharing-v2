import { apiPost, apiGet, apiPut, apiDelete, apiUpload } from './utils/apiClient';
import { extractError } from './utils/errorHandler';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

// Legacy function for backward compatibility
function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function signup({ email, password, role, username }) {
  try {
    const response = await apiPost('/auth/signup', { email, password, role, username });
    return response.data || response;
  } catch (error) {
    const errorInfo = extractError(error);
    throw new Error(errorInfo.message);
  }
}

export async function login({ email, password }) {
  try {
    const response = await apiPost('/auth/login', { email, password });
    return response.data || response;
  } catch (error) {
    const errorInfo = extractError(error);
    throw new Error(errorInfo.message);
  }
}

export async function verifyToken(token) {
  const res = await fetch(`${API_BASE}/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  });
  if (!res.ok) return null;
  return res.json();
}

export async function createRoom(name, description, eventDate) {
  try {
    const response = await apiPost('/rooms', { name, description, eventDate });
    return response.data || response;
  } catch (error) {
    const errorInfo = extractError(error);
    throw new Error(errorInfo.message);
  }
}

export async function myRooms() {
  try {
    const response = await apiGet('/rooms/mine');
    return response.data || response;
  } catch (error) {
    const errorInfo = extractError(error);
    throw new Error(errorInfo.message);
  }
}

export async function roomByKey(key) {
  const res = await fetch(`${API_BASE}/rooms/by-code/${key}`, {
    headers: { ...getAuthHeaders() }
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Room not found');
  return res.json();
}

export async function deleteRoom(roomId) {
  const res = await fetch(`${API_BASE}/rooms/${roomId}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() }
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete room');
  return res.json();
}

export async function uploadRoomPhotos(roomId, files, signal = null) {
  console.log('🌐 [API] Uploading photos:', {
    roomId,
    fileCount: files.length,
    totalSize: `${(files.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2)}MB`,
    endpoint: `${API_BASE}/uploads/room/${roomId}`
  });
  
  const fd = new FormData();
  for (const f of files) {
    fd.append('photos', f);
    console.log('  📎 Added file:', f.name, `(${(f.size / 1024 / 1024).toFixed(2)}MB)`);
  }
  
  const startTime = Date.now();
  const res = await fetch(`${API_BASE}/uploads/room/${roomId}`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
    body: fd,
    signal
  });
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  if (!res.ok) {
    let errorMessage = 'Upload failed';
    try {
      const errorData = await res.json();
      errorMessage = errorData.error || errorMessage;
      console.error('❌ [API] Upload failed:', {
        status: res.status,
        statusText: res.statusText,
        error: errorMessage,
        duration: `${duration}s`
      });
    } catch (e) {
      // If response is not JSON, use status text
      errorMessage = res.statusText || errorMessage;
      console.error('❌ [API] Upload failed (non-JSON response):', {
        status: res.status,
        statusText: res.statusText,
        duration: `${duration}s`
      });
    }
    throw new Error(errorMessage);
  }
  
  const result = await res.json();
  console.log('✅ [API] Upload successful:', {
    added: result.added,
    items: result.items?.length || 0,
    duration: `${duration}s`,
    speed: `${(files.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024 / parseFloat(duration)).toFixed(2)}MB/s`
  });
  
  return result;
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

export async function deletePhoto(photoId) {
  try {
    const response = await apiDelete(`/uploads/${photoId}`);
    return response.data || response;
  } catch (error) {
    const errorInfo = extractError(error);
    throw new Error(errorInfo.message);
  }
}

export async function match(roomId, file) {
  try {
    const fd = new FormData();
    fd.append('photo', file);
    const res = await fetch(`${API_BASE}/match/${roomId}`, {
      method: 'POST',
      headers: { ...getAuthHeaders() },
      body: fd
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      const errorInfo = extractError({ response: { data: errorData, status: res.status } });
      throw new Error(errorInfo.message);
    }
    
    const response = await res.json();
    
    // Handle new standardized response format: { success: true, data: {...} }
    if (response.success && response.data) {
      return response.data;
    }
    
    // Handle old format for backward compatibility
    return response;
  } catch (error) {
    if (error.message) {
      throw error;
    }
    const errorInfo = extractError(error);
    throw new Error(errorInfo.message);
  }
}


export async function joinRoom(code) {
  const res = await fetch(`${API_BASE}/rooms/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ code })
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Join failed');
  return res.json();
}

export async function getJoinedRooms() {
  const res = await fetch(`${API_BASE}/rooms/joined`, {
    headers: { ...getAuthHeaders() }
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Fetch joined rooms failed');
  return res.json();
}

export async function roomDetails(roomId) {
  const res = await fetch(`${API_BASE}/rooms/${roomId}`, {
    headers: { ...getAuthHeaders() }
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Room not found');
  return res.json();
}

export async function roomPhotos(roomId, page = 1, limit = 20) {
  try {
    const response = await apiGet(`/uploads/room/${roomId}`, {
      params: { page, limit }
    });
    
    // Handle paginated response: { success: true, data: [...], pagination: {...} }
    if (response.success && response.data) {
      return {
        data: response.data,
        pagination: response.pagination
      };
    }
    
    // Handle non-paginated response (backward compatibility)
    return response.data || response;
  } catch (error) {
    const errorInfo = extractError(error);
    throw new Error(errorInfo.message);
  }
}

export async function updateUsername(username) {
  const res = await fetch(`${API_BASE}/auth/username`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ username })
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to update username');
  return res.json();
}

export async function retryPhotoIngestion(roomId) {
  const res = await fetch(`${API_BASE}/uploads/room/${roomId}/retry-ingestion`, {
    method: 'POST',
    headers: { ...getAuthHeaders() }
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to retry ingestion');
  return res.json();
}

export async function getIngestionStatus(roomId) {
  const res = await fetch(`${API_BASE}/uploads/room/${roomId}/ingestion-status`, {
    headers: { ...getAuthHeaders() }
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to get ingestion status');
  return res.json();
}