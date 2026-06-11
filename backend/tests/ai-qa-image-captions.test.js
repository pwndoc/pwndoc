const {
    isFilenameLikeCaption,
    extractFilenameLikeCaptionsFromHtml,
    runImageCaptionChecks
} = require('../src/lib/ai-qa-image-captions');

module.exports = function() {
    describe('AI QA image caption checks', () => {
        it('should detect filename-like captions', () => {
            expect(isFilenameLikeCaption('screenshot.png')).toBe(true);
            expect(isFilenameLikeCaption('photo.JPEG')).toBe(true);
            expect(isFilenameLikeCaption('Login page showing the error')).toBe(false);
            expect(isFilenameLikeCaption('')).toBe(false);
        });

        it('should extract filename-like captions from HTML fields', () => {
            const matches = extractFilenameLikeCaptionsFromHtml(
                '<p>Proof</p><img src="abc123" alt="evidence.jpg">' +
                '<legend label="Figure" alt="diagram.png"></legend>'
            );

            expect(matches).toHaveLength(2);
            expect(matches.map((entry) => entry.caption)).toEqual(['evidence.jpg', 'diagram.png']);
        });

        it('should ignore descriptive captions', () => {
            const matches = extractFilenameLikeCaptionsFromHtml(
                '<img src="abc123" alt="Successful authentication bypass">'
            );

            expect(matches).toHaveLength(0);
        });

        it('should flag findings that still use imported image filenames', () => {
            const issues = runImageCaptionChecks({
                findings: [{
                    title: 'XSS',
                    poc: '<img src="image-id" alt="payload.png">'
                }],
                sections: []
            });

            expect(issues).toHaveLength(1);
            expect(issues[0].category).toBe('imageCaptions');
            expect(issues[0].location).toBe('finding:XSS/poc');
            expect(issues[0].message).toContain('payload.png');
        });
    });
};
