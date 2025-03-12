module.exports = {
	nodes: [
		require('./dist/nodes/WhatsApp/WhatsApp.node.js'),
		require('./dist/nodes/WhatsApp/WhatsAppTrigger.node.js'),
	],
	credentials: [
		require('./dist/credentials/WhatsAppApi.credentials.js'),
	],
}; 