const serverless = require('serverless-http');

let app;
let handler;

// Initialize app with error handling
try {
  app = require('../../dist/server.js');
  handler = serverless(app.default || app);
} catch (error) {
  console.error('Failed to initialize app:', error);
  // Create a fallback handler
  handler = async (event, context) => {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      },
      body: JSON.stringify({
        success: false,
        message: 'Server initialization failed',
        error: error.message
      })
    };
  };
}

module.exports.handler = async (event, context) => {
  try {
    // Set context to not wait for empty event loop
    context.callbackWaitsForEmptyEventLoop = false;
    
    const result = await handler(event, context);
    
    return {
      ...result,
      headers: {
        ...result.headers,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      },
    };
  } catch (error) {
    console.error('Handler error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      },
      body: JSON.stringify({
        success: false,
        message: 'Internal server error',
        error: error.message
      })
    };
  }
};
