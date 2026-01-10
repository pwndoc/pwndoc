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
})
