import { ITriggerFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
	NodeOperationError,
} from 'n8n-workflow';

import { Client, ClientOptions, Message } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';

export class WhatsAppTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'WhatsApp Триггер',
		name: 'whatsAppTrigger',
		icon: 'file:whatsapp.svg',
		group: ['trigger'],
		version: 1,
		subtitle: 'Ожидание событий WhatsApp',
		description: 'Запускает поток при получении новых сообщений WhatsApp',
		defaults: {
			name: 'WhatsApp Триггер',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'whatsAppApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Тип триггера',
				name: 'triggerType',
				type: 'options',
				options: [
					{
						name: 'Новое сообщение',
						value: 'newMessage',
						description: 'Запустить при получении любого нового сообщения',
					},
					{
						name: 'Сообщение с ключевым словом',
						value: 'messageWithKeyword',
						description: 'Запустить при получении сообщения с определенным ключевым словом',
					},
				],
				default: 'newMessage',
				description: 'Тип события, которое запустит поток',
			},
			{
				displayName: 'Ключевое слово',
				name: 'keyword',
				type: 'string',
				displayOptions: {
					show: {
						triggerType: [
							'messageWithKeyword',
						],
					},
				},
				default: '',
				description: 'Ключевое слово для фильтрации сообщений (регистр не учитывается)',
			},
			{
				displayName: 'Фильтр контактов',
				name: 'contactFilter',
				type: 'string',
				default: '',
				description: 'Фильтр по номеру телефона отправителя (оставьте пустым, чтобы получать все сообщения)',
			},
			{
				displayName: 'Включать медиа',
				name: 'includeMedia',
				type: 'boolean',
				default: false,
				description: 'Загружать и включать медиафайлы из сообщения',
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const triggerType = this.getNodeParameter('triggerType') as string;
		const keyword = this.getNodeParameter('keyword', '') as string;
		const contactFilter = this.getNodeParameter('contactFilter', '') as string;
		const includeMedia = this.getNodeParameter('includeMedia', false) as boolean;

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

		// Используем сохраненные данные сессии, если есть
		if (sessionData) {
			try {
				clientOptions.session = JSON.parse(sessionData);
			} catch (error) {
				// Если данные сессии повреждены, продолжаем без них
				console.error('Ошибка при парсинге данных сессии:', error.message);
			}
		}

		// Создать клиент WhatsApp
		const client = new Client(clientOptions);

		const manualTriggerFunction = () => {
			this.emit([
				[
					{
						json: {
							success: true,
							manually: true,
							message: 'Триггер запущен вручную',
						},
					},
				],
			]);
		};

		// Обработка QR-кода для аутентификации
		let qrCodeScanned = false;
		client.on('qr', (qr) => {
			qrcode.generate(qr, { small: true });
			this.emit([
				[
					{
						json: {
							success: false,
							message: 'Требуется аутентификация по QR-коду. Отсканируйте QR-код на вашем мобильном устройстве WhatsApp.',
						},
					},
				],
			]);
		});

		// Обработчик готовности клиента
		client.on('ready', () => {
			qrCodeScanned = true;
			this.emit([
				[
					{
						json: {
							success: true,
							message: 'WhatsApp успешно подключен и готов к приему сообщений',
						},
					},
				],
			]);

			// Сохраняем данные сессии
			if (client.pupPage && client.pupPage.session) {
				// Не выполняем сохранение здесь, так как это привело бы к изменению учетных данных,
				// что не рекомендуется в методе trigger.
				// Лучше указать пользователю, что данные сессии готовы к сохранению.
				this.emit([
					[
						{
							json: {
								success: true,
								message: 'Данные сессии готовы к сохранению в учетных данных',
							},
						},
					],
				]);
			}
		});

		// Обработчик сообщений
		client.on('message', async (message: Message) => {
			// Проверяем, подходит ли сообщение под условия триггера
			const sender = (await message.getContact()).id._serialized;
			let shouldTrigger = true;

			// Проверяем фильтр контактов, если указан
			if (contactFilter && !sender.includes(contactFilter)) {
				shouldTrigger = false;
			}

			// Проверяем ключевое слово для типа триггера messageWithKeyword
			if (triggerType === 'messageWithKeyword' && keyword) {
				const messageText = message.body.toLowerCase();
				if (!messageText.includes(keyword.toLowerCase())) {
					shouldTrigger = false;
				}
			}

			if (shouldTrigger) {
				try {
					// Подготавливаем данные сообщения
					const chat = await message.getChat();
					const contact = await message.getContact();

					const messageData: IDataObject = {
						messageId: message.id._serialized,
						body: message.body,
						timestamp: message.timestamp,
						from: {
							id: sender,
							name: contact.name || contact.pushname || '',
							number: contact.number,
						},
						chat: {
							id: chat.id._serialized,
							name: chat.name,
							isGroup: chat.isGroup,
						},
						hasMedia: message.hasMedia,
					};

					// Если сообщение содержит медиа и запрошено включение медиа
					if (message.hasMedia && includeMedia) {
						try {
							const media = await message.downloadMedia();
							if (media) {
								messageData.media = {
									mimetype: media.mimetype,
									data: media.data, // base64 данные
									filename: media.filename,
								};
							}
						} catch (error) {
							messageData.mediaError = error.message;
						}
					}

					// Запускаем поток с данными сообщения
					this.emit([
						[
							{
								json: messageData,
							},
						],
					]);
				} catch (error) {
					console.error('Ошибка при обработке сообщения:', error);
				}
			}
		});

		// Инициализируем клиент
		await client.initialize();

		// Эта функция вызывается при деактивации триггера
		async function closeFunction() {
			await client.destroy();
		}

		// Возвращаем функции для работы с триггером
		return {
			closeFunction,
			manualTriggerFunction,
		};
	}
} 