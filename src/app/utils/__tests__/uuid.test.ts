import { generateUUID } from '../uuid'

describe('UUID Utilities', () => {
  describe('generateUUID', () => {
    test('should generate a string', () => {
      const id = generateUUID()
      expect(typeof id).toBe('string')
    })

    test('should generate unique IDs', () => {
      const id1 = generateUUID()
      const id2 = generateUUID()
      const id3 = generateUUID()

      expect(id1).not.toBe(id2)
      expect(id2).not.toBe(id3)
      expect(id1).not.toBe(id3)
    })

    test('should generate IDs of consistent format', () => {
      const ids = Array.from({ length: 100 }, () => generateUUID())

      ids.forEach(id => {
        expect(id).toMatch(/^[a-zA-Z0-9_-]+$/) // Base64-like characters
        expect(id.length).toBeGreaterThan(10) // Should be reasonably long
      })
    })

    test('should generate URL-safe IDs', () => {
      const ids = Array.from({ length: 50 }, () => generateUUID())

      ids.forEach(id => {
        // Should not contain characters that need URL encoding
        expect(id).not.toMatch(/[+/=]/)
        expect(encodeURIComponent(id)).toBe(id)
      })
    })

    test('should have low collision probability', () => {
      const idSet = new Set()
      const iterations = 10000

      for (let i = 0; i < iterations; i++) {
        const id = generateUUID()
        expect(idSet.has(id)).toBe(false) // No collisions
        idSet.add(id)
      }

      expect(idSet.size).toBe(iterations)
    })

    test('should generate IDs quickly', () => {
      const startTime = performance.now()
      
      for (let i = 0; i < 1000; i++) {
        generateUUID()
      }
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      // Should generate 1000 IDs in less than 100ms
      expect(duration).toBeLessThan(100)
    })

    test('should handle concurrent generation', () => {
      const promises = Array.from({ length: 100 }, () => 
        Promise.resolve(generateUUID())
      )

      return Promise.all(promises).then(ids => {
        const uniqueIds = new Set(ids)
        expect(uniqueIds.size).toBe(ids.length) // All should be unique
      })
    })
  })
})