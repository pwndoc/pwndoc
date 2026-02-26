import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Utils from '@/services/utils'

describe('Utils Service', () => {
  describe('htmlEncode', () => {
    it('should return empty string for non-string input', () => {
      expect(Utils.htmlEncode(null)).toBe('')
      expect(Utils.htmlEncode(undefined)).toBe('')
      expect(Utils.htmlEncode(123)).toBe('')
      expect(Utils.htmlEncode({})).toBe('')
    })

    it('should sanitize HTML and keep allowed tags', () => {
      const html = '<p>Hello <b>world</b></p><script>alert("xss")</script>'
      const result = Utils.htmlEncode(html)
      expect(result).toContain('<p>')
      expect(result).toContain('<b>')
      expect(result).not.toContain('<script>')
    })

    it('should allow image tags with valid ObjectId src', () => {
      const html = '<img src="507f1f77bcf86cd799439011" alt="test">'
      const result = Utils.htmlEncode(html)
      expect(result).toContain('<img')
      expect(result).toContain('src="507f1f77bcf86cd799439011"')
    })

    it('should allow image tags with base64 src', () => {
      const html = '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" alt="test">'
      const result = Utils.htmlEncode(html)
      expect(result).toContain('<img')
      expect(result).toContain('data:image')
    })

    it('should allow commentid attribute on images', () => {
      const html = '<img src="507f1f77bcf86cd799439011" alt="test" commentid="comment123">'
      const result = Utils.htmlEncode(html)
      expect(result).toContain('commentid="comment123"')
    })

    it('should allow legend tags with label and alt attributes', () => {
      const html = '<legend label="Test Label" alt="Alternative"></legend>'
      const result = Utils.htmlEncode(html)
      expect(result).toContain('<legend')
      expect(result).toContain('label="Test Label"')
      expect(result).toContain('alt="Alternative"')
    })

    it('should allow legend tags with commentid attribute', () => {
      const html = '<legend commentid="comment123"></legend>'
      const result = Utils.htmlEncode(html)
      expect(result).toContain('commentid="comment123"')
    })

    it('should allow mark tags with data-color and style attributes', () => {
      const html = '<mark data-color="red" style="background-color: yellow;">highlighted</mark>'
      const result = Utils.htmlEncode(html)
      expect(result).toContain('<mark')
      expect(result).toContain('data-color="red"')
      expect(result).toContain('style="background-color: yellow;"')
    })

    it('should allow code tags with language class', () => {
      const html = '<code class="language-javascript">const x = 1;</code>'
      const result = Utils.htmlEncode(html)
      expect(result).toContain('<code')
      expect(result).toContain('class="language-javascript"')
    })

    it('should allow comment tags with id attribute', () => {
      const html = '<comment id="comment123"></comment>'
      const result = Utils.htmlEncode(html)
      expect(result).toContain('<comment')
      expect(result).toContain('id="comment123"')
    })

    it('should normalize invisible characters', () => {
      const html = '<p>Test\u00A0with\u200Binvisible\u200Ccharacters</p>'
      const result = Utils.htmlEncode(html)
      expect(result).toContain('<p>')
      expect(result).not.toContain('\u00A0')
      expect(result).not.toContain('\u200B')
    })

    it('should remove control characters except newline, tab, carriage return', () => {
      const html = '<p>Test\x00\x01\x02content</p>'
      const result = Utils.htmlEncode(html)
      expect(result).toContain('<p>')
      expect(result).not.toContain('\x00')
    })
  })

  describe('normalizeString', () => {
    it('should convert to lowercase', () => {
      expect(Utils.normalizeString('HELLO')).toBe('hello')
    })

    it('should remove diacritics', () => {
      expect(Utils.normalizeString('café')).toBe('cafe')
      expect(Utils.normalizeString('naïve')).toBe('naive')
    })

    it('should handle empty strings', () => {
      expect(Utils.normalizeString('')).toBe('')
    })
  })

  describe('customFilter', () => {
    const rows = [
      { name: 'John Doe', email: 'john@example.com' },
      { name: 'Jane Smith', email: 'jane@example.com' },
      { name: 'Bob Johnson', email: 'bob@example.com' }
    ]

    it('should filter rows by name', () => {
      const result = Utils.customFilter(rows, { name: 'John' })
      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('John Doe')
      expect(result[1].name).toBe('Bob Johnson')
    })

    it('should filter rows by email', () => {
      const result = Utils.customFilter(rows, { email: 'jane' })
      expect(result).toHaveLength(1)
      expect(result[0].email).toBe('jane@example.com')
    })

    it('should return empty array when no matches', () => {
      const result = Utils.customFilter(rows, { name: 'Nonexistent' })
      expect(result).toHaveLength(0)
    })

    it('should handle empty rows', () => {
      const result = Utils.customFilter(null, { name: 'test' })
      expect(result).toBeNull()
    })

    it('should be case insensitive', () => {
      const result = Utils.customFilter(rows, { name: 'JOHN' })
      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('John Doe')
      expect(result[1].name).toBe('Bob Johnson')
    })
  })

  describe('getTextColor', () => {
    it('should return black for light backgrounds', () => {
      expect(Utils.getTextColor('#FFFFFF')).toBe('#000000')
      expect(Utils.getTextColor('#F0F0F0')).toBe('#000000')
    })

    it('should return white for dark backgrounds', () => {
      expect(Utils.getTextColor('#000000')).toBe('#ffffff')
      expect(Utils.getTextColor('#333333')).toBe('#ffffff')
    })

    it('should return black for invalid color format', () => {
      expect(Utils.getTextColor('invalid')).toBe('#000000')
      expect(Utils.getTextColor('#GGG')).toBe('#000000')
    })
  })

  describe('strongPassword', () => {
    it('should return true for strong passwords', () => {
      expect(Utils.strongPassword('Password123')).toBe(true)
      expect(Utils.strongPassword('MyP@ssw0rd')).toBe(true)
    })

    it('should return error message for weak passwords', () => {
      const result = Utils.strongPassword('weak')
      expect(typeof result).toBe('string')
      expect(result).not.toBe(true)
    })

    it('should require at least 8 characters', () => {
      expect(Utils.strongPassword('Pass1')).not.toBe(true)
    })

    it('should require uppercase letter', () => {
      expect(Utils.strongPassword('password123')).not.toBe(true)
    })

    it('should require lowercase letter', () => {
      expect(Utils.strongPassword('PASSWORD123')).not.toBe(true)
    })

    it('should require a digit', () => {
      expect(Utils.strongPassword('Password')).not.toBe(true)
    })
  })

  describe('getRelativeDate', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should return seconds ago for recent dates', () => {
      const date = new Date('2024-01-15T11:59:30Z')
      const result = Utils.getRelativeDate(date.toISOString())
      expect(result).toContain('seconds ago')
    })

    it('should return minutes ago', () => {
      const date = new Date('2024-01-15T11:30:00Z')
      const result = Utils.getRelativeDate(date.toISOString())
      expect(result).toContain('minutes ago')
    })

    it('should return hours ago', () => {
      const date = new Date('2024-01-15T10:00:00Z')
      const result = Utils.getRelativeDate(date.toISOString())
      expect(result).toContain('hours ago')
    })

    it('should return days ago', () => {
      const date = new Date('2024-01-10T12:00:00Z')
      const result = Utils.getRelativeDate(date.toISOString())
      expect(result).toContain('days ago')
    })

    it('should return months ago', () => {
      const date = new Date('2023-11-15T12:00:00Z')
      const result = Utils.getRelativeDate(date.toISOString())
      expect(result).toContain('months ago')
    })

    it('should return years ago', () => {
      const date = new Date('2022-01-15T12:00:00Z')
      const result = Utils.getRelativeDate(date.toISOString())
      expect(result).toContain('years ago')
    })
  })

  describe('bytesToHumanReadable', () => {
    it('should format bytes', () => {
      expect(Utils.bytesToHumanReadable(0)).toBe('0 B')
      expect(Utils.bytesToHumanReadable(1024)).toBe('1.00 KB')
      expect(Utils.bytesToHumanReadable(1048576)).toBe('1.00 MB')
      expect(Utils.bytesToHumanReadable(1073741824)).toBe('1.00 GB')
    })

    it('should handle decimal values', () => {
      const result = Utils.bytesToHumanReadable(1536)
      expect(result).toContain('KB')
      expect(parseFloat(result)).toBeCloseTo(1.5, 1)
    })
  })

  describe('AUDIT_VIEW_STATE', () => {
    it('should have all expected states', () => {
      expect(Utils.AUDIT_VIEW_STATE.EDIT).toBe(0)
      expect(Utils.AUDIT_VIEW_STATE.APPROVED).toBe(8)
      expect(Utils.AUDIT_VIEW_STATE.APPROVED_READONLY).toBe(10)
    })
  })

  describe('syncEditors', () => {
    it('should call updateHTML on single basiceditor refs', () => {
      const mockUpdateHTML = vi.fn()
      const refs = {
        basiceditor_test: { updateHTML: mockUpdateHTML }
      }
      Utils.syncEditors(refs)
      expect(mockUpdateHTML).toHaveBeenCalledOnce()
    })

    it('should call updateHTML on array of basiceditor refs', () => {
      const mockUpdateHTML1 = vi.fn()
      const mockUpdateHTML2 = vi.fn()
      const refs = {
        basiceditor_test: [
          { updateHTML: mockUpdateHTML1 },
          { updateHTML: mockUpdateHTML2 }
        ]
      }
      Utils.syncEditors(refs)
      expect(mockUpdateHTML1).toHaveBeenCalledOnce()
      expect(mockUpdateHTML2).toHaveBeenCalledOnce()
    })

    it('should recursively check child component refs', () => {
      const mockUpdateHTML = vi.fn()
      const refs = {
        childComponent: {
          $refs: {
            basiceditor_nested: { updateHTML: mockUpdateHTML }
          }
        }
      }
      Utils.syncEditors(refs)
      expect(mockUpdateHTML).toHaveBeenCalledOnce()
    })

    it('should skip refs that do not start with basiceditor_', () => {
      const mockUpdateHTML = vi.fn()
      const refs = {
        otherRef: { updateHTML: mockUpdateHTML }
      }
      Utils.syncEditors(refs)
      expect(mockUpdateHTML).not.toHaveBeenCalled()
    })

    it('should handle null or undefined refs gracefully', () => {
      const refs = {
        basiceditor_test: null,
        basiceditor_test2: undefined
      }
      expect(() => Utils.syncEditors(refs)).not.toThrow()
    })
  })

  describe('filterCustomFields', () => {
    const customFields = [
      { _id: '1', display: 'finding', displaySub: '', fieldType: 'text', text: [{ locale: 'en', value: 'English' }, { locale: 'fr', value: 'French' }] },
      { _id: '2', display: 'vulnerability', displaySub: '', fieldType: 'select-multiple', text: [{ locale: 'en', value: ['Option1'] }] },
      { _id: '3', display: 'general', displaySub: '', fieldType: 'checkbox', text: [] },
      { _id: '4', display: 'section', displaySub: 'subsection', fieldType: 'text', text: [] },
      { _id: '5', display: 'finding', displaySub: 'special', fieldType: 'text', text: [] }
    ]

    it('should filter fields for finding page', () => {
      const result = Utils.filterCustomFields('finding', '', customFields, [])
      expect(result.length).toBe(2) // finding and vulnerability display types
      expect(result[0].customField._id).toBe('1')
      expect(result[1].customField._id).toBe('2')
    })

    it('should filter fields for vulnerability page', () => {
      const result = Utils.filterCustomFields('vulnerability', '', customFields, [])
      expect(result.length).toBe(1)
      expect(result[0].customField._id).toBe('2')
    })

    it('should filter fields for audit-general page', () => {
      const result = Utils.filterCustomFields('audit-general', '', customFields, [])
      expect(result.length).toBe(1)
      expect(result[0].customField._id).toBe('3')
    })

    it('should filter fields for section page', () => {
      const result = Utils.filterCustomFields('section', '', customFields, [])
      expect(result.length).toBe(0) // no section fields with empty displaySub
    })

    it('should filter by displaySub', () => {
      const result = Utils.filterCustomFields('section', 'subsection', customFields, [])
      expect(result.length).toBe(1)
      expect(result[0].customField._id).toBe('4')
    })

    it('should apply locale to field text', () => {
      const result = Utils.filterCustomFields('finding', '', customFields, [], 'fr')
      expect(result[0].text).toBe('French')
    })

    it('should initialize select-multiple with array', () => {
      const result = Utils.filterCustomFields('vulnerability', '', customFields, [], 'en')
      expect(Array.isArray(result[0].text)).toBe(true)
      expect(result[0].text).toEqual(['Option1'])
    })

    it('should initialize checkbox with array', () => {
      const result = Utils.filterCustomFields('audit-general', '', customFields, [])
      expect(Array.isArray(result[0].text)).toBe(true)
      expect(result[0].text).toEqual([])
    })

    it('should map objectFields text to customFields', () => {
      const objectFields = [
        { customField: '1', text: 'Existing text' }
      ]
      const result = Utils.filterCustomFields('finding', '', customFields, objectFields)
      expect(result[0].text).toBe('Existing text')
    })

    it('should handle objectFields with customField as object', () => {
      const objectFields = [
        { customField: { _id: '2' }, text: ['Value1', 'Value2'] }
      ]
      const result = Utils.filterCustomFields('vulnerability', '', customFields, objectFields)
      expect(result[0].text).toEqual(['Value1', 'Value2'])
    })

    it('should omit text from customField in result', () => {
      const result = Utils.filterCustomFields('finding', '', customFields, [])
      expect(result[0].customField.text).toBeUndefined()
    })
  })

  describe('customFilter with non-string fields', () => {
    it('should handle non-string search values', () => {
      const rows = [
        { id: 1, name: 'Test' },
        { id: 2, name: 'Another' }
      ]
      const result = Utils.customFilter(rows, { id: 1 })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(1)
    })

    it('should handle nested properties', () => {
      const rows = [
        { user: { name: 'John' } },
        { user: { name: 'Jane' } }
      ]
      const result = Utils.customFilter(rows, { 'user.name': 'john' })
      expect(result).toHaveLength(1)
      expect(result[0].user.name).toBe('John')
    })

    it('should handle missing properties', () => {
      const rows = [
        { name: 'Test' },
        { other: 'value' }
      ]
      const result = Utils.customFilter(rows, { name: 'Test' })
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Test')
    })

    it('should normalize accented characters in search', () => {
      const rows = [
        { name: 'café' },
        { name: 'resume' }
      ]
      const result = Utils.customFilter(rows, { name: 'cafe' })
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('café')
    })
  })

  describe('resizeImg', () => {
    beforeEach(() => {
      global.Image = class {
        constructor() {
          this.width = 2000
          this.height = 1500
          setTimeout(() => {
            if (this.onload) this.onload()
          }, 0)
        }
      }
      global.document = {
        createElement: vi.fn(() => ({
          width: 0,
          height: 0,
          getContext: vi.fn(() => ({
            drawImage: vi.fn()
          })),
          toDataURL: vi.fn(() => 'data:image/jpeg;base64,/9j/4AAQSkZJRg==')
        }))
      }
    })

    it('should resize images larger than max width', async () => {
      const imageB64 = 'data:image/jpeg;base64,' + 'A'.repeat(1000)
      const result = await Utils.resizeImg(imageB64)
      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
    })

    it('should keep original if resized version is larger', async () => {
      // Mock a scenario where compression makes file larger
      global.document.createElement = vi.fn(() => ({
        width: 0,
        height: 0,
        getContext: vi.fn(() => ({
          drawImage: vi.fn()
        })),
        toDataURL: vi.fn(() => 'data:image/jpeg;base64,' + 'B'.repeat(10000))
      }))

      const imageB64 = 'data:image/jpeg;base64,ABC'
      const result = await Utils.resizeImg(imageB64)
      expect(result).toBe(imageB64)
    })
  })
})
