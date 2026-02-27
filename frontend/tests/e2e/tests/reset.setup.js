import { test as setup } from '@playwright/test';

setup('reset db', async ({ request }) => {
    const res = await request.post('/api/__test__/reset-db');
    if (!res.ok()) throw new Error('Failed to reset MongoDB');
});