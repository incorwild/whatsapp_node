import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class WhatsAppApi implements ICredentialType {
	name = 'whatsAppApi';
	displayName = 'WhatsApp API';
	documentationUrl = 'https://github.com/pedroslopez/whatsapp-web.js/';
	properties: INodeProperties[] = [
		{
			displayName: 'Session Data',
			name: 'sessionData',
			type: 'string',
			default: '',
			typeOptions: {
				password: true,
			},
			description: 'Сохраненные данные сессии для восстановления аутентификации',
		},
		{
			displayName: 'Headless Mode',
			name: 'headless',
			type: 'boolean',
			default: true,
			description: 'Запускать браузер в headless режиме (без пользовательского интерфейса)',
		},
		{
			displayName: 'Proxy Server',
			name: 'proxyServer',
			type: 'string',
			default: '',
			description: 'URL прокси-сервера для использования с браузером',
		},
	];
} 