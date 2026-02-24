# Frontend Update: Study Material Downloads

## 🔄 Breaking Change - Download API Updated

The study material download endpoint has been updated to use **presigned S3 URLs** for better performance with large files (up to 120MB).

---

## What Changed

### ❌ Old Behavior (File Streaming)
```javascript
// POST /api/courses/:courseId/study-materials/:materialId/download
// Response: Binary file data with Content-Disposition headers
```

### ✅ New Behavior (Presigned URLs)
```javascript
// POST /api/courses/:courseId/study-materials/:materialId/download
// Response: JSON with temporary download URL
{
  "success": true,
  "data": {
    "downloadUrl": "https://cbtapp76765687.s3.eu-north-1.amazonaws.com/materials/...",
    "fileName": "Introduction to Computer Science.pdf",
    "fileSize": 125829120,
    "expiresIn": 300
  },
  "message": "Study material download URL generated successfully"
}
```

---

## Frontend Implementation

### Required Changes

**Before:**
```javascript
// Old implementation - direct download
const response = await axios.post(
  `/api/courses/${courseId}/study-materials/${materialId}/download`,
  {},
  { responseType: 'blob' }
);

const blob = new Blob([response.data]);
const url = window.URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = 'material.pdf';
link.click();
```

**After:**
```javascript
// New implementation - presigned URL
const response = await axios.post(
  `/api/courses/${courseId}/study-materials/${materialId}/download`
);

if (response.data.success) {
  // Method 1: Direct browser download (recommended)
  window.location.href = response.data.data.downloadUrl;
  
  // OR Method 2: Download with custom name
  const link = document.createElement('a');
  link.href = response.data.data.downloadUrl;
  link.download = response.data.data.fileName;
  link.click();
  
  // OR Method 3: Fetch and save (for progress tracking)
  const fileResponse = await fetch(response.data.data.downloadUrl);
  const blob = await fileResponse.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = response.data.data.fileName;
  link.click();
  window.URL.revokeObjectURL(url);
}
```

### React Example

```jsx
import { useState } from 'react';
import axios from 'axios';

const DownloadButton = ({ courseId, materialId, materialTitle }) => {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      setError(null);

      const response = await axios.post(
        `/api/courses/${courseId}/study-materials/${materialId}/download`
      );

      if (response.data.success) {
        // Direct download
        const { downloadUrl, fileName } = response.data.data;
        
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      if (err.response?.status === 429) {
        setError(`Daily download limit reached. ${err.response.data.message}`);
      } else if (err.response?.status === 403) {
        setError('Premium access required to download this material');
      } else {
        setError('Failed to download material');
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div>
      <button onClick={handleDownload} disabled={downloading}>
        {downloading ? 'Preparing download...' : 'Download'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
};
```

---

## Key Points

### ⏱️ URL Expiration
- **Presigned URLs expire after 5 minutes (300 seconds)**
- Users must click download within this timeframe
- After expiration, users need to request a new download URL

### 📊 Download Limits Still Apply
- Free tier: 7 downloads per day
- Basic/Premium/Admin: Unlimited downloads
- Limits are checked **before** the URL is generated
- Each successful request counts toward the daily quota

### 🚀 Performance Benefits
- **Large files (120MB+)** download directly from S3
- **No backend bottleneck** - files stream from AWS
- **No timeout issues** on slow connections
- **Lower bandwidth costs** for the backend server

### 🛡️ Security
- URLs are **temporary and expire** after 5 minutes
- Download limits are enforced **before URL generation**
- Analytics tracking remains intact
- Access control checks happen **before URL creation**

---

## Error Handling

### Possible Error Responses

**404 - Material Not Found**
```json
{
  "success": false,
  "message": "Study material not found"
}
```

**403 - Access Denied**
```json
{
  "success": false,
  "message": "Premium access required to download this material"
}
```

**429 - Rate Limit Exceeded**
```json
{
  "success": false,
  "message": "Daily download limit reached for free tier (7/day). Upgrade your plan for unlimited downloads.",
  "data": {
    "dailyLimit": 7,
    "usedToday": 7,
    "remainingToday": 0,
    "resetsAt": "2026-02-25T00:00:00.000Z",
    "scope": "study_material_downloads"
  }
}
```

**502 - S3 Error**
```json
{
  "success": false,
  "message": "Unable to generate download URL for study material"
}
```

---

## Migration Checklist

- [ ] Update API call to expect JSON response instead of blob
- [ ] Remove `responseType: 'blob'` from axios config
- [ ] Implement presigned URL download logic
- [ ] Add error handling for expired URLs (show "request download again")
- [ ] Update UI to show "Preparing download..." state
- [ ] Test with large files (100MB+)
- [ ] Test download limit enforcement
- [ ] Test premium vs free tier access

---

## Questions?

If you encounter any issues with the new download flow, check:
1. ✅ You're calling the same endpoint: `POST /api/courses/:courseId/study-materials/:materialId/download`
2. ✅ You're NOT using `responseType: 'blob'` in the request
3. ✅ You're extracting `downloadUrl` from `response.data.data.downloadUrl`
4. ✅ The download is triggered within 5 minutes of receiving the URL

---

**Date:** February 24, 2026  
**Impact:** Breaking change - frontend code update required  
**Rollout:** Immediate
