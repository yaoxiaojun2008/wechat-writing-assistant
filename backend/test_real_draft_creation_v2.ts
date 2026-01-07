
import { wechatService } from './src/services/wechatService.js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.join(process.cwd(), '.env') });

async function testDraftCreation() {
    console.log('--- STARTING REAL DRAFT CREATION TEST ---');

    // Need to ensure WECHAT_MOCK_MODE is NOT true for this test
    // but we can't easily change process.env here if the service is already initialized 
    // with some config. However, wechatService reads env vars at runtime for checking mock mode.
    process.env.WECHAT_MOCK_MODE = 'false';
    process.env.USE_REAL_WECHAT_API = 'true';

    try {
        // Force update config because import happened before dotenv.config
        wechatService.updateConfig({
            appId: process.env.WECHAT_APP_ID || '',
            appSecret: process.env.WECHAT_APP_SECRET || ''
        });

        console.log('1. Checking configuration capability...');
        const capability = await wechatService.checkAccountCapabilities();
        console.log('Capability:', capability);

        if (!capability.canUseDraftAPI) {
            console.warn('WARNING: Account might not support draft API, but we will try anyway.');
        }

        const title = `Automated Test Draft ${new Date().toISOString()}`;
        // Use a placeholder image that is reliable
        const externalImageUrl = "https://via.placeholder.com/300.png/09f/fff";
        const content = `
      <p>This is a test draft created by the automated validation script.</p>
      <p>It contains an external image that should be automatically processed:</p>
      <img src="${externalImageUrl}" alt="Test Image" />
      <p>End of test content.</p>
    `;

        console.log('2. Creating draft...');
        console.log('Title:', title);

        // We expect this to:
        // a) Download the image
        // b) Upload it to WeChat
        // c) Upload a default thumbnail (since we don't provide one)
        // d) Create the draft

        const mediaId = await wechatService.saveToDraft(content, title);
        console.log('SUCCESS: Draft created with Media ID:', mediaId);

    } catch (error) {
        console.error('TEST FAILED:', error);
        if (error instanceof Error) {
            console.error('Message:', error.message);
            console.error('Stack:', error.stack);
        }
    } finally {
        console.log('--- TEST FINISHED ---');
        process.exit(0);
    }
}

testDraftCreation();
