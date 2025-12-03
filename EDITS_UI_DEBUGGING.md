# Edits UI - Debugging Guide

## Issue: Edits not applying/rejecting

### Symptoms
- Click accept/reject buttons but nothing happens
- No toast notifications appear
- Edit state doesn't change in UI

### Debugging Steps

#### 1. Check Browser Console
Open DevTools (F12) and check the Console tab for errors:

```javascript
// You should see logs like:
// "submitEdit called with editId: xxx"
// "submitEdit response status: 200"
// "submitEdit result: {...}"
```

If you see errors, note them down.

#### 2. Check Network Requests
In DevTools Network tab:

1. Click an accept/reject button
2. Look for a POST or DELETE request to `/api/edits/pending/...`
3. Check the response:
   - Status should be 200 or 201
   - Response body should contain the result

#### 3. Common Issues

**Issue: 401 Unauthorized**
- Solution: Check that `authToken` is set correctly
- Run in console: `console.log('authToken:', authToken)`

**Issue: 404 Not Found**
- Solution: API endpoint doesn't exist
- Check that backend has `/api/edits/pending/{id}/submit` endpoint

**Issue: 500 Server Error**
- Solution: Backend error
- Check server logs for details

**Issue: No network request at all**
- Solution: Function not being called
- Check that `onEditSubmit` and `onEditDismiss` are properly connected
- Run in console: `console.log('editsMenuCompact:', editsMenuCompact)`

#### 4. Manual Testing

In the browser console, try:

```javascript
// Test if the functions exist
console.log('submitEdit:', typeof submitEdit);
console.log('dismissEdit:', typeof dismissEdit);

// Test if the menu exists
console.log('editsMenuCompact:', editsMenuCompact);

// Test if the menu has edits
console.log('pendingEdits:', editsMenuCompact?.pendingEdits);

// Manually call submitEdit with a test ID
submitEdit('test-id-123');
```

#### 5. Check API Endpoints

Make sure your backend has these endpoints:

```
POST /api/edits/pending/{id}/submit
DELETE /api/edits/pending/{id}
GET /api/edits/pending
GET /api/edits/history
```

### Solution Checklist

- [ ] Check browser console for errors
- [ ] Check network requests in DevTools
- [ ] Verify `authToken` is set
- [ ] Verify API endpoints exist on backend
- [ ] Check server logs for errors
- [ ] Verify `editsMenuCompact` is initialized
- [ ] Verify `onEditSubmit` and `onEditDismiss` are called
- [ ] Check that API responses are valid JSON

### If Still Not Working

1. **Check the API Response**
   - The API should return a success response
   - Check what the backend is actually returning

2. **Check the Backend**
   - Verify the endpoint is implemented
   - Check server logs for errors
   - Test the endpoint with curl or Postman

3. **Check the Integration**
   - Verify `submitEdit()` and `dismissEdit()` are being called
   - Add console.log statements to verify execution
   - Check that the functions have access to `authToken` and `userId`

### Debug Output to Look For

When you click accept/reject, you should see in the console:

```
submitEdit called with editId: abc123
submitEdit response status: 200
submitEdit result: {success: true, ...}
Edit applied successfully!
```

Or for dismiss:

```
dismissEdit called with editId: abc123
dismissEdit response status: 200
dismissEdit result: {success: true, ...}
Edit dismissed
```

### If You See Errors

**Error: "Failed to submit edit: 404"**
- The API endpoint doesn't exist
- Check that your backend has the endpoint implemented

**Error: "Failed to submit edit: 401"**
- Authentication failed
- Check that `authToken` is valid

**Error: "Failed to submit edit: 500"**
- Server error
- Check server logs

**Error: "Cannot read property 'pendingEditCount' of undefined"**
- `chatWindow` or `floatingChatIcon` is not initialized
- This is non-critical, the edit should still be submitted

### Next Steps

1. Open browser DevTools (F12)
2. Go to Console tab
3. Click an accept/reject button
4. Look for the debug logs
5. Check the Network tab for the API request
6. Share the console output and network request details

---

**Note**: The debug logging has been added to help identify the issue. Check the console output when you interact with the UI.
