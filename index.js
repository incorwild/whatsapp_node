module.exports = {
	nodes: [
		require('./dist/nodes/WhatsApp/WhatsApp.node.js'),
	],
	credentials: [
		require('./dist/credentials/WhatsAppApi.credentials.js'),
	],
}; 