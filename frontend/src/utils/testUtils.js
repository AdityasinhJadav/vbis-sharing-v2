/**
 * Testing utilities and helpers
 */

// Mock data generators
export const mockData = {
  // Generate mock photo data
  generatePhotos: (count = 10) => {
    return Array.from({ length: count }, (_, index) => ({
      id: `photo_${index + 1}`,
      cloudinaryPublicId: `facematch/event123/photo_${index + 1}`,
      originalName: `photo_${index + 1}.jpg`,
      uploadedAt: {
        seconds: Date.now() / 1000 - Math.random() * 86400 * 7 // Random time in last week
      },
      uploadedBy: `user_${Math.floor(Math.random() * 5) + 1}`,
      width: 1920 + Math.floor(Math.random() * 800),
      height: 1080 + Math.floor(Math.random() * 600),
      fileSize: Math.floor(Math.random() * 5000000) + 1000000, // 1-6MB
      event_id: 'event123',
      passcode: 'ABC123'
    }));
  },

  // Generate mock user data
  generateUser: (overrides = {}) => ({
    id: 'user_123',
    email: 'test@example.com',
    role: 'organizer',
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
    ...overrides
  }),

  // Generate mock event data
  generateEvent: (overrides = {}) => ({
    id: 'event_123',
    eventName: 'Test Event',
    passcode: 'ABC123',
    createdAt: new Date().toISOString(),
    createdBy: 'user_123',
    ...overrides
  }),

  // Generate mock face match results
  generateFaceMatches: (photoCount = 5) => {
    return Array.from({ length: photoCount }, (_, index) => ({
      id: `photo_${index + 1}`,
      matchScore: 0.7 + Math.random() * 0.3, // 0.7-1.0
      confidence: Math.floor(70 + Math.random() * 30), // 70-100%
      ...mockData.generatePhotos(1)[0]
    }));
  }
};

// Test helpers
export const testHelpers = {
  // Wait for async operations
  waitFor: (ms = 100) => new Promise(resolve => setTimeout(resolve, ms)),

  // Mock fetch responses
  mockFetch: (response, status = 200) => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: status >= 200 && status < 300,
        status,
        json: () => Promise.resolve(response),
        text: () => Promise.resolve(JSON.stringify(response))
      })
    );
  },

  // Mock localStorage
  mockLocalStorage: () => {
    const store = {};
    return {
      getItem: jest.fn((key) => store[key] || null),
      setItem: jest.fn((key, value) => { store[key] = value; }),
      removeItem: jest.fn((key) => { delete store[key]; }),
      clear: jest.fn(() => { Object.keys(store).forEach(key => delete store[key]); })
    };
  },

  // Mock sessionStorage
  mockSessionStorage: () => {
    const store = {};
    return {
      getItem: jest.fn((key) => store[key] || null),
      setItem: jest.fn((key, value) => { store[key] = value; }),
      removeItem: jest.fn((key) => { delete store[key]; }),
      clear: jest.fn(() => { Object.keys(store).forEach(key => delete store[key]); })
    };
  },

  // Create mock file
  createMockFile: (name = 'test.jpg', type = 'image/jpeg', size = 1024) => {
    const file = new File(['test content'], name, { type });
    Object.defineProperty(file, 'size', { value: size });
    return file;
  },

  // Mock image loading
  mockImageLoad: () => {
    const mockImage = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      src: '',
      onload: null,
      onerror: null
    };
    
    // Simulate successful load
    setTimeout(() => {
      if (mockImage.onload) mockImage.onload();
    }, 100);
    
    return mockImage;
  }
};

// Test assertions
export const testAssertions = {
  // Check if element has specific classes
  hasClass: (element, className) => {
    return element.classList.contains(className);
  },

  // Check if element is visible
  isVisible: (element) => {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  },

  // Check if element is in viewport
  isInViewport: (element) => {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  },

  // Check if image is loaded
  isImageLoaded: (img) => {
    return img.complete && img.naturalHeight !== 0;
  }
};

// Performance testing utilities
export const performanceTests = {
  // Measure render time
  measureRenderTime: (renderFn) => {
    const start = performance.now();
    const result = renderFn();
    const end = performance.now();
    return {
      result,
      renderTime: end - start
    };
  },

  // Test memory usage
  testMemoryUsage: () => {
    if (performance.memory) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      };
    }
    return null;
  },

  // Test component re-renders
  countRenders: (component) => {
    let renderCount = 0;
    const originalRender = component.render;
    
    component.render = function(...args) {
      renderCount++;
      return originalRender.apply(this, args);
    };
    
    return () => renderCount;
  }
};

// Integration test helpers
export const integrationTests = {
  // Test API endpoints
  testApiEndpoint: async (url, options = {}) => {
    try {
      const response = await fetch(url, {
        method: 'GET',
        ...options
      });
      return {
        success: response.ok,
        status: response.status,
        data: await response.json()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Test file upload
  testFileUpload: async (file, endpoint) => {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData
      });
      return {
        success: response.ok,
        status: response.status,
        data: await response.json()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
};

// Mock services
export const mockServices = {
  // Mock Flask face service
  mockFlaskFaceService: {
    initialize: jest.fn(() => Promise.resolve()),
    getFaceDescriptor: jest.fn(() => Promise.resolve([0.1, 0.2, 0.3])),
    findMatchingPhotos: jest.fn(() => Promise.resolve(mockData.generateFaceMatches(3)))
  },

  // Mock Cloudinary service
  mockCloudinaryService: {
    uploadToCloudinary: jest.fn(() => Promise.resolve({
      public_id: 'test_public_id',
      secure_url: 'https://res.cloudinary.com/test/image/upload/test.jpg'
    })),
    getThumbnailUrl: jest.fn((publicId) => `https://res.cloudinary.com/test/image/upload/w_300,h_300,c_fill/${publicId}`),
    getFullSizeUrl: jest.fn((publicId) => `https://res.cloudinary.com/test/image/upload/w_1920,h_1080,c_limit/${publicId}`)
  }
};

export default {
  mockData,
  testHelpers,
  testAssertions,
  performanceTests,
  integrationTests,
  mockServices
};
