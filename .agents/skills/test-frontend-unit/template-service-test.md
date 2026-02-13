# Service Test Template

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock axios BEFORE importing the service
vi.mock('boot/axios', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}))

import { api } from 'boot/axios'
import ServiceName from '@/services/{name}'

describe('{ServiceName}', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // For each method in the service, create a describe block:

  describe('{methodName}', () => {
    it('should call {HTTP_METHOD} on {endpoint}', async () => {
      const mockResponse = { data: { datas: {/* expected shape */} } }
      api.{method}.mockResolvedValue(mockResponse)

      const result = await ServiceName.{methodName}(/* args */)

      expect(api.{method}).toHaveBeenCalledWith('{endpoint}', /* expected args */)
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = new Error('API Error')
      api.{method}.mockRejectedValue(mockError)

      await expect(ServiceName.{methodName}(/* args */)).rejects.toThrow('API Error')
    })
  })
})
```

## Common PwnDoc Service Patterns

All services follow a consistent structure:
```javascript
import { api } from 'boot/axios'
export default {
  getItems: function() { return api.get('items') },
  createItem: function(item) { return api.post('items', item) },
  updateItem: function(id, item) { return api.put(`items/${id}`, item) },
  deleteItem: function(id) { return api.delete(`items/${id}`) }
}
```

For each method, verify:
1. Correct HTTP method (get/post/put/delete)
2. Correct endpoint URL
3. Parameters are passed through correctly
4. Return value is the raw axios response (not unwrapped)
