require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testModel(modelName) {
    console.log(`Testing model: ${modelName}`);
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Say hello!");
        console.log(`Success with ${modelName}:`, result.response.text());
        return true;
    } catch (e) {
        console.log(`Failed with ${modelName}:`, e.message);
        return false;
    }
}

async function run() {
    await testModel('gemini-1.5-flash');
    await testModel('gemini-1.5-flash-latest');
    await testModel('gemini-pro');
    await testModel('gemini-2.0-flash');
}

run();
