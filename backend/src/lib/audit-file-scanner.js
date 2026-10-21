const net = require('node:net');

// Optional ClamAV INSTREAM integration. A configured scanner always fails closed.
// Files remain in the uploading state until scanning has completed successfully.
module.exports = async function scan(streamFactory) {
    const host = process.env.AUDIT_FILES_CLAMAV_HOST;
    if (!host) return 'not-scanned';
    const port = Number(process.env.AUDIT_FILES_CLAMAV_PORT || 3310);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid ClamAV port');
    const socket = net.createConnection({ host, port });
    const source = streamFactory();
    let response = '';
    const result = new Promise((resolve, reject) => {
        socket.setTimeout(120000, () => socket.destroy(new Error('Scanner timeout')));
        socket.on('error', reject);
        socket.on('data', data => {
            response += data.toString();
            if (response.length > 4096) socket.destroy(new Error('Invalid scanner response'));
            else if (response.includes('\0') || response.includes('\n')) {
                if (/^stream: OK[\0\n]/.test(response)) resolve('clean');
                else reject(new Error('File rejected by malware scanner'));
            }
        });
        socket.on('end', () => reject(new Error('Scanner disconnected')));
    });
    // Attach handlers before beginning the transfer so early connection failures
    // cannot become unhandled promise rejections while the source is being read.
    const send = async () => {
        const write = buffer => new Promise((resolve, reject) => {
            socket.write(buffer, error => error ? reject(error) : resolve());
        });
        await write(Buffer.from('zINSTREAM\0'));
        for await (const chunk of source) {
            const size = Buffer.alloc(4);
            size.writeUInt32BE(chunk.length);
            await write(size);
            await write(chunk);
        }
        await write(Buffer.alloc(4));
    };
    try {
        const [status] = await Promise.all([result, send()]);
        return status;
    } finally {
        source.destroy();
        socket.destroy();
    }
};
