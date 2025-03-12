import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import { Client, ClientOptions, MessageMedia } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';

export class WhatsApp implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'WhatsApp',
		name: 'whatsApp',
		icon: 'file:whatsapp.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Отправляйте и получайте сообщения через WhatsApp',
		defaults: {
			name: 'WhatsApp',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'whatsAppApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Ресурс',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Сообщение',
						value: 'message',
					},
					{
						name: 'Чат',
						value: 'chat',
					},
					{
						name: 'Контакт',
						value: 'contact',
					},
				],
				default: 'message',
			},
			// Операции для сообщений
			{
				displayName: 'Операция',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'message',
						],
					},
				},
				options: [
					{
						name: 'Отправить',
						value: 'send',
						description: 'Отправить сообщение',
						action: 'Отправить сообщение',
					},
					{
						name: 'Отправить медиа',
						value: 'sendMedia',
						description: 'Отправить медиа-файл',
						action: 'Отправить медиа-файл',
					},
				],
				default: 'send',
			},
			// Операции для чатов
			{
				displayName: 'Операция',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'chat',
						],
					},
				},
				options: [
					{
						name: 'Получить',
						value: 'get',
						description: 'Получить информацию о чате',
						action: 'Получить информацию о чате',
					},
					{
						name: 'Получить все',
						value: 'getAll',
						description: 'Получить список всех чатов',
						action: 'Получить список всех чатов',
					},
				],
				default: 'get',
			},
			// Операции для контактов
			{
				displayName: 'Операция',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'contact',
						],
					},
				},
				options: [
					{
						name: 'Получить',
						value: 'get',
						description: 'Получить информацию о контакте',
						action: 'Получить информацию о контакте',
					},
					{
						name: 'Получить все',
						value: 'getAll',
						description: 'Получить список всех контактов',
						action: 'Получить список всех контактов',
					},
				],
				default: 'get',
			},
			// Поля для отправки сообщения
			{
				displayName: 'Номер телефона получателя',
				name: 'to',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'message',
						],
						operation: [
							'send',
							'sendMedia',
						],
					},
				},
				description: 'Номер телефона получателя в формате международного номера без + или 00 (например, 79123456789)',
			},
			{
				displayName: 'Текст сообщения',
				name: 'message',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'message',
						],
						operation: [
							'send',
						],
					},
				},
				description: 'Текст сообщения для отправки',
			},
			// Поля для отправки медиа
			{
				displayName: 'URL медиа-файла',
				name: 'mediaUrl',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'message',
						],
						operation: [
							'sendMedia',
						],
					},
				},
				description: 'URL медиа-файла для отправки',
			},
			{
				displayName: 'Подпись медиа',
				name: 'caption',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: [
							'message',
						],
						operation: [
							'sendMedia',
						],
					},
				},
				description: 'Подпись для медиа-файла',
			},
			// Поля для получения чата или контакта
			{
				displayName: 'ID чата',
				name: 'chatId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'chat',
						],
						operation: [
							'get',
						],
					},
				},
				description: 'ID чата для получения информации',
			},
			{
				displayName: 'ID контакта',
				name: 'contactId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'contact',
						],
						operation: [
							'get',
						],
					},
				},
				description: 'ID контакта для получения информации',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		let item: INodeExecutionData;

		// Получить параметры узла
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		// Получить учетные данные
		const credentials = await this.getCredentials('whatsAppApi') as IDataObject;
		const sessionData = credentials.sessionData as string;
		const headless = credentials.headless as boolean;
		const proxyServer = credentials.proxyServer as string;

		// Настройки клиента WhatsApp
		const clientOptions: ClientOptions = {
			puppeteer: {
				headless,
			},
		};

		if (proxyServer) {
			clientOptions.puppeteer = {
				...clientOptions.puppeteer,
				args: [`--proxy-server=${proxyServer}`],
			};
		}

		// Создать клиент WhatsApp
		const client = new Client(clientOptions);

		// Обработать QR-код для аутентификации
		if (!sessionData) {
			client.on('qr', (qr) => {
				qrcode.generate(qr, { small: true });
				throw new NodeOperationError(this.getNode(), 'Отсканируйте QR-код в терминале для аутентификации, затем сохраните данные сессии в учетных данных.');
			});
		}

		// Инициализировать клиент
		await client.initialize();

		// Выполнить операцию в зависимости от ресурса и операции
		for (let i = 0; i < items.length; i++) {
			try {
				item = items[i];
				
				if (resource === 'message') {
					if (operation === 'send') {
						const to = this.getNodeParameter('to', i) as string;
						const message = this.getNodeParameter('message', i) as string;
						
						// Проверить формат номера и добавить '@c.us' для формата WhatsApp
						const chatId = to.includes('@c.us') ? to : `${to}@c.us`;
						
						// Отправить сообщение
						const result = await client.sendMessage(chatId, message);
						
						returnData.push({
							success: true,
							messageId: result.id._serialized,
							timestamp: result.timestamp,
						});
					}
					
					if (operation === 'sendMedia') {
						const to = this.getNodeParameter('to', i) as string;
						const mediaUrl = this.getNodeParameter('mediaUrl', i) as string;
						const caption = this.getNodeParameter('caption', i) as string;
						
						// Получить медиа-файл из URL
						const media = await MessageMedia.fromUrl(mediaUrl);
						
						// Проверить формат номера и добавить '@c.us' для формата WhatsApp
						const chatId = to.includes('@c.us') ? to : `${to}@c.us`;
						
						// Отправить медиа-файл
						const result = await client.sendMessage(chatId, media, { caption });
						
						returnData.push({
							success: true,
							messageId: result.id._serialized,
							timestamp: result.timestamp,
						});
					}
				}
				
				if (resource === 'chat') {
					if (operation === 'get') {
						const chatId = this.getNodeParameter('chatId', i) as string;
						
						// Получить информацию о чате
						const chat = await client.getChatById(chatId);
						
						returnData.push({
							id: chat.id._serialized,
							name: chat.name,
							isGroup: chat.isGroup,
							timestamp: chat.timestamp,
							unreadCount: chat.unreadCount,
						});
					}
					
					if (operation === 'getAll') {
						// Получить список всех чатов
						const chats = await client.getChats();
						
						for (const chat of chats) {
							returnData.push({
								id: chat.id._serialized,
								name: chat.name,
								isGroup: chat.isGroup,
								timestamp: chat.timestamp,
								unreadCount: chat.unreadCount,
							});
						}
					}
				}
				
				if (resource === 'contact') {
					if (operation === 'get') {
						const contactId = this.getNodeParameter('contactId', i) as string;
						
						// Получить информацию о контакте
						const contact = await client.getContactById(contactId);
						
						returnData.push({
							id: contact.id._serialized,
							name: contact.name,
							number: contact.number,
							pushname: contact.pushname,
							isGroup: contact.isGroup,
							isMe: contact.isMe,
							isMyContact: contact.isMyContact,
						});
					}
					
					if (operation === 'getAll') {
						// Получить список всех контактов
						const contacts = await client.getContacts();
						
						for (const contact of contacts) {
							returnData.push({
								id: contact.id._serialized,
								name: contact.name,
								number: contact.number,
								pushname: contact.pushname,
								isGroup: contact.isGroup,
								isMe: contact.isMe,
								isMyContact: contact.isMyContact,
							});
						}
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}
		}

		// Закрыть соединение с WhatsApp
		await client.destroy();

		return [this.helpers.returnJsonArray(returnData)];
	}
} 