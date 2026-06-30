module.exports = function() {
  describe('AiPrompt backup restore compatibility', () => {
    const nodeFs = require('fs')
    const os = require('os')
    const path = require('path')
    const AiPrompt = require('mongoose').model('AiPrompt')

    it('keeps existing prompts when aiPrompts.json is missing (upsert mode)', async () => {
      const tmpDir = nodeFs.mkdtempSync(path.join(os.tmpdir(), 'ai-prompt-restore-'))

      await AiPrompt.deleteMany({})
      await AiPrompt.create({
        entityType: 'finding',
        fieldKey: 'description',
        fieldLabel: 'Description',
        outputType: 'html',
        prompt: 'existing prompt'
      })

      await expect(AiPrompt.restore(tmpDir, 'upsert')).resolves.toBeUndefined()

      const remaining = await AiPrompt.find({}).lean()
      expect(remaining).toHaveLength(1)
      expect(remaining[0].prompt).toBe('existing prompt')

      nodeFs.rmSync(tmpDir, {recursive: true, force: true})
    })

    it('clears prompts in revert mode when aiPrompts.json is missing', async () => {
      const tmpDir = nodeFs.mkdtempSync(path.join(os.tmpdir(), 'ai-prompt-restore-'))

      await AiPrompt.deleteMany({})
      await AiPrompt.create({
        entityType: 'finding',
        fieldKey: 'description',
        fieldLabel: 'Description',
        outputType: 'html',
        prompt: 'existing prompt'
      })

      await expect(AiPrompt.restore(tmpDir, 'revert')).resolves.toBeUndefined()
      expect(await AiPrompt.countDocuments()).toBe(0)

      nodeFs.rmSync(tmpDir, {recursive: true, force: true})
    })
  })
}
